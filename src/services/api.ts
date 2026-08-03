import { z } from "zod";
import { getRpc2Client, RpcResponseError } from "@/services/rpc2Client";
import {
  MeSchema,
  NodeInfoSchema,
  PublicConfigSchema,
  AdminClientSchema,
  LoadRecordSchema,
  PingRecordSchema,
  PingTaskSchema,
  type Me,
  type NodeInfo,
  type PublicConfig,
  type AdminClient,
  type LoadRecordsResponse,
  type PingRecordsResponse,
  type PingTask,
  type PingTaskStats,
} from "@/types/komari";
import { fetchWithTimeout } from "@/utils/abort";
import { inferHistoryIntervalSeconds } from "@/utils/historyRange";
import {
  LOAD_LAST_AGGREGATION,
  LOAD_METRIC_KEYS,
  mergeLoadMetricSeries,
  type LoadMetricSeries,
} from "@/utils/loadMetrics";
import {
  mergePingMetricSeries,
  pingTasksFromMetricStats,
  reconcilePingMetricStats,
  PING_LATENCY_METRIC,
  PING_LOSS_METRIC,
  type PingMetricSeries,
} from "@/utils/pingMetrics";
import {
  fillMetricBoundaryGaps,
  getMetricBoundaryRepairRange,
  hasMetricBoundaryGap,
  type MetricBoundaryAggregation,
  type MetricBoundarySeries,
} from "@/utils/metricBoundaryRepair";
import {
  TODAY_TRAFFIC_AGGREGATION,
  TODAY_TRAFFIC_METRIC_KEYS,
  type TrafficMetricSeries,
} from "@/utils/trafficStats";

const ApiEnvelope = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    status: z.string().optional(),
    message: z.string().optional(),
    data: inner,
  });

const RpcRecordsSchema = z
  .object({
    count: z.number().default(0),
    records: z.unknown().optional(),
    tasks: z.unknown().optional(),
  })
  .passthrough();

const MetricPointSchema = z
  .object({
    time: z.string(),
    value: z.number().nullable().default(null),
    count: z.number().default(0),
  })
  .passthrough();

const MetricSeriesSchema = z
  .object({
    metric_key: z.string(),
    entity_id: z.string().default(""),
    tags: z.record(z.string(), z.string()).optional(),
    tag: z.record(z.string(), z.string()).optional(),
    interval_seconds: z.number().default(0),
    points: z.array(MetricPointSchema).default([]),
  })
  .passthrough();

const MetricQueryResponseSchema = z
  .object({
    start: z.string().optional(),
    end: z.string().optional(),
    series: z.array(MetricSeriesSchema).default([]),
  })
  .passthrough();

const PingMetricStatSchema = z
  .object({
    entity_id: z.string().default(""),
    task_id: z.union([z.string(), z.number()]),
    name: z.string().default(""),
    type: z.string().default("icmp"),
    interval: z.number().default(60),
    total: z.number().default(0),
    valid: z.number().default(0),
    loss: z.number().default(0),
    min: z.number().nullable().optional(),
    max: z.number().nullable().optional(),
    avg: z.number().nullable().optional(),
    latest: z.number().nullable().optional(),
    p50: z.number().nullable().optional(),
    p99: z.number().nullable().optional(),
    stddev: z.number().nullable().optional(),
    p99_p50_ratio: z.number().default(0),
  })
  .passthrough();

const PingMetricStatsResponseSchema = z
  .object({
    stats: z.array(PingMetricStatSchema).default([]),
  })
  .passthrough();

const LOAD_RECORDS_PER_HOUR = 12;
const PING_RECORDS_PER_HOUR = 240;
const MAX_RPC_RECORDS = 20_000;
const OVERVIEW_PING_MAX_COUNT = 4_000;
const OVERVIEW_METRIC_MAX_POINTS = 24;
const DETAIL_METRIC_MAX_POINTS = 500;
// 普通 HTTP GET(/api/nodes、/api/public、load/ping 兜底)自身没有传输超时,
// 在这里统一兜底,half-open socket 能快速失败而不是无限挂住调用方。
const DEFAULT_API_TIMEOUT_MS = 12_000;

