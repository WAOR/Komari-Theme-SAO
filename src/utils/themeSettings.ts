import type {
  MetricColorKey,
  OverviewCardId,
  PingLatencyColors,
  PingLatencyThresholds,
  PingLossColors,
  PingLossThresholds,
  ThemeSettings,
  TrafficSpectrumColors,
  UserMatrixPreset,
  YesterdayBestScope,
  YesterdayBestDisplayMode,
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
  DEFAULT_HOMEPAGE_MULTI_PING_TASK_IDS,
  normalizeHomepageMultiPingTaskIds,
  normalizeHomepagePingTaskBindings,
  type HomepagePingTaskBindings,
} from "@/utils/pingTasks";
import {
  type SiteBrandIconId,
  DEFAULT_SITE_BRAND_ICON,
  isSiteBrandIconId,
  SITE_BRAND_ICON_OPTIONS,
} from "@/components/brand-icons";

export {
  type SiteBrandIconId,
  DEFAULT_SITE_BRAND_ICON,
  isSiteBrandIconId,
  SITE_BRAND_ICON_OPTIONS,
};

export type Appearance = "system" | "light" | "dark";
export type NodeViewMode = "large" | "compact" | "mini" | "list";
export type ServerCardTemplate = "classic" | "layered";
export const SERVER_CARD_TEMPLATES: readonly ServerCardTemplate[] = [
  "classic",
  "layered",
] as const;
export type ClusterOverviewMode = "classic" | "nodes";
export type MatrixColorTheme =
  | "default"
  | "eva"
  | "divergence"
  | "aurora";

export const MATRIX_COLOR_THEMES: readonly MatrixColorTheme[] = [
  "default",
  "eva",
  "divergence",
  "aurora",
] as const;

export const PALETTE_STORAGE_KEY = "komaritheme:palette";
let memoryPalette: MatrixColorTheme | null = null;

export function readStoredPalette(): MatrixColorTheme | null {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(PALETTE_STORAGE_KEY);
      if (isMatrixColorTheme(raw)) return raw;
    } catch {}
  }
  return memoryPalette;
}

export function persistPalette(palette: MatrixColorTheme) {
  memoryPalette = palette;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(PALETTE_STORAGE_KEY, palette);
    } catch {}
  }
}

export const DARK_BRAND_COLOR_STORAGE_KEY = "komaritheme:dark_brand_color";
let memoryDarkBrandColor: boolean | null = null;

export function readStoredDarkBrandColor(): boolean | null {
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(DARK_BRAND_COLOR_STORAGE_KEY);
      if (raw === "true") return true;
      if (raw === "false") return false;
    } catch {}
  }
  return memoryDarkBrandColor;
}

export function persistDarkBrandColor(enabled: boolean) {
  memoryDarkBrandColor = enabled;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(DARK_BRAND_COLOR_STORAGE_KEY, String(enabled));
      if (typeof document !== "undefined") {
        document.documentElement.dataset.darkBrandColor = enabled ? "true" : "false";
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("sao:dark-brand-color-change", { detail: enabled }));
      }
    } catch {}
  }
}

export type OverviewCardVisualMode = "adaptive" | "visual" | "text";

export const OVERVIEW_CARD_VISUAL_MODES = ["adaptive", "visual", "text"] as const;

export type OverviewMicroVisualMode = "dynamic" | "static";

export const OVERVIEW_MICRO_VISUAL_MODES = ["dynamic", "static"] as const;

export function normalizeOverviewMicroVisualMode(val: unknown): OverviewMicroVisualMode {
  return val === "static" ? "static" : "dynamic";
}

export function normalizeOverviewStaticCards(val: unknown): OverviewCardId[] {
  if (!Array.isArray(val)) return ["yesterdayBest"];
  const valid = new Set<OverviewCardId>(ALL_OVERVIEW_CARD_IDS);
  return val.filter((item): item is OverviewCardId => typeof item === "string" && valid.has(item as OverviewCardId));
}

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
  excellent: "#82dd2d",
  good: "#68bb1e",
  moderate: "#4f8f1c",
  elevated: "#386c14",
  critical: "#234c0e",
};

export const DEFAULT_PING_LOSS_THRESHOLDS: PingLossThresholds = {
  low: 3,
  medium: 10,
};

