import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Clock,
  Server,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Flag } from "@/components/ui/Flag";
import { useAuth } from "@/hooks/useAuth";
import {
  useAllNodeMeta,
  useHomeNodeSummaries,
  useNodeOnlineSummaries,
  useNodeStoreStatus,
} from "@/hooks/useNode";
import { useHomepagePingOverview } from "@/hooks/usePingOverview";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useViewMode } from "@/hooks/useViewMode";
import { usePriceVisibility } from "@/hooks/usePriceVisibility";
import {
  formatBytes,
  formatByteRateLabel,
} from "@/utils/format";
import { calculateCostSummary, formatCnyMoney, getExchangeRates } from "@/utils/cost";
import { useHiddenNodeUuids } from "@/hooks/useVisibleNodes";
import {
  getHomeGroupLabel,
  getHomeGroupOptions,
  getHomeRegionOptions,
  HOME_ALL_GROUP,
  HOME_ALL_REGION,
  sortHomeGroupOptions,
  type HomeRegionOption,
} from "@/utils/homeNodes";
import { getDisplayRegionCode } from "@/utils/geo";
import { useHomeSort } from "@/hooks/useHomeSort";
import { useHomeNodeOrder } from "@/hooks/useHomeNodeOrder";
import { useHourlyClock } from "@/hooks/useClock";
import { preloadAssetsPage } from "@/services/assetsPageLoader";
import {
  preloadTodayTrafficStats,
  TodayTrafficStatsProvider,
} from "@/hooks/useTodayTrafficStats";
import { HomeSortControl } from "./HomeSortControl";
import {
  getOverviewRating,
  type OverviewRating,
} from "@/utils/overviewRating";
import { CompactNodeCard } from "./CompactNodeCard";
import { MiniNodeCard } from "./MiniNodeCard";
import { NodeCard } from "./NodeCard";
import { OverviewTrafficChart } from "./OverviewTrafficChart";
import { NodeListView } from "./NodeListView";
import { RenewalReminder } from "./RenewalReminder";
import type { NodeViewMode } from "@/utils/themeSettings";
import { getRenewalReminders, type RenewalReminderSource } from "@/utils/renewalReminder";
import { DiaTextReveal } from "@/components/ui/DiaTextReveal";

// 卡片视图网格密度；列表档由独立组件布局。
const GRID_LAYOUT: Record<NodeViewMode, { className: string; minColumnWidth: number }> = {
  large: { className: "grid gap-4 xl:gap-5", minColumnWidth: 360 },
  compact: { className: "grid gap-3 xl:gap-4", minColumnWidth: 340 },
  mini: { className: "grid gap-3 xl:gap-3.5", minColumnWidth: 260 },
  // 占位以满足 Record 穷尽。
  list: { className: "", minColumnWidth: 0 },
};

type MiniGridStyle = CSSProperties & { "--mini-card-min-width": string };

// 标准 UUID 不含逗号，可安全拼成稳定签名。
const UUID_KEY_SEPARATOR = ",";

type IdleCapableWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

interface HomeOverview {
  totalNodes: number;
  onlineNodes: number;
  offlineNodes: number;
  trafficUp: number;
  trafficDown: number;
  netUp: number;
  netDown: number;
}

function TrafficBarsIcon({ size = 19 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <rect x="2" y="10" width="4" height="8" rx="1.2" fill="currentColor" />
      <rect x="8" y="5.5" width="4" height="12.5" rx="1.2" fill="currentColor" />
      <rect x="14" y="2" width="4" height="16" rx="1.2" fill="currentColor" />
    </svg>
  );
}

function HomeBrand({ siteName }: { siteName: string }) {
  return (
    <header className="home-brand sr-only" aria-label="站点名称">
      <h1 className="home-brand-title" title={siteName}>
        {siteName}
      </h1>
    </header>
  );
}

