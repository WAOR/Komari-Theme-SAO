import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMinuteClock } from "@/hooks/useClock";
import { useVisibleNodeUuids } from "@/hooks/useNode";
import { useHiddenNodeUuids } from "@/hooks/useVisibleNodes";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { getPingOverview, getPingOverviewStats } from "@/services/api";
import type {
  HomepagePingLine,
  PingOverviewBucket,
  PingOverviewItem,
  PingRecord,
  PingTaskStats,
} from "@/types/komari";
import { withTimeoutSignal } from "@/utils/abort";
import { resolvePingSampleCounts } from "@/utils/pingMetrics";
import {
  HOMEPAGE_MULTI_PING_TASK_COUNT,
  resolveHomepagePingSelections,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import type { NodeViewMode } from "@/utils/themeSettings";

const DEFAULT_PING_REFRESH_INTERVAL = 60_000;
const MIN_PING_REFRESH_INTERVAL = 10_000;
const MAX_PING_REFRESH_INTERVAL = 300_000;
// 首页延迟图表最多显示 24 个 bucket。metric API 返回的是聚合区间而不是瞬时点，
// 绘制时要把较粗的后端区间投影到它覆盖的可视 bucket，同时保持卡片密度一致。
const MAX_VISIBLE_HOMEPAGE_PING_BUCKETS = 24;

const EMPTY_PING: PingOverviewItem = {
  client: "",
  isAssigned: false,
  lastValue: null,
  samples: [],
  max: 1,
  loss: null,
};
const EMPTY_PING_LINES: HomepagePingLine[] = [];
const EMPTY_PING_BUCKETS: PingOverviewBucket[] = [];
const EMPTY_TASK_IDS: number[] = [];
const EMPTY_BINDINGS: HomepagePingTaskBindings = {};

type HomepagePingRequestMode = "single" | "multi";

export function resolveHomepagePingRequestMode(
  viewMode: NodeViewMode,
  multiPingEnabled: boolean,
  multiTaskIds: number[],
): HomepagePingRequestMode {
  return (viewMode === "large" || viewMode === "compact") &&
    multiPingEnabled &&
    multiTaskIds.length === HOMEPAGE_MULTI_PING_TASK_COUNT
    ? "multi"
    : "single";
}

interface PingOverviewMapResult {
  assignmentKey: string;
  intervalMs: number;
  singleItems: Map<string, PingOverviewItem>;
  multiLines: Map<string, HomepagePingLine[]>;
}

type Listener = () => void;

function toTimestamp(value: string | number) {
  if (typeof value === "number") {
    return value > 1_000_000_000_000 ? value : value * 1000;
  }
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeRefreshInterval(seconds: number | null | undefined) {
  if (!Number.isFinite(seconds) || !seconds || seconds <= 0) {
    return DEFAULT_PING_REFRESH_INTERVAL;
  }

  return Math.min(
    MAX_PING_REFRESH_INTERVAL,
    Math.max(MIN_PING_REFRESH_INTERVAL, seconds * 1000),
  );
}

function normalizeVisibleUuids(uuids: string[]) {
  return Array.from(new Set(uuids.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right),
  );
}

function stringifyBindings(bindings: HomepagePingTaskBindings) {
  return JSON.stringify(
    Object.entries(bindings)
      .map(([taskId, clients]) => [taskId, [...clients].sort((left, right) => left.localeCompare(right))])
      .sort(([left], [right]) => Number(left) - Number(right)),
  );
}

function equalSamples(
  a: PingOverviewItem["samples"],
  b: PingOverviewItem["samples"],
) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.time !== b[i]?.time ||
      a[i]?.value !== b[i]?.value ||
      a[i]?.count !== b[i]?.count ||
      a[i]?.loss !== b[i]?.loss
    ) {
      return false;
    }
  }
  return true;
}