export const DEFAULT_PING_LOSS_COLORS: PingLossColors = {
  zero: "#82dd2d",
  loss: "#dce5da",
  low: "#dce5da",
  medium: "#dce5da",
  high: "#dce5da",
};

export interface StatusBarPreset {
  id: string;
  name: string;
  enablePingLossHatch?: boolean;
  colors: TrafficSpectrumColors;
  latencyColors: PingLatencyColors;
  lossColors: PingLossColors;
  metricColors: Record<MetricColorKey, string>;
}

export type TrafficSpectrumPreset = StatusBarPreset;

export const DEFAULT_TRAFFIC_SPECTRUM_COLORS: TrafficSpectrumColors = {
  start: "#b4f475",
  mid: "#82dd2d",
  high: "#4f8f1c",
  end: "#234c0e",
};

export const DEFAULT_CARD_METRIC_COLORS: Record<MetricColorKey, string> = {
  cpu: "#82dd2d",
  memory: "#82dd2d",
  disk: "#82dd2d",
  load: "#82dd2d",
  swap: "#82dd2d",
  speedIdle: "#82dd2d",
  speedLow: "#68bb1e",
  speedHigh: "#4f8f1c",
  speedMax: "#234c0e",
  trafficUp: "#82dd2d",
  trafficDown: "#4f8f1c",
};

export const STATUS_BAR_PRESETS: readonly StatusBarPreset[] = [
  {
    id: "default",
    name: "经典标准 (翡翠绿 · 琥珀黄 · 警示橙 · 熔岩红)",
    enablePingLossHatch: false,
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
      loss: "#ef4444",
      low: "#ef4444",
      medium: "#ef4444",
      high: "#ef4444",
    },
    metricColors: {
      cpu: "#3b82f6",
      memory: "#8b5cf6",
      disk: "#f97316",
      load: "#ec4899",
      swap: "#6366f1",
      speedIdle: "#10b981",
      speedLow: "#f59e0b",
      speedHigh: "#f97316",
      speedMax: "#ef4444",
      trafficUp: "#3b82f6",
      trafficDown: "#10b981",
    },
  },
  {
    id: "eva",
    name: "EVA (机体紫 · 装甲绿 · 警示橙 · 暴走红)",
    enablePingLossHatch: true,
    colors: { start: "#60289b", mid: "#8b5cf6", high: "#f58d39", end: "#e52c2c" },
    latencyColors: {
      excellent: "#b8e84c",
      good: "#52d053",
      moderate: "#7c3aed",
      elevated: "#f58d39",
      critical: "#e52c2c",
    },
    lossColors: {
      zero: "#7c3aed",
      loss: "#f58d39",
      low: "#f58d39",
      medium: "#f58d39",
      high: "#f58d39",
    },
    metricColors: {
      cpu: "#7c3aed",
      memory: "#7c3aed",
      disk: "#b8e84c",
      load: "#b8e84c",
      swap: "#4d4d4d",
      speedIdle: "#60289b",
      speedLow: "#7c3aed",
      speedHigh: "#f58d39",
      speedMax: "#e52c2c",
      trafficUp: "#60289b",
      trafficDown: "#b8e84c",
    },
  },
  {
    id: "divergence",
    name: "命运石之门 (电离金 · 辉光橙 · 暮光琥珀 · 收敛深红)",
    enablePingLossHatch: true,
    colors: { start: "#facc15", mid: "#ff7700", high: "#ea580c", end: "#991b1b" },
    latencyColors: {
      excellent: "#ff7700",
      good: "#ea580c",
      moderate: "#c2410c",
      elevated: "#9a3412",
      critical: "#dc2626",
    },
    lossColors: {
      zero: "#ff7700",
      loss: "#facc15",
      low: "#facc15",
      medium: "#facc15",
      high: "#facc15",
    },
    metricColors: {
      cpu: "#ff7700",
      memory: "#ff7700",
      disk: "#ff7700",
      load: "#ff7700",
      swap: "#ff7700",
      speedIdle: "#ff7700",
      speedLow: "#ea580c",
      speedHigh: "#c2410c",
      speedMax: "#dc2626",
      trafficUp: "#ff7700",
      trafficDown: "#facc15",
    },
  },
  {
    id: "aurora",
    name: "云雾抹茶 (薄雾绿 · 浓醇抹茶 · 灰绿与警示斜纹)",
    enablePingLossHatch: true,
    colors: { start: "#b4f475", mid: "#82dd2d", high: "#4f8f1c", end: "#234c0e" },
    latencyColors: {
      excellent: "#82dd2d",
      good: "#68bb1e",
      moderate: "#4f8f1c",
      elevated: "#386c14",
      critical: "#234c0e",
    },
    lossColors: {
      zero: "#82dd2d",
      loss: "#dce5da",
      low: "#dce5da",
      medium: "#dce5da",
      high: "#dce5da",
    },
    metricColors: {
      cpu: "#82dd2d",
      memory: "#82dd2d",
      disk: "#82dd2d",
      load: "#82dd2d",
      swap: "#82dd2d",
      speedIdle: "#82dd2d",
      speedLow: "#68bb1e",
      speedHigh: "#4f8f1c",
      speedMax: "#234c0e",
      trafficUp: "#82dd2d",
      trafficDown: "#4f8f1c",
    },
  },
] as const;