function getTimeGreetingInfo(
  totalNodes: number,
  onlineNodes: number,
  offlineNodes: number,
  renewalCount: number,
): { greeting: string; subtitle: string } {
  const hour = new Date().getHours();
  let greeting = "早上好";
  if (hour >= 0 && hour < 5) greeting = "夜深了";
  else if (hour >= 5 && hour < 11) greeting = "早上好";
  else if (hour >= 11 && hour < 13) greeting = "中午好";
  else if (hour >= 13 && hour < 18) greeting = "下午好";
  else greeting = "晚上好";

  // 1. 存在离线异常时，精准贴合实际情况告警提示
  if (totalNodes > 0 && offlineNodes > 0) {
    if (onlineNodes === 0) {
      return {
        greeting,
        subtitle: "集群服务器已全部离线，请及时排查网络与连接状态。",
      };
    }
    return {
      greeting,
      subtitle: `检测到 ${offlineNodes} 台服务器处于离线状态，建议排查处理。`,
    };
  }

  // 2. 暂未连接服务器
  if (totalNodes === 0) {
    return {
      greeting,
      subtitle: "暂未检测到在线服务器，等待节点客户端数据上报。",
    };
  }

  // 3. 临期提醒（无离线节点但有临近到期节点）
  if (renewalCount > 0) {
    return {
      greeting,
      subtitle: `当前有 ${renewalCount} 台服务器临近到期，请留意续费维护。`,
    };
  }

  // 4. 全员在线健康：按时段给出贴切且长度均衡的生产/工作问候
  if (hour >= 0 && hour < 5) {
    return {
      greeting,
      subtitle: "夜间全站服务器运行平稳，各项指标持续实时监控中。",
    };
  }
  if (hour >= 5 && hour < 11) {
    return {
      greeting,
      subtitle: "全站服务器运行健康，系统资源与网络指标持续监控中。",
    };
  }
  if (hour >= 11 && hour < 13) {
    return {
      greeting,
      subtitle: "全员服务器保持在线，节点负载与核心指标运转正常。",
    };
  }
  if (hour >= 13 && hour < 18) {
    return {
      greeting,
      subtitle: "全员服务器连接通畅，集群状态与网络吞吐持续监控中。",
    };
  }
  return {
    greeting,
    subtitle: "全站服务器运转良好，集群网络与系统资源持续监控中。",
  };
}

