import { withTimeoutSignal } from "@/utils/abort";
import { HttpRequestError } from "@/services/requestErrors";

type JsonRpcId = number | string;

interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: "2.0";
  method: string;
  params?: TParams;
  id?: JsonRpcId;
}

interface JsonRpcSuccess<TResult = unknown> {
  jsonrpc?: string;
  id?: JsonRpcId;
  result: TResult;
}

interface JsonRpcFailure {
  jsonrpc?: string;
  id?: JsonRpcId;
  error: {
    code?: number;
    message?: string;
    data?: unknown;
  };
}

type JsonRpcResponse<TResult = unknown> =
  | JsonRpcSuccess<TResult>
  | JsonRpcFailure;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  timeout: number;
};

type RpcCallOptions = {
  timeout?: number;
  signal?: AbortSignal;
};

const DEFAULT_TIMEOUT_MS = 30_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const RECONNECT_INTERVAL_MS = 3_000;
const MAX_RECONNECT_INTERVAL_MS = 30_000;

// 服务端 RPC 错误不可再用 HTTP 重试，否则可能重复处理请求。
// 注意:WS 超时(结果未知)也会自动用 HTTP 重放同一调用,因此本客户端只可用于幂等的只读方法。
export class RpcResponseError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = "RpcResponseError";
  }
}

class RPC2Client {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<JsonRpcId, PendingRequest>();
  private reconnectAttempts = 0;
  private connectPromise: Promise<void> | null = null;
  private reconnectTimer: number | null = null;
  private heartbeatTimer: number | null = null;
  private closed = false;
  private state: "disconnected" | "connecting" | "connected" | "reconnecting" | "error" =
    "disconnected";

  constructor(private readonly baseUrl = "/api/rpc2") {
    this.autoConnect();
  }

