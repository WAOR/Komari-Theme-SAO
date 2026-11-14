import type { LoadRecord } from "@/types/komari";

export const TRAFFIC_UP_METRIC = "traffic.up";
export const TRAFFIC_DOWN_METRIC = "traffic.down";
export const RATE_UP_METRIC = "net.out.rate";
export const RATE_DOWN_METRIC = "net.in.rate";

export const TODAY_TRAFFIC_METRIC_KEYS = [
  TRAFFIC_UP_METRIC,
  TRAFFIC_DOWN_METRIC,
  RATE_UP_METRIC,
  RATE_DOWN_METRIC,
] as const;

export const TODAY_TRAFFIC_AGGREGATION = {
  [TRAFFIC_UP_METRIC]: "sum",
  [TRAFFIC_DOWN_METRIC]: "sum",
  [RATE_UP_METRIC]: "max",
  [RATE_DOWN_METRIC]: "max",
} as const;

export interface TrafficMetricSeries {
  metricKey: string;
  client: string;
  intervalSeconds?: number;
  semantics?: string;
  quality?: string;
  points: Array<{ time: string; value: number | null; count: number }>;
}

export interface TodayTrafficStat {
  uuid: string;
  trafficUp: number;
  trafficDown: number;
  peakUp: number;
  peakUpAt: number | null;
  peakDown: number;
  peakDownAt: number | null;
  sampleCount: number;
  hasSamples: boolean;
}

export interface TodayTrafficSample {
  timeMs: number;
  up: number;
  down: number;
}

function emptyStat(uuid: string): TodayTrafficStat {
  return {
    uuid,
    trafficUp: 0,
    trafficDown: 0,
    peakUp: 0,
    peakUpAt: null,
    peakDown: 0,
    peakDownAt: null,
    sampleCount: 0,
    hasSamples: false,
  };
}

function validPoint(point: TrafficMetricSeries["points"][number]) {
  return point.count > 0 && point.value != null && Number.isFinite(point.value);
}

export function summarizeTodayTrafficMetrics(
  series: TrafficMetricSeries[],
  uuids: string[],
  todayStartMs?: number,
): TodayTrafficStat[] {
  const stats = new Map(uuids.map((uuid) => [uuid, emptyStat(uuid)] as const));
  const sampleTimes = new Map(uuids.map((uuid) => [uuid, new Set<number>()] as const));

  for (const item of series) {
    const stat = stats.get(item.client);
    if (!stat) continue;
    for (const point of item.points) {
      if (!validPoint(point)) continue;
      const timeMs = Date.parse(point.time);
      if (!Number.isFinite(timeMs)) continue;
      if (todayStartMs != null && timeMs < todayStartMs) continue;
      const value = Math.max(0, point.value ?? 0);
      sampleTimes.get(item.client)?.add(timeMs);
      stat.hasSamples = true;

      switch (item.metricKey) {
        case TRAFFIC_UP_METRIC:
          stat.trafficUp += value;
          break;
        case TRAFFIC_DOWN_METRIC:
          stat.trafficDown += value;
          break;
        case RATE_UP_METRIC:
          if (value > stat.peakUp) {
            stat.peakUp = value;
            stat.peakUpAt = timeMs;
          }
          break;
        case RATE_DOWN_METRIC:
          if (value > stat.peakDown) {
            stat.peakDown = value;
            stat.peakDownAt = timeMs;
          }
          break;
      }
    }
  }

  for (const [uuid, stat] of stats) {
    stat.sampleCount = sampleTimes.get(uuid)?.size ?? 0;
  }
  return [...stats.values()];
}

export function buildTodayTrafficMetricSamples(
  series: TrafficMetricSeries[],
  uuid: string,
  todayStartMs?: number,
): TodayTrafficSample[] {
  const samples = new Map<number, TodayTrafficSample>();
  for (const item of series) {
    if (
      item.client !== uuid ||
      (item.metricKey !== RATE_UP_METRIC && item.metricKey !== RATE_DOWN_METRIC)
    ) {
      continue;
    }
    for (const point of item.points) {
      if (!validPoint(point)) continue;
      const timeMs = Date.parse(point.time);
      if (!Number.isFinite(timeMs)) continue;
      if (todayStartMs != null && timeMs < todayStartMs) continue;
      const sample = samples.get(timeMs) ?? { timeMs, up: 0, down: 0 };
      if (item.metricKey === RATE_UP_METRIC) sample.up = Math.max(0, point.value ?? 0);
      else sample.down = Math.max(0, point.value ?? 0);
      samples.set(timeMs, sample);
    }
  }
  return [...samples.values()].sort((left, right) => right.timeMs - left.timeMs);
}

function recordTimeMs(record: LoadRecord) {
  if (typeof record.time === "number") {
    return record.time > 1_000_000_000_000 ? record.time : record.time * 1000;
  }
  return Date.parse(record.time);
}

function counterDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || current < 0) return 0;
  if (!Number.isFinite(previous) || previous < 0) return 0;
  return current >= previous ? current - previous : current;
}