function HomeOverviewCards({
  overview,
  costSummary,
  costLoading,
  showOverviewRatings,
  showTrafficRating,
  showBandwidthRating,
  showAssetRating,
  trafficRatingLabels,
  bandwidthRatingLabels,
  assetRatingLabels,
  showDetailButton,
  renewalNodes,
  dense,
  onWarmTraffic,
  username,
}: {
  overview: HomeOverview;
  costSummary: { remainingCny: number } | null;
  costLoading: boolean;
  dense: boolean;
  showOverviewRatings: boolean;
  showTrafficRating: boolean;
  showBandwidthRating: boolean;
  showAssetRating: boolean;
  trafficRatingLabels: string;
  bandwidthRatingLabels: string;
  assetRatingLabels: string;
  showDetailButton: boolean;
  renewalNodes: RenewalReminderSource[];
  onWarmTraffic: () => void;
  username: string;
}) {
  const [trafficValue, trafficUnit] = formatBytes(
    overview.trafficUp + overview.trafficDown,
  ).split(" ");
  const onlinePct =
    overview.totalNodes > 0 ? (overview.onlineNodes / overview.totalNodes) * 100 : 0;
  const { isPriceVisible } = usePriceVisibility();
  const remainingValue = !isPriceVisible
    ? "**"
    : costSummary
      ? formatCnyMoney(costSummary.remainingCny)
      : costLoading
        ? "计算中"
        : "—";
  const trafficDetailLabel = `↑ ${formatBytes(overview.trafficUp)} · ↓ ${formatBytes(overview.trafficDown)}`;
  const trafficRating =
    showOverviewRatings && showTrafficRating
      ? getOverviewRating({
          kind: "traffic",
          value: overview.trafficUp + overview.trafficDown,
          customLabels: trafficRatingLabels,
        })
      : null;
  const bandwidthRating =
    showOverviewRatings && showBandwidthRating
      ? getOverviewRating({
          kind: "bandwidth",
          value: overview.netUp + overview.netDown,
          customLabels: bandwidthRatingLabels,
        })
      : null;
  const assetRating =
    isPriceVisible && showOverviewRatings && showAssetRating && costSummary
      ? getOverviewRating({
          kind: "asset",
          value: costSummary.remainingCny,
          customLabels: assetRatingLabels,
        })
      : null;

  const renderRating = (rating: OverviewRating | null) =>
    rating ? (
      <span className="overview-card-rating" data-rating-level={rating.level} title={rating.label}>
        {rating.label}
      </span>
    ) : null;

  const isAllHealthy = overview.offlineNodes === 0 && overview.totalNodes > 0;
  const renewalReminders = getRenewalReminders(renewalNodes, Date.now(), {
    requireOnlineForExpired: true,
  });
  const renewalCount = renewalReminders.length;
  const greetingInfo = getTimeGreetingInfo(
    overview.totalNodes,
    overview.onlineNodes,
    overview.offlineNodes,
    renewalCount,
  );

  return (
    <section className={`mao-dashboard-hero home-overview${dense ? " is-dense" : ""}`} aria-label="首页总览">
      {/* 左侧主要区域：问候语 + 6 宫格指标小卡片 */}
      <div className="mao-hero-main">
        <div className="mao-hero-header">
          <div className="mao-badge">
            <Sparkles size={12} className="text-[var(--text-primary)]" />
            <span>监控总览</span>
          </div>
          <h1 className="mao-hero-greeting flex items-center gap-1.5 flex-wrap">
            <span>{greetingInfo.greeting}，</span>
            <DiaTextReveal text={username || "Visitors"} />
          </h1>
          <p className="mao-hero-subtitle">
            {greetingInfo.subtitle}
          </p>
        </div>

        {/* 6 宫格指标卡片 */}
        <div className="mao-stat-grid">
          {/* 1. 实时上行 */}
          <div className="mao-stat-card" data-metric="net-up">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <ArrowUpRight size={15} className="mao-stat-icon text-[var(--traffic-up,var(--status-success))]" />
                <span className="mao-stat-label">实时上行</span>
              </div>
            </div>
            <div className="mao-stat-value">
              {formatByteRateLabel(overview.netUp)}
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption" title={`累计上行: ${formatBytes(overview.trafficUp)}`}>
                累计 ↑ {formatBytes(overview.trafficUp)}
              </span>
            </div>
          </div>

          {/* 2. 实时下行 */}
          <div className="mao-stat-card" data-metric="net-down">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <ArrowDownRight size={15} className="mao-stat-icon text-[var(--speed-high,var(--accent-500))]" />
                <span className="mao-stat-label">实时下行</span>
              </div>
            </div>
            <div className="mao-stat-value">
              {formatByteRateLabel(overview.netDown)}
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption" title={`累计下行: ${formatBytes(overview.trafficDown)}`}>
                累计 ↓ {formatBytes(overview.trafficDown)}
              </span>
            </div>
          </div>

          {/* 3. 全站总流量 */}
          <div className="mao-stat-card" data-metric="traffic">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <TrendingUp size={15} className="mao-stat-icon text-[var(--traffic-up,var(--status-info))]" />
                <span className="mao-stat-label">全站流量</span>
              </div>
              <Link
                to="/traffic"
                className="overview-card-action mao-stat-action"
                aria-label="打开今日流量统计页"
                title="今日流量统计"
                onPointerEnter={onWarmTraffic}
                onFocus={onWarmTraffic}
                onClick={onWarmTraffic}
              >
                <TrafficBarsIcon size={14} />
              </Link>
            </div>
            <div className="mao-stat-value">
              {trafficValue} <span className="mao-stat-unit">{trafficUnit}</span>
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption truncate" title={trafficDetailLabel}>
                双向总计流量
              </span>
              {renderRating(trafficRating)}
            </div>
          </div>

          {/* 4. 在线比例 */}
          <div className="mao-stat-card" data-metric="online">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <Server size={15} className="mao-stat-icon text-[var(--status-success)]" />
                <span className="mao-stat-label">在线比例</span>
              </div>
            </div>
            <div className="mao-stat-value">
              {overview.onlineNodes} <span className="mao-stat-unit">/ {overview.totalNodes}</span>
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption">
                在线率 {onlinePct.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 5. 临期 / 到期提醒 */}
          <div className="mao-stat-card" data-metric="renewal">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <Clock size={15} className="mao-stat-icon text-[var(--status-warning)]" />
                <span className="mao-stat-label">临期提醒</span>
              </div>
              {showDetailButton && <RenewalReminder nodes={renewalNodes} />}
            </div>
            <div className="mao-stat-value">
              {renewalCount > 0 ? `${renewalCount} 台临期` : "运行正常"}
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption">
                {renewalCount > 0 ? "7天内即将到期" : "近期无临期设备"}
              </span>
            </div>
          </div>

          {/* 6. 资产概览 */}
          <div className="mao-stat-card" data-metric="asset">
            <div className="mao-stat-head">
              <div className="mao-stat-title-wrap">
                <CircleDollarSign size={15} className="mao-stat-icon text-[var(--accent-500)]" />
                <span className="mao-stat-label">资产总值</span>
              </div>
              {showDetailButton && (
                <Link
                  to="/assets"
                  className="overview-card-action mao-stat-action"
                  aria-label="打开资产统计页"
                  title="资产统计"
                >
                  <CircleDollarSign size={14} />
                </Link>
              )}
            </div>
            <div className="mao-stat-value">
              {remainingValue}
            </div>
            <div className="mao-stat-footer">
              <span className="mao-stat-caption">实时汇率折算</span>
              {renderRating(assetRating)}
            </div>
          </div>
        </div>
      </div>

      {/* 右侧集群状态区域 */}
      <div className="mao-hero-side">
        <div className="mao-progress-container">
          <div className="mao-progress-head">
            <div className="mao-progress-title-wrap">
              <h3 className="mao-progress-title">
                <Activity size={17} className="text-[var(--text-primary)]" />
                <span>集群状态</span>
              </h3>
              <p className="mao-progress-subtitle">主机在线率与实时网络吞吐</p>
            </div>
            <span className={`mao-status-pill ${isAllHealthy ? "is-healthy" : "is-warning"}`}>
              <span className="mao-status-dot" />
              {isAllHealthy ? "状态健康" : overview.totalNodes === 0 ? "未连接" : `存在离线 (${overview.offlineNodes})`}
            </span>
          </div>

          {/* 进度模块 1：服务器在线状态 */}
          <div className="mao-progress-section">
            <div className="mao-progress-section-header">
              <div className="flex items-baseline gap-1.5">
                <span className="mao-progress-big-num">{onlinePct.toFixed(0)}%</span>
                <span className="mao-progress-unit-label">在线率</span>
              </div>
              <div className="mao-progress-tag-box">
                <span className="mao-progress-tag-label">离线服务器</span>
                <span className="mao-progress-tag-val">{overview.offlineNodes} 台</span>
              </div>
            </div>
            {/* 一节一节的服务器方块 */}
            <div className="mao-node-blocks" role="presentation">
              {overview.totalNodes > 0 ? (
                Array.from({ length: overview.totalNodes }, (_, i) => {
                  const isOnline = i < overview.onlineNodes;
                  const isOffline = i >= overview.totalNodes - overview.offlineNodes;
                  const statusClass = isOnline
                    ? "is-online"
                    : isOffline
                      ? "is-offline"
                      : "is-unknown";
                  return (
                    <span
                      key={i}
                      className={`mao-node-block ${statusClass}`}
                      title={`服务器 ${i + 1}: ${isOnline ? "在线" : isOffline ? "离线" : "未知"}`}
                    />
                  );
                })
              ) : (
                <span className="mao-node-block is-unknown" />
              )}
            </div>
            <div className="mao-progress-section-footer">
              <span>在线 {overview.onlineNodes} 台</span>
              <span>总计 {overview.totalNodes} 台</span>
            </div>
          </div>

          {/* 进度模块 2：实时动态网络曲线图 */}
          <OverviewTrafficChart
            netUp={overview.netUp}
            netDown={overview.netDown}
            bandwidthRating={bandwidthRating}
          />
        </div>
      </div>
    </section>
  );
}