function equalPingItem(a: PingOverviewItem | undefined, b: PingOverviewItem | undefined) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.client === b.client &&
    a.isAssigned === b.isAssigned &&
    a.lastValue === b.lastValue &&
    a.metricIntervalMs === b.metricIntervalMs &&
    a.max === b.max &&
    a.loss === b.loss &&
    equalSamples(a.samples, b.samples)
  );
}

function equalPingLine(a: HomepagePingLine | undefined, b: HomepagePingLine | undefined) {
  return (
    a?.taskId === b?.taskId &&
    a?.taskName === b?.taskName &&
    equalPingItem(a, b)
  );
}

export function buildPingOverviewItems(
  taskId: number,
  records: PingRecord[],
  metricStats: PingTaskStats[] = [],
  metricIntervalSeconds?: number,
) {
  const metricIntervalMs =
    typeof metricIntervalSeconds === "number" &&
    Number.isFinite(metricIntervalSeconds) &&
    metricIntervalSeconds > 0
      ? metricIntervalSeconds * 1000
      : undefined;
  const selectedRecords = records.filter((record) => record.task_id === taskId);
  const grouped = new Map<string, Array<(typeof selectedRecords)[number]>>();
  const lossStatsByClient = new Map<string, { total: number; lost: number }>();

  for (const record of selectedRecords) {
    if (!record.client) continue;
    const current = grouped.get(record.client);
    if (current) current.push(record);
    else grouped.set(record.client, [record]);

    const stats = lossStatsByClient.get(record.client) ?? { total: 0, lost: 0 };
    const counts = resolvePingSampleCounts(record);
    stats.total += counts.total;
    stats.lost += counts.lost;
    lossStatsByClient.set(record.client, stats);
  }

  const result = new Map<string, PingOverviewItem>();
  const statsByClient = new Map(
    metricStats
      .filter((stat) => stat.taskId === taskId)
      .map((stat) => [stat.client, stat] as const),
  );
  const clients = new Set([...grouped.keys(), ...statsByClient.keys()]);

  for (const client of clients) {
    const clientRecords = grouped.get(client) ?? [];
    const sorted = [...clientRecords].sort(
      (left, right) => toTimestamp(left.time) - toTimestamp(right.time),
    );
    const latestRecord = sorted[sorted.length - 1];
    const samples: PingOverviewItem["samples"] = [];
    let max = 1;

    for (let i = 0; i < sorted.length; i++) {
      const record = sorted[i];
      const value = record.value;
      const time = toTimestamp(record.time);
      if (time > 0) {
        samples.push({
          time,
          value,
          count: "count" in record && typeof record.count === "number" ? record.count : undefined,
          loss: "loss" in record && typeof record.loss === "number" ? record.loss : undefined,
        });
      }
      if (value > max) {
        max = value;
      }
    }

    const lossStats = lossStatsByClient.get(client);
    const serverStats = statsByClient.get(client);
    result.set(client, {
      client,
      isAssigned: true,
      lastValue:
        serverStats?.latest ??
        (latestRecord && latestRecord.value >= 0 ? latestRecord.value : null),
      metricIntervalMs,
      samples,
      max: serverStats?.max ?? max,
      loss:
        serverStats?.loss ??
        (lossStats?.total ? (lossStats.lost / lossStats.total) * 100 : null),
    });
  }

  return result;
}

function buildAssignmentKey(selectedTaskIdsByClient: Map<string, number[]>) {
  return Array.from(selectedTaskIdsByClient.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([uuid, taskIds]) => `${uuid}:${taskIds.join(",")}`)
    .join("|");
}

// 限制 RPC 与兼容接口组成的整条回退链，避免一次刷新长期占住轮询。
const PING_REQUEST_TIMEOUT_MS = 35_000;

interface PreviousPingOverview {
  assignmentKey: string;
  singleItems: ReadonlyMap<string, PingOverviewItem>;
  multiLines: ReadonlyMap<string, HomepagePingLine[]>;
}

function assignedEmptyPing(client: string): PingOverviewItem {
  return {
    client,
    isAssigned: true,
    lastValue: null,
    samples: [],
    max: 1,
    loss: null,
  };
}

