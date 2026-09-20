import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Grid3x3,
  ImageIcon,
  LayoutTemplate,
  LayoutGrid,
  List,
  ListFilter,
  Moon,
  RefreshCw,
  Rows3,
  Activity,
  Save,
  Search,
  Square,
  Sun,
  SunMoon,
  Video,
  Wallpaper,
} from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { Flag } from "@/components/ui/Flag";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useHourlyClock } from "@/hooks/useClock";
import { queryClient } from "@/services/queryClient";
import {
  ApiRequestError,
  getAdminClients,
  getAdminPingTasks,
  getNodes,
  saveThemeSettings,
} from "@/services/api";
import type { AdminClient, PingTask, ThemeSettings } from "@/types/komari";
import {
  DEFAULT_BACKGROUND_VIDEO_URL,
  type BackgroundPosition,
  type BackgroundSize,
  normalizeBackgroundAlignment,
  normalizeBackgroundUrl,
  normalizeBackgroundVideoUrl,
  parseBackgroundAlignment,
} from "@/utils/background";
import {
  calculateCostSummary,
  calculateCostPremiumAmount,
  calculateCostPremiumBasisAt,
  formatCnyMoney,
  formatSignedCny,
  getExchangeRates,
  isCostRateApiUrlValid,
  normalizeCostIgnoredNodes,
  normalizeCostPremiums,
  normalizeCostRateApiUrl,
  type CostPremiumEntry,
} from "@/utils/cost";
import { normalizeNodeIdentityList } from "@/utils/nodeIdentity";
import {
  dedupeGroupLabels,
  normalizeHomeGroupOrder,
  sortHomeGroupOptions,
} from "@/utils/homeNodes";
import {
  assignHomepageMultiPingTask,
  HOMEPAGE_MULTI_PING_MAX_COUNT,
  HOMEPAGE_MULTI_PING_MIN_COUNT,
  isHomepageMultiPingConfigured,
  normalizeHomepageMultiPingTaskIds,
  normalizeHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import {
  DEFAULT_THEME_SETTINGS,
  normalizeThemeSettings,
  type BackgroundMediaType,
  type ResolvedThemeSettings,
} from "@/utils/themeSettings";
import {
  getDefaultOverviewRatingLabelText,
  type OverviewRatingKind,
} from "@/utils/overviewRating";
import { HOME_SORT_FIELDS, HOME_SORT_FIELD_LABELS } from "@/utils/homeSort";

const APPEARANCE_OPTIONS = [
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: SunMoon },
  { value: "dark", label: "深色", icon: Moon },
] as const;
const NODE_VIEW_MODE_OPTIONS = [
  { value: "large", label: "大卡片", icon: Square },
  { value: "compact", label: "小卡片", icon: LayoutGrid },
  { value: "mini", label: "迷你卡片", icon: Grid3x3 },
  { value: "list", label: "列表", icon: List },
] as const;
const MOBILE_VIEW_MODE_OPTIONS = NODE_VIEW_MODE_OPTIONS.filter((option) => option.value !== "list");
const BACKGROUND_MEDIA_TYPE_OPTIONS: Array<{
  value: BackgroundMediaType;
  label: string;
  icon: typeof ImageIcon;
}> = [
  { value: "image", label: "图片", icon: ImageIcon },
  { value: "video", label: "视频", icon: Video },
];
const BACKGROUND_SIZE_OPTIONS: Array<{ value: BackgroundSize; label: string }> = [
  { value: "cover", label: "填满" },
  { value: "contain", label: "完整" },
  { value: "auto", label: "原始" },
];
const BACKGROUND_POSITION_OPTIONS: Array<{ value: BackgroundPosition; label: string }> = [
  { value: "top", label: "顶部" },
  { value: "center", label: "居中" },
  { value: "bottom", label: "底部" },
];

function localDateInputMax() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const OVERVIEW_RATING_LABEL_FIELDS: Array<{
  key: OverviewRatingKind;
  title: string;
  toggleKey: "showTrafficRating" | "showBandwidthRating" | "showAssetRating";
  tierHint: string;
}> = [
  {
    key: "traffic",
    title: "今日流量",
    toggleKey: "showTrafficRating",
    tierHint: "对应阶梯：≤10GB、≤50GB、≤200GB、>200GB",
  },
  {
    key: "bandwidth",
    title: "实时带宽",
    toggleKey: "showBandwidthRating",
    tierHint: "对应阶梯：≤1Mbps、≤10Mbps、≤100Mbps、>100Mbps",
  },
  {
    key: "asset",
    title: "资产概览",
    toggleKey: "showAssetRating",
    tierHint: "对应阶梯：≤500元、≤1500元、≤3000元、>3000元",
  },
];

function sortTasks(tasks: PingTask[]) {
  return [...tasks].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    if (left.id !== right.id) return left.id - right.id;
    return left.name.localeCompare(right.name);
  });
}

function buildPremiumEntry(
  amount: number,
  paidCny?: number,
  acquiredAt?: string,
): CostPremiumEntry {
  return {
    amount,
    ...(paidCny != null ? { paidCny } : {}),
    ...(acquiredAt ? { acquiredAt } : {}),
  };
}

function sortClients(clients: AdminClient[]) {
  return [...clients].sort((left, right) => {
    if (left.weight !== right.weight) return left.weight - right.weight;
    return left.name.localeCompare(right.name);
  });
}

function filterClients(clients: AdminClient[], rawKeyword: string) {
  const keyword = rawKeyword.trim().toLowerCase();
  if (!keyword) return clients;
  return clients.filter((client) => {
    const group = String(client.group || "").toLowerCase();
    const region = String(client.region || "").toLowerCase();
    return (
      client.name.toLowerCase().includes(keyword) ||
      client.uuid.toLowerCase().includes(keyword) ||
      group.includes(keyword) ||
      region.includes(keyword)
    );
  });
}

function summarizeNodes(
  uuids: string[],
  clientsById: Map<string, AdminClient>,
) {
  if (uuids.length === 0) return "未绑定节点";
  const names = uuids.map((uuid) => clientsById.get(uuid)?.name || uuid);
  const summary = names.join("、");
  return summary.length > 92 ? `${summary.slice(0, 92)}...` : summary;
}

function pruneBindings(bindings: HomepagePingTaskBindings) {
  const normalized = normalizeHomepagePingTaskBindings(bindings);
  const pruned: HomepagePingTaskBindings = {};

  for (const [taskId, clients] of Object.entries(normalized)) {
    if (clients.length > 0) {
      pruned[taskId] = clients;
    }
  }

  return pruned;
}

function applyClientAssignment(
  bindings: HomepagePingTaskBindings,
  taskId: number,
  clientUuid: string,
  checked: boolean,
) {
  const taskKey = String(taskId);
  const next = pruneBindings(bindings);

  for (const [currentTaskId, clients] of Object.entries(next)) {
    const filtered = clients.filter((uuid) => uuid !== clientUuid);
    if (filtered.length > 0) {
      next[currentTaskId] = filtered;
    } else {
      delete next[currentTaskId];
    }
  }

  if (checked) {
    const selected = next[taskKey] ?? [];
    next[taskKey] = Array.from(new Set([...selected, clientUuid])).sort((left, right) =>
      left.localeCompare(right),
    );
  }

  return next;
}

// 反查:client uuid → 所属 task id(字符串 key)。UI 保证每个 client 最多归属一个
// task,所以简单的后写覆盖 map 就是精确的。下面的「全选可用」reducer 和每次渲染的
// 可选节点过滤共用它,把「某 client 归属哪个 task」的推导收在一处。
function invertBindings(bindings: HomepagePingTaskBindings): Map<string, string> {
  const assignedTaskByClient = new Map<string, string>();
  for (const [taskId, clients] of Object.entries(bindings)) {
    for (const clientUuid of clients) {
      assignedTaskByClient.set(clientUuid, taskId);
    }
  }
  return assignedTaskByClient;
}

function applyAvailableClientAssignments(
  bindings: HomepagePingTaskBindings,
  taskId: number,
  clientUuids: string[],
) {
  const taskKey = String(taskId);
  const next = pruneBindings(bindings);
  const assignedTaskByClient = invertBindings(next);
  const selected = new Set(next[taskKey] ?? []);

  for (const clientUuid of clientUuids) {
    const assignedTaskId = assignedTaskByClient.get(clientUuid);
    if (assignedTaskId && assignedTaskId !== taskKey) continue;
    selected.add(clientUuid);
  }

  if (selected.size > 0) {
    next[taskKey] = [...selected].sort((left, right) => left.localeCompare(right));
  } else {
    delete next[taskKey];
  }

  return next;
}

