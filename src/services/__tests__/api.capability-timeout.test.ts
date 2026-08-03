import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("metric capability timeout budget", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subtracts capability probe time from the metrics request timeout", async () => {
    let now = 1_000;
    let actualMetricTimeout: number | undefined;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    rpcCallMock.mockImplementation(
      (method: string, params: Record<string, unknown>, options?: { timeout?: number }) => {
        if (method === "public:queryMetrics" && !params.metric_keys) {
          now += 5_000;
          return Promise.resolve({});
        }
        if (method === "public:queryMetrics") {
          actualMetricTimeout = options?.timeout;
          return Promise.resolve({
            start: "2026-07-15T00:00:00Z",
            end: "2026-07-15T01:00:00Z",
            series: [],
          });
        }
        return Promise.reject(new Error(`Unexpected RPC method: ${method}`));
      },
    );

    await getTodayTrafficMetrics(
      ["node-a"],
      Date.parse("2026-07-15T00:00:00Z"),
      Date.parse("2026-07-15T01:00:00Z"),
      { timeout: 6_000 },
    );

    expect(actualMetricTimeout).toBe(1_000);
  });
});