function GroupTabs({
  groups,
  selectedGroup,
  onSelectGroup,
}: {
  groups: string[];
  selectedGroup: string;
  onSelectGroup: (group: string) => void;
}) {
  return (
    <div className="home-group-tabs" role="group" aria-label="服务器分组">
      <button
        type="button"
        aria-pressed={selectedGroup === HOME_ALL_GROUP}
        data-active={selectedGroup === HOME_ALL_GROUP ? "true" : "false"}
        onClick={() => onSelectGroup(HOME_ALL_GROUP)}
      >
        全部
      </button>
      {groups.map((group) => (
        <button
          key={group}
          type="button"
          aria-pressed={selectedGroup === group}
          data-active={selectedGroup === group ? "true" : "false"}
          onClick={() => onSelectGroup(group)}
          title={group}
        >
          {group}
        </button>
      ))}
    </div>
  );
}

// 地区筛选栏:按国旗聚合节点,点击某地区只看该地区;再点一次(或点已选中项)回到全部。
// 与分组栏是两条独立筛选,可叠加(先分组、后地区)。
function RegionTabs({
  regions,
  selectedRegion,
  onSelectRegion,
}: {
  regions: HomeRegionOption[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
}) {
  return (
    <section className="home-region-bar" aria-label="地区筛选">
      <div className="home-region-chips" role="group">
        {regions.map(({ code, count }) => {
          const active = selectedRegion === code;
          return (
            <button
              key={code}
              type="button"
              className="home-region-chip"
              data-active={active ? "true" : "false"}
              aria-pressed={active}
              onClick={() => onSelectRegion(active ? HOME_ALL_REGION : code)}
              title={code}
            >
              <Flag region={code} size={14} />
              <span className="home-region-chip-code">{code}</span>
              <span className="home-region-chip-count">{count}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function NodeGrid() {
  const now = useHourlyClock();
  const queryClient = useQueryClient();
  const nodes = useHomeNodeSummaries();
  const nodeOnlineSummaries = useNodeOnlineSummaries();
  const allMeta = useAllNodeMeta();
  const { hydrated: storeHydrated, nodeInfoError } = useNodeStoreStatus();
  const { data: me } = useAuth();
  const { data: publicConfig } = usePublicConfig();
  const siteName = publicConfig?.sitename?.trim() || "节点概览";
  const themeSettings = useThemeSettings();
  const { mode } = useViewMode();
  const sort = useHomeSort();
  // enableHomeSort 控制访客能否改排序;关闭时无视 session 覆盖、直接用管理员默认序(默认仍是 weight)。
  const sortEnabled = themeSettings.isReady && themeSettings.enableHomeSort;
  const sortField = sortEnabled ? sort.field : themeSettings.homeSortField;
  const sortDirection = sortEnabled ? sort.direction : themeSettings.homeSortDirection;
  const [selectedGroup, setSelectedGroup] = useState(HOME_ALL_GROUP);
  const [selectedRegion, setSelectedRegion] = useState(HOME_ALL_REGION);
  useHomepagePingOverview(mode);

  // 摘要不含名称，先从完整 meta 解析主题隐藏列表，再统一过滤各类数据。
  const hiddenUuids = useHiddenNodeUuids();
  const visibleNodes = useMemo(
    () =>
      nodes.filter(
        (node) => (me?.logged_in === true || !node.hidden) && !hiddenUuids.has(node.uuid),
      ),
    [me?.logged_in, nodes, hiddenUuids],
  );
  // 资产统计与卡片使用同一可见性规则，避免泄露隐藏节点信息。
  const visibleMeta = useMemo(
    () =>
      allMeta.filter(
        (node) => (me?.logged_in === true || !node.hidden) && !hiddenUuids.has(node.uuid),
      ),
    [allMeta, me?.logged_in, hiddenUuids],
  );
  const renewalNodes = useMemo<RenewalReminderSource[]>(() => {
    const onlineByUuid = new Map(
      nodeOnlineSummaries.map((node) => [node.uuid, node.online]),
    );
    return visibleMeta.map((node) => ({
      ...node,
      online: onlineByUuid.get(node.uuid) ?? null,
    }));
  }, [nodeOnlineSummaries, visibleMeta]);
  const trafficUuids = useMemo(
    () => visibleMeta.map((node) => node.uuid),
    [visibleMeta],
  );
  const warmTrafficPage = useCallback(() => {
    void preloadTodayTrafficStats(queryClient, trafficUuids, Date.now());
  }, [queryClient, trafficUuids]);
  // 「名称」排序需要展示名(摘要无 name),从 meta 注入。
  const nameByUuid = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of visibleMeta) map.set(node.uuid, node.name?.trim() || node.uuid);
    return map;
  }, [visibleMeta]);
  const overview = useMemo<HomeOverview>(() => {
    let onlineNodes = 0;
    let offlineNodes = 0;
    let trafficUp = 0;
    let trafficDown = 0;
    let netUp = 0;
    let netDown = 0;
    for (const node of visibleNodes) {
      if (node.online === true) onlineNodes += 1;
      else if (node.online === false) offlineNodes += 1;
      trafficUp += node.trafficUp;
      trafficDown += node.trafficDown;
      netUp += node.netUp;
      netDown += node.netDown;
    }

    return {
      totalNodes: visibleNodes.length,
      onlineNodes,
      offlineNodes,
      trafficUp,
      trafficDown,
      netUp,
      netDown,
    };
  }, [visibleNodes]);
  const showHomeOverview = themeSettings.isReady && themeSettings.showHomeOverview;
  const showTrafficPopover = themeSettings.isReady && themeSettings.showTodayTrafficPopover;
  const hasNodes = visibleMeta.length > 0;
  const loggedIn = Boolean(me?.logged_in);
  const canAccessAssets = loggedIn || themeSettings.showPriceForGuests;
  // 卡内入口与悬浮入口互斥，避免重复操作入口。
  const showAssetCard = showHomeOverview && hasNodes;
  const showCostDetailButton =
    showAssetCard && themeSettings.isReady && themeSettings.showCostSummary && canAccessAssets;
  const showCostFloatingButton =
    themeSettings.isReady &&
    themeSettings.showCostSummaryFloatingButton &&
    hasNodes &&
    canAccessAssets &&
    !showCostDetailButton;

  useEffect(() => {
    if (!showCostDetailButton && !showCostFloatingButton) return;

    const idleWindow = window as IdleCapableWindow;
    if (idleWindow.requestIdleCallback) {
      const handle = idleWindow.requestIdleCallback(preloadAssetsPage, { timeout: 2_000 });
      return () => idleWindow.cancelIdleCallback?.(handle);
    }

    // Safari 等无 requestIdleCallback 的浏览器，在首页稳定后再低优先级预取。
    const handle = window.setTimeout(preloadAssetsPage, 1_000);
    return () => window.clearTimeout(handle);
  }, [showCostDetailButton, showCostFloatingButton]);

  // 资产入口存在时预热汇率，供概览、价格排序和资产页复用。
  const costNeeded = showAssetCard || showCostFloatingButton;
  const rateQuery = useQuery({
    queryKey: ["cost-rates", themeSettings.costRateApiUrl],
    queryFn: ({ signal }) => getExchangeRates(themeSettings.costRateApiUrl, { signal }),
    staleTime: 60 * 60 * 1000,
    // 「价格」排序也要汇率换算月化价,即便没显示资产卡也得拉一次;但空列表无需拉。
    enabled: (costNeeded || sortField === "price") && hasNodes,
    retry: 1,
  });
  const costSummary = useMemo(
    () =>
      rateQuery.data
        ? calculateCostSummary(
            visibleMeta,
            themeSettings.costIgnoredNodes,
            rateQuery.data.rates,
            themeSettings.costPremiums,
            now,
          )
        : null,
    [now, visibleMeta, themeSettings.costIgnoredNodes, themeSettings.costPremiums, rateQuery.data],
  );
  // 「价格」排序键:月化价格(CNY);免费/忽略/汇率缺失的节点 null,排到默认序之后。
  const priceByUuid = useMemo(() => {
    const map = new Map<string, number | null>();
    if (costSummary) {
      for (const detail of costSummary.details) {
        map.set(detail.uuid, detail.counted ? detail.monthlyCny : null);
      }
    }
    return map;
  }, [costSummary]);
  const costLoading = costNeeded && rateQuery.isLoading;
  const groupOptions = useMemo(
    () =>
      sortHomeGroupOptions(
        getHomeGroupOptions(visibleNodes),
        themeSettings.isReady ? themeSettings.homeGroupOrder : [],
      ),
    [visibleNodes, themeSettings.homeGroupOrder, themeSettings.isReady],
  );
  const groupFilteredNodes = useMemo(
    () =>
      selectedGroup === HOME_ALL_GROUP
        ? visibleNodes
        : visibleNodes.filter((node) => getHomeGroupLabel(node.group) === selectedGroup),
    [visibleNodes, selectedGroup],
  );
  // 地区选项在分组筛选之后统计,让国旗计数反映当前分组内的分布。
  const regionOptions = useMemo(
    () => getHomeRegionOptions(groupFilteredNodes),
    [groupFilteredNodes],
  );
  const filteredNodes = useMemo(
    () =>
      selectedRegion === HOME_ALL_REGION
        ? groupFilteredNodes
        : groupFilteredNodes.filter((node) => getDisplayRegionCode(node.region) === selectedRegion),
    [groupFilteredNodes, selectedRegion],
  );
  // 排序在分组筛选之后。离线永远沉底(写死,见 homeSort);实时网速走防抖(键平滑+滞回+5s 重排)。
  const orderedNodes = useHomeNodeOrder({
    nodes: filteredNodes,
    field: sortField,
    direction: sortDirection,
    nameByUuid,
    priceByUuid,
  });

  useEffect(() => {
    if (selectedGroup !== HOME_ALL_GROUP && !groupOptions.includes(selectedGroup)) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [groupOptions, selectedGroup]);

  // 选中的地区在当前分组里不存在了(切换分组/节点变化)就回到全部。
  useEffect(() => {
    if (
      selectedRegion !== HOME_ALL_REGION &&
      !regionOptions.some((option) => option.code === selectedRegion)
    ) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [regionOptions, selectedRegion]);

  // 地区栏被配置关闭(热更新)时,清掉可能残留的地区筛选,否则会留下一个不可见的过滤条件。
  useEffect(() => {
    if (!themeSettings.showRegionBar && selectedRegion !== HOME_ALL_REGION) {
      setSelectedRegion(HOME_ALL_REGION);
    }
  }, [themeSettings.showRegionBar, selectedRegion]);

  useEffect(() => {
    if (!themeSettings.showGroupTabs && selectedGroup !== HOME_ALL_GROUP) {
      setSelectedGroup(HOME_ALL_GROUP);
    }
  }, [themeSettings.showGroupTabs, selectedGroup]);

  // 卡片列表只随 UUID 集合/顺序变化；卡片内部各自订阅实时数据。
  const uuidsKey = useMemo(
    () => orderedNodes.map((node) => node.uuid).join(UUID_KEY_SEPARATOR),
    [orderedNodes],
  );
  const orderedUuids = useMemo(
    () => (uuidsKey ? uuidsKey.split(UUID_KEY_SEPARATOR) : []),
    [uuidsKey],
  );
  // 列表档由下方 NodeListView 渲染,这里不必构造卡片元素。
  const cards = useMemo(
    () =>
      mode === "list"
        ? null
        : orderedUuids.map((uuid) => (
            <div key={uuid} className="min-w-0">
              {mode === "mini" ? (
                <MiniNodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                />
              ) : mode === "compact" ? (
                <CompactNodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                />
              ) : (
                <NodeCard
                  uuid={uuid}
                  showTodayTraffic={showTrafficPopover}
                />
              )}
            </div>
          )),
    [orderedUuids, mode, showTrafficPopover],
  );
  const showGroupTabs =
    themeSettings.isReady && themeSettings.showGroupTabs && groupOptions.length > 0;
  const showHomeSort = sortEnabled && visibleNodes.length > 1;
  // 地区栏:只有一个地区时筛选无意义,>1 才显示。
  const showRegionBar =
    themeSettings.isReady && themeSettings.showRegionBar && regionOptions.length > 1;
  // 分组标签栏与卡片网格共用列定义，让标签栏左缘对齐首卡。
  const isMini = mode === "mini";
  const isList = mode === "list";
  const { className: gridClassName, minColumnWidth } = GRID_LAYOUT[mode];
  const gridWrapClassName = isMini ? `${gridClassName} node-grid-mini` : gridClassName;
  const gridStyle = isList
    ? undefined
    : isMini
      ? ({ "--mini-card-min-width": `${minColumnWidth}px` } as MiniGridStyle)
      : { gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${minColumnWidth}px), 1fr))` };
  const gridElement = (
    <div className={gridWrapClassName} style={gridStyle}>
      {cards}
    </div>
  );
  // 迷你与列表档的控件栏借用小卡列宽，避免跟随密集内容列而被压窄。
  const borrowControlsGrid = isMini || isList;
  const controlsWrapClassName = borrowControlsGrid
    ? "grid gap-3 home-controls-bar mb-4"
    : `${gridWrapClassName} home-controls-bar mb-4`;
  const controlsStyle = borrowControlsGrid
    ? {
        gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${GRID_LAYOUT.compact.minColumnWidth}px), 1fr))`,
      }
    : gridStyle;

  if (!themeSettings.isReady || !storeHydrated) {
    if (!nodeInfoError) return null;
    return (
      <div
        className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]"
        aria-live="polite"
      >
        <span className="text-[14px]">节点数据暂时无法加载</span>
        <span className="text-[12px]">正在等待后端自动重试</span>
      </div>
    );
  }

  // 资产页悬浮入口 + 首页概览卡在「空节点」与正常两个分支里完全一致，提取一次复用。
  const homeHeader = (
    <>
      {showCostFloatingButton && (
        <Link
          to="/assets"
          className="cost-summary-ball show"
          aria-label="打开资产统计页"
          title="资产统计"
        >
          <span className="cost-summary-ball-icon" aria-hidden>
            <CircleDollarSign size={16} />
          </span>
        </Link>
      )}
      <HomeBrand siteName={siteName} />
      {showHomeOverview && (
        <HomeOverviewCards
          overview={overview}
          dense={mode === "mini" || mode === "list"}
          showDetailButton={showCostDetailButton}
          renewalNodes={renewalNodes}
          costSummary={costSummary}
          costLoading={costLoading}
          showOverviewRatings={themeSettings.showOverviewRatings}
          showTrafficRating={themeSettings.showTrafficRating}
          showBandwidthRating={themeSettings.showBandwidthRating}
          showAssetRating={themeSettings.showAssetRating}
          trafficRatingLabels={themeSettings.trafficRatingLabels}
          bandwidthRatingLabels={themeSettings.bandwidthRatingLabels}
          assetRatingLabels={themeSettings.assetRatingLabels}
          onWarmTraffic={warmTrafficPage}
          username={me?.username || (me?.logged_in ? "Admin" : "Visitors")}
        />
      )}
    </>
  );

  if (visibleNodes.length === 0) {
    return (
      <>
        {homeHeader}
        <div className="flex h-[40vh] flex-col items-center justify-center gap-2 text-[var(--text-tertiary)]">
          <span className="text-[15px]">尚未连接到任何节点</span>
          <span className="text-[12px]">等待后端推送或前往管理后台添加</span>
        </div>
      </>
    );
  }

  return (
    <>
      {homeHeader}
      <section className="mao-cluster-card" aria-label="服务器集群与监控列表">
        {showHomeOverview && (
          <div className="mao-section-header">
            <div className="mao-section-top-row">
              <div className="mao-badge">
                <Server size={12} className="text-[var(--text-primary)]" />
                <span>服务器集群</span>
              </div>
              {showHomeSort && (
                <div className="mao-section-header-actions">
                  <HomeSortControl state={sort} />
                </div>
              )}
            </div>
            <div className="mao-section-title-wrap">
              <h2 className="mao-section-title">服务器矩阵与实时监控</h2>
              <p className="mao-section-sub">
                实时监控服务器负载、资源占用、网络吞吐与在线状态。
              </p>
            </div>
          </div>
        )}
        {((!showHomeOverview && showHomeSort) || showGroupTabs) && (
          <div className={controlsWrapClassName} style={controlsStyle}>
            {showGroupTabs && (
              <GroupTabs
                groups={groupOptions}
                selectedGroup={selectedGroup}
                onSelectGroup={setSelectedGroup}
              />
            )}
            {!showHomeOverview && showHomeSort && <HomeSortControl state={sort} />}
          </div>
        )}
        {showRegionBar && (
          <RegionTabs
            regions={regionOptions}
            selectedRegion={selectedRegion}
            onSelectRegion={setSelectedRegion}
          />
        )}
        {isList ? (
          <NodeListView uuids={orderedUuids} />
        ) : showTrafficPopover ? (
          <TodayTrafficStatsProvider uuids={trafficUuids}>
            {gridElement}
          </TodayTrafficStatsProvider>
        ) : (
          gridElement
        )}
      </section>
    </>
  );
}
