import React from "react";
import {
  Activity,
  CircleDollarSign,
  Cpu,
  Database,
  HardDrive,
  Layers,
  Network,
  Server,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { StatMetricIcon } from "../ui/StatMetricIcon";
import { formatBytes } from "@/utils/format";
import type { OverviewCardId } from "@/types/komari";
import type { OverviewRating } from "@/utils/overviewRating";
import { RenewalReminder } from "./RenewalReminder";
import type { RenewalReminderSource } from "@/utils/renewalReminder";
import { getRenewalReminders } from "@/utils/renewalReminder";

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
}

export interface OverviewStatCardProps {
  cardId: OverviewCardId;
  overview?: OverviewData | null;
  todayTrafficTotal?: number | null;
  todayTrafficLoading?: boolean;
  showAssetCard?: boolean;
  isPriceVisible?: boolean;
  costSummary?: { remainingCny: number; totalOriginalPriceCny?: number } | null;
  costLoading?: boolean;
  showTrafficDetailButton?: boolean;
  showDetailButton?: boolean;
  trafficRating?: OverviewRating | null;
  assetRating?: OverviewRating | null;
  renewalNodes?: RenewalReminderSource[];
  onWarmTraffic?: () => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
}

export const OVERVIEW_CARD_TITLES: Record<OverviewCardId, string> = {
  connections: "活跃连接",
  cpu: "平均 CPU",
  ram: "内存用量",
  disk: "硬盘用量",
  traffic: "今日流量",
  asset: "资产总值",
  nodes: "节点在线",
  bandwidth: "实时带宽",
  swap: "虚拟内存",
  process: "活跃进程",
  cores: "计算核心",
};

export const OverviewStatCard: React.FC<OverviewStatCardProps> = ({
  cardId,
  overview,
  todayTrafficTotal,
  todayTrafficLoading = false,
  showAssetCard = true,
  isPriceVisible = true,
  costSummary,
  costLoading = false,
  showTrafficDetailButton = false,
  showDetailButton = false,
  trafficRating,
  assetRating,
  renewalNodes,
  onWarmTraffic,
  className = "",
  draggable,
  onDragStart,
  onDragEnd,
  onClick,
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

  const renderRating = (rating: OverviewRating | null) =>
    rating ? (
      <span
        className="overview-card-rating"
        data-rating-level={rating.level}
        title={`指标定级: ${rating.label}`}
      >
        {rating.label}
      </span>
    ) : null;

  const renderAssetValue = () => {
    if (!isPriceVisible) return "保密";
    if (!costSummary) return costLoading ? "计算中" : "¥470";
    const totalOriginal = costSummary.totalOriginalPriceCny ?? 0;
    if (totalOriginal > 0 || costSummary.remainingCny > 0) {
      return (
        <>
          ¥{Math.round(costSummary.remainingCny)}
          {totalOriginal > 0 && (
            <span className="mao-stat-unit text-[13px] font-normal text-(--text-tertiary)">
              {" "}/ ¥{Math.round(totalOriginal)}
            </span>
          )}
        </>
      );
    }
    return `¥${Math.round(costSummary.remainingCny)}`;
  };

  const cardProps = {
    className: `mao-stat-card ${className}`,
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
          <div className="mao-stat-value">
            {totalConnections.toLocaleString()} <span className="mao-stat-unit">Conn</span>
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
          <div className="mao-stat-value">
            {avgCpu.toFixed(1)} <span className="mao-stat-unit">%</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption">
              {onlineNodes > 0 ? `${onlineNodes} 台在线服务器` : "暂无在线服务器"}
            </span>
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
          <div className="mao-stat-value">
            {ramUsedValue} <span className="mao-stat-unit">{ramUsedUnit}</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption" title={`已用: ${formatBytes(totalRamUsed)} / 总量: ${formatBytes(totalRamTotal)}`}>
              共 {formatBytes(totalRamTotal)} · {ramPct.toFixed(1)}%
            </span>
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
          <div className="mao-stat-value">
            {diskUsedValue} <span className="mao-stat-unit">{diskUsedUnit}</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption" title={`已用: ${formatBytes(totalDiskUsed)} / 总量: ${formatBytes(totalDiskTotal)}`}>
              共 {formatBytes(totalDiskTotal)} · {diskPct.toFixed(1)}%
            </span>
          </div>
        </div>
      );

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
                className="mao-stat-link"
                title="查看全节点流量趋势与月度出入站明细"
                aria-label="查看流量趋势与月度明细"
                onMouseEnter={onWarmTraffic}
                onFocus={onWarmTraffic}
              >
                <TrendingUp size={13} />
              </Link>
            )}
          </div>
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
            {renderRating(trafficRating ?? null)}
          </div>
        </div>
      );

    case "asset":
      if (!showAssetCard) return null;
      return (
        <div key="asset" data-metric="asset" {...cardProps} className={`mao-stat-card ${className}${renewalPopoverOpen ? " is-popover-open" : ""}`}>
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
                    <CircleDollarSign size={14} className={renewalCount > 0 ? "text-(--status-warning)" : ""} />
                  </Link>
                </RenewalReminder>
              ) : (
                <Link
                  to="/assets"
                  className="mao-stat-link"
                  title="查看资产明细与续费提醒"
                  aria-label="查看资产明细与续费提醒"
                >
                  <CircleDollarSign size={13} />
                </Link>
              )
            )}
          </div>
          <div className="mao-stat-value">{renderAssetValue()}</div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption">{!isPriceVisible ? "仅管理员可见" : "实时汇率折算"}</span>
            {renderRating(assetRating ?? null)}
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
          <div className="mao-stat-value">
            {onlinePct.toFixed(1)} <span className="mao-stat-unit">%</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption" title={`在线: ${onlineNodes} · 离线: ${offlineNodes} · 总计: ${totalNodes}`}>
              {onlineNodes} 在线 · {offlineNodes} 离线 (共 {totalNodes} 台)
            </span>
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
          <div className="mao-stat-value">
            {bandwidthTotalValue} <span className="mao-stat-unit">{bandwidthTotalUnit}/s</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption" title={`上行: ${formatBytes(netUp)}/s · 下行: ${formatBytes(netDown)}/s`}>
              ↑ {formatBytes(netUp)}/s · ↓ {formatBytes(netDown)}/s
            </span>
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
          <div className="mao-stat-value">
            {swapUsedValue} <span className="mao-stat-unit">{swapUsedUnit}</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption" title={`已用: ${formatBytes(totalSwapUsed)} / 总量: ${formatBytes(totalSwapTotal)}`}>
              共 {formatBytes(totalSwapTotal)} · {swapPct.toFixed(1)}%
            </span>
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
          <div className="mao-stat-value">
            {totalProcesses.toLocaleString()} <span className="mao-stat-unit">Procs</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption">
              全节点运行进程总计
            </span>
          </div>
        </div>
      );

    case "cores":
      return (
        <div key="cores" data-metric="cores" {...cardProps}>
          <div className="mao-stat-head">
            <div className="mao-stat-title-wrap">
              <StatMetricIcon metric="cores" icon={Cpu} />
              <span className="mao-stat-label">计算核心</span>
            </div>
          </div>
          <div className="mao-stat-value">
            {totalCores.toLocaleString()} <span className="mao-stat-unit">Cores</span>
          </div>
          <div className="mao-stat-footer">
            <span className="mao-stat-caption">
              集群 CPU 总核心数
            </span>
          </div>
        </div>
      );

    default:
      return null;
  }
};