// 本页托管设置的键清单唯一来源:草稿类型(ThemeDraft)、seed(draftFromSettings)与内容签名
// 都从它派生。新增一项设置只需在这里加一行,再到 JSX 里接 patch()。
// 刻意不标注返回类型:让推断给出全字段必填的具体类型,ThemeDraft 才能安全地 Omit/扩展。
function pickManagedThemeSettings(settings: ResolvedThemeSettings) {
  return {
    defaultAppearance: settings.defaultAppearance,
    desktopNodeViewMode: settings.desktopNodeViewMode,
    mobileNodeViewMode: settings.mobileNodeViewMode,
    homepagePingBindings: settings.homepagePingBindings,
    enableHomepageMultiPing: settings.enableHomepageMultiPing,
    homepageMultiPingTaskIds: settings.homepageMultiPingTaskIds,
    fakePingForUnbound: settings.fakePingForUnbound,
    showHomeOverview: settings.showHomeOverview,
    showGroupTabs: settings.showGroupTabs,
    showRegionBar: settings.showRegionBar,
    showCardGroup: settings.showCardGroup,
    homeGroupOrder: settings.homeGroupOrder,
    enableHomeSort: settings.enableHomeSort,
    homeSortField: settings.homeSortField,
    homeSortDirection: settings.homeSortDirection,
    showCostSummary: settings.showCostSummary,
    showCostSummaryFloatingButton: settings.showCostSummaryFloatingButton,
    showPriceForGuests: settings.showPriceForGuests,
    showOverviewRatings: settings.showOverviewRatings,
    showTrafficRating: settings.showTrafficRating,
    showBandwidthRating: settings.showBandwidthRating,
    showAssetRating: settings.showAssetRating,
    trafficRatingLabels: settings.trafficRatingLabels,
    bandwidthRatingLabels: settings.bandwidthRatingLabels,
    assetRatingLabels: settings.assetRatingLabels,
    compactShowTrafficTotal: settings.compactShowTrafficTotal,
    compactShowBilling: settings.compactShowBilling,
    compactShowUptime: settings.compactShowUptime,
    showConnections: settings.showConnections,
    showTodayTrafficPopover: settings.showTodayTrafficPopover,
    hiddenNodes: settings.hiddenNodes,
    costIgnoredNodes: settings.costIgnoredNodes,
    // 按键排序:costPremiums 的键序随编辑历史漂移(删掉再加回同一键会排到最后),而 dirty /
    // reseed 判断都走 JSON.stringify 签名——不排序会把"内容相同、键序不同"误判成有未保存改动。
    costPremiums: Object.fromEntries(
      Object.keys(settings.costPremiums)
        .sort()
        .map((uuid) => [uuid, settings.costPremiums[uuid]]),
    ),
    costRateApiUrl: settings.costRateApiUrl,
    enableBackgroundImage: settings.enableBackgroundImage,
    backgroundMediaType: settings.backgroundMediaType,
    backgroundImage: settings.backgroundImage,
    backgroundImageMobile: settings.backgroundImageMobile,
    backgroundVideo: settings.backgroundVideo,
    backgroundVideoDark: settings.backgroundVideoDark,
    backgroundAlignment: settings.backgroundAlignment,
    surfaceOpacity: settings.surfaceOpacity,
  };
}

function managedSettingsSignature(settings: ThemeSettings & Record<string, unknown>) {
  return JSON.stringify(pickManagedThemeSettings(normalizeThemeSettings(settings)));
}

type ManagedThemeSettings = ReturnType<typeof pickManagedThemeSettings>;

// 表单草稿:与托管设置同名同构,仅三处以「编辑态」存储——隐藏/忽略列表在表单里是多行文本
// (提交时再归一化回数组),三个评级名称合成按 kind 索引的对象(UI 按 OVERVIEW_RATING_LABEL_FIELDS
// 循环渲染)。其余字段直接透传,不维护第二份键清单。
type ThemeDraft = Omit<
  ManagedThemeSettings,
  | "hiddenNodes"
  | "costIgnoredNodes"
  | "trafficRatingLabels"
  | "bandwidthRatingLabels"
  | "assetRatingLabels"
> & {
  ratingLabels: Record<OverviewRatingKind, string>;
  hiddenNodesText: string;
  costIgnoredText: string;
};

// 服务端设置 → 表单草稿。reseed effect 和重置按钮都经 seedDrafts 走这里。
function draftFromSettings(settings: ResolvedThemeSettings): ThemeDraft {
  const {
    hiddenNodes,
    costIgnoredNodes,
    trafficRatingLabels,
    bandwidthRatingLabels,
    assetRatingLabels,
    ...rest
  } = pickManagedThemeSettings(settings);
  return {
    ...rest,
    ratingLabels: {
      traffic: trafficRatingLabels,
      bandwidth: bandwidthRatingLabels,
      asset: assetRatingLabels,
    },
    hiddenNodesText: hiddenNodes.join("\n"),
    costIgnoredText: costIgnoredNodes.join("\n"),
  };
}

type BooleanDraftKey = {
  [K in keyof ThemeDraft]: ThemeDraft[K] extends boolean ? K : never;
}[keyof ThemeDraft];

// 统一的「标题 + 说明 + 开关」行。memo + 稳定的 patch 引用:编辑无关字段的击键不再重渲这些行。
const ToggleRow = memo(function ToggleRow({
  field,
  title,
  desc,
  checked,
  onPatch,
}: {
  field: BooleanDraftKey;
  title: string;
  desc: string;
  checked: boolean;
  onPatch: (key: BooleanDraftKey, value: boolean) => void;
}) {
  return (
    <label className="surface-inset flex items-center justify-between gap-3 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-(--text-primary)">{title}</span>
        <span className="mt-1 block text-[11px] text-(--text-tertiary)">{desc}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onPatch(field, event.target.checked)}
        className="h-4 w-4 shrink-0 accent-(--accent-500)"
      />
    </label>
  );
});