function assignedEmptyLine(
  client: string,
  taskId: number,
  taskName = `任务 #${taskId}`,
): HomepagePingLine {
  return {
    taskId,
    taskName,
    ...assignedEmptyPing(client),
  };
}

function mergePingOverviewStats(
  taskId: number,
  entityIds: string[],
  localStats: PingTaskStats[] | undefined,
  batchedStats: PingTaskStats[],
) {
  const allowedClients = new Set(entityIds);
  const merged = new Map<string, PingTaskStats>();
  for (const stat of localStats ?? []) {
    if (stat.taskId === taskId && allowedClients.has(stat.client)) {
      merged.set(stat.client, stat);
    }
  }
  // 批量接口包含更完整的分位数与标准差，应覆盖 records 本地推导出的同节点统计。
  for (const stat of batchedStats) {
    if (stat.taskId === taskId && allowedClients.has(stat.client)) {
      merged.set(stat.client, stat);
    }
  }
  return [...merged.values()];
}

export async function buildPingOverviewMap(
  hours: number,
  clientUuids: string[],
  bindings: HomepagePingTaskBindings,
  multiTaskIds: number[],
  signal?: AbortSignal,
  previous?: PreviousPingOverview,
  loadOverview: typeof getPingOverview = getPingOverview,
  loadStats?: typeof getPingOverviewStats,
): Promise<PingOverviewMapResult> {
  const normalizedUuids = normalizeVisibleUuids(clientUuids);
  if (normalizedUuids.length === 0) {
    return {
      assignmentKey: "",
      intervalMs: DEFAULT_PING_REFRESH_INTERVAL,
      singleItems: new Map<string, PingOverviewItem>(),
      multiLines: new Map<string, HomepagePingLine[]>(),
    };
  }

  const {
    singleTaskIdsByClient,
    multiTaskIdsByClient,
    requestedTaskIdsByClient,
  } = resolveHomepagePingSelections(
    normalizedUuids,
    bindings,
    multiTaskIds,
  );
  const selectedTaskIds = Array.from(
    new Set(Array.from(requestedTaskIdsByClient.values()).flat()),
  ).sort((left, right) => left - right);
  const assignmentKey = [
    `single:${buildAssignmentKey(singleTaskIdsByClient)}`,
    `multi:${buildAssignmentKey(multiTaskIdsByClient)}`,
  ].join("|");

  if (selectedTaskIds.length === 0) {
    return {
      assignmentKey: "",
      intervalMs: DEFAULT_PING_REFRESH_INTERVAL,
      singleItems: new Map<string, PingOverviewItem>(),
      multiLines: new Map<string, HomepagePingLine[]>(),
    };
  }

  const batchStatsLoader =
    loadStats ?? (loadOverview === getPingOverview ? getPingOverviewStats : null);
  const batchStatsRequest = batchStatsLoader
    ? withTimeoutSignal(
        (requestSignal) =>
          batchStatsLoader(hours, selectedTaskIds, {
            signal: requestSignal,
            entityIds: normalizedUuids,
          }),
        PING_REQUEST_TIMEOUT_MS,
        signal,
      ).catch(() => [])
    : Promise.resolve([] as PingTaskStats[]);
  const overviewRequest = Promise.allSettled(
    selectedTaskIds.map((taskId) =>
      withTimeoutSignal(
        async (requestSignal) => {
          const entityIds = normalizedUuids.filter(
            (uuid) => requestedTaskIdsByClient.get(uuid)?.includes(taskId),
          );
          return {
            taskId,
            entityIds,
            overview: await loadOverview(hours, taskId, {
              signal: requestSignal,
              entityIds,
              includeStats: batchStatsLoader == null,
            }),
          };
        },
        PING_REQUEST_TIMEOUT_MS,
        signal,
      ),
    ),
  );
  const [batchedStats, overviewResults] = await Promise.all([
    batchStatsRequest,
    overviewRequest,
  ]);

  const itemsByTask = new Map<number, Map<string, PingOverviewItem>>();
  const taskNames = new Map<number, string>();
  const successfulTaskIds = new Set<number>();
  const refreshIntervals: number[] = [];

  for (const result of overviewResults) {
    if (result.status !== "fulfilled") {
      continue;
    }

    const {
      taskId,
      entityIds,
      overview: { records, tasks, stats, intervalSeconds },
    } = result.value;
    const effectiveStats = mergePingOverviewStats(
      taskId,
      entityIds,
      stats,
      batchedStats,
    );
    successfulTaskIds.add(taskId);
    const taskName =
      tasks.find((task) => task.id === taskId)?.name ||
      effectiveStats.find((stat) => stat.taskId === taskId)?.name;
    if (taskName) taskNames.set(taskId, taskName);
    itemsByTask.set(
      taskId,
      buildPingOverviewItems(taskId, records, effectiveStats, intervalSeconds),
    );

    const taskInterval =
      tasks.find((task) => task.id === taskId)?.interval ??
      effectiveStats.find((stat) => stat.taskId === taskId)?.interval;
    refreshIntervals.push(normalizeRefreshInterval(taskInterval));
  }

  const singleItems = new Map<string, PingOverviewItem>();
  for (const [uuid, taskIds] of singleTaskIdsByClient) {
    const taskId = taskIds[0];
    if (taskId == null) continue;
    const previousItem =
      previous?.assignmentKey === assignmentKey
        ? previous.singleItems.get(uuid)
        : undefined;
    if (!successfulTaskIds.has(taskId)) {
      singleItems.set(uuid, previousItem ?? assignedEmptyPing(uuid));
      continue;
    }
    singleItems.set(
      uuid,
      itemsByTask.get(taskId)?.get(uuid) ?? assignedEmptyPing(uuid),
    );
  }

  const multiLines = new Map<string, HomepagePingLine[]>();
  for (const [uuid, taskIds] of multiTaskIdsByClient) {
    const previousLines =
      previous?.assignmentKey === assignmentKey
        ? previous.multiLines.get(uuid)
        : undefined;
    const clientLines = taskIds.map((taskId) => {
      const previousLine = previousLines?.find((line) => line.taskId === taskId);
      if (!successfulTaskIds.has(taskId)) {
        return previousLine ?? assignedEmptyLine(uuid, taskId);
      }
      const taskName = taskNames.get(taskId) ?? previousLine?.taskName ?? `任务 #${taskId}`;
      const item = itemsByTask.get(taskId)?.get(uuid) ?? assignedEmptyPing(uuid);
      return { taskId, taskName, ...item };
    });
    multiLines.set(uuid, clientLines);
  }

  return {
    assignmentKey,
    intervalMs:
      refreshIntervals.length > 0
        ? Math.min(...refreshIntervals)
        : DEFAULT_PING_REFRESH_INTERVAL,
    singleItems,
    multiLines,
  };
}

