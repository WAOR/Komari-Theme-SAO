import React from "react";
import {
  Activity,
  Award,
  CircleDollarSign,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Microchip,
  Network,
  Radio,
  Server,
  Terminal,
  Timer,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatMetricIcon } from "../ui/StatMetricIcon";
import { StatMicroVisual } from "../ui/StatMicroVisual";
import { formatBytes, formatCompactNumber } from "@/utils/format";
import type { OverviewCardId, OverviewMicroVisualMode, YesterdayBestScope } from "@/types/komari";
import { RenewalReminder } from "./RenewalReminder";
import type { RenewalReminderSource } from "@/utils/renewalReminder";
import { getRenewalReminders } from "@/utils/renewalReminder";
import type { HourlyTrafficBucket } from "@/utils/trafficStats";
import { type CarrierLossSummary, getLossTier } from "@/utils/carrierLoss";
import { CURRENCY_SYMBOLS, convertCnyToTargetCurrency, type CostTargetCurrency } from "@/utils/cost";

function TrafficBarsIcon({ size = 14 }: { size?: number }) {
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

export interface OverviewData {
  totalNodes?: number;
  onlineNodes?: number;
  offlineNodes?: number;
  trafficUp?: number;
  trafficDown?: number;
  netUp?: number;
  netDown?: number;
  avgCpu?: number;
  totalRamUsed?: number;
  totalRamTotal?: number;
  ramPct?: number;
  totalDiskUsed?: number;
  totalDiskTotal?: number;
  diskPct?: number;
  totalTcpConn?: number;
  totalUdpConn?: number;
  totalSwapUsed?: number;
  totalSwapTotal?: number;
  swapPct?: number;
  totalProcesses?: number;
  totalCores?: number;
  recentRebootNode?: { name: string; seconds: number } | null;
  carrierLoss?: CarrierLossSummary | null;
  yesterdayBestScope?: YesterdayBestScope;
  yesterdayBest?: {
    nodeIndexText: string;
    nodeName: string;
    score: number;
    avgLatency: number;
    avgLoss: number;
    scope?: YesterdayBestScope;
    mode?: "best" | "average";
  } | null;
}

export interface OverviewStatCardProps {
  cardId: OverviewCardId;
  overview?: OverviewData | null;
  todayTrafficTotal?: number | null;
  todayTrafficLoading?: boolean;
  todayTrafficHourly?: HourlyTrafficBucket[] | null;
  showAssetCard?: boolean;
  isPriceVisible?: boolean;
  costSummary?: { remainingCny: number; totalOriginalPriceCny?: number } | null;
  costLoading?: boolean;
  costCurrency?: CostTargetCurrency;
  exchangeRates?: Record<string, number>;
  showTrafficDetailButton?: boolean;
  showDetailButton?: boolean;
  renewalNodes?: RenewalReminderSource[];
  onWarmTraffic?: () => void;
  onOpenLeaderboard?: () => void;
  isActive?: boolean;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
  microVisualMode?: OverviewMicroVisualMode;
}

export const OVERVIEW_CARD_TITLES: Record<OverviewCardId, string> = {
  connections: "活跃连接",
  cpu: "平均 CPU",
  ram: "内存用量",
  disk: "硬盘用量",
  uptime: "最近重启",
  traffic: "今日流量",
  asset: "资产总值",
  nodes: "节点在线",
  bandwidth: "实时带宽",
  swap: "虚拟内存",
  process: "活跃进程",
  cores: "计算核心",
  loss: "三网丢包",
  yesterdayBest: "稳定评分",
};

function formatRebootAgo(seconds: number): { value: string; unit: string; fullText: string } {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return { value: "—", unit: "", fullText: "—" };
  }
  if (seconds < 60) {
    return { value: "刚刚", unit: "", fullText: "刚刚" };
  }
  const days = Math.floor(seconds / 86400);
  if (days >= 1) {
    return { value: String(days), unit: "天前", fullText: `${days}天前` };
  }
  const hours = Math.floor(seconds / 3600);
  if (hours >= 1) {
    return { value: String(hours), unit: "小时前", fullText: `${hours}小时前` };
  }
  const minutes = Math.max(1, Math.floor(seconds / 60));
  return { value: String(minutes), unit: "分钟前", fullText: `${minutes}分钟前` };
}

