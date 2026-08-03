import { describe, expect, it, vi } from "vitest";

const { rpcCallMock, MockRpcResponseError } = vi.hoisted(() => ({
  rpcCallMock: vi.fn(),
  MockRpcResponseError: class MockRpcResponseError extends Error {
    constructor(
      message: string,
      public readonly code?: number,
    ) {
      super(message);
    }
  },
}));

vi.mock("@/services/rpc2Client", () => ({
  getRpc2Client: () => ({ call: rpcCallMock }),
  RpcResponseError: MockRpcResponseError,
}));

import { getTodayTrafficMetrics } from "@/services/api";

describe("metric capability cancellation", () => {
  it("lets a caller stop waiting without cancelling the shared probe", async () => {
    const never = new Promise<never>(() => undefined);
    rpcCallMock.mockImplementation((method: string) => {
      if (method === "public:queryMetrics") {
        return never;
      }
      return Promise.reject(new Error(`Unexpected RPC method: ${method}`));
    });
    const controller = new AbortController();

    const pending = getTodayTrafficMetrics(
      ["node-a"],
      Date.parse("2026-07-15T00:00:00Z"),
      Date.parse("2026-07-15T01:00:00Z"),
      { signal: controller.signal, timeout: 6_000 },
    );
    controller.abort(new DOMException("navigation changed", "AbortError"));

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    const metricCalls = rpcCallMock.mock.calls.filter(
      ([method]) => method === "public:queryMetrics",
    );
    expect(metricCalls).toHaveLength(1);
    expect(metricCalls[0]?.[1]).toEqual({});
  });
});
