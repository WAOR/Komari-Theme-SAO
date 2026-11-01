import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcCallMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/rpc2Client", () => ({
  getRpc2Client: () => ({ call: rpcCallMock }),
}));

import { getMe, getNodes, getPublic } from "@/services/api";

type EarlyDataMap = Record<string, Promise<unknown> | null>;
function getEarlyWindow(): { __EARLY_DATA__?: EarlyDataMap } {
  return window as unknown as { __EARLY_DATA__?: EarlyDataMap };
}

describe("Early Data prefetch consumption", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {
      __EARLY_DATA__: undefined,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    rpcCallMock.mockReset();
  });

  it("consumes early public config without initiating a new fetch roundtrip", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    getEarlyWindow().__EARLY_DATA__ = {
      public: Promise.resolve({
        status: "success",
        data: { sitename: "Early Site", version: "1.0.0" },
      }),
    };

    const config = await getPublic();
    expect(config.sitename).toBe("Early Site");
    // fetch 不应被调用，因为直接消费了早期数据
    expect(fetchMock).not.toHaveBeenCalled();
    // 消费后应当置空，防止后续轮询取到过时数据
    expect(getEarlyWindow().__EARLY_DATA__?.public).toBeNull();
  });

  it("consumes early auth status and falls back to normal fetch once cleared", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          logged_in: true,
          username: "fresh-user",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    getEarlyWindow().__EARLY_DATA__ = {
      me: Promise.resolve({
        logged_in: false,
      }),
    };

    const firstMe = await getMe();
    expect(firstMe.logged_in).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();

    // 再次调用时早期数据已置空，应调用常规 fetch
    const secondMe = await getMe();
    expect(secondMe.logged_in).toBe(true);
    expect(secondMe.username).toBe("fresh-user");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("consumes early RPC nodes without network roundtrip", async () => {
    getEarlyWindow().__EARLY_DATA__ = {
      rpc_nodes: Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: {
          "node-1": {
            uuid: "node-1",
            name: "Node One",
            weight: 10,
          },
        },
      }),
    };

    const nodes = await getNodes();
    expect(nodes).toHaveLength(1);
    expect(nodes[0].name).toBe("Node One");
    expect(getEarlyWindow().__EARLY_DATA__?.rpc_nodes).toBeNull();
    expect(rpcCallMock).not.toHaveBeenCalled();
  });

  it("consumes early today_traffic metrics without network roundtrip", async () => {
    getEarlyWindow().__EARLY_DATA__ = {
      today_traffic: Promise.resolve({
        jsonrpc: "2.0",
        id: 1,
        result: {
          start: "2026-11-01T00:00:00Z",
          end: "2026-11-01T02:00:00Z",
          count: 1,
          default_points: 500,
          series: [
            {
              metric_key: "traffic.up",
              entity_id: "node-1",
              type: "gauge",
              unit: "bytes",
              points: [{ time: "2026-11-01T01:00:00Z", value: 1048576, count: 1 }],
            },
          ],
        },
      }),
    };

    const { getTodayTrafficMetrics } = await import("@/services/api");
    const result = await getTodayTrafficMetrics(["node-1"], 1730419200000, 1730426400000);
    expect(result.series).toHaveLength(1);
    expect(result.series[0].client).toBe("node-1");
    expect(getEarlyWindow().__EARLY_DATA__?.today_traffic).toBeNull();
    expect(rpcCallMock).not.toHaveBeenCalled();
  });
});