export const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  cardId,
  overview,
  todayTrafficTotal,
  todayTrafficLoading = false,
  todayTrafficHourly,
  showAssetCard = true,
  isPriceVisible = true,
  costSummary,
  costLoading = false,
  costCurrency = "CNY",
  exchangeRates,
  showTrafficDetailButton = false,
  showDetailButton = false,
  renewalNodes,
  onWarmTraffic,
  onOpenLeaderboard,
  isActive = false,
  className = "",
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
  microVisualMode,
}) => {
  const [renewalPopoverOpen, setRenewalPopoverOpen] = React.useState(false);
  const renewalReminders = renewalNodes
    ? getRenewalReminders(renewalNodes, Date.now(), { requireOnlineForExpired: true })
    : [];
  const renewalCount = renewalReminders.length;
  // 提取各指标数值，支持真实数据或缺省预览数据
  const totalTcpConn = overview?.totalTcpConn ?? 1250;
  const totalUdpConn = overview?.totalUdpConn ?? 90;
  const totalConnections = totalTcpConn + totalUdpConn;

  const avgCpu = overview?.avgCpu ?? 66.6;
  const onlineNodes = overview?.onlineNodes ?? 5;
  const offlineNodes = overview?.offlineNodes ?? 1;
  const totalNodes = overview?.totalNodes ?? 6;
  const onlinePct = totalNodes > 0 ? (onlineNodes / totalNodes) * 100 : 83.3;

  const totalRamUsed = overview?.totalRamUsed ?? 54653452288; // 50.9 GB
  const totalRamTotal = overview?.totalRamTotal ?? 92340551680; // 86.0 GB
  const [ramUsedValue, ramUsedUnit] = formatBytes(totalRamUsed).split(" ");
  const ramPct = totalRamTotal > 0 ? (totalRamUsed / totalRamTotal) * 100 : 59.2;

  const totalDiskUsed = overview?.totalDiskUsed ?? 680749000000; // 634 GB
  const totalDiskTotal = overview?.totalDiskTotal ?? 2099900000000; // 1.91 TB
  const [diskUsedValue, diskUsedUnit] = formatBytes(totalDiskUsed).split(" ");
  const diskPct = totalDiskTotal > 0 ? (totalDiskUsed / totalDiskTotal) * 100 : 32.3;

  const todayTrafficBytes = todayTrafficTotal ?? (overview ? 0 : 46278836224); // 43.1 GB
  const [trafficValue, trafficUnit] =
    todayTrafficLoading && todayTrafficTotal === null
      ? ["—", ""]
      : formatBytes(todayTrafficBytes).split(" ");

  const totalSwapUsed = overview?.totalSwapUsed ?? 7516192768; // 7.00 GB
  const totalSwapTotal = overview?.totalSwapTotal ?? 23622320128; // 22.0 GB
  const [swapUsedValue, swapUsedUnit] = formatBytes(totalSwapUsed).split(" ");
  const swapPct = totalSwapTotal > 0 ? (totalSwapUsed / totalSwapTotal) * 100 : 31.8;

  const netUp = overview?.netUp ?? 44459622; // 42.4 MB/s
  const netDown = overview?.netDown ?? 64277708; // 61.3 MB/s
  const netTotal = netUp + netDown;
  const [bandwidthTotalValue, bandwidthTotalUnit] = formatBytes(netTotal).split(" ");

  const totalProcesses = overview?.totalProcesses ?? 1842;
  const totalCores = overview?.totalCores ?? 64;

  const targetSymbol = CURRENCY_SYMBOLS[costCurrency] || "¥";

  const renderAssetValue = () => {
    if (!isPriceVisible) return "保密";
    if (!costSummary) return costLoading ? "计算中" : "—";
    const totalOriginalCny = costSummary.totalOriginalPriceCny ?? 0;
    const remainingCny = costSummary.remainingCny ?? 0;

    const totalOriginal = exchangeRates && costCurrency !== "CNY"
      ? convertCnyToTargetCurrency(totalOriginalCny, costCurrency, exchangeRates)
      : totalOriginalCny;
    const remaining = exchangeRates && costCurrency !== "CNY"
      ? convertCnyToTargetCurrency(remainingCny, costCurrency, exchangeRates)
      : remainingCny;

    const mainPrice = totalOriginal > 0 ? totalOriginal : remaining;

    const fullTitle = totalOriginal > 0
      ? `资产总值: ${targetSymbol}${Math.round(totalOriginal).toLocaleString()} · 剩余价值: ${targetSymbol}${Math.round(remaining).toLocaleString()}`
      : `剩余价值: ${targetSymbol}${Math.round(remaining).toLocaleString()}`;

    // 资产总值卡片大数字空间充裕（单数值无单位）：6位数内（<1,000,000）完整显示千分位，7位数（百万级及以上）才启用 M 缩写
    return <span title={fullTitle}>{targetSymbol}{formatCompactNumber(mainPrice, 1_000_000)}</span>;
  };

  const renderAssetCaption = () => {
    if (!isPriceVisible) return "仅管理员可见";
    if (!costSummary) return costLoading ? "计算中" : "实时汇率折算";
    const remainingCny = costSummary.remainingCny ?? 0;
    const remaining = exchangeRates && costCurrency !== "CNY"
      ? convertCnyToTargetCurrency(remainingCny, costCurrency, exchangeRates)
      : remainingCny;
    // 剩余价值需直观观察每日折旧减少，避免金额较大时因缩写看不出变化；千万以内（<10,000,000）完整显示千分位
    return `剩余价值 ${targetSymbol}${formatCompactNumber(remaining, 10_000_000)}`;
  };

  const cardProps = {
    className: `mao-stat-card ${className}${isActive ? " is-active" : ""}`,
    tabIndex: 0,
    draggable,
    onDragStart,
    onDragEnd,
    onClick,
  };

  switch (cardId) {
    case "connections":
      return (
        <div key="connections" data-metric="connections" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="connections" icon={Network} />
              <span className="mao-stat-label">活跃连接</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div
                className="mao-stat-value"
                title={`${totalConnections.toLocaleString()} Conn`}
              >
                {formatCompactNumber(totalConnections)} <span className="mao-stat-unit">Conn</span>
              </div>
              <div className="mao-stat-footer">
                <span
                  className="mao-stat-caption"
                  title={`TCP 连接: ${totalTcpConn.toLocaleString()} · UDP 连接: ${totalUdpConn.toLocaleString()}`}
                >
                  TCP {totalTcpConn.toLocaleString()} · UDP {totalUdpConn.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="connections"
                totalTcpConn={totalTcpConn}
                totalUdpConn={totalUdpConn}
                onlineNodes={onlineNodes}
                totalNodes={totalNodes}
                microVisualMode={microVisualMode}
              />
            </div>
          </div>
        </div>
      );

    case "cpu":
      return (
        <div key="cpu" data-metric="cpu" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="cpu" icon={Cpu} />
              <span className="mao-stat-label">平均 CPU</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {avgCpu.toFixed(1)} <span className="mao-stat-unit">%</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption">
                  {onlineNodes > 0 ? `${onlineNodes} 台在线服务器` : "暂无在线服务器"}
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="cpu" avgCpu={avgCpu} microVisualMode={microVisualMode} />
            </div>
          </div>
        </div>
      );

    case "ram":
      return (
        <div key="ram" data-metric="ram" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="ram" icon={Layers} />
              <span className="mao-stat-label">内存用量</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {ramUsedValue} <span className="mao-stat-unit">{ramUsedUnit}</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption" title={`已用: ${formatBytes(totalRamUsed)} / 总量: ${formatBytes(totalRamTotal)}`}>
                  共 {formatBytes(totalRamTotal)} · {ramPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="ram" ramPct={ramPct} />
            </div>
          </div>
        </div>
      );

    case "disk":
      return (
        <div key="disk" data-metric="disk" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="disk" icon={HardDrive} />
              <span className="mao-stat-label">硬盘用量</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {diskUsedValue} <span className="mao-stat-unit">{diskUsedUnit}</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption" title={`已用: ${formatBytes(totalDiskUsed)} / 总量: ${formatBytes(totalDiskTotal)}`}>
                  共 {formatBytes(totalDiskTotal)} · {diskPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="disk" diskPct={diskPct} microVisualMode={microVisualMode} />
            </div>
          </div>
        </div>
      );

    case "uptime": {
      const recentReboot = overview?.recentRebootNode
        ? {
            name: overview.recentRebootNode.name,
            ...formatRebootAgo(overview.recentRebootNode.seconds),
          }
        : overview !== undefined
          ? null
          : { value: "3", unit: "小时前", fullText: "3小时前", name: "Tokyo-01" };
      return (
        <div key="uptime" data-metric="uptime" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="uptime" icon={Timer} />
              <span className="mao-stat-label">最近重启</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {recentReboot ? (
                  <>
                    {recentReboot.value}{" "}
                    {recentReboot.unit && (
                      <span className="mao-stat-unit">{recentReboot.unit}</span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
              <div className="mao-stat-footer">
                <span
                  className="mao-stat-caption truncate"
                  title={
                    recentReboot
                      ? `最近重启设备: ${recentReboot.name} · ${recentReboot.fullText}`
                      : "暂无在线设备"
                  }
                >
                  {recentReboot ? recentReboot.name : "暂无在线设备"}
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="uptime"
                recentRebootSeconds={overview?.recentRebootNode?.seconds ?? 10800}
              />
            </div>
          </div>
        </div>
      );
    }

    case "traffic":
      return (
        <div key="traffic" data-metric="traffic" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="traffic" icon={TrendingUp} />
              <span className="mao-stat-label">今日流量</span>
            </div>
            {showTrafficDetailButton && (
              <Link
                to="/traffic"
                className="overview-card-action mao-stat-action"
                title="查看全节点流量趋势与月度出入站明细"
                aria-label="查看流量趋势与月度明细"
                onMouseEnter={onWarmTraffic}
                onFocus={onWarmTraffic}
              >
                <TrafficBarsIcon size={14} />
              </Link>
            )}
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {trafficValue} <span className="mao-stat-unit">{trafficUnit}</span>
              </div>
              <div className="mao-stat-footer">
                <span
                  className="mao-stat-caption"
                  title={`今日全节点出入站累计 ${formatBytes(todayTrafficBytes)}`}
                >
                  全节点出入站累计
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="traffic"
                todayTrafficBytes={todayTrafficBytes}
                todayTrafficHourly={todayTrafficHourly}
                microVisualMode={microVisualMode}
              />
            </div>
          </div>
        </div>
      );

    case "asset":
      if (!showAssetCard) return null;
      return (
        <div key="asset" data-metric="asset" {...cardProps} className={`mao-stat-card ${className}${isActive ? " is-active" : ""}${renewalPopoverOpen ? " is-popover-open" : ""}`}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="asset" icon={CircleDollarSign} />
              <span className="mao-stat-label">资产总值</span>
            </div>
            {showDetailButton && (
              renewalNodes && renewalNodes.length > 0 ? (
                <RenewalReminder nodes={renewalNodes} onOpenChange={setRenewalPopoverOpen}>
                  <Link
                    to="/assets"
                    className="overview-card-action mao-stat-action"
                    title={renewalCount > 0 ? `${renewalCount} 台设备即将到期` : "资产统计"}
                    aria-label="查看资产明细与续费提醒"
                  >
                    <Wallet size={14} strokeWidth={2} />
                  </Link>
                </RenewalReminder>
              ) : (
                <Link
                  to="/assets"
                  className="overview-card-action mao-stat-action"
                  title="查看资产明细与续费提醒"
                  aria-label="查看资产明细与续费提醒"
                >
                  <Wallet size={14} strokeWidth={2} />
                </Link>
              )
            )}
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">{renderAssetValue()}</div>
              <div className="mao-stat-footer">
                <span
                  className="mao-stat-caption"
                  title={
                    costSummary && isPriceVisible
                      ? (() => {
                          const origCny = costSummary.totalOriginalPriceCny ?? 0;
                          const remCny = costSummary.remainingCny ?? 0;
                          const orig = exchangeRates && costCurrency !== "CNY"
                            ? convertCnyToTargetCurrency(origCny, costCurrency, exchangeRates)
                            : origCny;
                          const rem = exchangeRates && costCurrency !== "CNY"
                            ? convertCnyToTargetCurrency(remCny, costCurrency, exchangeRates)
                            : remCny;
                          return `剩余价值: ${targetSymbol}${Math.round(rem).toLocaleString()} · 资产总值: ${targetSymbol}${Math.round(orig).toLocaleString()}`;
                        })()
                      : undefined
                  }
                >
                  {renderAssetCaption()}
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="asset" costSummary={costSummary} costCurrency={costCurrency} />
            </div>
          </div>
        </div>
      );

    case "nodes":
      return (
        <div key="nodes" data-metric="nodes" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="nodes" icon={Server} />
              <span className="mao-stat-label">节点在线</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {onlinePct.toFixed(1)} <span className="mao-stat-unit">%</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption" title={`在线: ${onlineNodes} · 离线: ${offlineNodes} · 总计: ${totalNodes}`}>
                  {onlineNodes} 在线 · {offlineNodes} 离线 (共 {totalNodes} 台)
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="nodes"
                onlinePct={onlinePct}
                onlineNodes={onlineNodes}
                offlineNodes={offlineNodes}
                totalNodes={totalNodes}
              />
            </div>
          </div>
        </div>
      );

    case "bandwidth":
      return (
        <div key="bandwidth" data-metric="bandwidth" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="bandwidth" icon={Activity} />
              <span className="mao-stat-label">实时带宽</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {bandwidthTotalValue} <span className="mao-stat-unit">{bandwidthTotalUnit}/s</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption" title={`上行: ${formatBytes(netUp)}/s · 下行: ${formatBytes(netDown)}/s`}>
                  ↑ {formatBytes(netUp)}/s · ↓ {formatBytes(netDown)}/s
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="bandwidth"
                netUp={netUp}
                netDown={netDown}
                microVisualMode={microVisualMode}
              />
            </div>
          </div>
        </div>
      );

    case "swap":
      return (
        <div key="swap" data-metric="swap" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="swap" icon={Database} />
              <span className="mao-stat-label">虚拟内存</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {swapUsedValue} <span className="mao-stat-unit">{swapUsedUnit}</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption" title={`已用: ${formatBytes(totalSwapUsed)} / 总量: ${formatBytes(totalSwapTotal)}`}>
                  共 {formatBytes(totalSwapTotal)} · {swapPct.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="swap" swapPct={swapPct} />
            </div>
          </div>
        </div>
      );

    case "process":
      return (
        <div key="process" data-metric="process" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="process" icon={Terminal} />
              <span className="mao-stat-label">活跃进程</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div
                className="mao-stat-value"
                title={`${totalProcesses.toLocaleString()} Procs`}
              >
                {formatCompactNumber(totalProcesses)} <span className="mao-stat-unit">Procs</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption">
                  全节点运行进程总计
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="process" totalProcesses={totalProcesses} />
            </div>
          </div>
        </div>
      );

    case "cores":
      return (
        <div key="cores" data-metric="cores" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="cores" icon={Microchip} />
              <span className="mao-stat-label">计算核心</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div className="mao-stat-value">
                {totalCores.toLocaleString()} <span className="mao-stat-unit">Cores</span>
              </div>
              <div className="mao-stat-footer">
                <span className="mao-stat-caption">
                  集群 CPU 总核心数
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual metric="cores" totalCores={totalCores} />
            </div>
          </div>
        </div>
      );

    case "loss": {
      const defaultCarrierLoss: CarrierLossSummary = {
        peakLoss: null,
        avgLoss: null,
        ct: { loss: null, count: 0 },
        cu: { loss: null, count: 0 },
        cm: { loss: null, count: 0 },
        hasAnyData: false,
        isMultiPingMode: true,
      };
      const carrierLoss = overview?.carrierLoss ?? defaultCarrierLoss;
      const isMultiPingMode = carrierLoss.isMultiPingMode ?? true;
      const hasAnyData = carrierLoss.hasAnyData;
      const peakLoss = carrierLoss.peakLoss;
      const ctLoss = carrierLoss.ct.loss;
      const cuLoss = carrierLoss.cu.loss;
      const cmLoss = carrierLoss.cm.loss;
      const peakTier = getLossTier(peakLoss);

      const displayValue = hasAnyData && peakLoss != null ? peakLoss.toFixed(1) : "—";
      const hasValue = displayValue !== "—";

      let cardTitle = "暂无监控数据";
      if (!isMultiPingMode) {
        cardTitle = "三网丢包需在【网络延迟】中开启「多线模式」查看";
      } else if (hasAnyData && peakLoss != null) {
        cardTitle = `峰值丢包率: ${displayValue}% (电信: ${ctLoss ?? 0}% · 联通: ${cuLoss ?? 0}% · 移动: ${cmLoss ?? 0}%)`;
      }

      const formatCarrier = (name: string, val: number | null | undefined) => {
        if (!hasAnyData || val == null) return `${name} 0.0%`;
        return `${name} ${val.toFixed(1)}%`;
      };
      const getCarrierClass = (val: number | null | undefined) => {
        if (!hasAnyData || val == null) return "";
        const tier = getLossTier(val);
        if (tier === "error") return "text-(--loss-color-error, #ef4444)";
        if (tier === "warning") return "text-(--loss-color-warning, #fbbf24)";
        return "";
      };

      return (
        <div key="loss" data-metric="loss" data-loss-tier={peakTier} {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="loss" icon={Radio} />
              <span className="mao-stat-label">三网丢包</span>
            </div>
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div
                className={`mao-stat-value${
                  peakTier === "error"
                    ? " text-(--loss-color-error, #ef4444)"
                    : peakTier === "warning"
                      ? " text-(--loss-color-warning, #fbbf24)"
                      : ""
                }`}
                title={cardTitle}
              >
                {displayValue}
                {hasValue && <span className="mao-stat-unit">%</span>}
              </div>
              <div className="mao-stat-footer">
                {!isMultiPingMode ? (
                  <span
                    className="mao-stat-caption"
                    title="三网丢包需启用多线路测速，请在【主题设置 -> 网络延迟】中切换为多线模式"
                  >
                    未启用多线模式
                  </span>
                ) : !hasAnyData ? (
                  <span className="mao-stat-caption" title="等待多线测速任务上报数据">
                    等待测速数据
                  </span>
                ) : (
                  <span
                    className="mao-stat-caption mao-stat-carrier-caption"
                    title={`电信 (CT): ${ctLoss ?? 0}% · 联通 (CU): ${cuLoss ?? 0}% · 移动 (CM): ${cmLoss ?? 0}%`}
                  >
                    <span className={`mao-stat-carrier-item ${getCarrierClass(ctLoss)}`}>
                      {formatCarrier("CT", ctLoss)}
                    </span>
                    <span className="mao-stat-carrier-sep" aria-hidden="true">·</span>
                    <span className={`mao-stat-carrier-item ${getCarrierClass(cuLoss)}`}>
                      {formatCarrier("CU", cuLoss)}
                    </span>
                    <span className="mao-stat-carrier-sep" aria-hidden="true">·</span>
                    <span className={`mao-stat-carrier-item ${getCarrierClass(cmLoss)}`}>
                      {formatCarrier("CM", cmLoss)}
                    </span>
                  </span>
                )}
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="loss"
                ctLoss={ctLoss}
                cuLoss={cuLoss}
                cmLoss={cmLoss}
                peakLoss={peakLoss}
                microVisualMode={microVisualMode}
              />
            </div>
          </div>
        </div>
      );
    }

    case "yesterdayBest": {
      const best = overview?.yesterdayBest;
      const scope = best?.scope ?? overview?.yesterdayBestScope ?? "tri";
      const isMultiPingMode = overview?.carrierLoss?.isMultiPingMode ?? true;
      const isTriSingleBlocked = !isMultiPingMode && scope === "tri";

      const displayIndex = isTriSingleBlocked ? "—" : (best ? best.nodeIndexText : "—");
      const hasBest = !isTriSingleBlocked && Boolean(best);
      const score = hasBest && best ? best.score : undefined;

      const cardLabel = "稳定评分";

      const lossPrefix =
        scope === "ct"
          ? "电信丢包"
          : scope === "cu"
            ? "联通丢包"
            : scope === "cm"
              ? "移动丢包"
              : scope === "all"
                ? "综合丢包"
                : "三网丢包";

      const scoreTier =
        score != null
          ? score >= 98
            ? "pure"
            : score >= 93
              ? "good"
              : score >= 85
                ? "fine"
                : score >= 70
                  ? "fair"
                  : score >= 55
                    ? "warn"
                    : "crit"
          : undefined;

      const fallbackCaption = isTriSingleBlocked
        ? "未启用多线模式"
        : "暂无达标节点";

      const fallbackTitle = isTriSingleBlocked
        ? "三网稳定评分需开启「多线模式」，或在卡片设置中切为「全量」"
        : "暂无测速达标节点";

      const cardTitle = hasBest && best
        ? best.mode === "average"
          ? `${cardLabel}: 全集群综合均分 ${best.score}分 · 平均延迟: ${best.avgLatency}ms · ${lossPrefix}: ${best.avgLoss}% (${best.nodeName})`
          : `${cardLabel}: ${best.nodeName} (${best.nodeIndexText}) · 稳定性评分: ${best.score}分 · 平均延迟: ${best.avgLatency}ms · ${lossPrefix}: ${best.avgLoss}%`
        : fallbackTitle;

      return (
        <div
          key="yesterdayBest"
          data-metric="yesterdayBest"
          data-score-tier={scoreTier}
          {...cardProps}
        >
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="yesterdayBest" icon={Trophy} />
              <span className="mao-stat-label">{cardLabel}</span>
            </div>
            {!isTriSingleBlocked && onOpenLeaderboard && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenLeaderboard();
                }}
                className="overview-card-action mao-stat-action"
                title="查看参评服务器网络评分天梯榜"
                aria-label="查看参评服务器网络评分天梯榜"
              >
                <Award size={13} strokeWidth={2.2} />
              </button>
            )}
          </div>
          <div className="mao-stat-body">
            <div className="mao-stat-main">
              <div
                className="mao-stat-value"
                title={cardTitle}
              >
                {hasBest && best ? (
                  <>
                    {best.score.toFixed(1)}{" "}
                    <span className="mao-stat-unit">PTS</span>
                  </>
                ) : (
                  displayIndex
                )}
              </div>
              <div className="mao-stat-footer">
                <span
                  className="mao-stat-caption truncate text-(--text-tertiary)"
                  style={{ color: "var(--text-tertiary)" }}
                  title={cardTitle}
                >
                  {hasBest && best
                    ? best.nodeName
                    : fallbackCaption}
                </span>
              </div>
            </div>
            <div className="mao-stat-visual" aria-hidden="true">
              <StatMicroVisual
                metric="yesterdayBest"
                yesterdayScore={score}
                microVisualMode={microVisualMode}
              />
            </div>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};