interface RpcRecordsPayload {
  count?: number;
  records?: unknown;
  tasks?: unknown;
}

interface PingOverviewResponse {
  records: PingRecordsResponse["records"];
  tasks: PingTask[];
  rangeStartMs?: number;
  rangeEndMs?: number;
  intervalSeconds?: number;
  stats?: PingTaskStats[];
}

interface RequestRange {
  rangeStartMs: number;
  rangeEndMs: number;
}

interface ApiCallOptions {
  signal?: AbortSignal;
  timeout?: number;
}

// skipMetricQuery 只有 getLoadRecords 实现(跳过 metric 探测直读 records),
// 不放进通用选项,避免"写了但不生效"的签名。
interface LoadRecordsOptions extends ApiCallOptions {
  skipMetricQuery?: boolean;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly path: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

function normalizeRpcLatestStatus(
  payload: unknown,
): Record<string, unknown> {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const maybeRecords = (payload as Record<string, unknown>).records;
    const wrapped = z.record(z.string(), z.unknown()).safeParse(maybeRecords);
    if (wrapped.success) {
      return wrapped.data;
    }
  }

  const direct = z.record(z.string(), z.unknown()).safeParse(payload);
  if (direct.success) {
    return direct.data;
  }

  return {};
}

function getRecordsMaxCount(hours: number, recordsPerHour: number) {
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
  return Math.min(
    MAX_RPC_RECORDS,
    Math.max(recordsPerHour, Math.ceil(safeHours * recordsPerHour)),
  );
}

function createRequestRange(hours: number, now = Date.now()): RequestRange {
  const safeHours = Number.isFinite(hours) && hours > 0 ? hours : 1;
  return {
    rangeStartMs: now - safeHours * 60 * 60 * 1000,
    rangeEndMs: now,
  };
}

function getMetricPayloadRange(
  payload: z.output<typeof MetricQueryResponseSchema>,
  fallback: RequestRange,
): RequestRange {
  const start = Date.parse(payload.start ?? "");
  const end = Date.parse(payload.end ?? "");
  return {
    rangeStartMs: Number.isFinite(start) ? start : fallback.rangeStartMs,
    rangeEndMs: Number.isFinite(end) ? end : fallback.rangeEndMs,
  };
}

async function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: { signal?: AbortSignal; timeout?: number },
): Promise<T> {
  const resp = await fetchWithTimeout(
    path,
    {
      credentials: "include",
      headers: { Accept: "application/json" },
    },
    options?.timeout ?? DEFAULT_API_TIMEOUT_MS,
    options?.signal,
  );
  if (!resp.ok) {
    throw new ApiRequestError(`Request ${path} failed: ${resp.status}`, resp.status, path);
  }
  const json = (await resp.json()) as unknown;
  const envelopeResult = ApiEnvelope(schema).safeParse(json);
  if (envelopeResult.success) return envelopeResult.data.data as T;
  const rawResult = schema.safeParse(json);
  if (rawResult.success) return rawResult.data;
  // 两种解析错误都抛出来:enveloped 接口看 envelope 错误,裸 array/object 接口看 raw
  // 错误,而这里无法判断接口本该返回哪种结构。
  throw new Error(
    `Schema mismatch on ${path}: envelope=${
      envelopeResult.error.issues[0]?.message ?? ""
    }; raw=${rawResult.error.issues[0]?.message ?? ""}`,
  );
}

async function rpcCall<T>(
  method: string,
  params: Record<string, unknown>,
  schema: z.ZodType<T>,
  options?: { timeout?: number; signal?: AbortSignal },
): Promise<T> {
  const payload = await getRpc2Client().call(method, params, options);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(
      `Schema mismatch on rpc:${method}: ${parsed.error.issues[0]?.message ?? ""}`,
    );
  }
  return parsed.data;
}