interface PingOverviewStoreState {
  assignmentKey: string;
  intervalMs: number;
  singleItems: Map<string, PingOverviewItem>;
  multiLines: Map<string, HomepagePingLine[]>;
}

let pingOverviewState: PingOverviewStoreState = {
  assignmentKey: "",
  intervalMs: DEFAULT_PING_REFRESH_INTERVAL,
  singleItems: new Map(),
  multiLines: new Map(),
};
let scheduledVisibleUuids: string[] = [];
let scheduledVisibleKey = "";
let scheduledBindings: HomepagePingTaskBindings = {};
let scheduledMultiTaskIds: number[] = [];
let scheduledSelectionKey = `${stringifyBindings({})}|multi:`;
let pingRefreshInFlight = false;
let pingRefreshTimer: number | null = null;
let pingAbortController: AbortController | null = null;
let activeConsumers = 0;
// HMR dispose 后置真:阻止 in-flight 请求的 finally 恢复逻辑在旧模块实例上复活轮询。
let pingPollingDisposed = false;
const pingListeners = new Map<string, Set<Listener>>();

function schedulePingRefresh(intervalMs: number) {
  if (pingRefreshTimer != null) {
    window.clearTimeout(pingRefreshTimer);
    pingRefreshTimer = null;
  }
  // 没有组件消费 overview 时就停止轮询。等有消费者再次挂载时，
  // 由 ensurePingOverviewStarted 重新启动整条链路。
  if (pingPollingDisposed || activeConsumers <= 0) return;
  pingRefreshTimer = window.setTimeout(() => {
    pingRefreshTimer = null;
    void refreshPingOverview();
  }, intervalMs);
}