export const TRAFFIC_SPECTRUM_PRESETS: readonly StatusBarPreset[] = STATUS_BAR_PRESETS;

export const OVERVIEW_CARD_SLOT_COUNT = 6;

export const DEFAULT_OVERVIEW_CARDS: readonly OverviewCardId[] = [
  "asset",
  "loss",
  "cpu",
  "bandwidth",
  "traffic",
  "yesterdayBest",
] as const;

export const ALL_OVERVIEW_CARD_IDS: readonly OverviewCardId[] = [
  "asset",
  "loss",
  "cpu",
  "bandwidth",
  "traffic",
  "yesterdayBest",
  "nodes",
  "connections",
  "ram",
  "swap",
  "uptime",
  "process",
  "disk",
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
  [key: string]: unknown;
  defaultAppearance: Appearance;
  desktopNodeViewMode: NodeViewMode;
  mobileNodeViewMode: NodeViewMode;
  serverCardTemplate: ServerCardTemplate;
  clusterOverviewMode: ClusterOverviewMode;
  /** 是否允许点击集群状态卡片在趋势大盘与方格矩阵之间 3D 双面翻转（默认开启） */
  enableClusterFlip: boolean;
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
  enablePingLossHatch: boolean;
  trafficSpectrumColors: TrafficSpectrumColors;
  metricColors: Record<MetricColorKey, string>;
  showHomeOverview: boolean;
  /** 首页顶部总览左侧小卡片列表（固定 6 个槽位） */
  overviewCards: OverviewCardId[];
  overviewCardOrder: OverviewCardId[];
  overviewCardDisabled: OverviewCardId[];
  /** 首页指标小卡视觉展现模式：智能切换(adaptive)、图形卡片(visual)、文字卡片(text) */
  overviewCardVisualMode: OverviewCardVisualMode;
  /** 首页易闲置指标卡（平均CPU/今日流量/活跃连接）微图呈现模式：动态真实数据(dynamic)、静态美化微图(static) */
  overviewMicroVisualMode: OverviewMicroVisualMode;
  /** 单卡片独立静态微图呈现列表：包含在此数组中的卡片强制呈现静态美化微图，未包含的默认保持动态 */
  overviewStaticCards: OverviewCardId[];
  showGroupTabs: boolean;
  showRegionBar: boolean;
  showCardGroup: boolean;
  homeGroupOrder: string[];
  enableHomeSort: boolean;
  homeSortField: HomeSortField;
  homeSortDirection: HomeSortDirection;
  enableSeasonalSnow: boolean;
  siteBrandIcon: SiteBrandIconId;
  enableDarkBrandColor: boolean;
  showTrafficPageButton: boolean;
  showTrafficPageForGuests: boolean;
  showCostSummary: boolean;
  showCostSummaryFloatingButton: boolean;
  showPriceForGuests: boolean;
  showOverviewRatings: boolean;
  showBandwidthRating: boolean;
  bandwidthRatingLabels: string;
  compactShowTrafficTotal: boolean;
  compactShowBilling: boolean;
  compactShowUptime: boolean;
  showConnections: boolean;
  showTodayTrafficPopover: boolean;
  hiddenNodes: string[];
  costIgnoredNodes: string[];
  carrierLossIncludedNodes: string[];
  yesterdayBestIncludedNodes: string[];
  yesterdayBestScope: YesterdayBestScope;
  yesterdayBestDisplayMode: YesterdayBestDisplayMode;
  costPremiums: Record<string, CostPremiumEntry>;
  costRateApiUrl: string;
  costCurrency: "CNY" | "USD" | "EUR";
}