// 丢掉单条解析失败的记录,而不是让整个数组抛错。否则一条坏记录会让 RPC normalize
// 抛错,调用方捕获后兜底到完整 HTTP 请求 —— 一条坏数据就变成每次轮询都 RPC + HTTP
// 双重拉取。
function parseArrayLenient<S extends z.ZodTypeAny>(schema: S, value: unknown): z.infer<S>[] {
  if (!Array.isArray(value)) return [];
  const out: z.infer<S>[] = [];
  for (const item of value) {
    const parsed = schema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function extractRpcRecords(payload: RpcRecordsPayload, key?: string): unknown[] {
  if (Array.isArray(payload.records)) return payload.records;
  if (!payload.records || typeof payload.records !== "object") return [];

  const recordsByKey = payload.records as Record<string, unknown>;
  if (key && Array.isArray(recordsByKey[key])) {
    return recordsByKey[key];
  }

  return Object.values(recordsByKey).flatMap((value) =>
    Array.isArray(value) ? value : [],
  );
}

function normalizeRpcLoadRecords(
  uuid: string,
  payload: RpcRecordsPayload,
  range?: RequestRange,
): LoadRecordsResponse {
  const records = parseArrayLenient(LoadRecordSchema, extractRpcRecords(payload, uuid));
  const count = payload.count;
  return {
    count: typeof count === "number" && Number.isFinite(count) && count > 0 ? count : records.length,
    records,
    intervalSeconds: inferHistoryIntervalSeconds(records),
    ...range,
  };
}

function derivePingTasks(records: PingRecordsResponse["records"]): PingTask[] {
  return Array.from(new Set(records.map((record) => record.task_id)))
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      interval: 60,
      name: `任务 #${id}`,
      loss: 0,
      clients: [],
      type: "icmp",
      target: "",
      weight: id,
    }));
}

function normalizeRpcPingRecords(
  uuid: string,
  payload: RpcRecordsPayload,
  range?: RequestRange,
): PingRecordsResponse {
  const records = parseArrayLenient(PingRecordSchema, extractRpcRecords(payload, uuid));
  const parsedTasks = z.array(PingTaskSchema).safeParse(payload.tasks);
  const tasks = parsedTasks.success ? parsedTasks.data : derivePingTasks(records);
  const count = payload.count;
  return {
    count: typeof count === "number" && Number.isFinite(count) && count > 0 ? count : records.length,
    records,
    tasks,
    ...range,
  };
}

function normalizeRpcPingOverview(
  payload: RpcRecordsPayload,
  range?: RequestRange,
): PingOverviewResponse {
  const records = parseArrayLenient(PingRecordSchema, extractRpcRecords(payload));
  const parsedTasks = z.array(PingTaskSchema).safeParse(payload.tasks);
  return {
    records,
    tasks: parsedTasks.success ? parsedTasks.data : derivePingTasks(records),
    ...range,
  };
}

let metricQueryApiUnavailable = false;
let publicPingTasksCache: PingTask[] | null = null;
let publicPingTasksCachedAt = 0;
let publicPingTasksRequest: Promise<PingTask[]> | null = null;

// 降级链全程静默会让「长期走兼容路径」与「一切正常」无法区分,每类降级警告一次。
const degradeWarned = new Set<string>();
export function warnDegradedOnce(key: string, message: string) {
  if (degradeWarned.has(key)) return;
  degradeWarned.add(key);
  console.warn(`[LuminaPlus] ${message}`);
}

function isMissingMetricMethod(error: unknown) {
  // JSON-RPC 标准的 Method not found 是 -32601；文本匹配只兜底非标准实现。
  if (error instanceof RpcResponseError && error.code === -32601) return true;
  if (!(error instanceof Error)) return false;
  return /method.*(?:not found|unknown|registered)|(?:not found|unknown).*method/i.test(
    error.message,
  );
}

