import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpcCallMock } = vi.hoisted(() => ({ rpcCallMock: vi.fn() }));

vi.mock("@/services/rpc2Client", () => ({
  getRpc2Client: () => ({ call: rpcCallMock }),
}));

import { getLoadRecords, getPingOverview, getPingRecords } from "@/services/api";

const START = "2026-07-15T03:00:00Z";
const END = "2026-07-15T04:00:00Z";
const TAGS = { task_id: "7" };

function metricSeries(
  metricKey: string,
  points: Array<{ time: string; value: number | null; count?: number }>,
) {
  return {
    metric_key: metricKey,
    entity_id: "node-a",
    tags: TAGS,
    interval_seconds: 60,
    points,
  };
}

function aggregatePayload(hasGap: boolean) {
  const latency = hasGap
    ? [
        { time: "2026-07-15T03:43:00Z", value: 20, count: 1 },
        { time: "2026-07-15T03:44:00Z", value: null, count: 0 },
        { time: "2026-07-15T03:45:00Z", value: 30, count: 1 },
      ]
    : [
        { time: "2026-07-15T03:43:00Z", value: 20, count: 1 },
        { time: "2026-07-15T03:44:00Z", value: 25, count: 1 },
        { time: "2026-07-15T03:45:00Z", value: 30, count: 1 },
      ];
  const loss = latency.map((point) => ({
    ...point,
    value: point.count === 0 ? null : 0,
  }));
  return {
    start: START,
    end: END,
    series: [
      metricSeries("ping.latency_ms", latency),
      metricSeries("ping.loss", loss),
    ],
  };
}

function installRpcResponses({ hasGap, rawFails = false }: { hasGap: boolean; rawFails?: boolean }) {
  rpcCallMock.mockImplementation((method: string, params: Record<string, unknown>) => {
    if (method === "public:getPingMetricStats") {
      return Promise.resolve({
        stats: [
          {
            entity_id: "node-a",
            task_id: 7,
            name: "广州探测",
            interval: 60,
            total: hasGap ? 2 : 3,
            valid: hasGap ? 2 : 3,
            loss: 0,
            avg: 25,
            latest: 30,
          },
        ],
      });
    }
    if (method === "public:getPublicPingTasks") {
      return Promise.resolve([
        {
          id: 7,
          interval: 60,
          name: "广州探测",
          clients: ["node-a"],
        },
      ]);
    }
    if (method === "public:queryMetrics" && params.downsample === false) {
      if (rawFails) return Promise.reject(new Error("raw query failed"));
      return Promise.resolve({
        start: "2026-07-15T03:40:00Z",
        end: "2026-07-15T03:46:00Z",
        series: [
          metricSeries("ping.latency_ms", [
            { time: "2026-07-15T03:44:15Z", value: 50 },
          ]),
          metricSeries("ping.loss", [
            { time: "2026-07-15T03:44:15Z", value: 0 },
          ]),
        ],
      });
    }
    if (method === "public:queryMetrics") {
      return Promise.resolve(aggregatePayload(hasGap));
    }
    return Promise.reject(new Error(`Unexpected RPC method: ${method}`));
  });
}

describe("metric boundary repair in the API adapter", () => {
  beforeEach(() => {
    rpcCallMock.mockReset();
  });

  it("does not request raw data when the aggregate boundary is continuous", async () => {
    installRpcResponses({ hasGap: false });
    const result = await getPingOverview(1, 7, { entityIds: ["node-a"] });

    expect(result.records).toHaveLength(3);
    const metricCalls = rpcCallMock.mock.calls.filter(
      ([method]) => method === "public:queryMetrics",
    );
    expect(metricCalls).toHaveLength(1);
  });

  it("requests only the bounded raw window and fills the empty bucket", async () => {
    installRpcResponses({ hasGap: true });
    const result = await getPingOverview(1, 7, { entityIds: ["node-a"] });

    expect(result.records).toHaveLength(3);
    expect(result.records.find((record) => record.time === "2026-07-15T03:44:00Z"))
      .toMatchObject({ value: 50, count: 1, loss: 0 });
    expect(result.stats?.[0]).toMatchObject({ total: 3, valid: 3, loss: 0 });

    const metricCalls = rpcCallMock.mock.calls.filter(
      ([method]) => method === "public:queryMetrics",
    );
    expect(metricCalls).toHaveLength(2);
    expect(metricCalls[1][1]).toMatchObject({
      entity_ids: ["node-a"],
      tags: TAGS,
      downsample: false,
      start: "2026-07-15T03:40:00.000Z",
      end: "2026-07-15T03:46:00.000Z",
    });
  });

  it("keeps the aggregate result when the optional raw repair fails", async () => {
    installRpcResponses({ hasGap: true, rawFails: true });
    const result = await getPingOverview(1, 7, { entityIds: ["node-a"] });

    expect(result.records).toHaveLength(2);
    expect(result.records.map((record) => record.time)).not.toContain(
      "2026-07-15T03:44:00Z",
    );
  });

  it("fetches stats in the same call chain on the ping detail path, without boundary repair", async () => {
    installRpcResponses({ hasGap: true });

    const result = await getPingRecords("node-a", 24);

    expect(result.records).toHaveLength(2);
    expect(result.stats).toHaveLength(1);
    expect(result.stats?.[0]).toMatchObject({ total: 2, valid: 2 });
    const metricCalls = rpcCallMock.mock.calls.filter(
      ([method]) => method === "public:queryMetrics",
    );
    expect(metricCalls).toHaveLength(1);
    expect(metricCalls[0][1]).toMatchObject({
      entity_ids: ["node-a"],
      fill_empty: false,
    });
    expect(rpcCallMock).toHaveBeenCalledWith(
      "public:getPingMetricStats",
      expect.objectContaining({ entity_ids: ["node-a"], hours: 24 }),
      expect.anything(),
    );
  });

  it("skips the metric probe when the traffic compatibility path already failed it", async () => {
    rpcCallMock.mockResolvedValue({ count: 0, records: [] });

    const result = await getLoadRecords("node-a", 24, {
      skipMetricQuery: true,
      timeout: 8_000,
    });

    expect(result.records).toEqual([]);
    expect(rpcCallMock).toHaveBeenCalledTimes(1);
    expect(rpcCallMock).toHaveBeenCalledWith(
      "common:getRecords",
      expect.objectContaining({ uuid: "node-a", hours: 24, type: "load" }),
      { signal: undefined, timeout: 8_000 },
    );
  });

  it("does not send removed Komari 1.3.0 total metrics in load queries", async () => {
    rpcCallMock.mockResolvedValue({
      start: START,
      end: END,
      series: [
        metricSeries("memory.used", [
          { time: "2026-07-15T03:30:00Z", value: 512, count: 1 },
        ]),
      ],
    });

    const result = await getLoadRecords("node-a", 1);

    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toMatchObject({ client: "node-a", ram: 512 });
    expect(rpcCallMock).toHaveBeenCalledTimes(1);
    expect(rpcCallMock).toHaveBeenCalledWith(
      "public:queryMetrics",
      expect.objectContaining({
        entity_ids: ["node-a"],
        metric_keys: expect.not.arrayContaining([
          "memory.total",
          "swap.total",
          "disk.total",
        ]),
      }),
      expect.anything(),
    );
  });
});
