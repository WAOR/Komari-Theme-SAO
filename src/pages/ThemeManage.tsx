import { memo, useCallback, useEffect, useMemo, useRef, useState, type ComponentPropsWithoutRef } from "react";
import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Compass,
  Grid3x3,
  Layers,
  LayoutTemplate,
  LayoutGrid,
  List,
  ListFilter,
  Moon,
  RefreshCw,
  Rows3,
  Activity,
  Server,
  Sparkles,
  Cloud,
  CloudAlert,
  Search,
  Square,
  Sun,
  SunMoon,
  Sliders,
  RotateCcw,
  PackagePlus,
  Palette,
  X,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Github,
  HelpCircle,
  MessageSquare,
  Star,
} from "lucide-react";
import { clsx } from "clsx";
import { InstancePanel } from "@/components/instance/InstancePanel";
import { Spinner } from "@/components/ui/Spinner";
import { Flag } from "@/components/ui/Flag";
import { MatrixPatternEditor } from "@/components/matrix/MatrixPatternEditor";
import { LatencyBars } from "@/components/node/LatencyBars";
import { QualityBars } from "@/components/node/QualityBars";
import { OverviewStatCard, type OverviewData } from "@/components/node/OverviewStatCard";
import { useHomeNodeSummaries } from "@/hooks/useNode";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useHourlyClock } from "@/hooks/useClock";
import { useThemeUpdate } from "@/hooks/useThemeUpdate";
import { queryClient } from "@/services/queryClient";
import {
  ApiRequestError,
  getAdminClients,
  getAdminPingTasks,
  getNodes,
  saveThemeSettings,
} from "@/services/api";
import type {
  AdminClient,
  OverviewCardId,
  PingLatencyColors,
  PingLatencyThresholds,
  PingLossColors,
  PingLossThresholds,
  PingOverviewBucket,
  PingTask,
  ThemeSettings,
  TrafficSpectrumColors,
} from "@/types/komari";
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
  HOMEPAGE_MULTI_PING_MIN_COUNT,
  isHomepageMultiPingConfigured,
  normalizeHomepageMultiPingTaskIds,
  normalizeHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import {
  DEFAULT_THEME_SETTINGS,
  DEFAULT_PING_LATENCY_COLORS,
  DEFAULT_PING_LATENCY_THRESHOLDS,
  DEFAULT_PING_LOSS_COLORS,
  DEFAULT_PING_LOSS_THRESHOLDS,
  DEFAULT_TRAFFIC_SPECTRUM_COLORS,
  STATUS_BAR_PRESETS,
  DEFAULT_OVERVIEW_CARDS,
  ALL_OVERVIEW_CARD_IDS,
  OVERVIEW_CARD_SLOT_COUNT,
  normalizeOverviewCards,
  normalizeThemeSettings,
  normalizePingLatencyColors,
  normalizePingLatencyThresholds,
  normalizePingLossColors,
  normalizePingLossThresholds,
  normalizeTrafficSpectrumColors,
  type ResolvedThemeSettings,
  type MatrixColorTheme,
  type MatrixBootEffect,
  type StatusBarPreset,
} from "@/utils/themeSettings";
import {
  buildTrafficQuotaSegmentColors,
} from "@/utils/metricTone";
import {
  getDefaultOverviewRatingLabelText,
  type OverviewRatingKind,
} from "@/utils/overviewRating";
import { HOME_SORT_FIELDS, HOME_SORT_FIELD_LABELS } from "@/utils/homeSort";

interface ColorThemeOption {
  id: MatrixColorTheme;
  label: string;
  badge: string;
  desc: string;
  colors: [string, string, string, string];
  badgeClass: string;
}

const COLOR_THEME_OPTIONS: ColorThemeOption[] = [
  {
    id: "default",
    label: "经典标准",
    badge: "CLASSIC",
    desc: "绿 · 橙 · 红 常规监控色阶",
    colors: ["#34d399", "#10b981", "#f59e0b", "#ef4444"],
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "eva",
    label: "EVA 初号机",
    badge: "UNIT-01",
    desc: "机体紫 · 荧光绿 · 警告橙 · 暴走红",
    colors: ["#7c3aed", "#00ff66", "#f97316", "#ef4444"],
    badgeClass: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30",
  },
  {
    id: "divergence",
    label: "命运石之门",
    badge: "1.048596%",
    desc: "待机暖杏橙 · 氖气放电暖橙 · 烈焰超频红橙",
    colors: ["#fdba74", "#f97316", "#ea580c", "#ef4444"],
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
  },
];

interface BootEffectOption {
  id: MatrixBootEffect;
  label: string;
  badge: string;
  desc: string;
  badgeClass: string;
}

const BOOT_EFFECT_OPTIONS: BootEffectOption[] = [
  {
    id: "laser-scan",
    label: "激光横扫 (Laser Scan)",
    badge: "RADAR",
    desc: "雷达光束自左向右横向扫描显影，纯正 SAO 机能扫描风格",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30",
  },
  {
    id: "digital-rain",
    label: "数码雨流 (Digital Rain)",
    badge: "CASCADE",
    desc: "流光瀑布自上而下交错倾泻显影，如矩阵代码雨般动态涌现",
    badgeClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300 border-cyan-500/30",
  },
  {
    id: "cyber-glitch",
    label: "神经故障 (Cyber Glitch)",
    badge: "OVERCLOCK",
    desc: "超频数码噪波高频爆闪显影，交错行撕裂重组与协议校准咬合",
    badgeClass: "bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-300 border-fuchsia-500/30",
  },
  {
    id: "divergence-flux",
    label: "世界线跳变 (Divergence Flux)",
    badge: "1.048596%",
    desc: "辉光数码管高频乱数脉冲跳动，自左向右逐位校验并锁定定格",
    badgeClass: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/30",
  },
];



const PREVIEW_LATENCY_SAMPLES = [
  15, 25, 40, 55, 65, 80, 95, 110, 130, 150, 165, 185, 195, 210, 260, 320,
];
const PREVIEW_LOSS_SAMPLES = [
  0, 0, 0, 1.2, 0, 0, 2.5, 0, 4.8, 7.5, 0, 12.0, 18.5, 0, 25.0, 0,
];

const PREVIEW_LATENCY_BUCKETS: PingOverviewBucket[] = PREVIEW_LATENCY_SAMPLES.map(
  (value, index) => ({
    index,
    total: 10,
    successful: 10,
    lost: 0,
    loss: 0,
    value,
    startAt: null,
    endAt: null,
  }),
);

const PREVIEW_LOSS_BUCKETS: PingOverviewBucket[] = PREVIEW_LOSS_SAMPLES.map(
  (loss, index) => ({
    index,
    total: 10,
    successful: Math.round(10 * (1 - loss / 100)),
    lost: Math.round(10 * (loss / 100)),
    loss,
    value: 40,
    startAt: null,
    endAt: null,
  }),
);

const LATENCY_TIER_CONFIG = [
  { key: "excellent" as const, label: "极好", hint: "极低延迟，最流畅体验", defaultColor: DEFAULT_PING_LATENCY_COLORS.excellent },
  { key: "good" as const, label: "良好", hint: "正常低延迟，无感知波动", defaultColor: DEFAULT_PING_LATENCY_COLORS.good },
  { key: "moderate" as const, label: "中等", hint: "稍有延迟，基本稳定可用", defaultColor: DEFAULT_PING_LATENCY_COLORS.moderate },
  { key: "elevated" as const, label: "偏高", hint: "高延迟警示，网络较吃紧", defaultColor: DEFAULT_PING_LATENCY_COLORS.elevated },
  { key: "critical" as const, label: "极高", hint: "严重延迟，极度拥堵或告警", defaultColor: DEFAULT_PING_LATENCY_COLORS.critical },
] as const;

const LOSS_TIER_CONFIG = [
  { key: "zero" as const, label: "无丢包 (0%)", hint: "网络通畅，零样本丢失", defaultColor: DEFAULT_PING_LOSS_COLORS.zero },
  { key: "low" as const, label: "轻微丢包", hint: "偶发微量丢包，基本可用", defaultColor: DEFAULT_PING_LOSS_COLORS.low },
  { key: "medium" as const, label: "中度丢包", hint: "较明显持续丢包，需注意", defaultColor: DEFAULT_PING_LOSS_COLORS.medium },
  { key: "high" as const, label: "严重丢包", hint: "严重丢包甚至失联脱网", defaultColor: DEFAULT_PING_LOSS_COLORS.high },
] as const;