async function queryMetricPayload(
  params: Record<string, unknown>,
  signal?: AbortSignal,
  timeout?: number,
): Promise<z.output<typeof MetricQueryResponseSchema>> {
  if (metricQueryApiUnavailable) {
    throw new Error("Metric query API is unavailable on this server");
  }

  try {
    const payload = await rpcCall(
      "public:queryMetrics",
      params,
      MetricQueryResponseSchema,
      { signal, timeout },
    );
    return payload as z.output<typeof MetricQueryResponseSchema>;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (isMissingMetricMethod(error)) {
      metricQueryApiUnavailable = true;
      warnDegradedOnce(
        "metric-api",
        "public:queryMetrics 不可用(旧版后端?),本次会话所有 metrics 查询将走兼容记录接口",
      );
    }
    throw error;
  }
}

function loadPublicPingTasks() {
  if (publicPingTasksCache && Date.now() - publicPingTasksCachedAt < 60_000) {
    return Promise.resolve(publicPingTasksCache);
  }
  if (publicPingTasksRequest) return publicPingTasksRequest;

  publicPingTasksRequest = rpcCall(
    "public:getPublicPingTasks",
    {},
    z.array(PingTaskSchema),
  )
    .then((tasks) => {
      const parsed = tasks as PingTask[];
      publicPingTasksCache = parsed;
      publicPingTasksCachedAt = Date.now();
      return parsed;
    })
    .finally(() => {
      publicPingTasksRequest = null;
    });
  return publicPingTasksRequest;
}

function normalizePingMetricStats(
  payload: z.output<typeof PingMetricStatsResponseSchema>,
): PingTaskStats[] {
  const out: PingTaskStats[] = [];
  for (const item of payload.stats) {
    const taskId = Number.parseInt(String(item.task_id), 10);
    if (!Number.isFinite(taskId) || taskId <= 0 || !item.entity_id) continue;
    out.push({
      client: item.entity_id,
      taskId,
      name: item.name,
      type: item.type,
      interval: item.interval,
      total: item.total,
      valid: item.valid,
      loss: item.loss,
      min: item.min ?? null,
      max: item.max ?? null,
      avg: item.avg ?? null,
      latest: item.latest ?? null,
      p50: item.p50 ?? null,
      p99: item.p99 ?? null,
      stddev: item.stddev ?? null,
      p99P50Ratio: item.p99_p50_ratio,
    });
  }
  return out;
}

type MetricPayloadSeries = z.output<typeof MetricSeriesSchema>;

function rawMetricPoints(item: MetricPayloadSeries) {
  return item.points.map((point) => ({
    ...point,
    count: point.value == null ? 0 : 1,
  }));
}

async function repairMetricBoundary<T extends MetricBoundarySeries>(
  aggregateSeries: T[],
  metricPayload: z.output<typeof MetricQueryResponseSchema>,
  requestRange: RequestRange,
  rawParams: Record<string, unknown>,
  mapRawSeries: (item: MetricPayloadSeries, intervalSeconds: number) => T,
  aggregationByMetric: Partial<Record<string, MetricBoundaryAggregation>> = {},
  signal?: AbortSignal,
  timeout?: number,
) {
  const payloadRange = getMetricPayloadRange(metricPayload, requestRange);
  const repairRange = getMetricBoundaryRepairRange(
    payloadRange.rangeStartMs,
    payloadRange.rangeEndMs,
  );
  if (!repairRange || !hasMetricBoundaryGap(aggregateSeries, repairRange)) {
    return aggregateSeries;
  }

  try {
    const rawPayload = await queryMetricPayload(
      {
        ...rawParams,
        start: new Date(repairRange.startMs).toISOString(),
        end: new Date(repairRange.endMs).toISOString(),
        downsample: false,
        fill_empty: false,
      },
      signal,
      timeout,
    );
    const fallbackInterval = Math.max(
      0,
      ...aggregateSeries.map((item) => item.intervalSeconds ?? 0),
    );
    const rawSeries = rawPayload.series.map((item) =>
      mapRawSeries(item, fallbackInterval),
    );
    return fillMetricBoundaryGaps(
      aggregateSeries,
      rawSeries,
      aggregationByMetric,
    ).series;
  } catch (error) {
    if (signal?.aborted) throw error;
    warnDegradedOnce("boundary-repair", "边界补点查询失败,保留聚合序列(尾部可能缺最新桶)");
    return aggregateSeries;
  }
}

