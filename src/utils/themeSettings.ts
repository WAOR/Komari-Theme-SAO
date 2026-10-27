import type {
  OverviewCardId,
  PingLatencyColors,
  PingLatencyThresholds,
  PingLossColors,
  PingLossThresholds,
  ThemeSettings,
  TrafficSpectrumColors,
  UserMatrixPreset,
} from "@/types/komari";
import {
  DEFAULT_COST_RATE_API_URL,
  normalizeCostIgnoredNodes,
  normalizeCostPremiums,
  normalizeCostRateApiUrl,
  type CostPremiumEntry,
} from "@/utils/cost";
import { normalizeNodeIdentityList } from "@/utils/nodeIdentity";
import { normalizeHomeGroupOrder } from "@/utils/homeNodes";
import {
  HOME_SORT_NATURAL_DIRECTION,
  isHomeSortDirection,
  isHomeSortField,
  type HomeSortDirection,
  type HomeSortField,
} from "@/utils/homeSort";
import {
  normalizeHomepageMultiPingTaskIds,
  normalizeHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";

export type Appearance = "system" | "light" | "dark";
export type NodeViewMode = "large" | "compact" | "mini" | "list";
export type ClusterOverviewMode = "classic" | "nodes";
export type MatrixColorTheme =
  | "default"
  | "eva"
  | "divergence";

export const MATRIX_COLOR_THEMES: readonly MatrixColorTheme[] = [
  "default",
  "eva",
  "divergence",
] as const;

export type MatrixBootEffect =
  | "laser-scan"
  | "digital-rain"
  | "cyber-glitch"
  | "divergence-flux";

export const MATRIX_BOOT_EFFECTS: readonly MatrixBootEffect[] = [
  "laser-scan",
  "digital-rain",
  "cyber-glitch",
  "divergence-flux",
] as const;

export const DEFAULT_PING_LATENCY_THRESHOLDS: PingLatencyThresholds = {
  excellent: 60,
  good: 100,
  moderate: 160,
  elevated: 200,
};

export const DEFAULT_PING_LATENCY_COLORS: PingLatencyColors = {
  excellent: "#10b981",
  good: "#84cc16",
  moderate: "#eab308",
  elevated: "#f59e0b",
  critical: "#ef4444",
};

export const DEFAULT_PING_LOSS_THRESHOLDS: PingLossThresholds = {
  low: 3,
  medium: 10,
};

export const DEFAULT_PING_LOSS_COLORS: PingLossColors = {
  zero: "#10b981",
  low: "#eab308",
  medium: "#f97316",
  high: "#ef4444",
};

export interface StatusBarPreset {
  id: string;
  name: string;
  colors: TrafficSpectrumColors;
  latencyColors: PingLatencyColors;
  lossColors: PingLossColors;
}

export type TrafficSpectrumPreset = StatusBarPreset;

export const DEFAULT_TRAFFIC_SPECTRUM_COLORS: TrafficSpectrumColors = {
  start: "#10b981",
  mid: "#eab308",
  high: "#f97316",
  end: "#ef4444",
};

export const STATUS_BAR_PRESETS: readonly StatusBarPreset[] = [
  {
    id: "classic",
    name: "经典运维 (翡翠绿 · 琥珀黄 · 警示橙 · 熔岩红)",
    colors: { start: "#10b981", mid: "#eab308", high: "#f97316", end: "#ef4444" },
    latencyColors: {
      excellent: "#10b981",
      good: "#84cc16",
      moderate: "#eab308",
      elevated: "#f97316",
      critical: "#ef4444",
    },
    lossColors: {
      zero: "#10b981",
      low: "#eab308",
      medium: "#f97316",
      high: "#ef4444",
    },
  },
  {
    id: "icefire",
    name: "深邃冰火 (冰川蓝 · 暮光紫 · 烈焰橙 · 绝境红)",
    colors: { start: "#06b6d4", mid: "#8b5cf6", high: "#f97316", end: "#ef4444" },
    latencyColors: {
      excellent: "#06b6d4",
      good: "#3b82f6",
      moderate: "#8b5cf6",
      elevated: "#f97316",
      critical: "#ef4444",
    },
    lossColors: {
      zero: "#06b6d4",
      low: "#8b5cf6",
      medium: "#f97316",
      high: "#ef4444",
    },
  },
  {
    id: "marine",
    name: "深海青翠 (薄荷青 · 蔚蓝海 · 暖杏黄 · 珊瑚红)",
    colors: { start: "#14b8a6", mid: "#0284c7", high: "#f59e0b", end: "#ef4444" },
    latencyColors: {
      excellent: "#14b8a6",
      good: "#06b6d4",
      moderate: "#0284c7",
      elevated: "#f59e0b",
      critical: "#ef4444",
    },
    lossColors: {
      zero: "#14b8a6",
      low: "#0284c7",
      medium: "#f59e0b",
      high: "#ef4444",
    },
  },
] as const;

export const TRAFFIC_SPECTRUM_PRESETS: readonly StatusBarPreset[] = STATUS_BAR_PRESETS;

export const OVERVIEW_CARD_SLOT_COUNT = 6;

export const DEFAULT_OVERVIEW_CARDS: readonly OverviewCardId[] = [
  "connections",
  "cpu",
  "ram",
  "disk",
  "traffic",
  "asset",
] as const;

export const ALL_OVERVIEW_CARD_IDS: readonly OverviewCardId[] = [
  "connections",
  "cpu",
  "ram",
  "disk",
  "traffic",
  "asset",
  "nodes",
  "bandwidth",
  "swap",
  "process",
  "cores",
] as const;

export function normalizeOverviewCards(raw: unknown): OverviewCardId[] {
  const allIds = new Set<OverviewCardId>(ALL_OVERVIEW_CARD_IDS);
  const result: OverviewCardId[] = [];

  const candidates: unknown[] = Array.isArray(raw)
    ? raw
    : typeof raw === "object" && raw !== null && "overviewCards" in raw && Array.isArray((raw as { overviewCards: unknown }).overviewCards)
      ? (raw as { overviewCards: unknown[] }).overviewCards
      : [];

  for (const item of candidates) {
    if (
      typeof item === "string" &&
      allIds.has(item as OverviewCardId) &&
      !result.includes(item as OverviewCardId)
    ) {
      result.push(item as OverviewCardId);
      if (result.length === OVERVIEW_CARD_SLOT_COUNT) break;
    }
  }

  if (result.length < OVERVIEW_CARD_SLOT_COUNT) {
    for (const id of DEFAULT_OVERVIEW_CARDS) {
      if (!result.includes(id)) {
        result.push(id);
        if (result.length === OVERVIEW_CARD_SLOT_COUNT) break;
      }
    }
  }

  if (result.length < OVERVIEW_CARD_SLOT_COUNT) {
    for (const id of ALL_OVERVIEW_CARD_IDS) {
      if (!result.includes(id)) {
        result.push(id);
        if (result.length === OVERVIEW_CARD_SLOT_COUNT) break;
      }
    }
  }

  return result.slice(0, OVERVIEW_CARD_SLOT_COUNT);
}

export interface ResolvedThemeSettings {
  defaultAppearance: Appearance;
  desktopNodeViewMode: NodeViewMode;
  mobileNodeViewMode: NodeViewMode;
  clusterOverviewMode: ClusterOverviewMode;
  matrixColorTheme: MatrixColorTheme;
  matrixMockFill: boolean;
  matrixBootAnimation: boolean;
  matrixBootEffect: MatrixBootEffect;
  matrixCustomPattern: number[] | null;
  matrixUserPresets: UserMatrixPreset[];
  enableAdminButton: boolean;
  showPingChart: boolean;
  homepagePingBindings: HomepagePingTaskBindings;
  enableHomepageMultiPing: boolean;
  homepageMultiPingTaskIds: number[];
  fakePingForUnbound: boolean;
  pingLatencyThresholds: PingLatencyThresholds;
  pingLatencyColors: PingLatencyColors;
  pingLossThresholds: PingLossThresholds;
  pingLossColors: PingLossColors;
  trafficSpectrumColors: TrafficSpectrumColors;
  showHomeOverview: boolean;
  /** 首页顶部总览左侧小卡片列表（固定 6 个槽位） */
  overviewCards: OverviewCardId[];
  overviewCardOrder: OverviewCardId[];
  overviewCardDisabled: OverviewCardId[];
  showGroupTabs: boolean;
  showRegionBar: boolean;
  showCardGroup: boolean;
  homeGroupOrder: string[];
  enableHomeSort: boolean;
  homeSortField: HomeSortField;
  homeSortDirection: HomeSortDirection;
  showTrafficPageButton: boolean;
  showTrafficPageForGuests: boolean;
  showCostSummary: boolean;
  showCostSummaryFloatingButton: boolean;
  showPriceForGuests: boolean;
  showOverviewRatings: boolean;
  showTrafficRating: boolean;
  showBandwidthRating: boolean;
  showAssetRating: boolean;
  trafficRatingLabels: string;
  bandwidthRatingLabels: string;
  assetRatingLabels: string;
  compactShowTrafficTotal: boolean;
  compactShowBilling: boolean;
  compactShowUptime: boolean;
  showConnections: boolean;
  showTodayTrafficPopover: boolean;
  hiddenNodes: string[];
  costIgnoredNodes: string[];
  costPremiums: Record<string, CostPremiumEntry>;
  costRateApiUrl: string;
}

export const DEFAULT_THEME_SETTINGS: ResolvedThemeSettings = {
  defaultAppearance: "system",
  desktopNodeViewMode: "large",
  mobileNodeViewMode: "compact",
  clusterOverviewMode: "classic",
  matrixColorTheme: "default",
  matrixMockFill: false,
  matrixBootAnimation: true,
  matrixBootEffect: "laser-scan",
  matrixCustomPattern: null,
  matrixUserPresets: [],
  enableAdminButton: true,
  showPingChart: true,
  homepagePingBindings: {},
  enableHomepageMultiPing: false,
  homepageMultiPingTaskIds: [],
  fakePingForUnbound: false,
  pingLatencyThresholds: DEFAULT_PING_LATENCY_THRESHOLDS,
  pingLatencyColors: DEFAULT_PING_LATENCY_COLORS,
  pingLossThresholds: DEFAULT_PING_LOSS_THRESHOLDS,
  pingLossColors: DEFAULT_PING_LOSS_COLORS,
  trafficSpectrumColors: DEFAULT_TRAFFIC_SPECTRUM_COLORS,
  showHomeOverview: true,
  overviewCards: [...DEFAULT_OVERVIEW_CARDS],
  overviewCardOrder: [...DEFAULT_OVERVIEW_CARDS],
  overviewCardDisabled: [],
  showGroupTabs: true,
  showRegionBar: true,
  showCardGroup: true,
  homeGroupOrder: [],
  enableHomeSort: true,
  homeSortField: "default",
  homeSortDirection: HOME_SORT_NATURAL_DIRECTION.default,
  showTrafficPageButton: true,
  showTrafficPageForGuests: false,
  showCostSummary: true,
  showCostSummaryFloatingButton: true,
  showPriceForGuests: false,
  showOverviewRatings: true,
  showTrafficRating: false,
  showBandwidthRating: true,
  showAssetRating: false,
  trafficRatingLabels: "",
  bandwidthRatingLabels: "",
  assetRatingLabels: "",
  compactShowTrafficTotal: true,
  compactShowBilling: true,
  compactShowUptime: true,
  showConnections: false,
  showTodayTrafficPopover: true,
  hiddenNodes: [],
  costIgnoredNodes: [],
  costPremiums: {},
  costRateApiUrl: DEFAULT_COST_RATE_API_URL,
};

export function isAppearance(value: unknown): value is Appearance {
  return value === "system" || value === "light" || value === "dark";
}

function normalizeAppearance(
  value: unknown,
  fallback: Appearance = DEFAULT_THEME_SETTINGS.defaultAppearance,
): Appearance {
  return isAppearance(value) ? value : fallback;
}

export function isNodeViewMode(value: unknown): value is NodeViewMode {
  return value === "large" || value === "compact" || value === "mini" || value === "list";
}

function normalizeNodeViewMode(
  value: unknown,
  fallback: NodeViewMode,
): NodeViewMode {
  if (isNodeViewMode(value)) return value;
  // 未知旧字符串统一落到小卡，避免升级后出现无选中项。
  return typeof value === "string" && value.length > 0 ? "compact" : fallback;
}

// 列表档仅桌面可用(见 useViewMode 的 MOBILE_VIEW_MODES)。移动端即便配置里存了 "list"
// (历史值/外部写入)也归一化回默认档,避免管理页无选中项、首页又强制回落 compact 的不一致。
function normalizeMobileNodeViewMode(
  value: unknown,
  fallback: NodeViewMode,
): NodeViewMode {
  const mode = normalizeNodeViewMode(value, fallback);
  return mode === "list" ? fallback : mode;
}

export function isClusterOverviewMode(value: unknown): value is ClusterOverviewMode {
  return value === "classic" || value === "nodes";
}

function normalizeClusterOverviewMode(
  value: unknown,
  fallback: ClusterOverviewMode = DEFAULT_THEME_SETTINGS.clusterOverviewMode,
): ClusterOverviewMode {
  if (value === "traffic") return "classic";
  if (value === "carousel") return "nodes";
  return isClusterOverviewMode(value) ? value : fallback;
}

export function isMatrixColorTheme(value: unknown): value is MatrixColorTheme {
  return typeof value === "string" && (MATRIX_COLOR_THEMES as readonly string[]).includes(value);
}

function normalizeMatrixColorTheme(
  value: unknown,
  fallback: MatrixColorTheme = DEFAULT_THEME_SETTINGS.matrixColorTheme,
): MatrixColorTheme {
  return isMatrixColorTheme(value) ? value : fallback;
}

function normalizeMatrixMockFill(value: unknown): boolean {
  return value === true;
}

export function normalizeMatrixBootAnimation(value: unknown): boolean {
  return value !== false;
}

export function isMatrixBootEffect(value: unknown): value is MatrixBootEffect {
  return typeof value === "string" && (MATRIX_BOOT_EFFECTS as readonly string[]).includes(value);
}

export function normalizeMatrixBootEffect(
  value: unknown,
  fallback: MatrixBootEffect = DEFAULT_THEME_SETTINGS.matrixBootEffect,
): MatrixBootEffect {
  return isMatrixBootEffect(value) ? value : fallback;
}

export function normalizeMatrixCustomPattern(val: unknown): number[] | null {
  if (!Array.isArray(val)) return null;
  const valid = val.filter(
    (n): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0 && n < 100,
  );
  return Array.from(new Set(valid)).sort((a, b) => a - b);
}

export function normalizeMatrixUserPresets(val: unknown): UserMatrixPreset[] {
  if (!Array.isArray(val)) return [];
  return val
    .filter(
      (item): item is UserMatrixPreset =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as UserMatrixPreset).id === "string" &&
            typeof (item as UserMatrixPreset).name === "string" &&
            Array.isArray((item as UserMatrixPreset).indices),
        ),
    )
    .map((item) => ({
      id: String(item.id),
      name: String(item.name).trim().slice(0, 24) || "自定义预设",
      indices: Array.from(
        new Set(
          item.indices.filter(
            (idx): idx is number =>
              typeof idx === "number" && Number.isInteger(idx) && idx >= 0 && idx < 100,
          ),
        ),
      ).sort((a, b) => a - b),
      createdAt: typeof item.createdAt === "number" ? item.createdAt : Date.now(),
    }))
    .slice(0, 12);
}