export function summarizeTodayTrafficRecords(
  uuid: string,
  records: LoadRecord[],
  startMs: number,
  endMs: number,
): TodayTrafficStat {
  const stat = emptyStat(uuid);
  const sorted = records
    .map((record) => ({ record, timeMs: recordTimeMs(record) }))
    .filter(({ timeMs }) => Number.isFinite(timeMs) && timeMs <= endMs)
    .sort((left, right) => left.timeMs - right.timeMs);

  let previous: LoadRecord | null = null;
  for (const item of sorted) {
    const { record, timeMs } = item;
    if (timeMs < startMs) {
      previous = record;
      continue;
    }

    stat.hasSamples = true;
    stat.sampleCount += 1;
    if (previous) {
      stat.trafficUp += counterDelta(record.net_total_up, previous.net_total_up);
      stat.trafficDown += counterDelta(record.net_total_down, previous.net_total_down);
    }
    const netOut = Number.isFinite(record.net_out) ? record.net_out : 0;
    const netIn = Number.isFinite(record.net_in) ? record.net_in : 0;
    if (netOut > stat.peakUp) {
      stat.peakUp = Math.max(0, netOut);
      stat.peakUpAt = timeMs;
    }
    if (netIn > stat.peakDown) {
      stat.peakDown = Math.max(0, netIn);
      stat.peakDownAt = timeMs;
    }
    previous = record;
  }

  return stat;
}

export function buildTodayTrafficRecordSamples(
  records: LoadRecord[],
  startMs: number,
  endMs: number,
): TodayTrafficSample[] {
  return records
    .map((record) => ({ record, timeMs: recordTimeMs(record) }))
    .filter(
      ({ timeMs }) => Number.isFinite(timeMs) && timeMs >= startMs && timeMs <= endMs,
    )
    .map(({ record, timeMs }) => ({
      timeMs,
      up: Math.max(0, Number.isFinite(record.net_out) ? record.net_out : 0),
      down: Math.max(0, Number.isFinite(record.net_in) ? record.net_in : 0),
    }))
    .sort((left, right) => right.timeMs - left.timeMs);
}

export interface HourlyTrafficBucket {
  up: number;
  down: number;
  total: number;
}

export function buildClusterHourlyTrafficBuckets(
  series: TrafficMetricSeries[],
  nowMs: number = Date.now(),
  bucketCount = 7,
  _spanMs = 3_600_000,
): HourlyTrafficBucket[] {
  const buckets: HourlyTrafficBucket[] = Array.from({ length: bucketCount }, () => ({
    up: 0,
    down: 0,
    total: 0,
  }));

  // 对齐自然整点：最右侧柱为当前所在自然小时（例如 09:00~10:00 进行时）
  const currentHourDate = new Date(nowMs);
  currentHourDate.setMinutes(0, 0, 0);
  const currentHourStartMs = currentHourDate.getTime();

  for (const item of series) {
    if (item.metricKey !== TRAFFIC_UP_METRIC && item.metricKey !== TRAFFIC_DOWN_METRIC) {
      continue;
    }
    const isUp = item.metricKey === TRAFFIC_UP_METRIC;
    for (const point of item.points) {
      if (!validPoint(point)) continue;
      const timeMs = Date.parse(point.time);
      if (!Number.isFinite(timeMs) || timeMs > nowMs) continue;

      const pointHourDate = new Date(timeMs);
      pointHourDate.setMinutes(0, 0, 0);
      const pointHourStartMs = pointHourDate.getTime();

      const diffHours = Math.round((currentHourStartMs - pointHourStartMs) / 3_600_000);
      const bucketIndex = bucketCount - 1 - diffHours;
      if (bucketIndex >= 0 && bucketIndex < bucketCount) {
        const val = Math.max(0, point.value ?? 0);
        if (isUp) buckets[bucketIndex].up += val;
        else buckets[bucketIndex].down += val;
        buckets[bucketIndex].total += val;
      }
    }
  }

  return buckets;
}

export function buildClusterHourlyRecordBuckets(
  allRecords: LoadRecord[][],
  startMs: number,
  nowMs: number = Date.now(),
  bucketCount = 7,
  _spanMs = 3_600_000,
): HourlyTrafficBucket[] {
  const buckets: HourlyTrafficBucket[] = Array.from({ length: bucketCount }, () => ({
    up: 0,
    down: 0,
    total: 0,
  }));

  // 对齐自然整点：最右侧柱为当前所在自然小时（例如 09:00~10:00 进行时）
  const currentHourDate = new Date(nowMs);
  currentHourDate.setMinutes(0, 0, 0);
  const currentHourStartMs = currentHourDate.getTime();

  for (const records of allRecords) {
    const sorted = records
      .map((record) => ({ record, timeMs: recordTimeMs(record) }))
      .filter(({ timeMs }) => Number.isFinite(timeMs) && timeMs <= nowMs)
      .sort((a, b) => a.timeMs - b.timeMs);

    let previous: LoadRecord | null = null;
    for (const item of sorted) {
      const { record, timeMs } = item;
      if (timeMs < startMs) {
        previous = record;
        continue;
      }
      if (previous) {
        const up = counterDelta(record.net_total_up, previous.net_total_up);
        const down = counterDelta(record.net_total_down, previous.net_total_down);

        const pointHourDate = new Date(timeMs);
        pointHourDate.setMinutes(0, 0, 0);
        const pointHourStartMs = pointHourDate.getTime();

        const diffHours = Math.round((currentHourStartMs - pointHourStartMs) / 3_600_000);
        const bucketIndex = bucketCount - 1 - diffHours;
        if (bucketIndex >= 0 && bucketIndex < bucketCount) {
          buckets[bucketIndex].up += up;
          buckets[bucketIndex].down += down;
          buckets[bucketIndex].total += up + down;
        }
      }
      previous = record;
    }
  }

  return buckets;
}