async function getLoadMetricData(
  uuid: string,
  hours: number,
  signal?: AbortSignal,
  timeout?: number,
): Promise<LoadRecordsResponse> {
  const requestRange = createRequestRange(hours);
  const metricPayload = await queryMetricPayload(
    {
      hours,
      entity_ids: [uuid],
      metric_keys: LOAD_METRIC_KEYS,
      max_points: DETAIL_METRIC_MAX_POINTS,
      aggregation: "avg",
      aggregation_by_metric: LOAD_LAST_AGGREGATION,
      fill_empty: false,
    },
    signal,
    timeout,
  );
  const series: LoadMetricSeries[] = metricPayload.series.map((item) => ({
    metricKey: item.metric_key,
    client: item.entity_id,
    intervalSeconds: item.interval_seconds,
    points: item.points,
  }));
  const records = mergeLoadMetricSeries(series);
  const intervalSeconds = Math.max(
    0,
    ...metricPayload.series.map((item) => item.interval_seconds),
  );
  return {
    count: records.length,
    records,
    ...getMetricPayloadRange(metricPayload, requestRange),
    intervalSeconds: intervalSeconds > 0 ? intervalSeconds : undefined,
  };
}

async function getPingMetricData({
  hours,
  entityIds,
  taskId,
  maxPoints,
  includeStats = false,
  repairBoundary = false,
  signal,
  timeout,
}: {
  hours: number;
  entityIds?: string[];
  taskId?: number;
  maxPoints: number;
  includeStats?: boolean;
  repairBoundary?: boolean;
  signal?: AbortSignal;
  timeout?: number;
}): Promise<PingRecordsResponse> {
  if (metricQueryApiUnavailable) {
    throw new Error("Metric query API is unavailable on this server");
  }

  const requestRange = createRequestRange(hours);
  const commonParams = {
    hours,
    ...(entityIds?.length ? { entity_ids: entityIds } : {}),
    ...(taskId != null ? { task_id: taskId } : {}),
    max_points: maxPoints,
  };

  const statsRequest = includeStats
    ? rpcCall(
        "public:getPingMetricStats",
        commonParams,
        PingMetricStatsResponseSchema,
        { signal, timeout },
      )
        .then((payload) => payload as z.output<typeof PingMetricStatsResponseSchema>)
        .catch((error: unknown) => {
          if (signal?.aborted) throw error;
          warnDegradedOnce("ping-stats", "Ping 统计接口失败,已由 records 本地兜底计算");
          return null;
        })
    : Promise.resolve(null);
  const [metricPayload, statsPayload, publicTasks] = await Promise.all([
    queryMetricPayload(
      {
        ...commonParams,
        metric_keys: [PING_LATENCY_METRIC, PING_LOSS_METRIC],
        ...(taskId != null ? { tags: { task_id: String(taskId) } } : {}),
        aggregation: "avg",
        fill_empty: false,
      },
      signal,
      timeout,
    ),
    statsRequest,
    loadPublicPingTasks().catch(() => {
      warnDegradedOnce("public-ping-tasks", "公开 Ping 任务列表获取失败,任务名将按 records 推导");
      return null;
    }),
  ]);
  let series: PingMetricSeries[] = metricPayload.series.map((item) => ({
    metricKey: item.metric_key,
    client: item.entity_id,
    tags: item.tags ?? item.tag ?? {},
    intervalSeconds: item.interval_seconds,
    points: item.points,
  }));
  if (repairBoundary && entityIds?.length) {
    series = await repairMetricBoundary(
      series,
      metricPayload,
      requestRange,
      {
        entity_ids: entityIds,
        metric_keys: [PING_LATENCY_METRIC, PING_LOSS_METRIC],
        ...(taskId != null ? { tags: { task_id: String(taskId) } } : {}),
      },
      (item, intervalSeconds) => ({
        metricKey: item.metric_key,
        client: item.entity_id,
        tags: item.tags ?? item.tag ?? {},
        intervalSeconds,
        points: rawMetricPoints(item),
      }),
      {},
      signal,
    );
  }
  const records = mergePingMetricSeries(series);
  const stats = reconcilePingMetricStats(
    statsPayload ? normalizePingMetricStats(statsPayload) : [],
    records,
  );
  const intervalSeconds = Math.max(
    0,
    ...metricPayload.series.map((item) => item.interval_seconds),
  );
  const observedTaskIds = new Set([
    ...records.map((record) => record.task_id),
    ...stats.map((stat) => stat.taskId),
  ]);
  const statByTask = new Map(stats.map((stat) => [stat.taskId, stat] as const));
  const tasks = publicTasks
    ?.filter((task) => observedTaskIds.has(task.id))
    .map((task) => ({
      ...task,
      loss: statByTask.get(task.id)?.loss ?? task.loss,
    }));
  const statsTasks = pingTasksFromMetricStats(stats);
  return {
    count: records.length,
    records,
    ...getMetricPayloadRange(metricPayload, requestRange),
    intervalSeconds: intervalSeconds > 0 ? intervalSeconds : undefined,
    tasks:
      tasks && tasks.length > 0
        ? tasks
        : statsTasks.length > 0
          ? statsTasks
          : derivePingTasks(records),
    stats,
  };
}