export const DEFAULT_THEME_SETTINGS: ResolvedThemeSettings = {
  defaultAppearance: "system",
  desktopNodeViewMode: "large",
  mobileNodeViewMode: "compact",
  serverCardTemplate: "layered",
  clusterOverviewMode: "nodes",
  enableClusterFlip: true,
  matrixColorTheme: "aurora",
  matrixMockFill: true,
  matrixBootAnimation: true,
  matrixBootEffect: "laser-scan",
  matrixCustomPattern: null,
  matrixUserPresets: [],
  enableAdminButton: true,
  showPingChart: true,
  homepagePingBindings: {},
  enableHomepageMultiPing: false,
  homepageMultiPingTaskIds: [...DEFAULT_HOMEPAGE_MULTI_PING_TASK_IDS],
  fakePingForUnbound: false,
  pingLatencyThresholds: DEFAULT_PING_LATENCY_THRESHOLDS,
  pingLatencyColors: DEFAULT_PING_LATENCY_COLORS,
  pingLossThresholds: DEFAULT_PING_LOSS_THRESHOLDS,
  pingLossColors: DEFAULT_PING_LOSS_COLORS,
  enablePingLossHatch: true,
  trafficSpectrumColors: DEFAULT_TRAFFIC_SPECTRUM_COLORS,
  metricColors: DEFAULT_CARD_METRIC_COLORS,
  showHomeOverview: true,
  overviewCards: [...DEFAULT_OVERVIEW_CARDS],
  overviewCardOrder: [...DEFAULT_OVERVIEW_CARDS],
  overviewCardDisabled: [],
  overviewCardVisualMode: "visual",
  overviewMicroVisualMode: "dynamic",
  overviewStaticCards: ["yesterdayBest"],
  showGroupTabs: true,
  showRegionBar: true,
  showCardGroup: true,
  homeGroupOrder: [],
  enableHomeSort: true,
  homeSortField: "default",
  homeSortDirection: HOME_SORT_NATURAL_DIRECTION.default,
  enableSeasonalSnow: false,
  siteBrandIcon: DEFAULT_SITE_BRAND_ICON,
  enableDarkBrandColor: true,
  showTrafficPageButton: true,
  showTrafficPageForGuests: false,
  showCostSummary: true,
  showCostSummaryFloatingButton: true,
  showPriceForGuests: false,
  showOverviewRatings: true,
  showBandwidthRating: true,
  bandwidthRatingLabels: "",
  compactShowTrafficTotal: true,
  compactShowBilling: true,
  compactShowUptime: true,
  showConnections: false,
  showTodayTrafficPopover: true,
  hiddenNodes: [],
  costIgnoredNodes: [],
  carrierLossIncludedNodes: [],
  yesterdayBestIncludedNodes: [],
  yesterdayBestScope: "tri",
  yesterdayBestDisplayMode: "best",
  costPremiums: {},
  costRateApiUrl: DEFAULT_COST_RATE_API_URL,
  costCurrency: "CNY",
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

export function isServerCardTemplate(value: unknown): value is ServerCardTemplate {
  return value === "classic" || value === "layered";
}

export function normalizeServerCardTemplate(
  value: unknown,
  fallback: ServerCardTemplate = DEFAULT_THEME_SETTINGS.serverCardTemplate,
): ServerCardTemplate {
  return isServerCardTemplate(value) ? value : fallback;
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

function normalizeOverviewCardVisualMode(value: unknown): OverviewCardVisualMode {
  return typeof value === "string" && (OVERVIEW_CARD_VISUAL_MODES as readonly string[]).includes(value)
    ? (value as OverviewCardVisualMode)
    : "visual";
}

function normalizeMatrixMockFill(value: unknown): boolean {
  return value !== false;
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

export function isValidHexColor(val: unknown): val is string {
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
  const rawExc = isValidHexColor(raw.excellent) ? raw.excellent.toLowerCase() : defaults.excellent;
  const rawGood = isValidHexColor(raw.good) ? raw.good.toLowerCase() : defaults.good;
  const rawMod = isValidHexColor(raw.moderate) ? raw.moderate.toLowerCase() : defaults.moderate;
  const rawEle = isValidHexColor(raw.elevated) ? raw.elevated.toLowerCase() : defaults.elevated;

  // 历史实验值平滑升级：修复中间突兀跳跃断层，恢复严格均匀递减的高级抹茶绿渐变
  const isOldAurora =
    (rawExc === "#b4f475" || rawExc === "#58a021") &&
    rawGood === "#82dd2d" &&
    rawMod === "#5cb022";

  return {
    excellent: isOldAurora ? "#82dd2d" : rawExc,
    good: isOldAurora ? "#68bb1e" : rawGood,
    moderate: isOldAurora ? "#4f8f1c" : rawMod,
    elevated: isOldAurora ? "#386c14" : rawEle,
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

export function normalizePingLossColors(
  val: unknown,
  fallbackTheme?: MatrixColorTheme,
): PingLossColors {
  const isEva = fallbackTheme === "eva";
  const isDivergence = fallbackTheme === "divergence";
  const defaults: PingLossColors = isEva
    ? {
        zero: "#7c3aed",
        loss: "#f58d39",
        low: "#f58d39",
        medium: "#f58d39",
        high: "#f58d39",
      }
    : isDivergence
      ? {
          zero: "#ff7700",
          loss: "#facc15",
          low: "#facc15",
          medium: "#facc15",
          high: "#facc15",
        }
      : fallbackTheme === "default"
        ? {
            zero: "#10b981",
            loss: "#ef4444",
            low: "#ef4444",
            medium: "#ef4444",
            high: "#ef4444",
          }
        : DEFAULT_PING_LOSS_COLORS;

  if (!val || typeof val !== "object") return defaults;
  const raw = val as Record<string, unknown>;
  const zero = isValidHexColor(raw.zero) ? (raw.zero as string).toLowerCase() : defaults.zero;

  const low = isValidHexColor(raw.low) ? (raw.low as string).toLowerCase() : defaults.low;
  const medium = isValidHexColor(raw.medium) ? (raw.medium as string).toLowerCase() : defaults.medium;
  const high = isValidHexColor(raw.high) ? (raw.high as string).toLowerCase() : defaults.high;

  let loss: string;
  if (isValidHexColor(raw.loss)) {
    loss = (raw.loss as string).toLowerCase();
  } else if (isValidHexColor(raw.low)) {
    loss = (raw.low as string).toLowerCase();
  } else if (isValidHexColor(raw.high)) {
    loss = (raw.high as string).toLowerCase();
  } else {
    loss = defaults.loss ?? defaults.high ?? "#ef4444";
  }

  return {
    zero,
    loss,
    low,
    medium,
    high,
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

export function normalizeCardMetricColors(val: unknown): Record<MetricColorKey, string> {
  const defaults = DEFAULT_CARD_METRIC_COLORS;
  if (!val || typeof val !== "object") return { ...defaults };
  const raw = val as Record<string, unknown>;
  const out = { ...defaults };
  for (const k of Object.keys(defaults) as MetricColorKey[]) {
    if (isValidHexColor(raw[k])) {
      out[k] = (raw[k] as string).toLowerCase();
    }
  }
  // 平滑升级：云雾抹茶卡片硬件指标统一使用经典抹茶绿 #82dd2d，保证指标视觉高度凝聚一致
  if (
    out.cpu === "#82dd2d" &&
    (out.memory === "#68bb1e" ||
      out.disk === "#4f8f1c" ||
      out.load === "#b4f475" ||
      out.load === "#58a021" ||
      out.swap === "#386c14")
  ) {
    out.memory = "#82dd2d";
    out.disk = "#82dd2d";
    out.load = "#82dd2d";
    out.swap = "#82dd2d";
  }
  // 平滑升级：命运石之门卡片硬件指标统一使用经典辉光暖橙 #ff7700，保证指标视觉高度凝聚一致
  if (
    out.cpu === "#ff7700" &&
    (out.memory === "#ea580c" ||
      out.disk === "#c2410c" ||
      out.load === "#facc15" ||
      out.swap === "#9a3412")
  ) {
    out.memory = "#ff7700";
    out.disk = "#ff7700";
    out.load = "#ff7700";
    out.swap = "#ff7700";
  }
  return out;
}

export function normalizeCostCurrency(
  value: unknown,
): "CNY" | "USD" | "EUR" {
  if (value === "USD" || value === "EUR") return value;
  return "CNY";
}

export function normalizeYesterdayBestScope(raw: unknown): YesterdayBestScope {
  if (raw === "ct" || raw === "cu" || raw === "cm" || raw === "all" || raw === "tri") {
    return raw;
  }
  return "tri";
}

export function normalizeYesterdayBestDisplayMode(raw: unknown): YesterdayBestDisplayMode {
  if (raw === "average" || raw === "best") {
    return raw;
  }
  return "best";
}

export function normalizeThemeSettings(
  settings: (ThemeSettings & Record<string, unknown>) | null | undefined,
): ResolvedThemeSettings {
  const rawMultiIds = normalizeHomepageMultiPingTaskIds(settings?.homepageMultiPingTaskIds);
  const fallbackIndependentIds = normalizeHomepageMultiPingTaskIds(
    (settings as Record<string, unknown> | undefined)?.homepageIndependentDefaultTaskIds,
  );
  const homepageMultiPingTaskIds =
    rawMultiIds.length > 0
      ? rawMultiIds
      : fallbackIndependentIds.length > 0
        ? fallbackIndependentIds
        : [...DEFAULT_HOMEPAGE_MULTI_PING_TASK_IDS];
  const matrixColorTheme = normalizeMatrixColorTheme(settings?.matrixColorTheme);
  const rawLoss = settings?.pingLossColors as Record<string, unknown> | undefined;
  const pingLossColors = normalizePingLossColors(settings?.pingLossColors, matrixColorTheme);
  const isThemeHatch =
    matrixColorTheme === "aurora" ||
    matrixColorTheme === "divergence" ||
    matrixColorTheme === "eva" ||
    pingLossColors.loss === "#dce5da" ||
    pingLossColors.loss === "#facc15" ||
    pingLossColors.loss === "#f58d39" ||
    rawLoss?.loss === "#dce5da" ||
    rawLoss?.low === "#dce5da" ||
    rawLoss?.high === "#dce5da" ||
    rawLoss?.loss === "#facc15" ||
    rawLoss?.low === "#facc15" ||
    rawLoss?.high === "#facc15" ||
    rawLoss?.loss === "#f58d39" ||
    rawLoss?.low === "#f58d39" ||
    rawLoss?.high === "#f58d39";
  const enablePingLossHatch =
    typeof settings?.enablePingLossHatch === "boolean"
      ? settings.enablePingLossHatch
      : Boolean(isThemeHatch);

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
    serverCardTemplate: normalizeServerCardTemplate(
      settings?.serverCardTemplate,
      DEFAULT_THEME_SETTINGS.serverCardTemplate,
    ),
    clusterOverviewMode: normalizeClusterOverviewMode(settings?.clusterOverviewMode),
    enableClusterFlip: enabledUnlessFalse(settings?.enableClusterFlip),
    matrixColorTheme,
    matrixMockFill: normalizeMatrixMockFill(settings?.matrixMockFill),
    matrixBootAnimation: normalizeMatrixBootAnimation(settings?.matrixBootAnimation),
    matrixBootEffect: normalizeMatrixBootEffect(settings?.matrixBootEffect),
    matrixCustomPattern: normalizeMatrixCustomPattern(settings?.matrixCustomPattern),
    matrixUserPresets: normalizeMatrixUserPresets(settings?.matrixUserPresets),
    enableAdminButton: enabledUnlessFalse(settings?.enableAdminButton),
    showPingChart: enabledUnlessFalse(settings?.showPingChart),
    homepagePingBindings: normalizeHomepagePingTaskBindings(settings?.homepagePingBindings),
    // 保留开关原值，让管理页能呈现并修复不完整配置；首页消费方仅在任务配置好时启用。
    enableHomepageMultiPing: settings?.enableHomepageMultiPing === true,
    homepageMultiPingTaskIds,
    // 默认关闭(需手动开启):给访客展示的是模拟数据,必须由站长显式决定。
    fakePingForUnbound: settings?.fakePingForUnbound === true,
    pingLatencyThresholds: normalizePingLatencyThresholds(settings?.pingLatencyThresholds),
    pingLatencyColors: normalizePingLatencyColors(settings?.pingLatencyColors),
    pingLossThresholds: normalizePingLossThresholds(settings?.pingLossThresholds),
    pingLossColors,
    enablePingLossHatch,
    trafficSpectrumColors: normalizeTrafficSpectrumColors(settings?.trafficSpectrumColors),
    metricColors: normalizeCardMetricColors(settings?.metricColors),
    showHomeOverview: enabledUnlessFalse(settings?.showHomeOverview),
    overviewCards: normalizeOverviewCards(settings?.overviewCards ?? settings?.overviewCardOrder),
    overviewCardOrder: normalizeOverviewCards(settings?.overviewCards ?? settings?.overviewCardOrder),
    overviewCardDisabled: [],
    overviewCardVisualMode: normalizeOverviewCardVisualMode(settings?.overviewCardVisualMode),
    overviewMicroVisualMode: normalizeOverviewMicroVisualMode(settings?.overviewMicroVisualMode),
    overviewStaticCards: normalizeOverviewStaticCards(settings?.overviewStaticCards),
    showGroupTabs: enabledUnlessFalse(settings?.showGroupTabs),
    showRegionBar: enabledUnlessFalse(settings?.showRegionBar),
    showCardGroup: enabledUnlessFalse(settings?.showCardGroup),
    homeGroupOrder: normalizeHomeGroupOrder(settings?.homeGroupOrder),
    enableHomeSort: enabledUnlessFalse(settings?.enableHomeSort),
    ...normalizeHomeSortDefault(settings?.homeSortField, settings?.homeSortDirection),
    enableSeasonalSnow: settings?.enableSeasonalSnow === true,
    siteBrandIcon: isSiteBrandIconId(settings?.siteBrandIcon)
      ? settings.siteBrandIcon
      : DEFAULT_SITE_BRAND_ICON,
    enableDarkBrandColor: enabledUnlessFalse(settings?.enableDarkBrandColor),
    showTrafficPageButton: enabledUnlessFalse(settings?.showTrafficPageButton),
    // 默认关闭(向访客保密入口):关闭时未登录访客隐藏今日流量右上角图表按钮，保持卡片无图标统一纯净。
    showTrafficPageForGuests: settings?.showTrafficPageForGuests === true,
    showCostSummary: enabledUnlessFalse(settings?.showCostSummary),
    showCostSummaryFloatingButton: enabledUnlessFalse(settings?.showCostSummaryFloatingButton),
    // 默认关闭(需手动开启):向访客展示价格与资产必须由站长显式决定。
    showPriceForGuests: settings?.showPriceForGuests === true,
    showOverviewRatings: enabledUnlessFalse(settings?.showOverviewRatings),
    showBandwidthRating: enabledUnlessFalse(settings?.showBandwidthRating),
    bandwidthRatingLabels: normalizePlainText(settings?.bandwidthRatingLabels),
    compactShowTrafficTotal: enabledUnlessFalse(settings?.compactShowTrafficTotal),
    compactShowBilling: enabledUnlessFalse(settings?.compactShowBilling),
    compactShowUptime: enabledUnlessFalse(settings?.compactShowUptime),
    // 默认关闭(需手动开启):连接数是个小众指标,很多 agent 也不上报,所以只在显式启用时才显示。
    showConnections: settings?.showConnections === true,
    showTodayTrafficPopover: enabledUnlessFalse(settings?.showTodayTrafficPopover),
    hiddenNodes: normalizeNodeIdentityList(settings?.hiddenNodes),
    costIgnoredNodes: normalizeCostIgnoredNodes(settings?.costIgnoredNodes),
    carrierLossIncludedNodes: normalizeNodeIdentityList(settings?.carrierLossIncludedNodes),
    yesterdayBestIncludedNodes: normalizeNodeIdentityList(settings?.yesterdayBestIncludedNodes),
    yesterdayBestScope: normalizeYesterdayBestScope(settings?.yesterdayBestScope),
    yesterdayBestDisplayMode: normalizeYesterdayBestDisplayMode(settings?.yesterdayBestDisplayMode),
    costPremiums: normalizeCostPremiums(settings?.costPremiums),
    costRateApiUrl: normalizeCostRateApiUrl(settings?.costRateApiUrl),
    costCurrency: normalizeCostCurrency(settings?.costCurrency),
  };
}