function stopPingPolling() {
  if (pingRefreshTimer != null) {
    window.clearTimeout(pingRefreshTimer);
    pingRefreshTimer = null;
  }
  // 中止进行中的 refresh（如果有），让它的请求和带宽在 teardown 时立刻释放；
  // refreshPingOverview 会把已 abort 的 signal 当成非当前，跳过 commit/重新调度。
  if (pingAbortController) {
    pingAbortController.abort();
    pingAbortController = null;
  }
}

function commitPingOverview(
  assignmentKey: string,
  intervalMs: number,
  singleItems: Map<string, PingOverviewItem>,
  multiLines: Map<string, HomepagePingLine[]>,
) {
  const touched = new Set<string>();
  const prevSingleItems = pingOverviewState.singleItems;
  const nextSingleItems = new Map<string, PingOverviewItem>();
  const singleKeys = new Set<string>([
    ...prevSingleItems.keys(),
    ...singleItems.keys(),
  ]);

  for (const key of singleKeys) {
    const prev = prevSingleItems.get(key);
    const next = singleItems.get(key);
    if (!next) {
      if (prev) touched.add(key);
      continue;
    }
    if (equalPingItem(prev, next)) {
      nextSingleItems.set(key, prev ?? next);
      continue;
    }
    nextSingleItems.set(key, next);
    touched.add(key);
  }

  const prevMultiLines = pingOverviewState.multiLines;
  const nextMultiLines = new Map<string, HomepagePingLine[]>();
  const multiKeys = new Set<string>([
    ...prevMultiLines.keys(),
    ...multiLines.keys(),
  ]);

  for (const key of multiKeys) {
    const prev = prevMultiLines.get(key);
    const next = multiLines.get(key);

    if (!next) {
      // buildPingOverviewMap 对每个被选中的 client 都会产出占位项，所以一个 key 缺失只可能是该
      // client 离开了选择集（assignmentKey 必然随之改变）。直接丢弃旧条目并通知订阅者。
      if (prev) touched.add(key);
      continue;
    }

    const stable = next.map((line, index) =>
      equalPingLine(prev?.[index], line) ? (prev?.[index] ?? line) : line,
    );
    const unchanged =
      prev?.length === stable.length &&
      stable.every((line, index) => line === prev[index]);
    if (unchanged && prev) {
      nextMultiLines.set(key, prev);
      continue;
    }

    nextMultiLines.set(key, stable);
    touched.add(key);
  }

  if (
    pingOverviewState.assignmentKey === assignmentKey &&
    pingOverviewState.intervalMs === intervalMs &&
    touched.size === 0 &&
    nextSingleItems.size === prevSingleItems.size &&
    nextMultiLines.size === prevMultiLines.size
  ) {
    return;
  }

  pingOverviewState = {
    assignmentKey,
    intervalMs,
    singleItems: nextSingleItems,
    multiLines: nextMultiLines,
  };

  for (const key of touched) {
    const listeners = pingListeners.get(key);
    if (!listeners) continue;
    for (const listener of listeners) listener();
  }
}