export async function getMe(options?: ApiCallOptions): Promise<Me> {
  // 必须 cast:zod `.passthrough()` schema 经 apiGet 推断出的是 input 类型(默认字段
  // 变可选),这里要重新收窄回来。
  return (await apiGet("/api/me", MeSchema, options)) as Me;
}

export async function getPublic(options?: ApiCallOptions): Promise<PublicConfig> {
  return (await apiGet("/api/public", PublicConfigSchema, options)) as PublicConfig;
}

export async function getNodesLatestStatus(
  uuids?: string[],
  options?: { timeout?: number; signal?: AbortSignal },
): Promise<Record<string, unknown>> {
  const payload = await rpcCall(
    "common:getNodesLatestStatus",
    uuids && uuids.length > 0 ? { uuids } : {},
    z.unknown(),
    options,
  );
  return normalizeRpcLatestStatus(payload);
}

export async function getNodes(options?: ApiCallOptions): Promise<NodeInfo[]> {
  // 走 common:getNodes（RPC2）：它按 SendIpAddrToGuest 设置下发 ipv4/ipv6（管理员全量 /
  // 访客打码），所以前端能显示 V4/V6；/api/nodes 则永远抹掉 IP，拿不到。
  try {
    const map = await rpcCall(
      "common:getNodes",
      {},
      z.record(z.string(), NodeInfoSchema),
      options,
    );
    return Object.values(map) as NodeInfo[];
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    // RPC 不可用时兜底回旧的 HTTP 接口（拿不到 IP，但节点列表照常加载）。
    return (await apiGet("/api/nodes", z.array(NodeInfoSchema), options)) as NodeInfo[];
  }
}

export async function getAdminClients(options?: ApiCallOptions): Promise<AdminClient[]> {
  return (await apiGet("/api/admin/client/list", z.array(AdminClientSchema), options)) as AdminClient[];
}

