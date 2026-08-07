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

import { getPingOverview } from "@/services/api";

describe("metric capability network failures", () => {
  it("uses compatibility records without permanently caching a transient failure", async () => {
    let probeCount = 0;
    rpcCallMock.mockImplementation((method: string, params: Record<string, unknown>) => {
      if (method === "public:queryMetrics" && !params.metric_keys) {
        probeCount += 1;
        return probeCount === 1
          ? Promise.reject(new Error("temporary network failure"))
          : Promise.reject(new MockRpcResponseError("invalid params", -32602));
      }
      if (method === "public:queryMetrics") {
        return Promise.resolve({ start: "2026-07-15T03:00:00Z", end: "2026-07-15T04:00:00Z", series: [] });
      }
      if (method === "common:getRecords") {
        return Promise.resolve({
          count: 1,
          records: [{ task_id: 7, time: "2026-07-15T04:00:00Z", value: 35, client: "node-a" }],
          tasks: [{ id: 7, name: "Legacy Ping", interval: 60, clients: ["node-a"] }],
        });
      }
      if (method === "public:getPingMetricStats") return Promise.resolve({ stats: [] });
      if (method === "public:getPublicPingTasks") return Promise.resolve([]);
      return Promise.reject(new Error(`Unexpected RPC method: ${method}`));
    });

    const fallback = await getPingOverview(1, 7, { entityIds: ["node-a"] });
    expect(fallback.records).toHaveLength(1);

    const metricResult = await getPingOverview(1, 7, { entityIds: ["node-a"] });
    expect(metricResult.records).toEqual([]);
    expect(probeCount).toBe(2);
  });
});