const TRAFFIC_SPECTRUM_ANCHOR_CONFIG = [
  {
    key: "start" as const,
    label: "充裕健康色 (0% ~ 15%)",
    stage: "充裕健康期",
    hint: "初始充裕配额，健康充足状态",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.start,
  },
  {
    key: "mid" as const,
    label: "半程消耗色 (~50%)",
    stage: "半程过渡期",
    hint: "中位消耗阶段，稳定过渡",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.mid,
  },
  {
    key: "high" as const,
    label: "高耗预警色 (~80%)",
    stage: "高耗预警期",
    hint: "配额消耗过半，提示关注用量",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.high,
  },
  {
    key: "end" as const,
    label: "危险耗尽色 (100% 警报红)",
    stage: "耗尽警报红",
    hint: "临近或已耗尽，末端绝对保证警报红",
    defaultColor: DEFAULT_TRAFFIC_SPECTRUM_COLORS.end,
  },
] as const;

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
  scopeBadge: string;
  description: string;
  toggleKey: "showTrafficRating" | "showBandwidthRating" | "showAssetRating";
  tierHint: string;
  isBadge?: boolean;
}> = [
  {
    key: "traffic",
    title: "今日流量",
    scopeBadge: "卡片底部",
    description: "显示在「今日流量」卡片右下角，按当日用量定级。",
    toggleKey: "showTrafficRating",
    tierHint: "对应阶梯：≤10GB、≤50GB、≤200GB、>200GB",
  },
  {
    key: "bandwidth",
    title: "实时带宽",
    scopeBadge: "展台顶部",
    description: "显示在「集群展台」标题旁，实时反馈总吞吐负荷。",
    toggleKey: "showBandwidthRating",
    tierHint: "对应阶梯：≤1Mbps、≤10Mbps、≤100Mbps、>100Mbps",
    isBadge: true,
  },
  {
    key: "asset",
    title: "资产规模",
    scopeBadge: "卡片底部",
    description: "显示在「资产总值」卡片右下角，按总资产规模定级。",
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
    clusterOverviewMode: settings.clusterOverviewMode,
    matrixColorTheme: settings.matrixColorTheme,
    matrixBootEffect: settings.matrixBootEffect,
    matrixMockFill: settings.matrixMockFill,
    matrixBootAnimation: settings.matrixBootAnimation,
    matrixCustomPattern: settings.matrixCustomPattern,
    matrixUserPresets: settings.matrixUserPresets,
    homepagePingBindings: settings.homepagePingBindings,
    enableHomepageMultiPing: settings.enableHomepageMultiPing,
    homepageMultiPingTaskIds: settings.homepageMultiPingTaskIds,
    fakePingForUnbound: settings.fakePingForUnbound,
    pingLatencyThresholds: settings.pingLatencyThresholds,
    pingLatencyColors: settings.pingLatencyColors,
    pingLossThresholds: settings.pingLossThresholds,
    pingLossColors: settings.pingLossColors,
    trafficSpectrumColors: settings.trafficSpectrumColors,
    showHomeOverview: settings.showHomeOverview,
    overviewCards: settings.overviewCards,
    showGroupTabs: settings.showGroupTabs,
    showRegionBar: settings.showRegionBar,
    showCardGroup: settings.showCardGroup,
    homeGroupOrder: settings.homeGroupOrder,
    enableHomeSort: settings.enableHomeSort,
    homeSortField: settings.homeSortField,
    homeSortDirection: settings.homeSortDirection,
    showCostSummary: settings.showCostSummary,
    showCostSummaryFloatingButton: settings.showCostSummaryFloatingButton,
    showTrafficPageButton: settings.showTrafficPageButton,
    showTrafficPageForGuests: settings.showTrafficPageForGuests,
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

type ThemeTabId = "home" | "card" | "cost" | "feedback";

const THEME_TABS: ReadonlyArray<{
  id: ThemeTabId;
  label: string;
  hint: string;
  icon: typeof ListFilter;
}> = [
  { id: "home", label: "首页", hint: "外观、展台、权限与评级", icon: ListFilter },
  { id: "card", label: "服务器", hint: "视图、指标、排序与延迟", icon: Server },
  { id: "cost", label: "资产", hint: "费用统计与二手溢价", icon: CircleDollarSign },
  { id: "feedback", label: "反馈", hint: "问题反馈与设计建议", icon: MessageSquare },
];

const PROJECT_REPOS = [
  {
    id: "komari",
    name: "Komari SAO",
    tag: "Komari",
    repo: "WAOR/Komari-Theme-SAO",
    url: "https://github.com/WAOR/Komari-Theme-SAO",
    issuesUrl: "https://github.com/WAOR/Komari-Theme-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/Komari-Theme-SAO/issues/new",
    desc: "适配 Komari 探针的 SAO 风格主题。",
    isCurrent: true,
  },
  {
    id: "monitor",
    name: "Monitor SAO",
    tag: "Monitor 极简探针",
    repo: "WAOR/Monitor-SAO",
    url: "https://github.com/WAOR/Monitor-SAO",
    issuesUrl: "https://github.com/WAOR/Monitor-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/Monitor-SAO/issues/new",
    desc: "适配 Monitor 极简探针的 SAO 风格主题。",
    isCurrent: false,
  },
  {
    id: "cfsm",
    name: "CFSM SAO",
    tag: "Cloudflare Server Monitor",
    repo: "WAOR/CFSM-SAO",
    url: "https://github.com/WAOR/CFSM-SAO",
    issuesUrl: "https://github.com/WAOR/CFSM-SAO/issues",
    newIssueUrl: "https://github.com/WAOR/CFSM-SAO/issues/new",
    desc: "适配 CFSM (Cloudflare Server Monitor) 探针的 SAO 风格主题。",
    isCurrent: false,
  },
] as const;

const DEFAULT_THEME_TAB: ThemeTabId = "home";

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

function SiteSyncIndicator({
  phase,
  invalid,
  waiting,
  onRetry,
}: {
  phase: "idle" | "saving" | "synced" | "error";
  invalid: boolean;
  waiting: boolean;
  onRetry?: () => void;
}) {
  const [icon, text] = invalid
    ? [<CloudAlert key="invalid" size={14} />, "存在未完成的设置项"]
    : phase === "saving" || waiting
      ? [<RefreshCw key="syncing" size={14} className="animate-spin" />, "正在同步到后端…"]
      : phase === "synced"
        ? [<Cloud key="synced" size={14} />, "已同步到后端"]
        : phase === "error"
          ? [<CloudAlert key="error" size={14} />, "同步失败，点击重试"]
          : [<Cloud key="idle" size={14} />, "改动会自动同步到后端"];

  return (
    <button
      type="button"
      onClick={phase === "error" ? onRetry : undefined}
      disabled={phase !== "error"}
      className={clsx(
        "theme-manage-sync-status",
        (invalid || phase === "error") && "is-error",
        phase === "error" && "cursor-pointer hover:underline",
      )}
    >
      {icon}
      <span>{text}</span>
    </button>
  );
}

export function ThemeManage() {
  const now = useHourlyClock();
  const { currentVersion } = useThemeUpdate();
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
  const rawTab = tabParam === "ping" ? "card" : tabParam;
  const activeTab: ThemeTabId = isThemeTabId(rawTab) ? rawTab : DEFAULT_THEME_TAB;
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

  const [syncPhase, setSyncPhase] = useState<"idle" | "saving" | "synced" | "error">("idle");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveFlushRef = useRef<(() => void) | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accessRevoked, setAccessRevoked] = useState(false);

  // 右上角悬浮气泡 Toast（fixed 脱离文档流，0 挤动页面布局，3 秒自动淡出）
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  }, []);
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

  const patchPingLatencyThreshold = useCallback(
    (key: keyof PingLatencyThresholds, val: number) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLatencyThresholds: {
          ...prev.pingLatencyThresholds,
          [key]: val,
        },
      }));
    },
    [],
  );

  const patchPingLatencyColor = useCallback(
    (key: keyof PingLatencyColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLatencyColors: {
          ...prev.pingLatencyColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const resetPingLatency = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      pingLatencyThresholds: DEFAULT_PING_LATENCY_THRESHOLDS,
      pingLatencyColors: DEFAULT_PING_LATENCY_COLORS,
    }));
  }, []);

  const patchPingLossThreshold = useCallback(
    (key: keyof PingLossThresholds, val: number) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLossThresholds: {
          ...prev.pingLossThresholds,
          [key]: val,
        },
      }));
    },
    [],
  );

  const patchPingLossColor = useCallback(
    (key: keyof PingLossColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        pingLossColors: {
          ...prev.pingLossColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const resetPingLoss = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      pingLossThresholds: DEFAULT_PING_LOSS_THRESHOLDS,
      pingLossColors: DEFAULT_PING_LOSS_COLORS,
    }));
  }, []);

  const patchTrafficSpectrumColor = useCallback(
    (key: keyof TrafficSpectrumColors, hex: string) => {
      editVersionRef.current += 1;
      setDraft((prev) => ({
        ...prev,
        trafficSpectrumColors: {
          ...prev.trafficSpectrumColors,
          [key]: hex,
        },
      }));
    },
    [],
  );

  const applyStatusBarPreset = useCallback((preset: StatusBarPreset) => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      trafficSpectrumColors: { ...preset.colors },
      pingLatencyColors: { ...preset.latencyColors },
      pingLossColors: { ...preset.lossColors },
    }));
  }, []);

  const resetTrafficSpectrum = useCallback(() => {
    editVersionRef.current += 1;
    setDraft((prev) => ({
      ...prev,
      trafficSpectrumColors: DEFAULT_TRAFFIC_SPECTRUM_COLORS,
    }));
  }, []);

  const previewTrafficSegmentColors = useMemo(
    () => buildTrafficQuotaSegmentColors(draft.trafficSpectrumColors),
    [draft.trafficSpectrumColors],
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

  const currentOverviewCards = useMemo(
    () => normalizeOverviewCards(draft.overviewCards),
    [draft.overviewCards],
  );

  const [poolCards, setPoolCards] = useState<OverviewCardId[]>(() => {
    const current = normalizeOverviewCards(draft.overviewCards);
    return ALL_OVERVIEW_CARD_IDS.filter((id) => !current.includes(id));
  });

  useEffect(() => {
    setPoolCards((prev) => {
      const currentSet = new Set(currentOverviewCards);
      const remainingCards = ALL_OVERVIEW_CARD_IDS.filter((id) => !currentSet.has(id));
      const kept = prev.filter((id) => !currentSet.has(id));
      const missing = remainingCards.filter((id) => !kept.includes(id));
      const next = [...kept, ...missing];
      if (
        next.length === prev.length &&
        next.every((id, idx) => id === prev[idx])
      ) {
        return prev;
      }
      return next;
    });
  }, [currentOverviewCards]);

  const [draggingCard, setDraggingCard] = useState<{
    source: "slot" | "pool";
    cardId: OverviewCardId;
    slotIndex?: number;
  } | null>(null);
  const [dragOverSlotIndex, setDragOverSlotIndex] = useState<number | null>(null);
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);

  const swapSlots = (indexA: number, indexB: number) => {
    if (indexA === indexB || indexA < 0 || indexA >= OVERVIEW_CARD_SLOT_COUNT || indexB < 0 || indexB >= OVERVIEW_CARD_SLOT_COUNT) return;
    const next = [...currentOverviewCards];
    [next[indexA], next[indexB]] = [next[indexB], next[indexA]];
    patch("overviewCards", next);
  };

  const replaceSlot = (slotIndex: number, newCardId: OverviewCardId) => {
    if (slotIndex < 0 || slotIndex >= OVERVIEW_CARD_SLOT_COUNT) return;
    const oldCardId = currentOverviewCards[slotIndex];
    if (oldCardId === newCardId) return;

    setPoolCards((prev) => {
      const idx = prev.indexOf(newCardId);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = oldCardId;
        return next;
      }
      return prev;
    });

    const next = [...currentOverviewCards];
    next[slotIndex] = newCardId;
    patch("overviewCards", normalizeOverviewCards(next));
    setSelectedSlotIndex(null);
  };

  const resetOverviewCards = () => {
    patch("overviewCards", [...DEFAULT_OVERVIEW_CARDS]);
    setPoolCards(ALL_OVERVIEW_CARD_IDS.filter((id) => !DEFAULT_OVERVIEW_CARDS.includes(id)));
    setSelectedSlotIndex(null);
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

  const canAddMultiPingTask = sortedTasks.some(
    (task) => !draft.homepageMultiPingTaskIds.includes(task.id),
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
      const availableTask = sortedTasks.find((task) => !current.includes(task.id));
      if (!availableTask) return current;
      return [...current, availableTask.id];
    });
  }, [commitMultiPingTaskIds, sortedTasks]);

  const location = useLocation();
  const toHome = useMemo(() => {
    const params = new URLSearchParams(location.search);
    params.delete("view");
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }, [location.search]);

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

  const nodeSummaries = useHomeNodeSummaries();
  const realOverview = useMemo<OverviewData | undefined>(() => {
    if (!nodeSummaries || nodeSummaries.length === 0) return undefined;
    let onlineNodes = 0;
    let offlineNodes = 0;
    let trafficUp = 0;
    let trafficDown = 0;
    let netUp = 0;
    let netDown = 0;
    let totalCpu = 0;
    let totalRamUsed = 0;
    let totalRamTotal = 0;
    let totalSwapUsed = 0;
    let totalSwapTotal = 0;
    let totalDiskUsed = 0;
    let totalDiskTotal = 0;
    let totalTcpConn = 0;
    let totalUdpConn = 0;
    let totalProcesses = 0;

    for (const node of nodeSummaries) {
      if (node.online === true) onlineNodes++;
      else if (node.online === false) offlineNodes++;

      trafficUp += node.trafficUp || 0;
      trafficDown += node.trafficDown || 0;
      netUp += node.netUp || 0;
      netDown += node.netDown || 0;
      totalCpu += node.cpuPct || 0;
      totalRamUsed += node.ramUsed || 0;
      totalRamTotal += node.ramTotal || 0;
      totalSwapUsed += node.swapUsed || 0;
      totalSwapTotal += node.swapTotal || 0;
      totalDiskUsed += node.diskUsed || 0;
      totalDiskTotal += node.diskTotal || 0;
      totalTcpConn += node.connectionsTcp || 0;
      totalUdpConn += node.connectionsUdp || 0;
      totalProcesses += node.process || 0;
    }

    const totalNodes = onlineNodes + offlineNodes;
    const avgCpu = onlineNodes > 0 ? totalCpu / onlineNodes : 0;

    return {
      totalNodes,
      onlineNodes,
      offlineNodes,
      trafficUp,
      trafficDown,
      netUp,
      netDown,
      avgCpu,
      totalRamUsed,
      totalRamTotal,
      ramPct: totalRamTotal > 0 ? (totalRamUsed / totalRamTotal) * 100 : 0,
      totalDiskUsed,
      totalDiskTotal,
      diskPct: totalDiskTotal > 0 ? (totalDiskUsed / totalDiskTotal) * 100 : 0,
      totalTcpConn,
      totalUdpConn,
      totalSwapUsed,
      totalSwapTotal,
      swapPct: totalSwapTotal > 0 ? (totalSwapUsed / totalSwapTotal) * 100 : 0,
      totalProcesses,
      totalCores: allMeta.length > 0 ? allMeta.reduce((sum, n) => sum + (n.cpu_cores || 0), 0) : 0,
    };
  }, [nodeSummaries, allMeta]);
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

  const realCostSummary = useMemo(() => {
    if (!premiumRateQuery.data || allMeta.length === 0) return null;
    return calculateCostSummary(
      allMeta,
      sourceThemeSettings.costIgnoredNodes,
      premiumRateQuery.data.rates,
      undefined,
      now,
    );
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
function draftToThemeSettings(targetDraft: ThemeDraft): ThemeSettings {
  const {
    ratingLabels,
    hiddenNodesText,
    costIgnoredText,
    ...rest
  } = targetDraft;
  return {
    ...rest,
    pingLatencyThresholds: normalizePingLatencyThresholds(rest.pingLatencyThresholds),
    pingLatencyColors: normalizePingLatencyColors(rest.pingLatencyColors),
    pingLossThresholds: normalizePingLossThresholds(rest.pingLossThresholds),
    pingLossColors: normalizePingLossColors(rest.pingLossColors),
    trafficSpectrumColors: normalizeTrafficSpectrumColors(rest.trafficSpectrumColors),
    overviewCards: normalizeOverviewCards(rest.overviewCards),
    homepagePingBindings: pruneBindings(rest.homepagePingBindings),
    homeGroupOrder: normalizeHomeGroupOrder(rest.homeGroupOrder),
    trafficRatingLabels: ratingLabels.traffic,
    bandwidthRatingLabels: ratingLabels.bandwidth,
    assetRatingLabels: ratingLabels.asset,
    hiddenNodes: normalizeNodeIdentityList(hiddenNodesText),
    costIgnoredNodes: normalizeCostIgnoredNodes(costIgnoredText),
    costPremiums: normalizeCostPremiums(rest.costPremiums),
    costRateApiUrl: normalizeCostRateApiUrl(rest.costRateApiUrl),
  };
}

  const draftThemeSettings = useMemo<ThemeSettings>(
    () => draftToThemeSettings(draft),
    [draft],
  );

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
    normalizeCostRateApiUrl(draft.costRateApiUrl) !==
    normalizeCostRateApiUrl(sourceThemeSettings.costRateApiUrl);
  const isDirty =
    draftSignature !== sourceSignature ||
    costRateApiUrlDirty;

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

  const handleSave = async (overrideDraft?: Partial<ThemeDraft>) => {
    if (
      !config?.theme ||
      savingDraftRef.current ||
      draftCostRateApiUrlInvalid ||
      draftMultiPingInvalid
    ) {
      return;
    }
    const currentDraft = overrideDraft ? { ...draft, ...overrideDraft } : draft;
    if (overrideDraft) {
      setDraft(currentDraft);
    }
    const currentDraftThemeSettings = draftToThemeSettings(currentDraft);
    const submittedEditVersion = editVersionRef.current;
    savingDraftRef.current = currentDraft;
    setSyncPhase("saving");
    setError(null);
    setMessage(null);
    try {
      const nextSettings: ThemeSettings & Record<string, unknown> = {
        ...(config.theme_settings ?? {}),
        ...currentDraftThemeSettings,
      };
      const savePromise = saveThemeSettings(config.theme, nextSettings);
      const minDelayPromise = new Promise((resolve) => setTimeout(resolve, 260));
      await Promise.all([savePromise, minDelayPromise]);
      lastSeededSignatureRef.current = managedSettingsSignature(nextSettings);
      await queryClient.invalidateQueries({ queryKey: ["public"] });
      if (editVersionRef.current === submittedEditVersion) {
        setSyncPhase("synced");
        setTimeout(() => {
          setSyncPhase((current) => (current === "synced" ? "idle" : current));
        }, 3000);
      }
    } catch (saveError) {
      setSyncPhase("error");
      if (
        saveError instanceof ApiRequestError &&
        (saveError.status === 401 || saveError.status === 403)
      ) {
        showToast("同步失败：管理员未登录或凭据已失效");
        setAccessRevoked(true);
        return;
      }
      const errMsg = saveError instanceof Error ? saveError.message : "同步失败";
      showToast(errMsg);
      setError(errMsg);
      throw saveError;
    } finally {
      savingDraftRef.current = null;
      }
  };

  const THEME_AUTO_SAVE_DEBOUNCE_MS = 800;
  const draftAwaitingAutoSave = isDirty && syncPhase !== "saving";

  useEffect(() => {
    if (!config || editVersionRef.current === 0) return;
    if (!isDirty) return;
    if (draftCostRateApiUrlInvalid || draftMultiPingInvalid) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      autoSaveFlushRef.current = null;
      return;
    }

    const performSave = () => {
      autoSaveFlushRef.current = null;
      void handleSave();
    };

    autoSaveFlushRef.current = performSave;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(performSave, THEME_AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    config,
    draftCostRateApiUrlInvalid,
    draftMultiPingInvalid,
    isDirty,
    draftSignature,
  ]);

  useEffect(() => {
    return () => {
      if (autoSaveFlushRef.current) {
        autoSaveFlushRef.current();
      }
    };
  }, []);

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
          <Link to={toHome} className="control-button px-4 py-2 text-[13px] font-medium">
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
  const acquiredAtMax = localDateInputMax();

  return (
    <div className="theme-manage flex flex-col gap-5 py-2">
      {/* 右上角悬浮气泡 Toast（fixed 绝对定位，绝不挤压页面任何布局，3秒自动淡出） */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-5 right-5 z-9999 flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-2xl border border-emerald-500/35 bg-(--bg-card)/95 backdrop-blur-md text-xs font-semibold text-emerald-600 dark:text-emerald-400 pointer-events-auto"
        >
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="ml-1 text-(--text-muted) hover:text-(--text-primary) transition-colors text-xs leading-none"
            title="关闭通知"
          >
            ✕
          </button>
        </div>
      )}

      <header className="theme-topbar">
        <Link to={toHome} className="instance-page-back theme-topbar-back">
          <ArrowLeft size={14} />
          <span>返回首页</span>
        </Link>
        <h1 className="theme-topbar-title">主题设置</h1>
        <div className="theme-manage-toolbar-actions">
          <SiteSyncIndicator
            phase={syncPhase}
            invalid={draftCostRateApiUrlInvalid || draftMultiPingInvalid}
            waiting={draftAwaitingAutoSave}
            onRetry={() => void handleSave()}
          />
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
          {activeTab === "home" && (
            <>
              <InstancePanel
                kicker="外观"
                title="显示外观"
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
                kicker="总览"
                title="监控总览"
                aside={<Layers size={16} />}
              >
                <ToggleRow
                  field="showHomeOverview"
                  title="监控总览"
                  desc="在首页顶部展示监控总览模块。"
                  checked={draft.showHomeOverview}
                  onPatch={patch}
                />

                {(draft.showHomeOverview ?? true) && (
                  <div className="mt-4 flex flex-col gap-5">
                    {/* 模块 1：配色方案 */}
                    <div
                      className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
                      data-palette={draft.matrixColorTheme || "default"}
                    >
                      {/* 模块头部：标题 + 当前生效角标 */}
                      <div className="flex items-center justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                            <Palette size={14} className="text-(--accent-500)" />
                            <span>配色方案</span>
                          </div>
                          <p className="text-[11px] text-(--text-muted) mt-0.5">
                            联动指标小卡、集群展台（经典双曲线与方格矩阵）的主题色彩体系。
                          </p>
                        </div>
                        {(() => {
                          const currentOpt = COLOR_THEME_OPTIONS.find(
                            (opt) => opt.id === (draft.matrixColorTheme ?? "default"),
                          ) ?? COLOR_THEME_OPTIONS[0];
                          return (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${currentOpt.badgeClass}`}
                            >
                              {currentOpt.badge}
                            </span>
                          );
                        })()}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
                        {COLOR_THEME_OPTIONS.map((opt) => {
                          const isSelected = (draft.matrixColorTheme ?? "default") === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => patch("matrixColorTheme", opt.id)}
                              data-active={isSelected ? "true" : "false"}
                              aria-pressed={isSelected}
                              className={`setting-color-theme-card ${opt.id === "eva" ? "is-eva" : opt.id === "divergence" ? "is-divergence" : ""}`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="flex items-center gap-1 shrink-0 p-1 rounded-md bg-(--bg-card) border border-(--hairline)">
                                  {opt.colors.map((c, i) => (
                                    <span
                                      key={i}
                                      className="w-2.5 h-2.5 rounded-xs"
                                      style={{ backgroundColor: c }}
                                    />
                                  ))}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-medium text-(--text-primary) block truncate">
                                    {opt.label}
                                  </span>
                                  <span className="text-[10px] text-(--text-muted) block truncate">
                                    {opt.desc}
                                  </span>
                                </div>
                              </div>
                              <div className="setting-color-theme-radio" aria-hidden="true">
                                {isSelected && (
                                  <div className="setting-color-theme-radio-dot" />
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 模块 2：指标小卡定制（6 槽位 + 备选抽屉） */}
                    <div
                      className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
                      data-palette={draft.matrixColorTheme || "default"}
                    >
                      {/* 模块头部：标题 + 状态角标 + 恢复默认按钮 */}
                      <div className="flex items-start justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                            <span>指标小卡定制</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                              固定 6 槽位
                            </span>
                          </div>
                          <p className="text-[11px] text-(--text-muted) mt-0.5">
                            展示在首页的核心小卡片。可调换位置或更换指标。
                          </p>
                        </div>
                        <button
                          type="button"
                          className="theme-reset-pill-btn shrink-0 whitespace-nowrap"
                          onClick={resetOverviewCards}
                          title="恢复官方默认 6 卡片配置与排序"
                        >
                          <RotateCcw size={12} strokeWidth={2.2} />
                          <span>重置</span>
                        </button>
                      </div>

                      {/* 1. 首页 6 槽位虚线卡片网格 (3x2 布局，1:1 所见即所得) */}
                      <div className="rounded-xl border border-dashed border-(--hairline) bg-[color-mix(in_srgb,var(--surface-inset)_35%,var(--bg-card))] p-3 sm:p-3.5 mb-4">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <LayoutGrid size={13} className="text-(--text-muted)" />
                            <span className="text-[11px] font-semibold text-(--text-secondary)">
                              展示卡池
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-(--hairline) bg-(--bg-card) text-(--text-muted)">
                              6 槽展示中
                            </span>
                          </div>
                          <span className="text-[10px] text-(--text-muted)">
                            <span className="theme-manage-guide-mouse">拖拽调序，点击对调或更换</span>
                            <span className="theme-manage-guide-touch">点两张卡对调，点闲置卡更换</span>
                          </span>
                        </div>

                        {selectedSlotIndex !== null && (
                          <div className="mb-2.5 px-3 py-1.5 rounded-xl bg-(--accent-500)/10 border border-(--accent-500)/30 flex items-center justify-between gap-2 shadow-xs transition-all animate-fade-in">
                            <div className="flex items-center gap-1.5 min-w-0 text-xs">
                              <span className="inline-flex items-center justify-center h-4.5 px-1.5 text-[10px] font-mono font-bold rounded-full bg-(--accent-500) text-white shrink-0">
                                #{selectedSlotIndex + 1}
                              </span>
                              <span className="font-semibold text-(--accent-500) shrink-0">
                                已选中
                              </span>
                              <span className="text-[11px] text-(--text-secondary) truncate">
                                点其他卡对调位置，或点下方备选卡更换
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSlotIndex(null);
                              }}
                              className="p-1 rounded-md text-(--text-muted) hover:text-(--text-primary) hover:bg-(--accent-500)/20 transition-colors cursor-pointer shrink-0"
                              title="取消选择"
                              aria-label="取消选择"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {currentOverviewCards.map((cardId, slotIndex) => {
                            const isBeingDragged = draggingCard?.source === "slot" && draggingCard.slotIndex === slotIndex;
                            const isDragOver = dragOverSlotIndex === slotIndex;
                            const isSelected = selectedSlotIndex === slotIndex;

                            return (
                              <div
                                key={`slot-${slotIndex}-${cardId}`}
                                onDragOver={(e) => {
                                  e.preventDefault();
                                  e.dataTransfer.dropEffect = "move";
                                  if (dragOverSlotIndex !== slotIndex) setDragOverSlotIndex(slotIndex);
                                }}
                                onDragLeave={() => {
                                  if (dragOverSlotIndex === slotIndex) setDragOverSlotIndex(null);
                                }}
                                onDrop={(e) => {
                                  e.preventDefault();
                                  setDragOverSlotIndex(null);
                                  if (!draggingCard) return;
                                  if (draggingCard.source === "slot") {
                                    if (draggingCard.slotIndex !== undefined) {
                                      swapSlots(draggingCard.slotIndex, slotIndex);
                                    }
                                  } else if (draggingCard.source === "pool") {
                                    replaceSlot(slotIndex, draggingCard.cardId);
                                  }
                                  setDraggingCard(null);
                                }}
                                onClick={() => {
                                  if (selectedSlotIndex === null) {
                                    setSelectedSlotIndex(slotIndex);
                                  } else if (selectedSlotIndex === slotIndex) {
                                    setSelectedSlotIndex(null);
                                  } else {
                                    swapSlots(selectedSlotIndex, slotIndex);
                                    setSelectedSlotIndex(null);
                                  }
                                }}
                                className={`group relative rounded-2xl border-2 border-dashed p-1.5 transition-all select-none cursor-pointer ${
                                  isDragOver
                                    ? "border-(--accent-500) bg-(--accent-500)/15 scale-[1.02] shadow-lg ring-2 ring-(--accent-500)/40"
                                    : isSelected
                                      ? "border-(--accent-500) bg-(--accent-500)/10 ring-2 ring-(--accent-500)/50 shadow-md"
                                      : "border-(--hairline) bg-(--bg-card)/40 hover:border-(--accent-500)/50 hover:bg-(--surface-elev)/40"
                                }`}
                              >
                                {/* 右上角极简槽位序号徽章 */}
                                <div className="absolute top-3 right-3 z-10 pointer-events-none">
                                  <span className={`inline-flex items-center justify-center h-4.5 px-1.5 text-[10px] font-mono font-bold rounded-full backdrop-blur-sm border shadow-xs transition-all ${
                                    isSelected
                                      ? "bg-(--accent-500) text-white border-(--accent-500) scale-110 shadow-(--accent-500)/30"
                                      : "bg-(--bg-card)/80 text-(--text-muted) border-(--hairline) group-hover:border-(--accent-500)/40 group-hover:text-(--accent-500)"
                                  }`}>
                                    #{slotIndex + 1}
                                  </span>
                                </div>

                                {/* 所见即所得：真实指标卡实体，支持拖拽 */}
                                <div
                                  draggable
                                  onDragStart={(e) => {
                                    e.dataTransfer.setData("text/plain", cardId);
                                    setDraggingCard({ source: "slot", cardId, slotIndex });
                                  }}
                                  onDragEnd={() => {
                                    setDraggingCard(null);
                                    setDragOverSlotIndex(null);
                                  }}
                                  className={`transition-opacity cursor-grab active:cursor-grabbing ${
                                    isBeingDragged ? "opacity-30" : "opacity-100"
                                  }`}
                                  title="按住卡片直接拖动调换顺序，或点击选中后在下方选择替换"
                                >
                                  <OverviewStatCard
                                    cardId={cardId}
                                    overview={realOverview}
                                    costSummary={realCostSummary}
                                    className="w-full pointer-events-none shadow-none"
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 2. 备选指标卡片池 (明确作为指标小卡的内嵌收纳抽屉) */}
                      <div className="rounded-xl border border-dashed border-(--hairline) bg-[color-mix(in_srgb,var(--surface-inset)_65%,var(--bg-card))] p-3 sm:p-3.5">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <PackagePlus size={13} className="text-(--text-muted)" />
                            <span className="text-[11px] font-semibold text-(--text-secondary)">
                              闲置卡池
                            </span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-(--hairline) bg-(--bg-card) text-(--text-muted)">
                              {poolCards.length} 张可用
                            </span>
                          </div>
                          <span className="text-[10px] text-(--text-muted)">
                            {selectedSlotIndex !== null ? (
                              <span className="text-(--accent-500) font-medium">
                                点击卡片直接换入 #{selectedSlotIndex + 1}
                              </span>
                            ) : (
                              <>
                                <span className="theme-manage-guide-mouse">
                                  拖入上方或点击换入
                                </span>
                                <span className="theme-manage-guide-touch">
                                  点上方卡片后点此换入
                                </span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                          {poolCards.map((cardId) => {
                            const isBeingDragged = draggingCard?.source === "pool" && draggingCard.cardId === cardId;

                            return (
                              <div
                                key={`pool-${cardId}`}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("text/plain", cardId);
                                  setDraggingCard({ source: "pool", cardId });
                                }}
                                onDragEnd={() => {
                                  setDraggingCard(null);
                                  setDragOverSlotIndex(null);
                                }}
                                onDragOver={(e) => {
                                  if (draggingCard?.source === "slot") {
                                    e.preventDefault();
                                  }
                                }}
                                onDrop={(e) => {
                                  if (draggingCard?.source === "slot" && draggingCard.slotIndex !== undefined) {
                                    e.preventDefault();
                                    replaceSlot(draggingCard.slotIndex, cardId);
                                    setDraggingCard(null);
                                  }
                                }}
                                onClick={() => {
                                  if (selectedSlotIndex !== null) {
                                    replaceSlot(selectedSlotIndex, cardId);
                                  }
                                }}
                                className={`rounded-xl transition-all cursor-grab active:cursor-grabbing select-none ${
                                  isBeingDragged ? "opacity-30 scale-95" : "opacity-90 hover:opacity-100 hover:scale-[1.01]"
                                } ${
                                  selectedSlotIndex !== null
                                    ? "ring-2 ring-(--accent-500)/60 shadow-md cursor-pointer hover:ring-(--accent-500)"
                                    : ""
                                }`}
                                title={
                                  selectedSlotIndex !== null
                                    ? `点击放入 #${selectedSlotIndex + 1} 槽位`
                                    : "按住拖拽至上方槽位进行替换"
                                }
                              >
                                <OverviewStatCard
                                  cardId={cardId}
                                  overview={realOverview}
                                  costSummary={realCostSummary}
                                  className="w-full pointer-events-none shadow-xs"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 模块 2：右侧 · 集群主展台呈现 */}
                    <div
                      id="set-cluster-overview-mode"
                      className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 mb-4 border-b border-(--hairline)">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                            <span>集群主展台呈现</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                              {draft.clusterOverviewMode === "nodes" ? "方格矩阵" : "经典布局"}
                            </span>
                          </div>
                          <p className="text-[11px] text-(--text-muted) mt-0.5">
                            对应首页右侧主展台形态。可呈现双曲线图或方格机架矩阵。
                          </p>
                        </div>
                      </div>

                      <div className="setting-mode-cards">
                        {[
                          {
                            value: "classic" as const,
                            label: "经典布局",
                            desc: "展示在线率与实时上下行带宽双曲线图。",
                            icon: Layers,
                          },
                          {
                            value: "nodes" as const,
                            label: "方格矩阵",
                            desc: "以机架方块直观排查每台机器负载与健康。",
                            icon: LayoutGrid,
                          },
                        ].map(({ value, label, desc, icon: ModeIcon }) => {
                          const isActive = (draft.clusterOverviewMode ?? "classic") === value;
                          return (
                            <button
                              key={value}
                              type="button"
                              onClick={() => patch("clusterOverviewMode", value)}
                              data-active={isActive ? "true" : "false"}
                              aria-pressed={isActive}
                              className="setting-mode-card"
                            >
                              <div className="setting-mode-card-head">
                                <div className="setting-mode-card-title">
                                  <ModeIcon size={15} />
                                  <span>{label}</span>
                                </div>
                                <div className="setting-mode-card-radio" aria-hidden="true">
                                  <div className="setting-mode-card-radio-dot" />
                                </div>
                              </div>
                              <div className="setting-mode-card-desc">{desc}</div>
                            </button>
                          );
                        })}
                      </div>

                      {/* 当切换到「方格矩阵」时，直接在容器内展开专属定制项 */}
                      {draft.clusterOverviewMode === "nodes" && (
                        <div className="mt-4 pt-4 border-t border-(--hairline) space-y-4">
                          {/* 1. SAO 主题开场动画 */}
                          <div>
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                                  <span>开屏动画</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                                    BOOT INTRO
                                  </span>
                                </div>
                                <p className="text-[11px] text-(--text-muted) mt-0.5">
                                  进入首页时播放光效开屏动画，随后载入数据。
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={draft.matrixBootAnimation ?? true}
                                onChange={(event) => patch("matrixBootAnimation", event.target.checked)}
                                className="h-4 w-4 shrink-0 accent-(--accent-500)"
                              />
                            </label>

                            {/* 开场点阵图案自定义画布与动效形式（仅在开启开场动画时展开） */}
                            {(draft.matrixBootAnimation ?? true) && (
                              <div className="mt-3.5 space-y-4">
                                {/* 动效形式独立选择器 */}
                                <div className="rounded-xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-3 sm:p-3.5">
                                  <div className="flex items-center justify-between gap-2 mb-2.5">
                                    <div>
                                      <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                                        <span>动效样式</span>
                                        {(() => {
                                          const currentEffect =
                                            BOOT_EFFECT_OPTIONS.find(
                                              (e) => e.id === (draft.matrixBootEffect ?? "laser-scan"),
                                            ) ?? BOOT_EFFECT_OPTIONS[0];
                                          return (
                                            <span
                                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${currentEffect.badgeClass}`}
                                            >
                                              {currentEffect.badge}
                                            </span>
                                          );
                                        })()}
                                      </div>
                                      <p className="text-[11px] text-(--text-muted) mt-0.5">
                                        选择开屏画面的入场动效样式。
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    {BOOT_EFFECT_OPTIONS.map((opt) => {
                                      const isSelected = (draft.matrixBootEffect ?? "laser-scan") === opt.id;
                                      return (
                                        <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => patch("matrixBootEffect", opt.id)}
                                          data-active={isSelected ? "true" : "false"}
                                          aria-pressed={isSelected}
                                          className="setting-color-theme-card"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1.5">
                                                <span className="text-xs font-medium text-(--text-primary) truncate">
                                                  {opt.label}
                                                </span>
                                              </div>
                                              <span className="text-[10px] text-(--text-muted) block truncate mt-0.5">
                                                {opt.desc}
                                              </span>
                                            </div>
                                          </div>
                                          <div className="setting-color-theme-radio" aria-hidden="true">
                                            {isSelected && (
                                              <div className="setting-color-theme-radio-dot" />
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* 点阵画板 */}
                                <MatrixPatternEditor
                                  value={draft.matrixCustomPattern}
                                  userPresets={draft.matrixUserPresets}
                                  colorTheme={draft.matrixColorTheme ?? "default"}
                                  bootEffect={draft.matrixBootEffect ?? "laser-scan"}
                                  onApply={async (pattern) => {
                                    patch("matrixCustomPattern", pattern);
                                    try {
                                      await handleSave({ matrixCustomPattern: pattern });
                                      showToast("已将点阵图案应用到首页并保存生效");
                                    } catch {
                                      showToast("已应用到画板，请点击右上角保存");
                                    }
                                  }}
                                  onSaveUserPresets={async (presets) => {
                                    patch("matrixUserPresets", presets);
                                    try {
                                      await handleSave({ matrixUserPresets: presets });
                                      showToast("用户预设已更新并保存生效");
                                    } catch {
                                      showToast("预设已更新，请点击右上角保存");
                                    }
                                  }}
                                />
                              </div>
                            )}
                          </div>

                          {/* 2. 模拟数据填充空闲机位插槽 */}
                          <div className="pt-3.5 border-t border-(--hairline)">
                            <label className="flex items-center justify-between gap-3 cursor-pointer">
                              <div className="min-w-0">
                                <div className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
                                  <span>模拟数据填充空闲机位插槽</span>
                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-500/30">
                                    MOCK FILL
                                  </span>
                                </div>
                                <p className="text-[11px] text-(--text-muted) mt-0.5">
                                  开启后，机架方格矩阵中未接入服务器的闲置插槽将使用模拟数据填满，并在运行期间周期性随机变幻「空闲待机」、「活跃传输」与「高吞吐」状态及吞吐速率，令机架方格更显生机灵动。
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                checked={draft.matrixMockFill ?? false}
                                onChange={(event) => patch("matrixMockFill", event.target.checked)}
                                className="h-4 w-4 shrink-0 accent-(--accent-500)"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </InstancePanel>

              <InstancePanel
                kicker="权限"
                title="访客权限"
                aside={<Compass size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div>
                    <span className="setting-subhead-title block mb-2">卡片操作入口</span>
                    <div className="grid gap-3 md:grid-cols-3">
                      <ToggleRow
                        field="showTrafficPageButton"
                        title="流量入口"
                        desc="在流量卡片右上角显示图表按钮，直达统计页。"
                        checked={draft.showTrafficPageButton}
                        onPatch={patch}
                      />
                      <ToggleRow
                        field="showCostSummary"
                        title="资产入口"
                        desc="在资产卡片显示进入按钮；未公开时仅管理员可见。"
                        checked={draft.showCostSummary}
                        onPatch={patch}
                      />
                      <ToggleRow
                        field="showCostSummaryFloatingButton"
                        title="悬浮入口"
                        desc="在右下角悬浮显示资产入口，未显示卡片时生效。"
                        checked={draft.showCostSummaryFloatingButton}
                        onPatch={patch}
                      />
                    </div>
                  </div>

                  <div className="border-t border-(--border-subtle) pt-3">
                    <span className="setting-subhead-title block mb-2">访客公开与可见性权限</span>
                    <div className="grid gap-3 md:grid-cols-2">
                      <ToggleRow
                        field="showTrafficPageForGuests"
                        title="公开流量"
                        desc="允许访客点击流量卡片入口，查看用量明细。"
                        checked={draft.showTrafficPageForGuests}
                        onPatch={patch}
                      />
                      <ToggleRow
                        field="showPriceForGuests"
                        title="公开资产"
                        desc="允许访客查看机器价格与资产总额，关闭则保密。"
                        checked={draft.showPriceForGuests}
                        onPatch={patch}
                      />
                    </div>
                  </div>
                </div>
              </InstancePanel>

              <InstancePanel
                kicker="评级"
                title="状态评级"
                aside={<ListFilter size={16} />}
              >
                <div className="grid gap-3 md:grid-cols-3">
                  {OVERVIEW_RATING_LABEL_FIELDS.map((field) => {
                    const defaultLabel = getDefaultOverviewRatingLabelText(field.key);
                    const ratingEnabled = draft[field.toggleKey];
                    return (
                      <div
                        key={field.key}
                        className={`surface-inset flex min-w-0 flex-col gap-2.5 px-4 py-3 transition-colors ${
                          field.isBadge ? "border-l-2 border-l-(--accent-500)" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="setting-subhead-title">{field.title}</span>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                  field.isBadge
                                    ? "bg-(--accent-500)/15 text-(--accent-400) border border-(--accent-500)/30"
                                    : "bg-white/5 text-(--text-muted) border border-white/10"
                                }`}
                              >
                                {field.isBadge && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />}
                                {field.scopeBadge}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-(--text-tertiary) leading-normal">
                              {field.description}
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            checked={draft[field.toggleKey]}
                            onChange={(event) => patch(field.toggleKey, event.target.checked)}
                            className="h-4 w-4 shrink-0 mt-0.5 accent-(--accent-500)"
                            title={`开启/关闭${field.title}`}
                          />
                        </div>

                        <div className="flex flex-col gap-1.5 mt-auto pt-1">
                          <div className="flex items-center justify-between text-[11px] text-(--text-muted)">
                            <span>自定义分级词</span>
                            {!ratingEnabled && <span className="opacity-70">(已停用)</span>}
                          </div>
                          <input
                            value={draft.ratingLabels[field.key]}
                            disabled={!ratingEnabled}
                            onChange={(event) => setRatingLabelDraft(field.key, event.target.value)}
                            placeholder={defaultLabel}
                            aria-label={`${field.title}评级名称`}
                            className="surface-inset w-full px-3 py-1.5 text-[12px] outline-none disabled:opacity-60 font-mono"
                          />
                          <span className="setting-hint">
                            {field.tierHint}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </InstancePanel>

              </>
          )}

          {activeTab === "card" && (
            <>
              {/* 面板 1: 默认视图 */}
              <InstancePanel
                kicker="视图"
                title="默认视图"
                aside={<LayoutGrid size={16} />}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="surface-inset setting-segment-slot flex flex-col gap-3 px-4 py-4">
                    <div>
                      <div className="setting-subhead-title">
                        桌面端
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
                        移动端
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

              {/* 面板 2: 卡片指标 */}
              <InstancePanel
                kicker="指标"
                title="卡片指标"
                description="自选各视图卡片上呈现的具体参数与开关。"
                aside={<Rows3 size={16} />}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleRow
                    field="showGroupTabs"
                    title="分组标签"
                    desc="在服务器列表上方显示分组切换标签。"
                    checked={draft.showGroupTabs}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showRegionBar"
                    title="地区标签"
                    desc="在服务器列表上方显示国旗地区筛选。"
                    checked={draft.showRegionBar}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showCardGroup"
                    title="分组名称"
                    desc="在服务器卡片副标题标注所属分组。"
                    checked={draft.showCardGroup}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowTrafficTotal"
                    title="累计流量"
                    desc="在紧凑卡片中展示月度或累计总流量。"
                    checked={draft.compactShowTrafficTotal}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowBilling"
                    title="计费周期"
                    desc="在紧凑卡片中标注续费计费周期。"
                    checked={draft.compactShowBilling}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="compactShowUptime"
                    title="在线时长"
                    desc="在紧凑卡片中展示系统持续运行时间。"
                    checked={draft.compactShowUptime}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showConnections"
                    title="连接数量"
                    desc="在卡片网络区域标注实时网络连接数。"
                    checked={draft.showConnections}
                    onPatch={patch}
                  />
                  <ToggleRow
                    field="showTodayTrafficPopover"
                    title="当日峰值"
                    desc="在卡片上显示按钮，查看当日流量与峰值。"
                    checked={draft.showTodayTrafficPopover}
                    onPatch={patch}
                  />
                </div>
              </InstancePanel>

              {/* 面板 3: 列表排序 */}
              <InstancePanel
                kicker="排序"
                title="列表排序"
                aside={<Rows3 size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <ToggleRow
                    field="enableHomeSort"
                    title="访客排序"
                    desc="允许访客在首页通过下拉菜单更改排序。"
                    checked={draft.enableHomeSort}
                    onPatch={patch}
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">默认指标</span>
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
                      <span className="setting-subhead-title">默认次序</span>
                      <SettingSelect
                        value={draft.homeSortDirection}
                        disabled={!draft.enableHomeSort}
                        onChange={(event) =>
                          patch("homeSortDirection", event.target.value as "asc" | "desc")
                        }
                      >
                        <option value="asc">升序</option>
                        <option value="desc">降序</option>
                      </SettingSelect>
                    </div>
                  </div>

                  {orderedDraftGroups.length > 0 && (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="setting-subhead-title">分组次序</span>
                        <span className="setting-hint">点击上下箭头调整次序</span>
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

              {/* 面板 4: 网络延迟 */}
              <InstancePanel
                kicker="延迟"
                title="网络延迟"
                description="设定延迟展示方式并为服务器指定线路。"
                aside={<Activity size={16} />}
              >
                <div className="flex flex-col gap-4">
                  <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                    <span className="setting-subhead-title">展示模式</span>
                    <div className="instance-segmented is-prominent is-even is-stack-mobile">
                      <button
                        type="button"
                        data-active={!draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", false)}
                      >
                        单线模式
                      </button>
                      <button
                        type="button"
                        data-active={draft.enableHomepageMultiPing ? "true" : "false"}
                        onClick={() => patch("enableHomepageMultiPing", true)}
                      >
                        多线模式
                      </button>
                    </div>
                  </div>

                  {draft.enableHomepageMultiPing ? (
                    <div className="surface-inset flex flex-col gap-3 px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="setting-subhead-title">多线槽位</span>
                          <p className="setting-hint mt-1">
                            卡片将依序展示各线路的实时延迟光柱。
                          </p>
                        </div>
                        {canAddMultiPingTask && (
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
                        title="平滑占位"
                        desc="无探测数据时显示平滑占位，保持视觉整齐。"
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

              {/* 面板 5: 状态光柱 */}
              <InstancePanel
                kicker="光柱"
                title="状态光柱"
                description="定制流量、延迟与丢包光柱的过渡色与判断门槛。"
                aside={<Sliders size={16} />}
              >
                <div className="flex flex-col gap-5">
                  {/* 顶置配套方案预设：一套方案联动覆盖流量、延迟、丢包三处光柱 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div>
                      <span className="setting-subhead-title">配套预设方案</span>
                      <p className="setting-hint mt-1">
                        一键联动设定流量、延迟与丢包光柱的成套视觉方案。
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {STATUS_BAR_PRESETS.map((preset) => {
                        const isSelected =
                          draft.trafficSpectrumColors.start === preset.colors.start &&
                          draft.trafficSpectrumColors.mid === preset.colors.mid &&
                          draft.trafficSpectrumColors.high === preset.colors.high &&
                          draft.trafficSpectrumColors.end === preset.colors.end &&
                          draft.pingLatencyColors.excellent === preset.latencyColors.excellent &&
                          draft.pingLatencyColors.good === preset.latencyColors.good &&
                          draft.pingLatencyColors.moderate === preset.latencyColors.moderate &&
                          draft.pingLatencyColors.elevated === preset.latencyColors.elevated &&
                          draft.pingLatencyColors.critical === preset.latencyColors.critical &&
                          draft.pingLossColors.zero === preset.lossColors.zero &&
                          draft.pingLossColors.low === preset.lossColors.low &&
                          draft.pingLossColors.medium === preset.lossColors.medium &&
                          draft.pingLossColors.high === preset.lossColors.high;
                        const gradient = `linear-gradient(to right, ${preset.colors.start}, ${preset.colors.mid}, ${preset.colors.high}, ${preset.colors.end})`;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => applyStatusBarPreset(preset)}
                            data-active={isSelected ? "true" : "false"}
                            aria-pressed={isSelected}
                            className="setting-spectrum-preset-card"
                          >
                            <div className="flex items-center justify-between gap-1.5 w-full">
                              <span
                                className={clsx(
                                  "text-xs font-semibold truncate",
                                  isSelected
                                    ? "text-(--accent-500)"
                                    : "text-(--text-primary)",
                                )}
                              >
                                {preset.name}
                              </span>
                              <div className="setting-color-theme-radio" aria-hidden="true">
                                {isSelected && <div className="setting-color-theme-radio-dot" />}
                              </div>
                            </div>
                            <div
                              className="h-2 w-full rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/10"
                              style={{ background: gradient }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 1. 流量进度光柱色谱自定义 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">流量光柱</span>
                        <p className="setting-hint mt-1">
                          从用量充裕到即将耗尽，呈现平滑过渡色谱。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetTrafficSpectrum}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认的监控绿色谱"
                      >
                        <RotateCcw size={13} />
                        重置色彩
                      </button>
                    </div>

                    {/* 就近实时预览：18 段发光光柱色谱全貌（置顶呈现） */}
                    <div className="flex flex-col gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3.5">
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Sparkles size={13} className="text-(--accent-500)" />
                          流量光柱实时效果 (18 段)
                        </span>
                        <span className="text-[11px] text-(--text-tertiary)">
                          所见即所得 · 0% 充裕至 100% 耗尽连续色谱
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 rounded-md bg-(--bg-primary) p-2.5 shadow-inner">
                        <div className="flex items-center justify-between text-[11px] text-(--text-tertiary) mb-1">
                          <span>18 段发光光柱色谱全貌：</span>
                          <span className="font-mono">从轻载平滑过渡至警戒红</span>
                        </div>
                        <div className="traffic-quota-track" aria-hidden>
                          {previewTrafficSegmentColors.map((color, i) => (
                            <span key={i} className="traffic-quota-segment" style={{ background: color }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 4 锚点 HEX 输入网格 */}
                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {TRAFFIC_SPECTRUM_ANCHOR_CONFIG.map(({ key, label, stage, hint, defaultColor }) => {
                        const currentColor = draft.trafficSpectrumColors[key];
                        const isEnd = key === "end";
                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <span
                                className={clsx(
                                  "text-[10px] px-1.5 py-0.5 rounded border font-mono font-medium",
                                  isEnd
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                                    : "bg-(--bg-primary) text-(--text-tertiary) border-(--hairline)",
                                )}
                              >
                                {stage}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <label className="relative flex items-center justify-center shrink-0 cursor-pointer">
                                <span
                                  className="inline-block h-7 w-7 rounded-full border-2 border-white/40 shadow-sm"
                                  style={{ backgroundColor: currentColor }}
                                />
                                <input
                                  type="color"
                                  value={currentColor}
                                  onChange={(e) => patchTrafficSpectrumColor(key, e.target.value)}
                                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                  title={`选取${label}`}
                                />
                              </label>
                              <input
                                type="text"
                                maxLength={7}
                                value={currentColor}
                                onChange={(e) => patchTrafficSpectrumColor(key, e.target.value)}
                                className="surface-inset px-2.5 py-1 text-[12px] font-mono uppercase text-(--text-primary) w-full outline-none"
                                placeholder={defaultColor}
                              />
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                {isEnd ? "末端特性" : "阶段定位"}
                              </span>
                              <span className="text-[11px] font-mono text-(--text-tertiary)">
                                {isEnd ? "严格警报红守护" : "平滑色谱锚点"}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. 延迟评级标准与色彩设置 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">延迟光柱</span>
                        <p className="setting-hint mt-1">
                          设定各毫秒区间的判断门槛与对应光柱颜色。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetPingLatency}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认的 60/100/160/200ms 及预设色"
                      >
                        <RotateCcw size={13} />
                        重置延迟
                      </button>
                    </div>

                    {/* 就近实时预览：延迟光柱 */}
                    <div className="flex flex-col gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Activity size={13} className="text-(--status-success)" />
                          延迟光柱实时效果 (示例梯度 15ms ~ 320ms)
                        </span>
                        <span className="tabular font-medium text-(--text-tertiary) text-[11px]">
                          门槛：{draft.pingLatencyThresholds.excellent}ms / {draft.pingLatencyThresholds.good}ms / {draft.pingLatencyThresholds.moderate}ms / {draft.pingLatencyThresholds.elevated}ms
                        </span>
                      </div>
                      <div className="rounded-md bg-(--bg-primary) p-2 shadow-inner">
                        <LatencyBars
                          buckets={PREVIEW_LATENCY_BUCKETS}
                          latencyThresholds={draft.pingLatencyThresholds}
                          latencyColors={draft.pingLatencyColors}
                          height={18}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {LATENCY_TIER_CONFIG.map(({ key, label, hint, defaultColor }) => {
                        const currentColor = draft.pingLatencyColors[key];
                        const isThresholdEditable = key !== "critical";
                        const thresholdVal = isThresholdEditable
                          ? draft.pingLatencyThresholds[key]
                          : null;

                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label
                                  className="metric-color-swatch"
                                  style={{ background: currentColor }}
                                  title="点击调整颜色"
                                >
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => patchPingLatencyColor(key, e.target.value)}
                                  />
                                </label>
                                {currentColor.toLowerCase() !== defaultColor.toLowerCase() && (
                                  <button
                                    type="button"
                                    onClick={() => patchPingLatencyColor(key, defaultColor)}
                                    className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors p-1"
                                    title="恢复该项默认色"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                {isThresholdEditable ? "门槛上限" : "高延迟区间"}
                              </span>
                              {isThresholdEditable ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    min={1}
                                    max={9999}
                                    value={thresholdVal ?? 0}
                                    onChange={(e) => {
                                      const num = parseInt(e.target.value, 10);
                                      if (!Number.isNaN(num) && num > 0) {
                                        patchPingLatencyThreshold(key, num);
                                      }
                                    }}
                                    className="w-16 rounded-[5px] border border-(--hairline) bg-(--bg-primary) px-2 py-0.5 text-right font-mono text-[12px] font-medium outline-none focus:border-(--status-success)"
                                  />
                                  <span className="text-[11px] text-(--text-tertiary)">ms</span>
                                </div>
                              ) : (
                                <span className="font-mono text-[11px] text-(--text-tertiary)">
                                  &gt; {draft.pingLatencyThresholds.elevated}ms
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. 丢包评级标准与色彩设置 */}
                  <div className="surface-inset flex flex-col gap-3.5 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="setting-subhead-title">丢包光柱</span>
                        <p className="setting-hint mt-1">
                          设定不同丢包率区间的判断门槛与对应颜色。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={resetPingLoss}
                        className="theme-manage-button is-compact shrink-0 flex items-center gap-1.5"
                        title="恢复为默认的 3%/10% 门槛及预设色"
                      >
                        <RotateCcw size={13} />
                        重置丢包
                      </button>
                    </div>

                    {/* 就近实时预览：丢包光柱 */}
                    <div className="flex flex-col gap-2 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[12px]">
                        <span className="font-medium text-(--text-secondary) flex items-center gap-1.5">
                          <Activity size={13} className="text-(--status-warning)" />
                          丢包光柱实时效果 (示例梯度 0% ~ 25%)
                        </span>
                        <span className="tabular font-medium text-(--text-tertiary) text-[11px]">
                          门槛：0% / {draft.pingLossThresholds.low}% / {draft.pingLossThresholds.medium}%
                        </span>
                      </div>
                      <div className="rounded-md bg-(--bg-primary) p-2 shadow-inner">
                        <QualityBars
                          buckets={PREVIEW_LOSS_BUCKETS}
                          lossThresholds={draft.pingLossThresholds}
                          lossColors={draft.pingLossColors}
                          height={18}
                        />
                      </div>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                      {LOSS_TIER_CONFIG.map(({ key, label, hint, defaultColor }) => {
                        const currentColor = draft.pingLossColors[key];
                        const isEditable = key === "low" || key === "medium";
                        const thresholdVal =
                          key === "low"
                            ? draft.pingLossThresholds.low
                            : key === "medium"
                              ? draft.pingLossThresholds.medium
                              : null;

                        return (
                          <div
                            key={key}
                            className="flex flex-col justify-between gap-2.5 rounded-[10px] border border-(--hairline) bg-(--bg-card) p-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] font-semibold text-(--text-primary)">
                                {label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <label
                                  className="metric-color-swatch"
                                  style={{ background: currentColor }}
                                  title="点击调整颜色"
                                >
                                  <input
                                    type="color"
                                    value={currentColor}
                                    onChange={(e) => patchPingLossColor(key, e.target.value)}
                                  />
                                </label>
                                {currentColor.toLowerCase() !== defaultColor.toLowerCase() && (
                                  <button
                                    type="button"
                                    onClick={() => patchPingLossColor(key, defaultColor)}
                                    className="text-(--text-tertiary) hover:text-(--text-primary) transition-colors p-1"
                                    title="恢复该项默认色"
                                  >
                                    <RotateCcw size={12} />
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-(--text-tertiary) leading-tight">
                              {hint}
                            </p>

                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-(--hairline)">
                              <span className="text-[11px] text-(--text-secondary) shrink-0">
                                {isEditable ? "丢包上限" : "生效条件"}
                              </span>
                              {isEditable ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min={0.1}
                                    max={100}
                                    value={thresholdVal ?? 0}
                                    onChange={(e) => {
                                      const num = parseFloat(e.target.value);
                                      if (!Number.isNaN(num) && num > 0) {
                                        patchPingLossThreshold(key, num);
                                      }
                                    }}
                                    className="w-16 rounded-[5px] border border-(--hairline) bg-(--bg-primary) px-2 py-0.5 text-right font-mono text-[12px] font-medium outline-none focus:border-(--status-success)"
                                  />
                                  <span className="text-[11px] text-(--text-tertiary)">%</span>
                                </div>
                              ) : (
                                <span className="font-mono text-[11px] text-(--text-tertiary)">
                                  {key === "zero" ? "= 0% (完全健康)" : `> ${draft.pingLossThresholds.medium}%`}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 6: 隐藏节点 */}
              <InstancePanel
                kicker="过滤"
                title="隐藏节点"
                aside={<Search size={16} />}
              >
                <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                  <span className="setting-subhead-title">隐藏名单 (每行一个 UUID 或名称)</span>
                  <textarea
                    rows={4}
                    value={draft.hiddenNodesText}
                    onChange={(event) => patch("hiddenNodesText", event.target.value)}
                    placeholder="node-uuid-1&#10;Tokyo Edge"
                    className="surface-inset p-3 text-[13px] font-mono outline-none min-h-28"
                  />
                  <span className="setting-hint">
                    名单内的服务器不在首页呈现，已生效 {draftHiddenNodes.length} 台。
                  </span>
                </div>
              </InstancePanel>
            </>
          )}

          {activeTab === "cost" && (
            <>
              <InstancePanel
                kicker="资产"
                title="财务设置"
                description="管理汇率换算与不计费的排除服务器。"
                aside={<CircleDollarSign size={16} />}
              >
                <div className="flex flex-col gap-4">


                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">汇率接口</span>
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
                          : "留空使用默认公共汇率接口。"}
                      </span>
                    </label>

                    <div className="surface-inset flex flex-col gap-2 px-4 py-3">
                      <span className="setting-subhead-title">排除机器</span>
                      <textarea
                        rows={3}
                        value={draft.costIgnoredText}
                        onChange={(event) => patch("costIgnoredText", event.target.value)}
                        placeholder="每行一个节点名称 / UUID，也可以用逗号分隔"
                        className="surface-inset min-h-24 w-full resize-y p-2.5 text-[13px] outline-none font-mono"
                      />
                      <span className="setting-hint">填入的机器不计入资产总值与续费成本。</span>
                    </div>
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 2: 买入溢价 */}
              <InstancePanel
                kicker="溢价"
                title="买入溢价"
                description="记录收机实际花费，系统自动平摊折溢价。"
                aside={<CircleDollarSign size={16} />}
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <label className="surface-inset flex flex-1 max-w-sm items-center gap-2 px-3 py-1.5">
                      <Search size={14} className="text-(--text-tertiary)" />
                      <input
                        value={premiumSearch}
                        onChange={(event) => setPremiumSearch(event.target.value)}
                        placeholder="搜索服务器…"
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

          {activeTab === "feedback" && (
            <>
              {/* 面板 1：三大项目反馈通道 */}
              <InstancePanel
                kicker="反馈"
                title="项目反馈与代码仓库"
                aside={<MessageSquare size={16} />}
              >
                <div className="space-y-4">
                  <p className="text-xs text-(--text-muted) leading-relaxed">
                    SAO 主题目前适配了三大探针。为确保您的反馈能由对应仓库维护者快速跟进，请优先在当前使用的项目仓库中提交 Issue。
                  </p>

                  <div className="grid grid-cols-1 gap-3.5">
                    {PROJECT_REPOS.map((proj) => (
                      <div
                        key={proj.id}
                        className={`rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                          proj.isCurrent
                            ? "border-(--accent-500)/40 bg-[color-mix(in_srgb,var(--accent-500)_4%,var(--bg-card))] ring-1 ring-(--accent-500)/20"
                            : "border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)]"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 mb-3 border-b border-(--hairline)">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm font-semibold text-(--text-primary)">
                              {proj.name}
                            </span>
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--text-secondary)">
                              {proj.tag}
                            </span>
                            {proj.isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-(--accent-500)/15 text-(--accent-500) border border-(--accent-500)/30">
                                <span className="w-1.5 h-1.5 rounded-full bg-(--accent-500) animate-pulse" />
                                当前运行版本
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-(--text-muted) shrink-0">
                            {proj.repo}
                          </span>
                        </div>

                        <p className="text-xs text-(--text-secondary) leading-relaxed mb-4">
                          {proj.desc}
                        </p>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5">
                          <a
                            href={proj.newIssueUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`repo-action-btn w-full sm:w-auto ${proj.isCurrent ? "is-primary" : "is-secondary"}`}
                          >
                            <span>提交 Issue 反馈</span>
                            <ExternalLink size={12} strokeWidth={2.2} />
                          </a>

                          <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center sm:gap-2.5">
                            <a
                              href={proj.issuesUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="repo-action-btn is-secondary w-full sm:w-auto"
                            >
                              <span className="sm:hidden">已知问题</span>
                              <span className="hidden sm:inline">查看已知问题</span>
                              <ExternalLink size={12} />
                            </a>

                            <a
                              href={proj.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="repo-action-btn is-secondary w-full sm:w-auto"
                            >
                              <Github size={12} />
                              <span className="sm:hidden">GitHub 仓库</span>
                              <span className="hidden sm:inline">访问 GitHub 仓库</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 2：反馈范围与提单指引 */}
              <InstancePanel
                kicker="指引"
                title="反馈范围与提单指引"
                aside={<AlertCircle size={16} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary) pb-2.5 mb-3 border-b border-(--hairline)">
                      <CheckCircle2 size={15} className="text-emerald-500 shrink-0" />
                      <span>建议在本仓库反馈的问题</span>
                    </div>
                    <ul className="text-xs text-(--text-secondary) space-y-2 leading-relaxed list-disc list-inside">
                      <li>首页与内页的功能BUG反馈</li>
                      <li>具有普适性的主题功能需求建议</li>
                      <li>设计呈现与色彩方案建议与异常反馈</li>
                      <li>手机端、平板等不同分辨率下的响应式排版优化建议</li>
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-semibold text-(--text-primary) pb-2.5 mb-3 border-b border-(--hairline)">
                      <AlertCircle size={15} className="text-amber-500 shrink-0" />
                      <span>建议前往原探针系统反馈的问题</span>
                    </div>
                    <ul className="text-xs text-(--text-secondary) space-y-2 leading-relaxed list-disc list-inside">
                      <li>探针客户端（Agent）掉线、离线重连或节点在线状态误报</li>
                      <li>探针底层系统指标采集不准（如 CPU/内存/磁盘占用率异常）</li>
                      <li>服务端 Docker 容器部署、反向代理或 WebSocket 连接中断</li>
                      <li>原系统基础权限管理与后端数据库存储错误</li>
                    </ul>
                  </div>
                </div>
              </InstancePanel>

              {/* 面板 3：常见问题排查 (FAQ) */}
              <InstancePanel
                kicker="帮助"
                title="常见问题速查 (FAQ)"
                aside={<HelpCircle size={16} />}
              >
                <div className="space-y-2.5">
                  <details className="group rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 transition-all shadow-xs open:ring-1 open:ring-(--accent-500)/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-xs text-(--text-primary)">
                      <span>Q: 为什么勾选了悬浮入口没有任何变化？</span>
                      <ChevronDown size={14} className="text-(--text-muted) transition-transform duration-200 group-open:rotate-180 shrink-0" />
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      「悬浮入口」与「资产入口」存在互斥展示逻辑，旨在避免界面上重复出现操作入口。只有在未勾选「资产入口」或者未开启首页「总览区域」时，页面右下角的悬浮入口才会显示。
                    </div>
                  </details>

                  <details className="group rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 transition-all shadow-xs open:ring-1 open:ring-(--accent-500)/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-xs text-(--text-primary)">
                      <span>Q: 集群展台的「经典双曲线」与「方格矩阵」如何切换？</span>
                      <ChevronDown size={14} className="text-(--text-muted) transition-transform duration-200 group-open:rotate-180 shrink-0" />
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      在设置分类中切换至「首页」，找到「集群展台模式」选项，即可一键在「经典双曲线（优雅平滑曲线）」与「方格矩阵（机架热力像素感）」之间无缝切换，两种模式均已全面适配所选配色方案。
                    </div>
                  </details>

                  <details className="group rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 transition-all shadow-xs open:ring-1 open:ring-(--accent-500)/30">
                    <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-xs text-(--text-primary)">
                      <span>Q: 提交 Bug 时如何能让问题更快得到定位与修复？</span>
                      <ChevronDown size={14} className="text-(--text-muted) transition-transform duration-200 group-open:rotate-180 shrink-0" />
                    </summary>
                    <div className="mt-2.5 pt-2.5 border-t border-(--hairline) text-xs text-(--text-secondary) leading-relaxed">
                      在 GitHub Issue 中写明：1. 遇到的现象与期望效果；2. 使用的浏览器与操作系统（如 PC Chrome、手机 Safari 等）；3. 若有界面错位，附带一张清晰截图；若有控制台红字报错，复制控制台日志可大幅加快排错效率。
                    </div>
                  </details>
                </div>
              </InstancePanel>

              {/* 面板 4：关于与致谢 */}
              <InstancePanel
                kicker="关于"
                title="关于 SAO 主题"
                aside={<Sparkles size={16} />}
              >
                <div className="rounded-2xl border border-(--hairline) bg-[color-mix(in_srgb,var(--bg-card)_55%,transparent)] p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-(--text-primary)">
                        Komari SAO Theme
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-(--hairline) bg-(--bg-card) text-(--accent-500)">
                        {currentVersion}
                      </span>
                    </div>
                    <p className="text-xs text-(--text-muted)">
                      极简机能风格探针监控主题 · 开源遵循 MIT License
                    </p>
                  </div>
                  <a
                    href="https://github.com/WAOR/Komari-Theme-SAO"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-(--hairline) bg-(--bg-card) text-(--text-primary) hover:border-(--accent-500) hover:text-(--accent-500) shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    <Star size={13} className="text-amber-400 fill-amber-400" />
                    <span>在 GitHub 上 Star 支持</span>
                  </a>
                </div>
              </InstancePanel>
            </>
          )}
        </div>
      </div>
</div>
  );
}