function SettingSelect({
  wrapperClassName,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"select"> & { wrapperClassName?: string }) {
  return (
    <div className={clsx("setting-select", wrapperClassName)}>
      <select
        {...props}
        className={clsx(
          "surface-inset text-[13px] text-(--text-primary) outline-none",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown size={14} className="setting-select-icon" aria-hidden />
    </div>
  );
}

type ThemeTabId = "appearance" | "home" | "card" | "cost" | "ping";

const THEME_TABS: ReadonlyArray<{
  id: ThemeTabId;
  label: string;
  hint: string;
  icon: typeof LayoutTemplate;
}> = [
  { id: "appearance", label: "外观", hint: "外观、视图、背景媒体、透明度", icon: LayoutTemplate },
  { id: "home", label: "首页", hint: "总览、分组、排序、隐藏节点", icon: ListFilter },
  { id: "card", label: "卡片", hint: "卡片上显示哪些信息与悬浮窗", icon: Rows3 },
  { id: "cost", label: "花费", hint: "资产统计与收购溢价", icon: CircleDollarSign },
  { id: "ping", label: "延迟", hint: "多线路与逐节点指定", icon: Activity },
];

const DEFAULT_THEME_TAB: ThemeTabId = "appearance";

function isThemeTabId(value: string | null): value is ThemeTabId {
  return value != null && THEME_TABS.some((tab) => tab.id === value);
}

const BODY_BOTTOM_GAP = 2;
const MIN_BODY_HEIGHT = 320;

const EMPTY_ASSIGNED_CLIENTS: string[] = [];
const EMPTY_ADMIN_CLIENTS: AdminClient[] = [];

// 单个 Ping 任务的绑定卡片。memo:编辑无关设置的击键不再重渲任务列表;展开态的
// tasks×clients 复选网格只在绑定/搜索/展开变化时重算。
const TaskBindingSection = memo(function TaskBindingSection({
  task,
  assigned,
  expanded,
  clientsById,
  visibleClients,
  assignedTaskByClientUuid,
  nodeSearch,
  onNodeSearch,
  onToggleExpand,
  onPatchBindings,
}: {
  task: PingTask;
  assigned: string[];
  expanded: boolean;
  clientsById: Map<string, AdminClient>;
  visibleClients: AdminClient[];
  assignedTaskByClientUuid: Map<string, string>;
  nodeSearch: string;
  onNodeSearch: (value: string) => void;
  onToggleExpand: (taskId: number) => void;
  onPatchBindings: (
    updater: (prev: HomepagePingTaskBindings) => HomepagePingTaskBindings,
  ) => void;
}) {
  const assignedSummary = summarizeNodes(assigned, clientsById);
  // 过滤只有展开的任务需要;收起的卡片跳过,搜索输入不再对每个任务做 O(clients) 扫描。
  const selectableVisibleClients = expanded
    ? visibleClients.filter((client) => {
        const assignedTaskId = assignedTaskByClientUuid.get(client.uuid);
        return !assignedTaskId || assignedTaskId === String(task.id);
      })
    : EMPTY_ADMIN_CLIENTS;
  const allVisibleSelectableAssigned =
    selectableVisibleClients.length > 0 &&
    selectableVisibleClients.every((client) => assigned.includes(client.uuid));
  return (
    <section className="surface-inset px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-semibold text-(--text-primary)">
              {task.name || `任务 #${task.id}`}
            </h3>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-(--text-tertiary)">
              {task.type || "icmp"}
            </span>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
              {task.interval}s
            </span>
            <span className="rounded-full border border-(--hairline) px-2 py-0.5 text-[10px] font-medium text-(--text-tertiary)">
              ID {task.id}
            </span>
          </div>
          <div className="mt-2 text-[12px] text-(--text-secondary)">
            <span className="font-medium text-(--text-primary)">
              已绑定 {assigned.length} 个节点
            </span>
            <span className="mx-2 text-(--text-tertiary)">·</span>
            <span title={task.target || ""}>{task.target || "未填写目标"}</span>
          </div>
          <p className="mt-2 text-[12px] text-(--text-tertiary)" title={assignedSummary}>
            {assignedSummary}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {expanded && (
            <button
              type="button"
              disabled={selectableVisibleClients.length === 0 || allVisibleSelectableAssigned}
              onClick={() => {
                onPatchBindings((prev) =>
                  applyAvailableClientAssignments(
                    prev,
                    task.id,
                    selectableVisibleClients.map((client) => client.uuid),
                  ),
                );
              }}
              className="theme-manage-button is-compact"
            >
              {allVisibleSelectableAssigned ? "已全选可用" : "全选可用"}
            </button>
          )}
          {assigned.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onPatchBindings((prev) => {
                  const next = { ...prev };
                  delete next[String(task.id)];
                  return pruneBindings(next);
                });
              }}
              className="theme-manage-button is-compact is-danger"
            >
              清空节点
            </button>
          )}
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => onToggleExpand(task.id)}
            className="theme-manage-button is-compact"
          >
            {expanded ? "收起节点" : "编辑节点"}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="mt-4 border-t border-(--hairline) pt-4">
          <label className="surface-inset flex items-center gap-2 px-3 py-2">
            <Search size={14} className="text-(--text-tertiary)" />
            <input
              value={nodeSearch}
              onChange={(event) => onNodeSearch(event.target.value)}
              placeholder="搜索节点名称 / UUID / 分组 / 地区"
              aria-label="搜索节点"
              className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--text-tertiary)"
            />
          </label>

          <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {visibleClients.map((client) => {
              const checked = assigned.includes(client.uuid);
              const subtitle = [client.group, client.uuid].filter(Boolean).join(" · ");
              return (
                <label
                  key={client.uuid}
                  className={clsx(
                    "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 transition-colors",
                    checked
                      ? "border-(--border-strong) bg-[color-mix(in_srgb,var(--hover-bg)_72%,transparent)]"
                      : "border-(--hairline) bg-transparent hover:bg-(--hover-bg)",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const nextChecked = event.target.checked;
                      onPatchBindings((prev) =>
                        applyClientAssignment(prev, task.id, client.uuid, nextChecked),
                      );
                    }}
                    className="mt-1 h-4 w-4 shrink-0 accent-(--accent-500)"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Flag region={client.region} size={14} />
                      <span className="truncate text-[13px] font-medium text-(--text-primary)">
                        {client.name}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] text-(--text-tertiary)">
                      {subtitle || client.region || "未设置分组"}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
});

type PremiumDetail = ReturnType<typeof calculateCostSummary>["details"][number];

// 溢价录入列表。memo:编辑其他设置的击键不重渲整表——引用变化只来自
// costPremiums 切片、搜索结果与汇率加载态。
const PremiumList = memo(function PremiumList({
  clients,
  costPremiums,
  detailByUuid,
  rateLoading,
  acquiredAtMax,
  onPatchPaid,
  onPatchAcquiredAt,
}: {
  clients: AdminClient[];
  costPremiums: ThemeDraft["costPremiums"];
  detailByUuid: Map<string, PremiumDetail>;
  rateLoading: boolean;
  acquiredAtMax: string;
  onPatchPaid: (uuid: string, rawValue: string) => void;
  onPatchAcquiredAt: (uuid: string, rawValue: string) => void;
}) {
  return (
    <div className="surface-inset max-h-80 overflow-y-auto">
      {clients.map((client) => {
        const entry = costPremiums[client.uuid];
        const detail = detailByUuid.get(client.uuid);
        const referenceLabel = rateLoading
          ? "计算中"
          : detail
            ? detail.counted
              ? formatCnyMoney(detail.remainingCny)
              : detail.note || "--"
            : "--";
        const canCompute = detail != null && (detail.counted || detail.note === "免费");
        return (
          <div
            key={client.uuid}
            className="flex flex-col gap-2 border-b border-(--hairline) px-3 py-2.5 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Flag region={client.region ?? ""} size={13} />
                <span
                  className="truncate text-[13px] text-(--text-primary)"
                  title={client.name}
                >
                  {client.name}
                </span>
              </div>
              <span
                className="shrink-0 text-[11px] text-(--text-tertiary)"
                title="该节点当前剩余价值（按账单周期折算，不含溢价）"
              >
                {referenceLabel}
              </span>
              {entry && (
                <span
                  className="shrink-0 text-[11px] font-medium"
                  style={{
                    color:
                      entry.amount > 0
                        ? "var(--status-error)"
                        : entry.amount < 0
                          ? "var(--status-success)"
                          : "var(--text-tertiary)",
                  }}
                  title={
                    entry.paidCny != null
                      ? "溢价 = 收购价 − 收购日剩余价值；该折算基准已经固化"
                      : "旧格式：直接记录的溢价，填写收购价后自动升级"
                  }
                >
                  溢价 {formatSignedCny(entry.amount)}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2 max-sm:w-full">
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min="0"
                value={entry?.paidCny ?? ""}
                onChange={(event) => {
                  // 键入 `-`/`e` 等非法中间态时 value 为空串,不能误当"留空即清除"删掉记录。
                  if (event.target.validity.badInput) return;
                  onPatchPaid(client.uuid, event.target.value);
                }}
                placeholder="收购价"
                disabled={!canCompute}
                aria-label={`${client.name} 的收购价`}
                title={
                  canCompute
                    ? "实际收购价（人民币），留空即清除记录"
                    : "该节点已忽略或汇率缺失，无法折算剩余价值"
                }
                className="surface-inset w-24 px-2 py-1 text-right text-[13px] outline-none disabled:opacity-45 max-sm:flex-1 min-w-0"
              />
              <input
                type="date"
                max={acquiredAtMax}
                value={entry?.acquiredAt ?? ""}
                onChange={(event) => onPatchAcquiredAt(client.uuid, event.target.value)}
                // 与收购价同门槛:汇率/基准未就绪时 patchPremiumAcquiredAt 无法回算,
                // 放开输入只会被静默丢弃(受控值弹回旧日期)。
                disabled={!entry || !canCompute}
                aria-label={`${client.name} 的收购日期`}
                title={
                  canCompute
                    ? "收购日期：修改后会按当前价格、周期、到期日和汇率回算该日剩余价值，重新计算并固化溢价"
                    : "该节点已忽略或汇率缺失，无法折算剩余价值"
                }
                className="surface-inset w-35 px-2 py-1 text-[12px] outline-none disabled:opacity-45 max-sm:flex-1 min-w-0"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
});

export function ThemeManage() {
  const now = useHourlyClock();
  const {
    data: config,
    isLoading: configLoading,
    error: configError,
    refetch: refetchConfig,
  } = usePublicConfig();
  // 全部托管设置收敛为单个草稿对象。之前是 30 个平行 useState,每新增一项设置要同步维护
  // 声明/seedDrafts/payload/依赖数组四处清单;现在键清单只在 pickManagedThemeSettings 一处。
  const [draft, setDraft] = useState<ThemeDraft>(() =>
    draftFromSettings(DEFAULT_THEME_SETTINGS),
  );
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [taskSearch, setTaskSearch] = useState("");
  const [nodeSearch, setNodeSearch] = useState("");
  const [premiumSearch, setPremiumSearch] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: ThemeTabId = isThemeTabId(tabParam) ? tabParam : DEFAULT_THEME_TAB;
  const bodyRef = useRef<HTMLDivElement>(null);
  const sectionsRef = useRef<HTMLDivElement>(null);

  const openTab = useCallback(
    (next: ThemeTabId) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          params.set("tab", next);
          return params;
        },
        { replace: true },
      );
      if (window.innerWidth >= 900) {
        sectionsRef.current?.scrollTo({ top: 0 });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [setSearchParams],
  );

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    const measure = () => {
      if (window.innerWidth < 900) {
        element.style.removeProperty("--theme-body-height");
        return;
      }
      const rect = element.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const main = element.closest("main");
      let padBottom = 0;
      for (
        let node: HTMLElement | null = element.parentElement;
        node && main && (node === main || main.contains(node));
        node = node.parentElement
      ) {
        const style = window.getComputedStyle(node);
        padBottom +=
          parseFloat(style.paddingBottom || "0") + parseFloat(style.borderBottomWidth || "0");
        if (node === main) break;
      }
      const footerHeight =
        document.querySelector(".site-footer")?.getBoundingClientRect().height ?? 0;
      const available = window.innerHeight - top - footerHeight - padBottom - BODY_BOTTOM_GAP;
      element.style.setProperty("--theme-body-height", `${Math.max(MIN_BODY_HEIGHT, available)}px`);
    };
    measure();
    window.addEventListener("resize", measure);
    const observer = new ResizeObserver(measure);
    const topbar = document.querySelector(".theme-topbar") || document.querySelector(".theme-masthead");
    const footer = document.querySelector(".site-footer");
    if (topbar) observer.observe(topbar);
    if (footer) observer.observe(footer);
    return () => {
      window.removeEventListener("resize", measure);
      observer.disconnect();
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);
  const savingDraftRef = useRef<ThemeDraft | null>(null);
  const editVersionRef = useRef(0);

  // 单字段更新收口,所有表单控件都走它。值未变时原样返回 prev,保留旧的独立 useState
  // 在同值 set 时不触发重渲染的行为。
  const patch = useCallback(
    <K extends keyof ThemeDraft>(key: K, value: ThemeDraft[K]) => {
      editVersionRef.current += 1;
      setDraft((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }));
    },
    [],
  );
  // 绑定关系的三个入口(勾选/全选/清空)都是基于前值的函数式更新,单独收口。
  const patchBindings = useCallback(
    (updater: (prev: HomepagePingTaskBindings) => HomepagePingTaskBindings) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        homepagePingBindings: updater(prev.homepagePingBindings),
      }));
    },
    [],
  );
  const toggleTaskExpanded = useCallback((taskId: number) => {
    setExpandedTaskId((current) => (current === taskId ? null : taskId));
    setNodeSearch("");
  }, []);

  const {
    data: pingTasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = useQuery({
    queryKey: ["admin", "ping-tasks"],
    queryFn: ({ signal }) => getAdminPingTasks({ signal }),
    staleTime: 30_000,
    retry: false,
  });
  const {
    data: adminClients,
    isLoading: clientsLoading,
    error: clientsError,
  } = useQuery({
    queryKey: ["admin", "clients"],
    queryFn: ({ signal }) => getAdminClients({ signal }),
    staleTime: 30_000,
    retry: false,
  });

  const sourceThemeSettings = useMemo(
    () => normalizeThemeSettings(config?.theme_settings),
    [config?.theme_settings],
  );
  // 按内容判断服务端设置是否真的变化，避免同内容 refetch 重置草稿。
  const sourceSignature = useMemo(
    () => JSON.stringify(pickManagedThemeSettings(sourceThemeSettings)),
    [sourceThemeSettings],
  );
  const lastSeededSignatureRef = useRef<string | null>(null);

  // 把服务端设置灌入草稿的唯一出口,reseed effect 和重置按钮都走它,避免两边逻辑漂移。
  const seedDrafts = useCallback((next: ResolvedThemeSettings) => {
    setDraft(draftFromSettings(next));
  }, []);

  const sortedTasks = useMemo(() => sortTasks(pingTasks ?? []), [pingTasks]);
  const sortedClients = useMemo(() => sortClients(adminClients ?? []), [adminClients]);
  const clientsById = useMemo(
    () => new Map(sortedClients.map((client) => [client.uuid, client])),
    [sortedClients],
  );

  // 后端实际存在的分组,按首页 Tab 的渲染顺序排列(已配置的在前,未排序的在后)。
  // 用户直接拖动这个列表来调整顺序。
  const availableGroups = useMemo(
    () => dedupeGroupLabels(sortedClients.map((client) => client.group)),
    [sortedClients],
  );
  const orderedDraftGroups = useMemo(
    () => sortHomeGroupOptions(availableGroups, draft.homeGroupOrder),
    [availableGroups, draft.homeGroupOrder],
  );
  const moveGroup = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= orderedDraftGroups.length) return;
    const next = [...orderedDraftGroups];
    [next[index], next[target]] = [next[target], next[index]];
    patch("homeGroupOrder", next);
  };

  const filteredTasks = useMemo(() => {
    const keyword = taskSearch.trim().toLowerCase();
    if (!keyword) return sortedTasks;
    return sortedTasks.filter((task) => {
      return (
        task.name.toLowerCase().includes(keyword) ||
        String(task.id).includes(keyword) ||
        task.type.toLowerCase().includes(keyword) ||
        task.target.toLowerCase().includes(keyword)
      );
    });
  }, [sortedTasks, taskSearch]);

  const multiPingSlotLimit = Math.min(
    HOMEPAGE_MULTI_PING_MAX_COUNT,
    Math.max(sortedTasks.length, HOMEPAGE_MULTI_PING_MIN_COUNT),
  );

  const commitMultiPingTaskIds = useCallback(
    (updater: (current: number[]) => number[]) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const nextIds = normalizeHomepageMultiPingTaskIds(updater(prev.homepageMultiPingTaskIds));
        return JSON.stringify(nextIds) === JSON.stringify(prev.homepageMultiPingTaskIds)
          ? prev
          : { ...prev, homepageMultiPingTaskIds: nextIds };
      });
    },
    [],
  );

  const patchMultiPingTask = useCallback(
    (slot: number, rawValue: string) => {
      if (rawValue === "") return;
      const parsedId = Number(rawValue);
      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) return;
      commitMultiPingTaskIds((current) => assignHomepageMultiPingTask(current, slot, parsedId));
    },
    [commitMultiPingTaskIds],
  );

  const removeMultiPingTask = useCallback(
    (slot: number) => {
      commitMultiPingTaskIds((current) => {
        if (current.length <= HOMEPAGE_MULTI_PING_MIN_COUNT) return current;
        const next = [...current];
        next.splice(slot, 1);
        return next;
      });
    },
    [commitMultiPingTaskIds],
  );

  const addMultiPingTask = useCallback(() => {
    commitMultiPingTaskIds((current) => {
      if (current.length >= HOMEPAGE_MULTI_PING_MAX_COUNT) return current;
      const availableTask = sortedTasks.find((task) => !current.includes(task.id));
      if (!availableTask) return current;
      return [...current, availableTask.id];
    });
  }, [commitMultiPingTaskIds, sortedTasks]);

  const visibleClients = useMemo(
    () => filterClients(sortedClients, nodeSearch),
    [nodeSearch, sortedClients],
  );
  const filteredPremiumClients = useMemo(
    () => filterClients(sortedClients, premiumSearch),
    [premiumSearch, sortedClients],
  );

  // 溢价表格里"当前剩余价值"仅供参考,用已保存的汇率源/忽略名单算(不用草稿里还没保存的
  // 编辑),口径与资产统计页完全一致(同一个 calculateCostSummary),但不叠加溢价本身。
  // 刻意用一次性 getNodes 查询而不是 useAllNodeMeta():后者会启动全局节点 store 的实时
  // 状态轮询(wsStore),设置页只需要静态 meta,不该为一列参考值挂一个常驻轮询。
  const { data: allMeta = [] } = useQuery({
    queryKey: ["theme-manage", "node-meta"],
    queryFn: ({ signal }) => getNodes({ signal }),
    staleTime: 60_000,
    retry: 1,
  });
  const premiumRateQuery = useQuery({
    queryKey: ["cost-rates", sourceThemeSettings.costRateApiUrl],
    queryFn: ({ signal }) => getExchangeRates(sourceThemeSettings.costRateApiUrl, { signal }),
    staleTime: 60 * 60 * 1000,
    enabled: allMeta.length > 0,
    retry: 1,
  });
  const premiumDetailByUuid = useMemo(() => {
    const map = new Map<string, ReturnType<typeof calculateCostSummary>["details"][number]>();
    if (!premiumRateQuery.data) return map;
    const summary = calculateCostSummary(
      allMeta,
      sourceThemeSettings.costIgnoredNodes,
      premiumRateQuery.data.rates,
      undefined,
      now,
    );
    for (const detail of summary.details) map.set(detail.uuid, detail);
    return map;
  }, [allMeta, now, sourceThemeSettings.costIgnoredNodes, premiumRateQuery.data]);

  // 使用当前价格、周期、到期日和汇率回算指定收购日的剩余价值；结果只在用户编辑
  // 收购价/日期时用于固化溢价，不会因后续续费或汇率变化自动改写。
  const premiumBasisAt = useCallback(
    (uuid: string, acquiredAt?: string): number | null => {
      if (!premiumRateQuery.data) return null;
      if (!acquiredAt || acquiredAt === localDateInputMax()) {
        const detail = premiumDetailByUuid.get(uuid);
        if (!detail) return null;
        if (detail.note === "免费") return 0;
        return detail.counted ? detail.remainingCny : null;
      }
      return calculateCostPremiumBasisAt(
        allMeta,
        sourceThemeSettings.costIgnoredNodes,
        premiumRateQuery.data.rates,
        uuid,
        acquiredAt,
        now,
      );
    },
    [
      allMeta,
      now,
      premiumDetailByUuid,
      sourceThemeSettings.costIgnoredNodes,
      premiumRateQuery.data,
    ],
  );

  const premiumConfiguredCount = useMemo(
    () => Object.keys(draft.costPremiums).length,
    [draft.costPremiums],
  );

  // 收购价清空即删条目；溢价按收购日的回算剩余价值算出并固化，不随后续续费/汇率漂移。
  const patchPremiumPaid = useCallback(
    (uuid: string, rawValue: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const next = { ...prev.costPremiums };
        if (rawValue.trim() === "") {
          if (!(uuid in next)) return prev;
          delete next[uuid];
          return { ...prev, costPremiums: next };
        }
        const paid = Number(rawValue);
        if (!Number.isFinite(paid) || paid < 0) return prev;
        const current = prev.costPremiums[uuid];
        if (current && Object.is(current.paidCny, paid)) return prev;
        const acquiredAt = current?.acquiredAt ?? localDateInputMax();
        const storedBasis =
          current?.paidCny != null ? current.paidCny - current.amount : Number.NaN;
        const basis = Number.isFinite(storedBasis)
          ? storedBasis
          : premiumBasisAt(uuid, acquiredAt);
        if (basis == null) return prev;
        next[uuid] = buildPremiumEntry(
          calculateCostPremiumAmount(paid, basis, current),
          paid,
          acquiredAt,
        );
        return { ...prev, costPremiums: next };
      });
    },
    [premiumBasisAt],
  );

  // 主动修改收购日期时重新回算该日剩余价值并固化新溢价；保存后仍保持固定。
  const patchPremiumAcquiredAt = useCallback(
    (uuid: string, rawValue: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => {
        const current = prev.costPremiums[uuid];
        if (!current) return prev;
        const acquiredAt = rawValue.trim() || undefined;
        if (current.acquiredAt === acquiredAt) return prev;
        let amount = current.amount;
        if (acquiredAt && current.paidCny != null) {
          const basis = premiumBasisAt(uuid, acquiredAt);
          if (basis == null) return prev;
          amount = calculateCostPremiumAmount(current.paidCny, basis);
        }
        const next = { ...prev.costPremiums };
        next[uuid] = buildPremiumEntry(amount, current.paidCny, acquiredAt);
        return { ...prev, costPremiums: next };
      });
    },
    [premiumBasisAt],
  );

  const draftHiddenNodes = useMemo(
    () => normalizeNodeIdentityList(draft.hiddenNodesText),
    [draft.hiddenNodesText],
  );
  const draftCostRateApiUrlInvalid =
    draft.costRateApiUrl.trim() !== "" && !isCostRateApiUrlValid(draft.costRateApiUrl.trim());
  const draftMultiPingInvalid =
    draft.enableHomepageMultiPing &&
    !isHomepageMultiPingConfigured(draft.homepageMultiPingTaskIds);

  // 由当前草稿拼出的设置 payload,保存请求和 dirty 判断都用它。草稿字段与设置同名,这里只做
  // 「编辑态 → 存储态」的换形与归一化;文本域(hiddenNodesText/costIgnoredText)和 ratingLabels
  // 解构出来换回存储字段,其余原样透传。
  const normalizedBackgroundVideo = normalizeBackgroundVideoUrl(draft.backgroundVideo);
  const normalizedBackgroundVideoDark = normalizeBackgroundVideoUrl(draft.backgroundVideoDark);
  const backgroundVideoLightMalformed =
    draft.backgroundVideo.trim() !== "" && !normalizedBackgroundVideo;
  const backgroundVideoDarkInvalid =
    draft.backgroundVideoDark.trim() !== "" && !normalizedBackgroundVideoDark;
  const backgroundVideoLightInvalid =
    draft.backgroundMediaType === "video" && !normalizedBackgroundVideo;
  const videoInputInvalid =
    draft.backgroundMediaType === "video" &&
    (!normalizedBackgroundVideo || backgroundVideoDarkInvalid);

  const draftThemeSettings = useMemo<ThemeSettings>(() => {
    const {
      ratingLabels,
      hiddenNodesText,
      costIgnoredText,
      ...rest
    } = draft;
    return {
      ...rest,
      homepagePingBindings: pruneBindings(rest.homepagePingBindings),
      homeGroupOrder: normalizeHomeGroupOrder(rest.homeGroupOrder),
      trafficRatingLabels: ratingLabels.traffic,
      bandwidthRatingLabels: ratingLabels.bandwidth,
      assetRatingLabels: ratingLabels.asset,
      hiddenNodes: normalizeNodeIdentityList(hiddenNodesText),
      costIgnoredNodes: normalizeCostIgnoredNodes(costIgnoredText),
      costPremiums: normalizeCostPremiums(rest.costPremiums),
      costRateApiUrl: normalizeCostRateApiUrl(rest.costRateApiUrl),
      backgroundImage: normalizeBackgroundUrl(rest.backgroundImage),
      backgroundImageMobile: normalizeBackgroundUrl(rest.backgroundImageMobile),
      backgroundVideo: backgroundVideoLightMalformed
        ? sourceThemeSettings.backgroundVideo
        : normalizedBackgroundVideo || DEFAULT_BACKGROUND_VIDEO_URL,
      backgroundVideoDark: backgroundVideoDarkInvalid
        ? sourceThemeSettings.backgroundVideoDark
        : normalizedBackgroundVideoDark,
      backgroundAlignment: normalizeBackgroundAlignment(rest.backgroundAlignment),
    };
  }, [
    backgroundVideoDarkInvalid,
    backgroundVideoLightMalformed,
    draft,
    normalizedBackgroundVideo,
    normalizedBackgroundVideoDark,
    sourceThemeSettings.backgroundVideo,
    sourceThemeSettings.backgroundVideoDark,
  ]);

  // 只比较本页实际管理的设置。enableAdminButton/showPingChart 这类隐藏设置会通过
  // baseSettings 在保存时保留,但不该让表单永远显示为 dirty。
  const draftSignature = useMemo(
    () => managedSettingsSignature(draftThemeSettings as ThemeSettings & Record<string, unknown>),
    [draftThemeSettings],
  );
  // draftSignature 用的是归一化后的 cost-rate URL,非法输入会被收敛回默认值,于是非法输入
  // 不会被判为 dirty,用户既无法保存也无法重置出来。所以单独跟踪原始文本,让编辑始终把表单
  // 标为 dirty(重置可用),而保存按钮再额外按合法性把关(见下文)。
  const costRateApiUrlDirty =
    draft.costRateApiUrl.trim() !== sourceThemeSettings.costRateApiUrl;
  const isDirty =
    draftSignature !== sourceSignature ||
    costRateApiUrlDirty ||
    videoInputInvalid;

  // 用户重新编辑后清掉「已保存」提示,避免过期的成功提示和 dirty 表单并存。
  useEffect(() => {
    if (isDirty) setMessage(null);
  }, [isDirty]);

  // 服务端设置真正变化时灌入草稿。首次灌入之后,只要表单有未保存编辑(含保存中)就跳过,
  // 避免 refetch / 其他端保存的回流静默覆盖用户草稿。
  useEffect(() => {
    if (!config) return;
    if (lastSeededSignatureRef.current === sourceSignature) return;
    if (lastSeededSignatureRef.current !== null && isDirty) return;
    lastSeededSignatureRef.current = sourceSignature;
    seedDrafts(sourceThemeSettings);
  }, [config, isDirty, sourceSignature, sourceThemeSettings, seedDrafts]);


  // 每个 client 归属哪个 task 的反查,只在绑定草稿变化时重建。与「全选可用」reducer
  // 共用 invertBindings() 避免推导漂移,并把可选节点过滤保持在 O(tasks × clients),
  // 而不是每个 client 都重扫一遍 bindings。
  const assignedTaskByClientUuid = useMemo(
    () => invertBindings(draft.homepagePingBindings),
    [draft.homepagePingBindings],
  );

  const handleSave = async () => {
    if (
      !config?.theme ||
      savingDraftRef.current ||
      draftCostRateApiUrlInvalid ||
      videoInputInvalid ||
      draftMultiPingInvalid
    ) {
      return;
    }
    const submittedEditVersion = editVersionRef.current;
    savingDraftRef.current = draft;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const nextSettings: ThemeSettings & Record<string, unknown> = {
        ...(config.theme_settings ?? {}),
        ...draftThemeSettings,
      };
      delete nextSettings.homepagePingTask;
      await saveThemeSettings(config.theme, nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      if (editVersionRef.current === submittedEditVersion) {
        setMessage("主题设置已保存");
      }
    } catch (saveError) {
      if (
        saveError instanceof ApiRequestError &&
        (saveError.status === 401 || saveError.status === 403)
      ) {
        setAccessRevoked(true);
        return;
      }
      setError(saveError instanceof Error ? saveError.message : "保存失败");
    } finally {
      savingDraftRef.current = null;
      setSaving(false);
    }
  };

  const handleReset = () => {
    seedDrafts(sourceThemeSettings);
    setMessage(null);
    setError(null);
  };

  if (configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size={24} />
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div role="alert" className="space-y-2">
          <div className="text-[15px] font-semibold text-(--text-primary)">
            无法读取主题配置
          </div>
          <p className="max-w-lg text-[13px] text-(--text-secondary)">
            {configError instanceof Error ? configError.message : "请稍后重试。"}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => void refetchConfig()}
            className="control-button px-4 py-2 text-[13px] font-medium"
          >
            重试
          </button>
          <Link to="/" className="control-button px-4 py-2 text-[13px] font-medium">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  if (accessRevoked) {
    return <Navigate to="/" replace />;
  }

  const adminAccessDenied =
    (tasksError instanceof ApiRequestError &&
      (tasksError.status === 401 || tasksError.status === 403)) ||
    (clientsError instanceof ApiRequestError &&
      (clientsError.status === 401 || clientsError.status === 403));

  if (adminAccessDenied) {
    return <Navigate to="/" replace />;
  }

  const adminError =
    (tasksError instanceof Error ? tasksError.message : null) ||
    (clientsError instanceof Error ? clientsError.message : null);
  const noTasksYet = !tasksLoading && !clientsLoading && sortedTasks.length === 0;
  const noFilteredTaskMatch = !tasksLoading && !clientsLoading && !noTasksYet && filteredTasks.length === 0;
  const setRatingLabelDraft = (kind: OverviewRatingKind, value: string) => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      ratingLabels: { ...prev.ratingLabels, [kind]: value },
    }));
  };
  const draftBgAlignment = parseBackgroundAlignment(draft.backgroundAlignment);
  const setBgSize = (size: BackgroundSize) =>
    patch("backgroundAlignment", `${size},${draftBgAlignment.position}`);
  const setBgPosition = (position: BackgroundPosition) =>
    patch("backgroundAlignment", `${draftBgAlignment.size},${position}`);
  const acquiredAtMax = localDateInputMax();

  return (
    <div className="theme-manage flex flex-col gap-5 py-2">
      <header className="theme-topbar">
        <Link to="/" className="instance-page-back theme-topbar-back">
          <ArrowLeft size={14} />
          <span>返回首页</span>
        </Link>
        <h1 className="theme-topbar-title">SAO 主题设置</h1>
        <div className="theme-manage-toolbar-actions">
          <button
            type="button"
            onClick={handleReset}
            disabled={!isDirty || saving}
            className="theme-manage-button is-compact"
          >
            <RefreshCw size={14} />
            <span>重置</span>
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              !isDirty ||
              saving ||
              draftCostRateApiUrlInvalid ||
              videoInputInvalid ||
              draftMultiPingInvalid
            }
            className="theme-manage-button is-compact is-primary"
          >
            {saving ? <Spinner size={14} /> : <Save size={14} />}
            <span>{saving ? "保存中" : "保存设置"}</span>
          </button>
        </div>
      </header>

      {(message || error || adminError) && (
        <div className="flex flex-col gap-3">
          {message && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-[color-mix(in_srgb,var(--status-online)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-online)_11%,var(--surface))] px-4 py-3 text-[13px] text-(--status-online)"
            >
              {message}
            </div>
          )}
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--status-offline)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-offline)_11%,var(--surface))] px-4 py-3 text-[13px] text-(--status-offline)"
            >
              {error}
            </div>
          )}
          {adminError && (
            <div
              role="alert"
              className="rounded-xl border border-[color-mix(in_srgb,var(--status-offline)_28%,transparent)] bg-[color-mix(in_srgb,var(--status-offline)_11%,var(--surface))] px-4 py-3 text-[13px] text-(--status-offline)"
            >
              无法读取后台 Ping 任务或节点列表: {adminError}
            </div>
          )}
        </div>
      )}

            <div className="theme-manage-body" ref={bodyRef}>
        <nav className="theme-tab-rail" aria-label="设置分组">
          {THEME_TABS.map(({ id, label, hint, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => openTab(id)}
              data-active={activeTab === id ? "true" : "false"}
              aria-current={activeTab === id ? "page" : undefined}
              className="theme-tab"
            >
              <Icon size={14} className="theme-tab-icon" />
              <span className="theme-tab-label">{label}</span>
              <span className="theme-tab-hint">{hint}</span>
            </button>
          ))}
        </nav>

        <div className="theme-manage-sections" ref={sectionsRef}>
          {activeTab === "appearance" && (
            <>
              <InstancePanel
                kicker="外观"
                title="默认外观"
                aside={<LayoutTemplate size={16} />}
              >
                <div className="instance-segmented is-prominent is-even">
                  {APPEARANCE_OPTIONS.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      data-active={draft.defaultAppearance === value ? "true" : "false"}
                      aria-pressed={draft.defaultAppearance === value}
                      onClick={() => patch("defaultAppearance", value)}
                      className="inline-flex items-center justify-center gap-2"
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="视图"
                title="默认卡片视图"
                aside={<LayoutGrid size={16} />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="surface-inset setting-segment-slot flex flex-col gap-3 px-4 py-4">
                    <div>
                      <div className="setting-subhead-title">
                        桌面端默认
                      </div>
                      <div className="mt-1 setting-hint">
                        适用于宽度大于 720px 的浏览器窗口。
                      </div>
                    </div>
                    <div className="instance-segmented is-prominent is-even">
                      {NODE_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          data-active={draft.desktopNodeViewMode === value ? "true" : "false"}
                          aria-pressed={draft.desktopNodeViewMode === value}
                          onClick={() => patch("desktopNodeViewMode", value)}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <Icon size={14} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="surface-inset setting-segment-slot flex flex-col gap-3 px-4 py-4">
                    <div>
                      <div className="setting-subhead-title">
                        移动端默认
                      </div>
                      <div className="mt-1 setting-hint">
                        适用于宽度小于等于 720px 的手机或窄屏窗口。
                      </div>
                    </div>
                    <div className="instance-segmented is-prominent is-even">
                      {MOBILE_VIEW_MODE_OPTIONS.map(({ value, label, icon: Icon }) => (
                        <button
                          key={value}
                          type="button"
                          data-active={draft.mobileNodeViewMode === value ? "true" : "false"}
                          aria-pressed={draft.mobileNodeViewMode === value}
                          onClick={() => patch("mobileNodeViewMode", value)}
                          className="inline-flex items-center justify-center gap-2"
                        >
                          <Icon size={14} />
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="背景媒体"
                title="自定义背景图与动态视频"
                description="支持配置高质感壁纸或循环 MP4 视频背景（提供日夜双模适配）。"
                aside={<Wallpaper size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <ToggleRow
                    field="enableBackgroundImage"
                    title="启用自定义背景媒体"
                    desc="开启后将覆盖站点默认背景，优先应用下方配置的图片或视频。"
                    checked={draft.enableBackgroundImage}
                    onPatch={patch}
                  />

                  {draft.enableBackgroundImage && (
                    <>
                      <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                        <span className="setting-subhead-title">媒体形式</span>
                        <div className="instance-segmented is-prominent is-even">
                          {BACKGROUND_MEDIA_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              type="button"
                              data-active={draft.backgroundMediaType === value ? "true" : "false"}
                              aria-pressed={draft.backgroundMediaType === value}
                              onClick={() => patch("backgroundMediaType", value)}
                              className="inline-flex items-center justify-center gap-2"
                            >
                              <Icon size={14} />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {draft.backgroundMediaType === "image" ? (
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">
                              桌面端背景图 URL
                            </span>
                            <input
                              value={draft.backgroundImage}
                              onChange={(event) => patch("backgroundImage", event.target.value)}
                              placeholder="https://example.com/desktop.jpg"
                              className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
                            />
                            <span className="setting-hint">
                              宽屏与桌面端加载的背景图。
                            </span>
                          </label>

                          <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">
                              移动端背景图 URL
                            </span>
                            <input
                              value={draft.backgroundImageMobile}
                              onChange={(event) => patch("backgroundImageMobile", event.target.value)}
                              placeholder="https://example.com/mobile.jpg"
                              className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
                            />
                            <span className="setting-hint">
                              竖屏手机加载，留空则沿用桌面端。
                            </span>
                          </label>

                          <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">平铺尺寸</span>
                            <div className="instance-segmented is-even">
                              {BACKGROUND_SIZE_OPTIONS.map(({ value, label }) => (
                                <button
                                  key={value}
                                  type="button"
                                  data-active={draftBgAlignment.size === value ? "true" : "false"}
                                  onClick={() => setBgSize(value)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">对齐位置</span>
                            <div className="instance-segmented is-even">
                              {BACKGROUND_POSITION_OPTIONS.map(({ value, label }) => (
                                <button
                                  key={value}
                                  type="button"
                                  data-active={draftBgAlignment.position === value ? "true" : "false"}
                                  onClick={() => setBgPosition(value)}
                                >
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">
                              浅色模式视频 URL (MP4)
                            </span>
                            <input
                              value={draft.backgroundVideo}
                              onChange={(event) => patch("backgroundVideo", event.target.value)}
                              placeholder={DEFAULT_BACKGROUND_VIDEO_URL}
                              aria-invalid={backgroundVideoLightInvalid}
                              className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
                            />
                            <span className="setting-hint">
                              {backgroundVideoLightInvalid
                                ? (backgroundVideoLightMalformed
                                    ? "请输入 HTTP(S) 或以 / 开头的站内视频直链"
                                    : `视频模式需要浅色视频地址，可使用 ${DEFAULT_BACKGROUND_VIDEO_URL}`)
                                : "留空使用 SAO 默认主题动态视频。"}
                            </span>
                          </label>
                          <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                            <span className="setting-subhead-title">
                              深色模式视频 URL (MP4)
                            </span>
                            <input
                              value={draft.backgroundVideoDark}
                              onChange={(event) => patch("backgroundVideoDark", event.target.value)}
                              placeholder="可选，夜间专属视频"
                              aria-invalid={backgroundVideoDarkInvalid}
                              className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
                            />
                            <span className="setting-hint">
                              {backgroundVideoDarkInvalid
                                ? "请输入 HTTP(S) 或以 / 开头的站内视频直链"
                                : "留空则在深色下自动叠加暗色暗场滤镜。"}
                            </span>
                          </label>
                        </div>
                      )}
                    </>
                  )}

                  <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="setting-subhead-title">
                        卡片不透明度
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={1}
                          inputMode="numeric"
                          value={draft.surfaceOpacity}
                          onChange={(event) => {
                            if (event.target.value.trim() === "") return;
                            const next = Number(event.target.value);
                            if (!Number.isFinite(next)) return;
                            patch("surfaceOpacity", Math.min(100, Math.max(0, Math.round(next))));
                          }}
                          aria-label="卡片不透明度百分比"
                          className="surface-inset w-20 px-3 py-2 text-right text-[13px] tabular outline-none"
                        />
                        <span className="text-[13px] font-medium text-(--text-tertiary)">%</span>
                      </span>
                    </div>
                    <span className="setting-hint">
                      输入 0–100 的整数。100 = 完全不透明，数值越低卡片越通透、越能透出背景媒体。
                      低于 95 时会自动叠加一层可读性遮罩，保证文字清晰。
                    </span>
                  </div>
                </div>
              </InstancePanel>
            </>
          )}

          {activeTab === "home" && (
            <>
              <InstancePanel
                kicker="总览"
                title="首页顶部组件"
                aside={<ListFilter size={16} />}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  <ToggleRow
                    field="showHomeOverview"
                    title="显示顶部总览栏"
                    desc="在首页顶部显示实时带宽、平均负载、内存用量、硬盘用量、今日流量与资产看板。"
                    checked={draft.showHomeOverview}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showGroupTabs"
                    title="显示分组筛选栏"
                    desc="在卡片列表上方展示分组 Tab 快速筛选。"
                    checked={draft.showGroupTabs}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showRegionBar"
                    title="显示地区筛选栏"
                    desc="在卡片列表上方展示国旗地区快捷标签。"
                    checked={draft.showRegionBar}
                    onPatch={patch}
                  />
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="排序"
                title="排序规则与默认选中"
                aside={<Rows3 size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <ToggleRow
                    field="enableHomeSort"
                    title="允许访客切换排序"
                    desc="在首页提供排序下拉切换功能。"
                    checked={draft.enableHomeSort}
                    onPatch={patch}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">默认排序字段</span>
                      <SettingSelect
                        value={draft.homeSortField}
                        disabled={!draft.enableHomeSort}
                        onChange={(event) =>
                          patch(
                            "homeSortField",
                            event.target.value as (typeof HOME_SORT_FIELDS)[number],
                          )
                        }
                      >
                        {HOME_SORT_FIELDS.map((field) => (
                          <option key={field} value={field}>
                            {HOME_SORT_FIELD_LABELS[field]}
                          </option>
                        ))}
                      </SettingSelect>
                    </div>

                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">默认排序方向</span>
                      <SettingSelect
                        value={draft.homeSortDirection}
                        disabled={!draft.enableHomeSort}
                        onChange={(event) =>
                          patch("homeSortDirection", event.target.value as "asc" | "desc")
                        }
                      >
                        <option value="asc">升序 (ASC)</option>
                        <option value="desc">降序 (DESC)</option>
                      </SettingSelect>
                    </div>
                  </div>

                  {orderedDraftGroups.length > 0 && (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="setting-subhead-title">分组展示顺序</span>
                        <span className="setting-hint">使用上下箭头调整顺序</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {orderedDraftGroups.map((group, index) => (
                          <div
                            key={group}
                            className="flex items-center justify-between rounded-lg border border-(--hairline) px-3 py-2 text-[13px]"
                          >
                            <span>{group}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={index === 0}
                                onClick={() => moveGroup(index, -1)}
                                className="theme-manage-button is-compact"
                                aria-label={`上移 ${group}`}
                              >
                                <ChevronUp size={14} />
                              </button>
                              <button
                                type="button"
                                disabled={index === orderedDraftGroups.length - 1}
                                onClick={() => moveGroup(index, 1)}
                                className="theme-manage-button is-compact"
                                aria-label={`下移 ${group}`}
                              >
                                <ChevronDown size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="评级"
                title="总览文字评级"
                aside={<ListFilter size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div className="surface-inset flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block setting-subhead-title">启用总览评级</span>
                      <span className="setting-desc">
                        在今日流量、资产概览及集群网络状态中显示评级标识。
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      checked={draft.showOverviewRatings}
                      onChange={(event) => patch("showOverviewRatings", event.target.checked)}
                      className="h-4 w-4 shrink-0 accent-(--accent-500)"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {OVERVIEW_RATING_LABEL_FIELDS.map((field) => {
                      const defaultLabel = getDefaultOverviewRatingLabelText(field.key);
                      const ratingEnabled = draft.showOverviewRatings && draft[field.toggleKey];
                      return (
                        <div key={field.key} className="surface-inset flex min-w-0 flex-col gap-2 px-4 py-3">
                          <label className="flex items-center justify-between gap-2">
                            <span className="setting-subhead-title">{field.title}</span>
                            <input
                              type="checkbox"
                              checked={draft[field.toggleKey]}
                              disabled={!draft.showOverviewRatings}
                              onChange={(event) => patch(field.toggleKey, event.target.checked)}
                              className="h-4 w-4 shrink-0 accent-(--accent-500)"
                            />
                          </label>
                          <input
                            value={draft.ratingLabels[field.key]}
                            disabled={!ratingEnabled}
                            onChange={(event) => setRatingLabelDraft(field.key, event.target.value)}
                            placeholder={defaultLabel}
                            aria-label={`${field.title}评级名称`}
                            className="surface-inset w-full px-3 py-2 text-[13px] outline-none disabled:opacity-60"
                          />
                          <span className="setting-hint">
                            {field.tierHint}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="过滤"
                title="隐藏节点"
                aside={<Search size={16} />}
              >
                <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                  <span className="setting-subhead-title">隐藏节点列表 (每行一个 UUID 或名称)</span>
                  <textarea
                    rows={4}
                    value={draft.hiddenNodesText}
                    onChange={(event) => patch("hiddenNodesText", event.target.value)}
                    placeholder="node-uuid-1&#10;Tokyo Edge"
                    className="surface-inset p-3 text-[13px] font-mono outline-none min-h-28"
                  />
                  <span className="setting-hint">
                    列在此处的节点将不会在首页及总览中展示。当前已生效 {draftHiddenNodes.length} 台。
                  </span>
                </div>
              </InstancePanel>
            </>
          )}

          {activeTab === "card" && (
            <InstancePanel
              kicker="卡片"
              title="卡片展示内容"
              description="定制大卡片、小卡片和列表模式下呈现的具体指标。"
              aside={<Rows3 size={16} />}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleRow
                  field="showCardGroup"
                  title="显示节点分组标签"
                  desc="在卡片副标题处标明其所属分组。"
                  checked={draft.showCardGroup}
                  onPatch={patch}
                />
                <ToggleRow
                  field="compactShowTrafficTotal"
                  title="小卡片显示累计流量"
                  desc="在紧凑视图中展示月度或累计出入站流量。"
                  checked={draft.compactShowTrafficTotal}
                  onPatch={patch}
                />
                <ToggleRow
                  field="compactShowBilling"
                  title="小卡片显示计费周期"
                  desc="在紧凑视图中保留周期标注。"
                  checked={draft.compactShowBilling}
                  onPatch={patch}
                />
                <ToggleRow
                  field="compactShowUptime"
                  title="小卡片显示在线时长"
                  desc="在紧凑视图中展示系统运行时间。"
                  checked={draft.compactShowUptime}
                  onPatch={patch}
                />
                <ToggleRow
                  field="showConnections"
                  title="显示 TCP/UDP 连接数"
                  desc="在卡片网络区域标注实时活跃连接统计。"
                  checked={draft.showConnections}
                  onPatch={patch}
                />
                <ToggleRow
                  field="showTodayTrafficPopover"
                  title="悬浮显示当日流量气泡 (SAO 特色)"
                  desc="鼠标悬停在卡片或小卡片流量指标时，弹出精致的今日已用流量透视窗。"
                  checked={draft.showTodayTrafficPopover}
                  onPatch={patch}
                />
              </div>
            </InstancePanel>
          )}

          {activeTab === "cost" && (
            <>
              <InstancePanel
                kicker="资产"
                title="资产与财务设置"
                aside={<CircleDollarSign size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <ToggleRow
                      field="showCostSummary"
                      title="显示资产页入口按钮"
                      desc="在首页资产概览卡右上角显示进入资产统计页的按钮。"
                      checked={draft.showCostSummary}
                      onPatch={patch}
                    />
                    <ToggleRow
                      field="showCostSummaryFloatingButton"
                      title="显示资产悬浮按钮"
                      desc="卡内入口不可用时（总览隐藏或其开关关闭），以悬浮按钮进入资产统计页。"
                      checked={draft.showCostSummaryFloatingButton}
                      onPatch={patch}
                    />
                    <ToggleRow
                      field="showPriceForGuests"
                      title="向访客公开价格与资产"
                      desc="默认关闭。开启后，未登录访客也能查看节点续费价格标签与首页资产概览；关闭时对访客隐藏价格标签，资产概览显示为 保密。"
                      checked={draft.showPriceForGuests}
                      onPatch={patch}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">实时汇率接口 API URL</span>
                      <input
                        value={draft.costRateApiUrl}
                        onChange={(event) => patch("costRateApiUrl", event.target.value)}
                        placeholder={DEFAULT_THEME_SETTINGS.costRateApiUrl}
                        aria-invalid={draftCostRateApiUrlInvalid}
                        className="surface-inset w-full px-3 py-2 text-[13px] outline-none"
                      />
                      <span className="setting-hint">
                        {draftCostRateApiUrlInvalid
                          ? "请输入 http(s) 链接，保存后将回退默认接口"
                          : "留空使用官方默认免费公共汇率接口。"}
                      </span>
                    </label>

                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">忽略计算费用的节点</span>
                      <textarea
                        rows={3}
                        value={draft.costIgnoredText}
                        onChange={(event) => patch("costIgnoredText", event.target.value)}
                        placeholder="每行一个节点名称 / UUID，也可以用逗号分隔"
                        className="surface-inset min-h-24 w-full resize-y p-2.5 text-[13px] outline-none font-mono"
                      />
                      <span className="setting-hint">每行一个节点 UUID 或名称，计入资产时不摊销其成本。</span>
                    </div>
                  </div>
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="溢价"
                title="二手买入溢价/折价固化"
                description="记录收购时的实际支出，系统自动算出折价盈亏并在到期日前线性摊销。"
                aside={<CircleDollarSign size={16} />}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="surface-inset flex flex-1 max-w-sm items-center gap-2 px-3 py-1.5">
                      <Search size={14} className="text-(--text-tertiary)" />
                      <input
                        value={premiumSearch}
                        onChange={(event) => setPremiumSearch(event.target.value)}
                        placeholder="搜索节点录入收购价…"
                        aria-label="搜索节点"
                        className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--text-tertiary)"
                      />
                    </label>
                    <span className="setting-hint shrink-0">
                      已记录 {premiumConfiguredCount} 台溢价
                    </span>
                  </div>

                  {clientsLoading && (
                    <div className="flex min-h-[15vh] items-center justify-center">
                      <Spinner size={24} />
                    </div>
                  )}

                  {!clientsLoading && sortedClients.length === 0 && (
                    <div className="theme-manage-empty-state">
                      <span>还没有任何节点。</span>
                    </div>
                  )}

                  {!clientsLoading && sortedClients.length > 0 && filteredPremiumClients.length === 0 && (
                    <div className="surface-inset px-4 py-5 text-[13px] text-(--text-secondary)">
                      没有匹配的节点。
                    </div>
                  )}

                  {!clientsLoading && filteredPremiumClients.length > 0 && (
                    <PremiumList
                      clients={filteredPremiumClients}
                      costPremiums={draft.costPremiums}
                      detailByUuid={premiumDetailByUuid}
                      rateLoading={premiumRateQuery.isLoading}
                      acquiredAtMax={acquiredAtMax}
                      onPatchPaid={patchPremiumPaid}
                      onPatchAcquiredAt={patchPremiumAcquiredAt}
                    />
                  )}
                </div>
              </InstancePanel>
            </>
          )}

          {activeTab === "ping" && (
            <>
              <InstancePanel
                kicker="线路"
                title="延迟探测模式"
                aside={<Activity size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                    <span className="setting-subhead-title">首页探测展示模式</span>
                    <div className="instance-segmented is-prominent is-even is-stack-mobile">
                      <button
                        type="button"
                        data-active={!draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", false)}
                      >
                        单线路模式 (指定主线路)
                      </button>
                      <button
                        type="button"
                        data-active={draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", true)}
                      >
                        多线路模式 (并列展示三网/自定义线路)
                      </button>
                    </div>
                  </div>

                  {draft.enableHomepageMultiPing ? (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="setting-subhead-title">多线路槽位展示列表</span>
                          <p className="setting-hint mt-1">
                            卡片将依序渲染这些线路的实时延迟柱条或色块。
                          </p>
                        </div>
                        {draft.homepageMultiPingTaskIds.length < multiPingSlotLimit && (
                          <button
                            type="button"
                            onClick={addMultiPingTask}
                            className="theme-manage-button is-compact"
                          >
                            + 添加展示线路
                          </button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {draft.homepageMultiPingTaskIds.map((taskId, slot) => (
                          <div
                            key={slot}
                            className="flex items-center justify-between gap-2 rounded-[10px] border border-(--hairline) px-3 py-2 min-w-0"
                          >
                            <span className="text-[12px] font-medium text-(--text-secondary) shrink-0">
                              槽位 #{slot + 1}
                            </span>
                            <SettingSelect
                              value={String(taskId)}
                              onChange={(event) => patchMultiPingTask(slot, event.target.value)}
                              wrapperClassName="flex-1 min-w-0"
                            >
                              {sortedTasks.map((task) => (
                                <option key={task.id} value={task.id}>
                                  {task.name || `线路 #${task.id}`}
                                </option>
                              ))}
                            </SettingSelect>
                            {draft.homepageMultiPingTaskIds.length > HOMEPAGE_MULTI_PING_MIN_COUNT && (
                              <button
                                type="button"
                                onClick={() => removeMultiPingTask(slot)}
                                className="theme-manage-button is-compact is-danger shrink-0"
                              >
                                删除
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      {draftMultiPingInvalid && (
                        <p className="mt-1 text-[11px] leading-relaxed text-(--status-error)" role="alert">
                          请至少选择 {HOMEPAGE_MULTI_PING_MIN_COUNT} 条有效的展示线路。
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(240px,320px)]">
                        <label className="surface-inset flex items-center gap-2 px-3 py-2">
                          <Search size={14} className="text-(--text-tertiary)" />
                          <input
                            value={taskSearch}
                            onChange={(event) => setTaskSearch(event.target.value)}
                            placeholder="搜索 Ping 任务名称 / ID / 类型 / 目标"
                            aria-label="搜索 Ping 任务"
                            className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-(--text-tertiary)"
                          />
                        </label>
                        <div className="surface-inset flex items-center justify-between gap-3 px-3 py-2 text-[12px] text-(--text-secondary)">
                          <span>首页绑定总数</span>
                          <strong className="text-(--text-primary)">
                            {`${sortedTasks.length} 个任务`}
                          </strong>
                        </div>
                      </div>

                      <ToggleRow
                        field="fakePingForUnbound"
                        title="未绑定线路时模拟平滑延迟"
                        desc="避免部分节点空缺无条形码时影响整体美观（仅视觉平滑占位）。"
                        checked={draft.fakePingForUnbound}
                        onPatch={patch}
                      />

                      {(tasksLoading || clientsLoading) && (
                        <div className="flex min-h-[20vh] items-center justify-center">
                          <Spinner size={24} />
                        </div>
                      )}

                      {noTasksYet && (
                        <div className="theme-manage-empty-state">
                          <span>当前还没有可用于首页展示的 Ping 任务。</span>
                          <a href="/admin/ping" className="theme-manage-inline-link">
                            前往后台 Ping 管理创建任务
                          </a>
                        </div>
                      )}

                      {noFilteredTaskMatch && (
                        <div className="surface-inset px-4 py-5 text-[13px] text-(--text-secondary)">
                          没有匹配的 Ping 任务。
                        </div>
                      )}

                      {!tasksLoading &&
                        !clientsLoading &&
                        !noTasksYet &&
                        filteredTasks.map((task) => {
                          const expanded = expandedTaskId === task.id;
                          return (
                            <TaskBindingSection
                              key={task.id}
                              task={task}
                              assigned={
                                draft.homepagePingBindings[String(task.id)] ?? EMPTY_ASSIGNED_CLIENTS
                              }
                              expanded={expanded}
                              clientsById={clientsById}
                              visibleClients={expanded ? visibleClients : EMPTY_ADMIN_CLIENTS}
                              assignedTaskByClientUuid={assignedTaskByClientUuid}
                              nodeSearch={expanded ? nodeSearch : ""}
                              onNodeSearch={setNodeSearch}
                              onToggleExpand={toggleTaskExpanded}
                              onPatchBindings={patchBindings}
                            />
                          );
                        })}
                    </div>
                  )}
                </div>
              </InstancePanel>
            </>
          )}
        </div>
      </div>
</div>
  );
}