export async function getLoadRecords(
  uuid: string,
  hours = 6,
  options?: LoadRecordsOptions,
): Promise<LoadRecordsResponse> {
  const requestRange = createRequestRange(hours);
  if (!options?.skipMetricQuery) {
    try {
      return await getLoadMetricData(uuid, hours, options?.signal, options?.timeout);
    } catch (error) {
      if (options?.signal?.aborted) throw error;
      // 旧版后端没有 public metric API，或新接口暂时失败时回退兼容记录接口。
      warnDegradedOnce("load-records", "负载 metrics 查询失败,已回退兼容记录接口");
    }
  }

  try {
    const maxCount = getRecordsMaxCount(hours, LOAD_RECORDS_PER_HOUR);
    const payload = await rpcCall(
      "common:getRecords",
      {
        uuid,
        hours,
        type: "load",
        maxCount,
      },
      RpcRecordsSchema,
      { signal: options?.signal, timeout: options?.timeout },
    );
    return normalizeRpcLoadRecords(uuid, payload, requestRange);
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    const legacy = (await apiGet(
      `/api/records/load?${new URLSearchParams({ uuid, hours: String(hours) })}`,
      z.object({
        count: z.number().default(0),
        records: z.array(LoadRecordSchema).default([]),
      }),
      { signal: options?.signal, timeout: options?.timeout },
    )) as LoadRecordsResponse;
    return {
      ...legacy,
      ...requestRange,
      intervalSeconds: inferHistoryIntervalSeconds(legacy.records),
    };
  }
}

export interface TodayTrafficMetricResponse {
  series: TrafficMetricSeries[];
  rangeStartMs: number;
  rangeEndMs: number;
  intervalSeconds?: number;
}

/**
 * 查询浏览器本地“今天”的流量增量与上下行采样峰值。服务端按 5 分钟左右聚合，
 * 流量使用 sum、速率使用 max；前端随后再汇总到每台节点，避免拉取全天原始点。
 */
export async function getTodayTrafficMetrics(
  entityIds: string[],
  startMs: number,
  endMs: number,
  options?: ApiCallOptions,
): Promise<TodayTrafficMetricResponse> {
  if (entityIds.length === 0) {
    return { series: [], rangeStartMs: startMs, rangeEndMs: endMs };
  }

  const fiveMinutesMs = 5 * 60 * 1000;
  const maxPoints = Math.max(1, Math.ceil((endMs - startMs) / fiveMinutesMs));
  const requestRange = { rangeStartMs: startMs, rangeEndMs: endMs };
  const metricPayload = await queryMetricPayload(
    {
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      entity_ids: entityIds,
      metric_keys: TODAY_TRAFFIC_METRIC_KEYS,
      max_points: maxPoints,
      aggregation_by_metric: TODAY_TRAFFIC_AGGREGATION,
      fill_empty: false,
    },
    options?.signal,
    options?.timeout,
  );
  let series: TrafficMetricSeries[] = metricPayload.series.map((item) => ({
    metricKey: item.metric_key,
    client: item.entity_id,
    intervalSeconds: item.interval_seconds,
    points: item.points,
  }));
  series = await repairMetricBoundary(
    series,
    metricPayload,
    requestRange,
    {
      entity_ids: entityIds,
      metric_keys: TODAY_TRAFFIC_METRIC_KEYS,
    },
    (item, intervalSeconds) => ({
      metricKey: item.metric_key,
      client: item.entity_id,
      intervalSeconds,
      points: rawMetricPoints(item),
    }),
    TODAY_TRAFFIC_AGGREGATION,
    options?.signal,
    options?.timeout,
  );
  const intervalSeconds = Math.max(0, ...series.map((item) => item.intervalSeconds ?? 0));
  return {
    series,
    ...getMetricPayloadRange(metricPayload, requestRange),
    intervalSeconds: intervalSeconds > 0 ? intervalSeconds : undefined,
  };
}