  async call<TParams = Record<string, unknown>, TResult = unknown>(
    method: string,
    params?: TParams,
    options: RpcCallOptions = {},
  ): Promise<TResult> {
    const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
    if (timeout <= 0) throw new DOMException("Request timed out", "TimeoutError");
    const deadline = Date.now() + timeout;
    // WS 与 HTTP 共用截止时间，回退不能重新领取一份超时预算。
    return await withTimeoutSignal(async (signal) => {
      if (signal.aborted) throw signal.reason;
      if (this.state === "disconnected") this.autoConnect();

      if (this.state === "connected") {
        try {
          return await this.callViaWebSocket<TParams, TResult>(method, params, {
            signal,
            timeout: Math.max(0, deadline - Date.now()),
          });
        } catch (error) {
          if (error instanceof RpcResponseError || signal.aborted) throw error;
        }
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new DOMException("Request timed out", "TimeoutError");
      return await this.callViaHttp<TParams, TResult>(method, params, {
        signal,
        timeout: remaining,
      });
    }, timeout, options.signal);
  }

  private autoConnect() {
    if (this.closed) return;
    void this.connect().catch(() => {
      // socket 不可用时仍可走 HTTP 兜底。
    });
  }

  close() {
    this.closed = true;
    this.stopHeartbeat();
    if (this.reconnectTimer != null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectPendingRequests(new Error("RPC2 client closed"));
    if (this.ws) {
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    this.state = "disconnected";
  }

  private async connect(): Promise<void> {
    if (this.state === "connected") return;
    if (this.connectPromise) return this.connectPromise;

    this.state = this.state === "reconnecting" ? "reconnecting" : "connecting";
    this.connectPromise = new Promise<void>((resolve, reject) => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}${this.baseUrl}`;
      const ws = new WebSocket(url);
      this.ws = ws;

      const timeout = window.setTimeout(() => {
        cleanup();
        this.state = "error";
        try {
          ws.close();
        } catch {}
        reject(new Error("RPC2 WebSocket connection timed out"));
      }, 10_000);

      const cleanup = () => {
        window.clearTimeout(timeout);
        ws.removeEventListener("open", handleOpen);
        ws.removeEventListener("error", handleError);
        ws.removeEventListener("close", handleConnectClose);
      };

      const handleOpen = () => {
        cleanup();
        if (this.closed) {
          this.state = "disconnected";
          try {
            ws.close();
          } catch {}
          reject(new Error("RPC2 client closed during connect"));
          return;
        }
        this.state = "connected";
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        resolve();
      };

      const handleError = () => {
        cleanup();
        this.state = "error";
        this.scheduleReconnect();
        reject(new Error("RPC2 WebSocket connection failed"));
      };

      // 握手关闭可能没有 error 事件，需立即结算 promise 以允许重连。
      const handleConnectClose = () => {
        cleanup();
        this.state = "error";
        reject(new Error("RPC2 WebSocket closed during connect"));
      };

      ws.addEventListener("open", handleOpen, { once: true });
      ws.addEventListener("error", handleError, { once: true });
      ws.addEventListener("close", handleConnectClose, { once: true });
      this.attachSocketHandlers(ws);
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  private attachSocketHandlers(ws: WebSocket) {
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      try {
        const payload = JSON.parse(String(event.data)) as JsonRpcResponse;
        this.handleMessage(payload);
      } catch {
        // 忽略传输层的非法帧。
      }
    };

    ws.onclose = () => {
      if (this.ws !== ws) return;
      this.stopHeartbeat();
      this.ws = null;
      this.state = "disconnected";
      this.rejectPendingRequests(new Error("RPC2 WebSocket disconnected"));
      this.scheduleReconnect();
    };

    // 握手后的传输错误由 close 事件统一处理。
  }

  private handleMessage(payload: JsonRpcResponse) {
    if (payload.id == null) return;

    const pending = this.pending.get(payload.id);
    if (!pending) return;

    this.pending.delete(payload.id);
    window.clearTimeout(pending.timeout);

    if ("error" in payload) {
      pending.reject(
        new RpcResponseError(
          payload.error.message || `RPC Error ${payload.error.code ?? "unknown"}`,
          payload.error.code,
        ),
      );
      return;
    }

    pending.resolve(payload.result);
  }

  private async callViaWebSocket<TParams, TResult>(
    method: string,
    params?: TParams,
    options: RpcCallOptions = {},
  ): Promise<TResult> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("RPC2 WebSocket is not connected");
    }

    const { signal } = options;
    if (signal?.aborted) {
      throw signal.reason ?? new DOMException("Aborted", "AbortError");
    }

    const id = ++this.requestId;
    const timeoutMs = options.timeout ?? DEFAULT_TIMEOUT_MS;
    const request: JsonRpcRequest<TParams> = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    return await new Promise<TResult>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        this.pending.delete(id);
        reject(new DOMException(`RPC2 request timed out: ${method}`, "TimeoutError"));
      }, timeoutMs);

      const onAbort = () => {
        cleanup();
        this.pending.delete(id);
        reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
      };

      const cleanup = () => {
        window.clearTimeout(timeout);
        signal?.removeEventListener("abort", onAbort);
      };

      signal?.addEventListener("abort", onAbort, { once: true });

      this.pending.set(id, {
        resolve: (value) => {
          cleanup();
          resolve(value as TResult);
        },
        reject: (reason) => {
          cleanup();
          reject(reason);
        },
        timeout,
      });

      try {
        this.ws?.send(JSON.stringify(request));
      } catch (error) {
        cleanup();
        this.pending.delete(id);
        reject(error);
      }
    });
  }

  private async callViaHttp<TParams, TResult>(
    method: string,
    params?: TParams,
    options: RpcCallOptions = {},
  ): Promise<TResult> {
    const id = ++this.requestId;
    const response = await fetch(
      this.baseUrl,
      {
        method: "POST",
        credentials: "include",
        signal: options.signal,
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id,
          method,
          params,
        } satisfies JsonRpcRequest<TParams>),
      },
    );

    if (!response.ok) {
      throw new HttpRequestError(
        `RPC ${method} failed: HTTP ${response.status}`,
        response.status,
        this.baseUrl,
      );
    }

    const payload = (await response.json()) as JsonRpcResponse<TResult>;
    if ("error" in payload) {
      throw new RpcResponseError(
        payload.error.message || `RPC Error ${payload.error.code ?? "unknown"}`,
        payload.error.code,
      );
    }

    return payload.result;
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = window.setInterval(() => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
      try {
        this.ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            method: "rpc.ping",
            params: { timestamp: Date.now() },
          } satisfies JsonRpcRequest<{ timestamp: number }>),
        );
      } catch {}
    }, HEARTBEAT_INTERVAL_MS);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.closed || this.reconnectTimer) return;

    // 指数退避并持续重试，连接成功后归零。
    this.state = "reconnecting";
    const delay = Math.min(
      RECONNECT_INTERVAL_MS * 2 ** this.reconnectAttempts,
      MAX_RECONNECT_INTERVAL_MS,
    );
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.autoConnect();
    }, delay);
  }

  private rejectPendingRequests(error: Error) {
    for (const [id, pending] of this.pending) {
      window.clearTimeout(pending.timeout);
      pending.reject(error);
      this.pending.delete(id);
    }
  }

  /**
   * 当移动端（如 iOS Safari）切回前台时，主动探测当前 WebSocket 是否已被系统静默挂死，
   * 如有异常立即清理僵尸连接并重新发起握手。
   */
  checkAndReconnectOnWake() {
    if (this.closed) return;
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.autoConnect();
    }
  }
}

let rpc2Client: RPC2Client | null = null;

export function getRpc2Client() {
  if (!rpc2Client) {
    rpc2Client = new RPC2Client();
  }
  return rpc2Client;
}

function disposeRpc2Client() {
  if (rpc2Client) {
    rpc2Client.close();
    rpc2Client = null;
  }
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    disposeRpc2Client();
  });
}