function enabledUnlessFalse(value: unknown) {
  return value !== false;
}

function normalizePlainText(value: unknown) {
  return typeof value === "string" ? value : "";
}

// 管理员默认排序:字段非法回落 default;方向非法时回落该字段的自然方向(文本升、数值降)。
function normalizeHomeSortDefault(
  field: unknown,
  direction: unknown,
): { homeSortField: HomeSortField; homeSortDirection: HomeSortDirection } {
  const homeSortField = isHomeSortField(field) ? field : "default";
  return {
    homeSortField,
    homeSortDirection: isHomeSortDirection(direction)
      ? direction
      : HOME_SORT_NATURAL_DIRECTION[homeSortField],
  };
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

function isValidHexColor(val: unknown): val is string {
  return typeof val === "string" && HEX_COLOR_REGEX.test(val);
}

export function normalizePingLatencyThresholds(val: unknown): PingLatencyThresholds {
  const defaults = DEFAULT_PING_LATENCY_THRESHOLDS;
  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  const e = typeof raw.excellent === "number" && Number.isFinite(raw.excellent) && raw.excellent > 0
    ? Math.round(raw.excellent)
    : defaults.excellent;
  const g = typeof raw.good === "number" && Number.isFinite(raw.good) && raw.good > e
    ? Math.round(raw.good)
    : Math.max(e + 10, defaults.good);
  const m = typeof raw.moderate === "number" && Number.isFinite(raw.moderate) && raw.moderate > g
    ? Math.round(raw.moderate)
    : Math.max(g + 10, defaults.moderate);
  const el = typeof raw.elevated === "number" && Number.isFinite(raw.elevated) && raw.elevated > m
    ? Math.round(raw.elevated)
    : Math.max(m + 10, defaults.elevated);
  return { excellent: e, good: g, moderate: m, elevated: el };
}

export function normalizePingLatencyColors(val: unknown): PingLatencyColors {
  const defaults = DEFAULT_PING_LATENCY_COLORS;
  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  return {
    excellent: isValidHexColor(raw.excellent) ? raw.excellent.toLowerCase() : defaults.excellent,
    good: isValidHexColor(raw.good) ? raw.good.toLowerCase() : defaults.good,
    moderate: isValidHexColor(raw.moderate) ? raw.moderate.toLowerCase() : defaults.moderate,
    elevated: isValidHexColor(raw.elevated) ? raw.elevated.toLowerCase() : defaults.elevated,
    critical: isValidHexColor(raw.critical) ? raw.critical.toLowerCase() : defaults.critical,
  };
}

export function normalizePingLossThresholds(val: unknown): PingLossThresholds {
  const defaults = DEFAULT_PING_LOSS_THRESHOLDS;
  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  const low = typeof raw.low === "number" && Number.isFinite(raw.low) && raw.low > 0 && raw.low <= 100
    ? Number(raw.low.toFixed(1))
    : defaults.low;
  const medium = typeof raw.medium === "number" && Number.isFinite(raw.medium) && raw.medium > low && raw.medium <= 100
    ? Number(raw.medium.toFixed(1))
    : Math.max(low + 1, defaults.medium);
  return { low, medium };
}

export function normalizePingLossColors(val: unknown): PingLossColors {
  const defaults = DEFAULT_PING_LOSS_COLORS;
  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  return {
    zero: isValidHexColor(raw.zero) ? raw.zero.toLowerCase() : defaults.zero,
    low: isValidHexColor(raw.low) ? raw.low.toLowerCase() : defaults.low,
    medium: isValidHexColor(raw.medium) ? raw.medium.toLowerCase() : defaults.medium,
    high: isValidHexColor(raw.high) ? raw.high.toLowerCase() : defaults.high,
  };
}

export function normalizeTrafficSpectrumColors(val: unknown): TrafficSpectrumColors {
  const defaults = DEFAULT_TRAFFIC_SPECTRUM_COLORS;
  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  return {
    start: isValidHexColor(raw.start) ? raw.start.toLowerCase() : defaults.start,
    mid: isValidHexColor(raw.mid) ? raw.mid.toLowerCase() : defaults.mid,
    high: isValidHexColor(raw.high) ? raw.high.toLowerCase() : defaults.high,
    end: isValidHexColor(raw.end) ? raw.end.toLowerCase() : defaults.end,
  };
}

export function normalizeThemeSettings(
  settings: (ThemeSettings & Record<string, unknown>) | null | undefined,
): ResolvedThemeSettings {
  const homepageMultiPingTaskIds = normalizeHomepageMultiPingTaskIds(
    settings?.homepageMultiPingTaskIds,
  );
  return {
    defaultAppearance: normalizeAppearance(settings?.defaultAppearance),
    desktopNodeViewMode: normalizeNodeViewMode(
      settings?.desktopNodeViewMode,
      DEFAULT_THEME_SETTINGS.desktopNodeViewMode,
    ),
    mobileNodeViewMode: normalizeMobileNodeViewMode(
      settings?.mobileNodeViewMode,
      DEFAULT_THEME_SETTINGS.mobileNodeViewMode,
    ),
    clusterOverviewMode: normalizeClusterOverviewMode(settings?.clusterOverviewMode),
    matrixColorTheme: normalizeMatrixColorTheme(settings?.matrixColorTheme),
    matrixMockFill: normalizeMatrixMockFill(settings?.matrixMockFill),
    matrixBootAnimation: normalizeMatrixBootAnimation(settings?.matrixBootAnimation),
    matrixBootEffect: normalizeMatrixBootEffect(settings?.matrixBootEffect),
    matrixCustomPattern: normalizeMatrixCustomPattern(settings?.matrixCustomPattern),
    matrixUserPresets: normalizeMatrixUserPresets(settings?.matrixUserPresets),
    enableAdminButton: enabledUnlessFalse(settings?.enableAdminButton),
    showPingChart: enabledUnlessFalse(settings?.showPingChart),
    homepagePingBindings: normalizeHomepagePingTaskBindings(settings?.homepagePingBindings),
    // 保留开关原值，让管理页能呈现并修复不完整配置；首页消费方仅在任务恰好为三项时启用。
    enableHomepageMultiPing: settings?.enableHomepageMultiPing === true,
    homepageMultiPingTaskIds,
    // 默认关闭(需手动开启):给访客展示的是模拟数据,必须由站长显式决定。
    fakePingForUnbound: settings?.fakePingForUnbound === true,
    pingLatencyThresholds: normalizePingLatencyThresholds(settings?.pingLatencyThresholds),
    pingLatencyColors: normalizePingLatencyColors(settings?.pingLatencyColors),
    pingLossThresholds: normalizePingLossThresholds(settings?.pingLossThresholds),
    pingLossColors: normalizePingLossColors(settings?.pingLossColors),
    trafficSpectrumColors: normalizeTrafficSpectrumColors(settings?.trafficSpectrumColors),
    showHomeOverview: enabledUnlessFalse(settings?.showHomeOverview),
    overviewCards: normalizeOverviewCards(settings?.overviewCards ?? settings?.overviewCardOrder),
    overviewCardOrder: normalizeOverviewCards(settings?.overviewCards ?? settings?.overviewCardOrder),
    overviewCardDisabled: [],
    showGroupTabs: enabledUnlessFalse(settings?.showGroupTabs),
    showRegionBar: enabledUnlessFalse(settings?.showRegionBar),
    showCardGroup: enabledUnlessFalse(settings?.showCardGroup),
    homeGroupOrder: normalizeHomeGroupOrder(settings?.homeGroupOrder),
    enableHomeSort: enabledUnlessFalse(settings?.enableHomeSort),
    ...normalizeHomeSortDefault(settings?.homeSortField, settings?.homeSortDirection),
    showTrafficPageButton: enabledUnlessFalse(settings?.showTrafficPageButton),
    // 默认关闭(向访客保密入口):关闭时未登录访客隐藏今日流量右上角图表按钮，保持卡片无图标统一纯净。
    showTrafficPageForGuests: settings?.showTrafficPageForGuests === true,
    showCostSummary: enabledUnlessFalse(settings?.showCostSummary),
    showCostSummaryFloatingButton: enabledUnlessFalse(settings?.showCostSummaryFloatingButton),
    // 默认关闭(需手动开启):向访客展示价格与资产必须由站长显式决定。
    showPriceForGuests: settings?.showPriceForGuests === true,
    showOverviewRatings: enabledUnlessFalse(settings?.showOverviewRatings),
    showTrafficRating: settings?.showTrafficRating === true,
    showBandwidthRating: enabledUnlessFalse(settings?.showBandwidthRating),
    showAssetRating: settings?.showAssetRating === true,
    trafficRatingLabels: normalizePlainText(settings?.trafficRatingLabels),
    bandwidthRatingLabels: normalizePlainText(settings?.bandwidthRatingLabels),
    assetRatingLabels: normalizePlainText(settings?.assetRatingLabels),
    compactShowTrafficTotal: enabledUnlessFalse(settings?.compactShowTrafficTotal),
    compactShowBilling: enabledUnlessFalse(settings?.compactShowBilling),
    compactShowUptime: enabledUnlessFalse(settings?.compactShowUptime),
    // 默认关闭(需手动开启):连接数是个小众指标,很多 agent 也不上报,所以只在显式启用时才显示。
    showConnections: settings?.showConnections === true,
    showTodayTrafficPopover: enabledUnlessFalse(settings?.showTodayTrafficPopover),
    hiddenNodes: normalizeNodeIdentityList(settings?.hiddenNodes),
    costIgnoredNodes: normalizeCostIgnoredNodes(settings?.costIgnoredNodes),
    costPremiums: normalizeCostPremiums(settings?.costPremiums),
    costRateApiUrl: normalizeCostRateApiUrl(settings?.costRateApiUrl),
  };
}