async function refreshPingOverview() {
  if (pingPollingDisposed || pingRefreshInFlight) return;

  pingRefreshInFlight = true;
  const visibleKey = scheduledVisibleKey;
  const selectionKey = scheduledSelectionKey;
  const controller = new AbortController();
  pingAbortController = controller;
  const { signal } = controller;
  // 判断当前请求是否仍然有效（没被 stopPingPolling 中止，
  // 且 visible/binding 分配在执行期间没有被改掉）。
  const isCurrent = () =>
    !signal.aborted &&
    visibleKey === scheduledVisibleKey &&
    selectionKey === scheduledSelectionKey;

  try {
    if (scheduledVisibleUuids.length === 0) {
      commitPingOverview(
        "",
        DEFAULT_PING_REFRESH_INTERVAL,
        new Map(),
        new Map(),
      );
      return;
    }

    const next = await buildPingOverviewMap(
      1,
      scheduledVisibleUuids,
      scheduledBindings,
      scheduledMultiTaskIds,
      signal,
      pingOverviewState,
    );
    if (isCurrent()) {
      commitPingOverview(
        next.assignmentKey,
        next.intervalMs,
        next.singleItems,
        next.multiLines,
      );
      schedulePingRefresh(next.intervalMs);
    }
  } catch {
    if (isCurrent()) {
      schedulePingRefresh(DEFAULT_PING_REFRESH_INTERVAL);
    }
  } finally {
    pingRefreshInFlight = false;
    if (pingAbortController === controller) pingAbortController = null;
    // 只要消费者还想轮询但队列里没有任务，就恢复轮询。这覆盖了执行中途 assignment
    // 变化（上面那次跑会跳过 commit）以及 abort/重新挂载竞态（如 StrictMode:
    // mount→stop(abort)→mount），后者里被 abort 的那次不能负责重新调度。成功或失败
    // 的一次已经设过 timer，所以稳态下这里是 no-op。
    if (
      activeConsumers > 0 &&
      scheduledVisibleUuids.length > 0 &&
      pingRefreshTimer == null
    ) {
      void refreshPingOverview();
    }
  }
}

function ensurePingOverviewStarted(
  visibleUuids: string[],
  bindings: HomepagePingTaskBindings,
  multiTaskIds: number[],
) {
  const normalizedVisibleUuids = normalizeVisibleUuids(visibleUuids);
  const visibleKey = normalizedVisibleUuids.join("|");
  const selectionKey = `${stringifyBindings(bindings)}|multi:${multiTaskIds.join(",")}`;

  if (
    scheduledVisibleKey !== visibleKey ||
    scheduledSelectionKey !== selectionKey
  ) {
    scheduledVisibleUuids = normalizedVisibleUuids;
    scheduledVisibleKey = visibleKey;
    scheduledBindings = bindings;
    scheduledMultiTaskIds = multiTaskIds;
    scheduledSelectionKey = selectionKey;

    pingAbortController?.abort();

    if (pingRefreshTimer != null) {
      window.clearTimeout(pingRefreshTimer);
      pingRefreshTimer = null;
    }
    void refreshPingOverview();
    return;
  }

  // 只要没有待处理请求、也没有已调度的 tick 就重启——这同时覆盖首次挂载
  // 和轮询被停止后的恢复。
  if (
    normalizedVisibleUuids.length > 0 &&
    !pingRefreshInFlight &&
    pingRefreshTimer == null
  ) {
    void refreshPingOverview();
  }
}

function subscribeToPingItem(uuid: string, listener: Listener) {
  let listeners = pingListeners.get(uuid);
  if (!listeners) {
    listeners = new Set();
    pingListeners.set(uuid, listeners);
  }
  listeners.add(listener);

  return () => {
    listeners?.delete(listener);
    if (listeners && listeners.size === 0) {
      pingListeners.delete(uuid);
    }
  };
}

function getPingSnapshot(uuid: string) {
  return pingOverviewState.singleItems.get(uuid) ?? EMPTY_PING;
}

function getPingLinesSnapshot(uuid: string) {
  return pingOverviewState.multiLines.get(uuid) ?? EMPTY_PING_LINES;
}