export async function getPingRecords(
  uuid: string,
  hours = 6,
  options?: ApiCallOptions,
): Promise<PingRecordsResponse> {
  const requestRange = createRequestRange(hours);
  try {
    // includeStats:records 与 stats 并行走同一次调用链,省掉实例页单独的 stats 往返;
    // stats 子请求失败会被内部吞掉,由 records 本地兜底,不影响图表主路径。
    return await getPingMetricData({
      hours,
      entityIds: [uuid],
      maxPoints: DETAIL_METRIC_MAX_POINTS,
      includeStats: true,
      signal: options?.signal,
      timeout: options?.timeout,
    });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    // 旧版后端没有 public metric API，或新版接口暂时失败时回退兼容记录接口。
    warnDegradedOnce("ping-records", "Ping metrics 查询失败,已回退兼容记录接口");
  }

  try {
    const maxCount = getRecordsMaxCount(hours, PING_RECORDS_PER_HOUR);
    const payload = await rpcCall(
      "common:getRecords",
      {
        uuid,
        hours,
        type: "ping",
        maxCount,
      },
      RpcRecordsSchema,
      options,
    );
    return normalizeRpcPingRecords(uuid, payload, requestRange);
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    const legacy = (await apiGet(
      `/api/records/ping?${new URLSearchParams({ uuid, hours: String(hours) })}`,
      z.object({
        count: z.number().default(0),
        records: z.array(PingRecordSchema).default([]),
        tasks: z.array(PingTaskSchema).default([]),
      }),
      options,
    )) as PingRecordsResponse;
    return {
      ...legacy,
      ...requestRange,
    };
  }
}

export async function getAdminPingTasks(options?: ApiCallOptions): Promise<PingTask[]> {
  return (await apiGet("/api/admin/ping", z.array(PingTaskSchema), options)) as PingTask[];
}

export async function saveThemeSettings(
  theme: string,
  settings: Record<string, unknown>,
): Promise<void> {
  const resp = await fetchWithTimeout(
    `/api/admin/theme/settings?theme=${encodeURIComponent(theme)}`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    },
    DEFAULT_API_TIMEOUT_MS,
  );

  if (!resp.ok) {
    let message = `Request /api/admin/theme/settings failed: ${resp.status}`;
    try {
      const json = (await resp.json()) as { message?: string };
      if (json?.message) {
        message = json.message;
      }
    } catch {
      // body 不是 JSON 时保留兜底错误信息。
    }
    throw new ApiRequestError(message, resp.status, "/api/admin/theme/settings");
  }
}

export async function getPingOverview(
  hours = 1,
  taskId?: number,
  options?: { signal?: AbortSignal; entityIds?: string[] },
): Promise<PingOverviewResponse> {
  const requestRange = createRequestRange(hours);
  try {
    return await getPingMetricData({
      hours,
      entityIds: options?.entityIds,
      taskId,
      maxPoints: OVERVIEW_METRIC_MAX_POINTS,
      includeStats: true,
      repairBoundary: true,
      signal: options?.signal,
    });
  } catch (error) {
    if (options?.signal?.aborted) throw error;
    // 旧版后端没有 public metric API 时继续走原有记录接口。
    warnDegradedOnce("ping-overview", "Ping overview metrics 查询失败,已回退兼容记录接口");
  }

  try {
    const payload = await rpcCall(
      "common:getRecords",
      {
        hours,
        type: "ping",
        ...(taskId != null ? { task_id: taskId } : {}),
        maxCount: OVERVIEW_PING_MAX_COUNT,
      },
      RpcRecordsSchema,
      { signal: options?.signal },
    );
    return normalizeRpcPingOverview(payload, requestRange);
  } catch {
    // 先判取消再判参数,避免把 abort 误报成缺 task_id。
    if (options?.signal?.aborted) {
      throw options.signal.reason ?? new DOMException("Aborted", "AbortError");
    }
    if (taskId == null) {
      throw new Error("Ping overview fallback requires a concrete task_id");
    }

    const data = await apiGet(
      `/api/records/ping?${new URLSearchParams({ task_id: String(taskId), hours: String(hours) })}`,
      z.object({
        records: z.array(PingRecordSchema).default([]),
        tasks: z.array(PingTaskSchema).default([]),
      }),
      { signal: options?.signal },
    );
    return {
      records: data.records,
      tasks: data.tasks,
      ...requestRange,
    } as PingOverviewResponse;
  }
}
