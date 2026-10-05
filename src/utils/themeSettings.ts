import type { ThemeSettings, UserMatrixPreset } from "@/types/komari";
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
export type MatrixColorTheme = "default" | "eva";

export interface ResolvedThemeSettings {
  defaultAppearance: Appearance;
  desktopNodeViewMode: NodeViewMode;
  mobileNodeViewMode: NodeViewMode;
  clusterOverviewMode: ClusterOverviewMode;
  matrixColorTheme: MatrixColorTheme;
  matrixMockFill: boolean;
  matrixBootAnimation: boolean;
  matrixCustomPattern: number[] | null;
  matrixUserPresets: UserMatrixPreset[];
  enableAdminButton: boolean;
  showPingChart: boolean;
  homepagePingBindings: HomepagePingTaskBindings;
  enableHomepageMultiPing: boolean;
  homepageMultiPingTaskIds: number[];
  fakePingForUnbound: boolean;
  showHomeOverview: boolean;
  showGroupTabs: boolean;
  showRegionBar: boolean;
  showCardGroup: boolean;
  homeGroupOrder: string[];
  enableHomeSort: boolean;
  homeSortField: HomeSortField;
  homeSortDirection: HomeSortDirection;
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
  matrixCustomPattern: null,
  matrixUserPresets: [],
  enableAdminButton: true,
  showPingChart: true,
  homepagePingBindings: {},
  enableHomepageMultiPing: false,
  homepageMultiPingTaskIds: [],
  fakePingForUnbound: false,
  showHomeOverview: true,
  showGroupTabs: true,
  showRegionBar: true,
  showCardGroup: true,
  homeGroupOrder: [],
  enableHomeSort: true,
  homeSortField: "default",
  homeSortDirection: HOME_SORT_NATURAL_DIRECTION.default,
  showCostSummary: true,
  showCostSummaryFloatingButton: true,
  showPriceForGuests: false,
  showOverviewRatings: true,
  showTrafficRating: true,
  showBandwidthRating: true,
  showAssetRating: true,
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
  return value === "default" || value === "eva";
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
    showHomeOverview: enabledUnlessFalse(settings?.showHomeOverview),
    showGroupTabs: enabledUnlessFalse(settings?.showGroupTabs),
    showRegionBar: enabledUnlessFalse(settings?.showRegionBar),
    showCardGroup: enabledUnlessFalse(settings?.showCardGroup),
    homeGroupOrder: normalizeHomeGroupOrder(settings?.homeGroupOrder),
    enableHomeSort: enabledUnlessFalse(settings?.enableHomeSort),
    ...normalizeHomeSortDefault(settings?.homeSortField, settings?.homeSortDirection),
    showCostSummary: enabledUnlessFalse(settings?.showCostSummary),
    showCostSummaryFloatingButton: enabledUnlessFalse(settings?.showCostSummaryFloatingButton),
    // 默认关闭(需手动开启):向访客展示价格与资产必须由站长显式决定。
    showPriceForGuests: settings?.showPriceForGuests === true,
    showOverviewRatings: enabledUnlessFalse(settings?.showOverviewRatings),
    showTrafficRating: enabledUnlessFalse(settings?.showTrafficRating),
    showBandwidthRating: enabledUnlessFalse(settings?.showBandwidthRating),
    showAssetRating: enabledUnlessFalse(settings?.showAssetRating),
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