export function useHomepagePingOverview(viewMode: NodeViewMode) {
  const { data: me } = useAuth();
  const visibleUuids = useVisibleNodeUuids(me?.logged_in === true);
  const themeSettings = useThemeSettings();

  // 主题级隐藏节点首页已不渲染,这里也从 overview 拉取里剔除——否则仍会为其绑定的
  // ping 任务发请求、做聚合,纯属无效网络/计算开销。
  const hiddenUuids = useHiddenNodeUuids();
  const effectiveUuids = useMemo(
    () =>
      hiddenUuids.size > 0
        ? visibleUuids.filter((uuid) => !hiddenUuids.has(uuid))
        : visibleUuids,
    [visibleUuids, hiddenUuids],
  );
  const requestMode = resolveHomepagePingRequestMode(
    viewMode,
    themeSettings.enableHomepageMultiPing,
    themeSettings.homepageMultiPingTaskIds,
  );
  const requestedBindings =
    requestMode === "single"
      ? themeSettings.homepagePingBindings
      : EMPTY_BINDINGS;
  const requestedMultiTaskIds =
    requestMode === "multi"
      ? themeSettings.homepageMultiPingTaskIds
      : EMPTY_TASK_IDS;

  useEffect(() => {
    if (!themeSettings.isReady) return;
    activeConsumers += 1;
    ensurePingOverviewStarted(
      effectiveUuids,
      requestedBindings,
      requestedMultiTaskIds,
    );
    return () => {
      activeConsumers -= 1;
      if (activeConsumers <= 0) {
        activeConsumers = 0;
        stopPingPolling();
      }
    };
  }, [
    effectiveUuids,
    requestMode,
    requestedBindings,
    requestedMultiTaskIds,
    themeSettings.isReady,
  ]);
}

export function useNodePingOverview(
  uuid: string,
  enabled = true,
): PingOverviewItem {
  const subscribe = useCallback(
    (cb: Listener) =>
      uuid && enabled ? subscribeToPingItem(uuid, cb) : () => undefined,
    [enabled, uuid],
  );
  const getSnapshot = useCallback(
    () => (uuid && enabled ? getPingSnapshot(uuid) : EMPTY_PING),
    [enabled, uuid],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useNodePingOverviewLines(
  uuid: string,
  enabled = true,
): HomepagePingLine[] {
  const subscribe = useCallback(
    (cb: Listener) =>
      uuid && enabled ? subscribeToPingItem(uuid, cb) : () => undefined,
    [enabled, uuid],
  );
  const getSnapshot = useCallback(
    () => (uuid && enabled ? getPingLinesSnapshot(uuid) : EMPTY_PING_LINES),
    [enabled, uuid],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function buildPingBuckets(
  ping: Pick<PingOverviewItem, "samples" | "metricIntervalMs">,
  count?: number,
  now = Date.now(),
): PingOverviewBucket[] {
  const totalWindowMs = 60 * 60 * 1000;
  const requestedCount = count ?? MAX_VISIBLE_HOMEPAGE_PING_BUCKETS;
  const boundedRequestedCount =
    Number.isFinite(requestedCount) && requestedCount > 0
      ? Math.min(240, Math.max(1, Math.round(requestedCount)))
      : MAX_VISIBLE_HOMEPAGE_PING_BUCKETS;
  const metricIntervalMs =
    typeof ping.metricIntervalMs === "number" &&
    Number.isFinite(ping.metricIntervalMs) &&
    ping.metricIntervalMs > 0
      ? ping.metricIntervalMs
      : 0;
  const resolvedCount = boundedRequestedCount;
  const bucketMs = totalWindowMs / resolvedCount;
  const windowStart = now - totalWindowMs;
  const totals = new Array<number>(resolvedCount).fill(0);
  const losts = new Array<number>(resolvedCount).fill(0);
  const positiveSums = new Array<number>(resolvedCount).fill(0);
  const positiveCounts = new Array<number>(resolvedCount).fill(0);

  const addSampleToBucket = (
    bucketIndex: number,
    sample: PingOverviewItem["samples"][number],
  ) => {
    const { total: sampleCount, lost: sampleLost, valid: sampleValid } =
      resolvePingSampleCounts(sample);

    totals[bucketIndex] += sampleCount;
    losts[bucketIndex] += sampleLost;
    // 聚合点的 value 已由 metric 适配层恢复为“成功样本均值”，这里按 valid count
    // 加权；旧接口/模拟数据没有 count，仍等价于单样本累加。
    if (sample.value >= 0 && sampleValid > 0) {
      positiveSums[bucketIndex] += sample.value * sampleValid;
      positiveCounts[bucketIndex] += sampleValid;
    }
  };

  for (const sample of ping.samples ?? []) {
    if (metricIntervalMs > bucketMs) {
      const sampleEnd = sample.time + metricIntervalMs;
      if (sampleEnd <= windowStart || sample.time > now) continue;

      // 后端时间戳是聚合桶起点。以每个可视 bucket 的中点判断它属于哪个
      // 聚合区间，相当于对粗粒度数据做 sample-and-hold：不会制造规律性空洞，
      // 也不会因为减少 DOM 数量而让不同节点的柱宽不一致。
      for (let index = 0; index < resolvedCount; index += 1) {
        const midpoint = windowStart + (index + 0.5) * bucketMs;
        if (midpoint >= sample.time && midpoint < sampleEnd) {
          addSampleToBucket(index, sample);
        }
      }
      continue;
    }

    let sampleTime = sample.time;
    if (metricIntervalMs > 0) {
      const sampleEnd = sample.time + metricIntervalMs;
      if (sampleEnd <= windowStart || sample.time > now) continue;
      const overlapStart = Math.max(sample.time, windowStart);
      const overlapEnd = Math.min(sampleEnd, now);
      if (overlapEnd < overlapStart) continue;
      sampleTime = overlapStart + (overlapEnd - overlapStart) / 2;
    } else if (sample.time < windowStart || sample.time > now) {
      continue;
    }

    let bucketIndex = Math.floor((sampleTime - windowStart) / bucketMs);
    if (bucketIndex < 0) continue;
    if (bucketIndex >= resolvedCount) bucketIndex = resolvedCount - 1;
    addSampleToBucket(bucketIndex, sample);
  }

  return Array.from({ length: resolvedCount }, (_, index) => {
    const startAt = windowStart + index * bucketMs;
    const endAt = startAt + bucketMs;
    const total = totals[index];
    const lost = Math.round(losts[index]);
    const positiveCount = positiveCounts[index];

    return {
      index,
      value: positiveCount > 0 ? positiveSums[index] / positiveCount : null,
      loss: total > 0 ? (lost / total) * 100 : null,
      total,
      lost,
      startAt,
      endAt,
    };
  });
}

export function usePingBuckets(
  ping: Pick<PingOverviewItem, "samples" | "metricIntervalMs">,
  count?: number,
  enabled = true,
): PingOverviewBucket[] {
  const { samples, metricIntervalMs } = ping;
  // 轮询返回同引用数据时窗口也要随时间前移,否则时间轴最多滞后约 2 个桶;分钟粒度足够
  // (桶宽 ≥150s),也避免每个 ws tick 都重算。
  const now = useMinuteClock(enabled);
  return useMemo(
    () =>
      enabled
        ? buildPingBuckets({ samples, metricIntervalMs }, count, now)
        : EMPTY_PING_BUCKETS,
    [count, enabled, metricIntervalMs, now, samples],
  );
}

// 模块级定时器/请求在热更新时必须停掉,否则新旧两个模块实例会并行轮询。
// disposed 标志 + 清零消费者计数:in-flight 请求的 finally 恢复逻辑不会再重启旧模块的轮询。
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    pingPollingDisposed = true;
    activeConsumers = 0;
    stopPingPolling();
  });
}
