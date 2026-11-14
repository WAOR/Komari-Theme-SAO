import React, { useEffect, useRef, useState } from "react";
import type { OverviewCardId, OverviewMicroVisualMode } from "@/types/komari";
import type { HourlyTrafficBucket } from "@/utils/trafficStats";
import { getLossTier } from "@/utils/carrierLoss";
import { CURRENCY_SYMBOLS, type CostTargetCurrency } from "@/utils/cost";

export interface StatMicroVisualProps {
  metric: OverviewCardId;
  ramPct?: number;
  diskPct?: number;
  avgCpu?: number;
  totalTcpConn?: number;
  totalUdpConn?: number;
  onlinePct?: number;
  onlineNodes?: number;
  offlineNodes?: number;
  totalNodes?: number;
  swapPct?: number;
  totalCores?: number;
  totalProcesses?: number;
  recentRebootSeconds?: number;
  netUp?: number;
  netDown?: number;
  todayTrafficBytes?: number;
  todayTrafficHourly?: HourlyTrafficBucket[] | null;
  costSummary?: { remainingCny: number; totalOriginalPriceCny?: number } | null;
  costCurrency?: CostTargetCurrency;
  microVisualMode?: OverviewMicroVisualMode;
  ctLoss?: number | null;
  cuLoss?: number | null;
  cmLoss?: number | null;
  peakLoss?: number | null;
  yesterdayScore?: number;
}

export const StatMicroVisual: React.FC<StatMicroVisualProps> = ({
  metric,
  ramPct = 46.5,
  diskPct = 29.2,
  avgCpu = 31.7,
  totalTcpConn = 1250,
  totalUdpConn = 90,
  onlinePct = 100,
  onlineNodes = 6,
  offlineNodes = 0,
  totalNodes = 6,
  swapPct = 20,
  recentRebootSeconds = 10800,
  netUp = 0,
  netDown = 0,
  todayTrafficHourly,
  costSummary,
  costCurrency = "CNY",
  microVisualMode = "dynamic",
  ctLoss,
  cuLoss,
  cmLoss,
  peakLoss: _peakLoss,
  yesterdayScore,
}) => {
  const isStatic = microVisualMode === "static";

  switch (metric) {
    /* ------------------------------------------------------------------ *
     * 1. 内存用量 (RAM) / 虚拟内存 (Swap) - 超采样 240° 仪表盘 + 原生 DOM 高清字符
     * ------------------------------------------------------------------ */
    case "ram":
    case "swap": {
      const pct = Math.min(100, Math.max(0, metric === "swap" ? swapPct : ramPct));
      const radius = 41;
      const arcAngle = 270;
      const circumference = 2 * Math.PI * radius; // ~257.61
      const totalArcLength = circumference * (arcAngle / 360); // ~193.21
      const dashOffset = totalArcLength * (1 - pct / 100);
      const isHigh = pct >= 85;

      return (
        <div className="mao-micro-stage">
          <svg
            viewBox="0 0 100 100"
            className="mao-micro-svg mao-micro-gauge"

            aria-hidden="true"
          >
            {/* 背景暗轨 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="9.6"
              strokeLinecap="round"
              strokeDasharray={`${totalArcLength} ${circumference}`}
              transform="rotate(135 50 50)"
              className="mao-gauge-track"
            />
            {/* 实时高能发光弧段 */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={isHigh ? "var(--status-error, #ef4444)" : "currentColor"}
              strokeWidth="9.6"
              strokeLinecap="round"
              strokeDasharray={`${totalArcLength} ${circumference}`}
              strokeDashoffset={dashOffset}
              transform="rotate(135 50 50)"
              className="mao-gauge-fill"
            />
          </svg>
          {/* 核心字符 DOM 原生层：免受 SVG 模糊光栅化，享受系统顶级字形微调 */}
          <div className="mao-gauge-center-badge">
            <span className="mao-gauge-center-num">{Math.round(pct)}</span>
            <span className="mao-gauge-center-unit mao-gauge-pct">%</span>
          </div>
        </div>
      );
    }

    /* ------------------------------------------------------------------ *
     * 2. 平均 CPU - 5 柱声谱音量均衡器 (超采样 100x100)
     * ------------------------------------------------------------------ */
    case "cpu": {
      const cpu = Math.min(100, Math.max(0, avgCpu));
      const barProfiles = [
        { x: 13, maxH: 42, weight: 0.72 },
        { x: 29, maxH: 58, weight: 0.94 },
        { x: 45, maxH: 66, weight: 1.0 },
        { x: 61, maxH: 54, weight: 0.86 },
        { x: 77, maxH: 38, weight: 0.65 },
      ];
      // 静态美化状态：均衡声谱饱满黄金曲线，实心与顶部虚影保持和谐呼吸空间（约 60% 充实感，留出清晰暗轨）
      const staticHeights = [20, 36, 44, 32, 18];

      return (
        <svg
          viewBox="0 0 100 100"
          className="mao-micro-svg mao-micro-bars"

          aria-hidden="true"
        >
          {barProfiles.map((b, i) => {
            const currentH = isStatic
              ? staticHeights[i]
              : Math.max(6, Math.round(b.maxH * (cpu / 100) * b.weight));
            const yPos = 82 - currentH;
            const trackY = 82 - b.maxH;

            return (
              <g key={i}>
                <rect
                  x={b.x}
                  y={trackY}
                  width="10"
                  height={b.maxH}
                  rx="5"
                  fill="currentColor"
                  className="mao-bar-track"
                />
                <rect
                  x={b.x}
                  y={yPos}
                  width="10"
                  height={currentH}
                  rx="5"
                  fill="currentColor"
                  className="mao-bar-fill"
                />
              </g>
            );
          })}
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 3. 活跃连接 - 双通道集群密度自适应协议环 (TCP 外环 + UDP 内环)
     * ------------------------------------------------------------------ */
    case "connections": {
      // 解决固定 2500 标尺在集群多服务器（数万连接）或单节点（几十连接）下失真的问题：
      // 1. 采用「集群单机密度 (Conns per Node)」标定：动态除以在线节点数，屏蔽节点数量差异；
      // 2. 引入对数级平滑压缩 (Logarithmic Scale)：
      //    无论是轻量级 (10~100 conn/台 -> 20%~35%)、正常业务 (200~800 conn/台 -> 45%~60%)，
      //    还是超高并发突发 (2000~5000+ conn/台 -> 80%~95%)，均能在 360° 环上获得真实的动态反馈，绝不再死锁。
      const nodeCount = Math.max(1, onlineNodes || totalNodes || 1);
      const avgTcp = totalTcpConn / nodeCount;
      const avgUdp = totalUdpConn / nodeCount;

      const dynamicTcpRatio = Math.min(0.96, Math.max(0.12, (Math.log10(Math.max(1, avgTcp)) - 1) / 3));
      const dynamicUdpRatio = Math.min(0.96, Math.max(0.12, (Math.log10(Math.max(1, avgUdp)) - 0.5) / 2.5));

      // 静态美化状态：呈现饱满且层叠呼应的雷达扫描双环（外环 ~78%、内环 ~52%），彻底告别闲置或低连接数时的暗色虚影
      const tcpRatio = isStatic ? 0.78 : dynamicTcpRatio;
      const udpRatio = isStatic ? 0.52 : dynamicUdpRatio;

      // 外环与内环间距保持通透负空间，粗细与 RAM / Asset 对齐加粗
      const rOuter = 41;
      const cOuter = 2 * Math.PI * rOuter; // ~257.61
      const tcpArc = cOuter * tcpRatio;

      const rInner = 25;
      const cInner = 2 * Math.PI * rInner; // ~157.08
      const udpArc = cInner * udpRatio;

      return (
        <svg
          viewBox="0 0 100 100"
          className="mao-micro-svg mao-micro-conn"

          aria-hidden="true"
        >
          {/* 外环 TCP 轨道与能量弧 */}
          <circle
            cx="50"
            cy="50"
            r={rOuter}
            fill="none"
            stroke="currentColor"
            strokeWidth="9.2"
            className="mao-conn-track-outer"
          />
          <circle
            cx="50"
            cy="50"
            r={rOuter}
            fill="none"
            stroke="currentColor"
            strokeWidth="9.2"
            strokeLinecap="round"
            strokeDasharray={`${tcpArc} ${cOuter}`}
            transform="rotate(-90 50 50)"
            className="mao-conn-fill-tcp"
          />

          {/* 内环 UDP 轨道与能量弧 */}
          <circle
            cx="50"
            cy="50"
            r={rInner}
            fill="none"
            stroke="currentColor"
            strokeWidth="7.2"
            className="mao-conn-track-inner"
          />
          <circle
            cx="50"
            cy="50"
            r={rInner}
            fill="none"
            stroke="currentColor"
            strokeWidth="7.2"
            strokeLinecap="round"
            strokeDasharray={`${udpArc} ${cInner}`}
            transform="rotate(-90 50 50)"
            className="mao-conn-fill-udp"
          />

          {/* 中心网络粒子中枢 */}
          <circle cx="50" cy="50" r="5.5" fill="currentColor" className="mao-conn-hub" />
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 4. 硬盘用量 - 立式机架刀片阵列 (Vertical Blade Enclosure: 上3下3)
     * ------------------------------------------------------------------ */
    case "disk": {
      const pct = Math.min(100, Math.max(0, diskPct));
      const totalBlocks = 6;
      const filledBlocks = isStatic
        ? totalBlocks // 静态美化状态：点亮全部 6 个立式硬盘刀片槽位，呈现满配机架工业美学
        : Math.min(totalBlocks, Math.round((pct / 100) * totalBlocks));

      // 6 个立式服务器刀片插槽：上排 3 个，下排 3 个
      // 保持与首页「服务器集群」徽章相同的立式 1:2 黄金比例，底部带有精准统一的 LED 伺服指示灯孔
      const blades = [
        { x: 18, y: 16, w: 16, h: 30 },
        { x: 42, y: 16, w: 16, h: 30 },
        { x: 66, y: 16, w: 16, h: 30 },
        { x: 18, y: 54, w: 16, h: 30 },
        { x: 42, y: 54, w: 16, h: 30 },
        { x: 66, y: 54, w: 16, h: 30 },
      ];

      return (
        <svg
          viewBox="0 0 100 100"
          className="mao-micro-svg mao-micro-disk"
          aria-hidden="true"
        >
          {blades.map((b, i) => {
            const isFilled = i < filledBlocks;
            const isLatest = !isStatic && i === filledBlocks - 1;
            const ledX = b.x + b.w / 2;
            const ledY = b.y + b.h - 6.5;

            return (
              <g
                key={i}
                className={`mao-disk-bay ${isFilled ? "is-filled" : "is-empty"}${isLatest ? " is-latest" : ""}`}
              >
                {/* 立式刀片机身：已填充为高能实体色，未填充为空闲暗轨背景虚影 + 柔和机架轮廓 */}
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  rx="3"
                  className="mao-disk-chassis"
                />
                {/* 刀片底部统一 LED 伺服指示微灯 */}
                <circle
                  cx={ledX}
                  cy={ledY}
                  r="1.7"
                  className="mao-disk-led"
                />
              </g>
            );
          })}
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 4.5. 最近重启 (Uptime / Recent Reboot) - 拟真心电滤波脉冲微图
     * ------------------------------------------------------------------ */
    case "uptime": {
      return (
        <svg
          viewBox="0 0 100 64"
          className="mao-micro-svg mao-micro-uptime-ecg"
          aria-hidden="true"
          data-reboot-sec={recentRebootSeconds}
        >
          {/* 医疗示波滤波背景微网格 */}
          <line x1="2" y1="16" x2="98" y2="16" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="2" y1="32" x2="98" y2="32" className="mao-ecg-grid-axis" strokeDasharray="3 2" />
          <line x1="2" y1="48" x2="98" y2="48" className="mao-ecg-grid" strokeDasharray="2 2" />

          <line x1="18" y1="6" x2="18" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="42" y1="6" x2="42" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="68" y1="6" x2="68" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="92" y1="6" x2="92" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />

          {/* 静态淡轨底衬 */}
          <path
            d="M 2 32 L 20 32 Q 25 27, 29 32 T 33 32 L 38 32 L 42 38 L 49 8 L 56 54 L 60 32 L 65 32 Q 72 23, 78 32 L 96 32"
            className="mao-ecg-bg-track"
          />

          {/* 荧光余辉滤波发散光层 (Phosphor Glow: 5.5s 极缓呼吸) */}
          <path
            d="M 2 32 L 20 32 Q 25 27, 29 32 T 33 32 L 38 32 L 42 38 L 49 8 L 56 54 L 60 32 L 65 32 Q 72 23, 78 32 L 96 32"
            className="mao-ecg-glow"
          />

          {/* 核心清晰心电脉冲线条（波形始终完整，纯线条轻柔呼吸，零圆点） */}
          <path
            d="M 2 32 L 20 32 Q 25 27, 29 32 T 33 32 L 38 32 L 42 38 L 49 8 L 56 54 L 60 32 L 65 32 Q 72 23, 78 32 L 96 32"
            className="mao-ecg-trace"
            stroke="currentColor"
          />
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 5. 今日流量 - 专业微型直方柱谱 (真实过去 6 小时 + 当前小时吞吐动态切片)
     *    7 阶等距出入站双层堆叠柱：最右侧带高亮圆点为当前进行时小时，左侧 6 柱为过去 6 小时
     * ------------------------------------------------------------------ */
    case "traffic": {
      const BUCKET_COUNT = 7;
      const xPositions = [6, 20, 34, 48, 62, 76, 90];
      const baselineY = 68;
      const maxBarH = 56;

      const hasRealHourly =
        !isStatic &&
        todayTrafficHourly &&
        todayTrafficHourly.length === BUCKET_COUNT &&
        todayTrafficHourly.some((b) => b.total > 0);

      let barProfiles: Array<{
        x: number;
        totalH: number;
        inH: number;
        active?: boolean;
      }>;

      if (hasRealHourly) {
        const maxVal = Math.max(...todayTrafficHourly.map((b) => b.total), 1);
        barProfiles = todayTrafficHourly.map((b, i) => {
          const ratio = b.total / maxVal;
          // 柱高介于最小 8px (清晰可见的基座) 与最大 56px (峰值)
          const totalH = Math.max(8, Math.min(maxBarH, Math.round(ratio * maxBarH)));
          const inRatio = b.total > 0 ? b.down / b.total : 0.6;
          const inH = Math.max(4, Math.min(totalH - 3, Math.round(totalH * inRatio)));
          return {
            x: xPositions[i],
            totalH,
            inH,
            active: i === BUCKET_COUNT - 1,
          };
        });
      } else if (isStatic) {
        // 静态美化模式：呈现 7 阶有节奏起伏的展示性直方图与高光点
        const fallbackHours = [
          { totalWeight: 0.22, inRatio: 0.55 }, // 6 小时前：低谷平缓
          { totalWeight: 0.38, inRatio: 0.68 }, // 5 小时前：开始爬升
          { totalWeight: 0.58, inRatio: 0.62 }, // 4 小时前：中度吞吐
          { totalWeight: 0.94, inRatio: 0.78 }, // 3 小时前：突发高峰
          { totalWeight: 0.44, inRatio: 0.52 }, // 2 小时前：峰后回落
          { totalWeight: 0.68, inRatio: 0.65 }, // 1 小时前：稳健吞吐
          { totalWeight: 0.86, inRatio: 0.72 }, // 当前小时：持续活跃进行时
        ];
        barProfiles = fallbackHours.map((h, i) => {
          const totalH = Math.max(8, Math.round(h.totalWeight * maxBarH));
          const inH = Math.max(4, Math.min(totalH - 3, Math.round(totalH * h.inRatio)));
          return {
            x: xPositions[i],
            totalH,
            inH,
            active: i === BUCKET_COUNT - 1,
          };
        });
      } else {
        // 动态监控模式待机 / 加载中兜底：7 根整齐平稳的基准待机柱（8px 平底基座，没有任何虚假起伏）
        // 真实数据返回后，无流量小时保持 8px（零跳动、零坍塌），有流量小时平滑向上生长
        barProfiles = xPositions.map((x, i) => ({
          x,
          totalH: 8,
          inH: 4,
          active: i === BUCKET_COUNT - 1,
        }));
      }

      return (
        <svg
          viewBox="0 0 104 76"
          className="mao-micro-svg mao-micro-bars-sparkline"

          aria-hidden="true"
        >
          {/* 背景微网格标尺 */}
          <line
            x1="4"
            y1="20"
            x2="100"
            y2="20"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.14"
            className="mao-spark-grid"
          />
          <line
            x1="4"
            y1="44"
            x2="100"
            y2="44"
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.14"
            className="mao-spark-grid"
          />
          <line
            x1="4"
            y1={baselineY}
            x2="100"
            y2={baselineY}
            stroke="currentColor"
            strokeWidth="1.2"
            opacity="0.32"
            className="mao-spark-axis"
          />

          {/* 7 阶微型出入站直方柱 */}
          {barProfiles.map((b, i) => {
            const yTop = baselineY - b.totalH;
            const yIn = baselineY - b.inH;

            return (
              <g key={i} className="mao-traffic-bar-group">
                {/* 全高背景柱（出站 TX 浅阶） */}
                <rect
                  x={b.x}
                  y={yTop}
                  width="8"
                  height={b.totalH}
                  rx="2.5"
                  fill="currentColor"
                  opacity={b.active ? 0.45 : 0.3}
                  className="mao-traffic-bar-total"
                />
                {/* 底部堆叠柱（入站 RX 实阶） */}
                <rect
                  x={b.x}
                  y={yIn}
                  width="8"
                  height={b.inH}
                  rx="2"
                  fill="currentColor"
                  opacity={b.active ? 1 : 0.85}
                  className="mao-traffic-bar-in"
                />
                {/* 最新活跃峰值指示点 */}
                {b.active && (
                  <circle
                    cx={b.x + 4}
                    cy={yTop - 6}
                    r="2.2"
                    fill="currentColor"
                    className="mao-traffic-bar-dot"
                  />
                )}
              </g>
            );
          })}
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 6. 实时带宽 - HUD 微型双轨平滑贝塞尔实时速率曲线
     * ------------------------------------------------------------------ */
    case "bandwidth": {
      return (
        <BandwidthMicroVisual
          metric={metric}
          isStatic={isStatic}
          netUp={netUp}
          netDown={netDown}
        />
      );
    }

    /* ------------------------------------------------------------------ *
     * 6. 节点在线 (Nodes Online) - 集群心跳遥测多阶脉冲微图 (Cluster Keepalive Telemetry)
     *    1) 100% 全在线：饱满规律的集群双心跳连续生命律动波 (Peak 1 + Peak 2 齐峰并起)；
     *    2) 部分离线 (1%~99%)：主峰挺立维持调度 + 次级脉冲呈心律阻滞缺损 (Dropped/Depressed Beat)；
     *    3) 全离线 (0%)：微型弱脉冲 (Agonal Beat / 濒死微弱信标，仅单次 26px 钝化弱脉冲，既不突兀空旷又具强警示感)。
     * ------------------------------------------------------------------ */
    case "nodes": {
      const pct = Math.min(100, Math.max(0, onlinePct));
      const isAllOffline = totalNodes > 0 ? onlineNodes === 0 : onlinePct <= 0;
      const hasOffline = isAllOffline || offlineNodes > 0 || pct < 100;

      // 100% 全在线：饱满坚挺的集群双脉冲连续生命波 (Peak 1 at x=27 y=6..58, Peak 2 at x=68 y=8..54)
      const normalPath =
        "M 2 32 L 10 32 Q 14 26, 17 32 L 20 32 L 23 37 L 27 6 L 33 58 L 37 32 Q 42 20, 48 32 L 53 32 Q 57 26, 60 32 L 64 32 L 67 37 L 71 8 L 76 54 L 80 32 Q 85 22, 90 32 L 98 32";

      // 部分离线 (1% ~ 99%)：主脉冲依然挺拔，次级脉冲呈现显著的心律阻滞与ST缺血下凹段 (Dropped / Depressed Beat)
      const offlinePath =
        "M 2 32 L 10 32 Q 14 26, 17 32 L 20 32 L 23 37 L 27 6 L 33 58 L 37 32 Q 42 20, 48 32 L 53 32 L 60 32 L 64 36 L 68 15 L 74 48 L 78 32 L 83 38 L 89 38 L 94 32 L 98 32";

      // 全离线 (0%)：濒死微型弱脉冲 (Single Low/Agonal Pulse，高度压缩至 26px，象征孤立存活信标，绝不空洞)
      const allOfflinePath =
        "M 2 32 L 24 32 Q 30 28, 35 32 L 40 32 L 44 36 L 49 18 L 54 44 L 58 32 Q 64 26, 70 32 L 98 32";

      const wavePath = isAllOffline ? allOfflinePath : hasOffline ? offlinePath : normalPath;
      const statusClass = isAllOffline ? " has-all-offline has-offline" : hasOffline ? " has-offline" : "";

      return (
        <svg
          viewBox="0 0 100 64"
          className={`mao-micro-svg mao-micro-nodes-ecg mao-micro-uptime-ecg${statusClass}`}
          aria-hidden="true"
          data-online-pct={onlinePct}
        >
          {/* 集群遥测示波微网格 */}
          <line x1="2" y1="16" x2="98" y2="16" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="2" y1="32" x2="98" y2="32" className="mao-ecg-grid-axis" strokeDasharray="3 2" />
          <line x1="2" y1="48" x2="98" y2="48" className="mao-ecg-grid" strokeDasharray="2 2" />

          <line x1="16" y1="6" x2="16" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="38" y1="6" x2="38" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="62" y1="6" x2="62" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />
          <line x1="84" y1="6" x2="84" y2="58" className="mao-ecg-grid" strokeDasharray="2 2" />

          {/* 静态淡轨底衬 */}
          <path d={wavePath} className="mao-ecg-bg-track" />

          {/* 荧光余辉滤波发散光层 (Phosphor Glow: 5.5s 极缓呼吸) */}
          <path d={wavePath} className="mao-ecg-glow" />

          {/* 核心清晰心电脉冲线条 */}
          <path d={wavePath} className="mao-ecg-trace" stroke="currentColor" />
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 7. 资产总值 - 预算流光环 (270° 超采样) + 原生 DOM 金融徽章
     * ------------------------------------------------------------------ */
    case "asset": {
      const remaining = costSummary?.remainingCny ?? 470;
      const total = costSummary?.totalOriginalPriceCny ?? 788;
      const ratio = total > 0 ? Math.min(1, Math.max(0.1, remaining / total)) : 0.6;
      const radius = 41;
      const arcAngle = 270;
      const circumference = 2 * Math.PI * radius; // ~257.61
      const arcLen = circumference * (arcAngle / 360); // ~193.21
      const dashOffset = arcLen * (1 - ratio);

      return (
        <div className="mao-micro-stage">
          <svg
            viewBox="0 0 100 100"
            className="mao-micro-svg mao-micro-asset"

            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="9.6"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circumference}`}
              transform="rotate(135 50 50)"
              className="mao-asset-track"
            />
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth="9.6"
              strokeLinecap="round"
              strokeDasharray={`${arcLen} ${circumference}`}
              strokeDashoffset={dashOffset}
              transform="rotate(135 50 50)"
              className="mao-asset-fill"
            />
          </svg>
          {/* 货币符号原生 DOM 层 */}
          <div className="mao-gauge-center-badge">
            <span className="mao-asset-symbol">{CURRENCY_SYMBOLS[costCurrency] || "¥"}</span>
          </div>
        </div>
      );
    }

    /* ------------------------------------------------------------------ *
     * 8. 计算核心 - 精密微架构处理单元 (Tabler cpu-2 纯线条版)
     * ------------------------------------------------------------------ */
    case "cores": {
      return (
        <svg
          viewBox="0 0 24 24"
          className="mao-micro-svg mao-micro-cores"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* 芯片外封装基座 */}
          <rect x="5" y="5" width="14" height="14" rx="1.5" />
          {/* 内部 4 角光刻回路 */}
          <path d="M8 10v-2h2m6 6v2h-2m-4 0h-2v-2m8 -4v-2h-2" />
          {/* 四边 8 根精密外部引脚 */}
          <path d="M3 10h2" />
          <path d="M3 14h2" />
          <path d="M10 3v2" />
          <path d="M14 3v2" />
          <path d="M21 10h-2" />
          <path d="M21 14h-2" />
          <path d="M14 21v-2" />
          <path d="M10 21v-2" />
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 9. 活跃进程 - 终端级联任务堆栈 (Terminal Task Cascade)
     *    层叠微型终端执行窗口 + 命令提示符 `>_` 与执行任务条；
     *    呼应卡片左上角终端符号，呈现多终端并发执行科技感，彻底告别圆圈。
     * ------------------------------------------------------------------ */
    case "process": {
      return (
        <svg
          viewBox="0 0 100 68"
          className="mao-micro-svg mao-micro-proc-cascade"
          aria-hidden="true"
        >
          {/* 背景堆栈层 1 */}
          <rect
            x="22"
            y="8"
            width="68"
            height="34"
            rx="4"
            fill="currentColor"
            className="mao-proc-stack-1"
          />
          {/* 中间堆栈层 2 */}
          <rect
            x="14"
            y="18"
            width="68"
            height="34"
            rx="4"
            fill="currentColor"
            className="mao-proc-stack-2"
          />
          {/* 前景主终端活动窗口 3 */}
          <rect
            x="6"
            y="28"
            width="72"
            height="34"
            rx="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            className="mao-proc-window"
          />
          {/* 终端顶栏分割线 */}
          <line
            x1="6"
            y1="36"
            x2="78"
            y2="36"
            stroke="currentColor"
            strokeWidth="1"
            className="mao-proc-titlebar"
          />
          {/* 终端命令符提示 >_ */}
          <polyline
            points="14,44 19,48 14,52"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mao-proc-prompt-arrow"
          />
          <line
            x1="24"
            y1="52"
            x2="32"
            y2="52"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="mao-proc-prompt-dash"
          />
          {/* 执行中的子任务微条 */}
          <rect
            x="38"
            y="45"
            width="32"
            height="6"
            rx="2"
            fill="currentColor"
            className="mao-proc-task-bar"
          />
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 10. 三网丢包 - 三网专属脉冲立柱微图 (Cellular Trigram Bar)
     *     CT (电信) / CU (联通) / CM (移动) 三组独立蜂窝柱；
     *     平时呈现科技底垫基线，丢包时柱体动态抬升并触发高危警报辉光；
     *     底部带高清微字模标识与网格标尺，呼应 SAO 战术 HUD 风格。
     * ------------------------------------------------------------------ */
    case "loss": {
      const ct = ctLoss ?? 0;
      const cu = cuLoss ?? 0;
      const cm = cmLoss ?? 0;

      const pillars = [
        { key: "ct", label: "CT", loss: ct, x: 14 },
        { key: "cu", label: "CU", loss: cu, x: 41 },
        { key: "cm", label: "CM", loss: cm, x: 68 },
      ];

      // 静态美化形态：黄金起伏波段 [20, 38, 56]，三色阶梯展示 [good, warning, error]
      const staticHeights = [20, 38, 56];
      const staticTiers = ["good", "warning", "error"] as const;

      return (
        <svg
          viewBox="0 0 100 100"
          className="mao-micro-svg mao-micro-trigram"
          aria-hidden="true"
        >
          {/* SAO 战术 HUD 标尺虚线：25% 与 50% 刻度参考 */}
          <line
            x1="8"
            y1="28"
            x2="92"
            y2="28"
            stroke="currentColor"
            strokeDasharray="2 3"
            opacity="0.15"
            strokeWidth="1"
          />
          <line
            x1="8"
            y1="50"
            x2="92"
            y2="50"
            stroke="currentColor"
            strokeDasharray="2 3"
            opacity="0.15"
            strokeWidth="1"
          />

          {pillars.map((p, i) => {
            const h = isStatic
              ? staticHeights[i]
              : p.loss > 0
                ? Math.min(62, Math.max(12, Math.round(12 + (p.loss / 100) * 50)))
                : 10;
            const yPos = 74 - h;
            const tier = isStatic ? staticTiers[i] : getLossTier(p.loss);

            return (
              <g key={p.key} className="mao-trigram-pillar" data-tier={tier}>
                {/* 柱槽背景轨道 (暗轨) */}
                <rect
                  x={p.x}
                  y={12}
                  width="18"
                  height="62"
                  rx="4"
                  fill="currentColor"
                  className="mao-trigram-track"
                />
                {/* 实时活跃能量柱 (一体化平滑胶囊柱，移除突兀白线) */}
                <rect
                  x={p.x}
                  y={yPos}
                  width="18"
                  height={h}
                  rx="4"
                  className="mao-trigram-fill"
                />
                {/* 运营商微字标: CT / CU / CM (居中留出充裕呼吸间距) */}
                <text
                  x={p.x + 9}
                  y={89}
                  textAnchor="middle"
                  className="mao-trigram-label"
                  fontSize="10"
                  fontWeight="700"
                  fontFamily="ui-monospace, monospace"
                  fill="currentColor"
                >
                  {p.label}
                </text>
              </g>
            );
          })}
        </svg>
      );
    }

    /* ------------------------------------------------------------------ *
     * 14. 稳定评分 (Yesterday Best Node) - 纯粹品阶字母微图 (Pure Rank Glyphs)
     * SSS(≥98) · SS(93~97.9) · S(85~92.9) · A(70~84.9) · B(55~69.9) · C(<55)
     * 纯粹字模呈现，尺寸按字符数自适应，与其它微图视觉面等大
     * ------------------------------------------------------------------ */
    case "yesterdayBest": {
      const score = yesterdayScore != null ? Math.max(0, Math.min(100, yesterdayScore)) : null;
      const isPlaceholder = score == null;

      const rankWord = isPlaceholder
        ? "---"
        : score >= 98
          ? "SSS"
          : score >= 93
            ? "SS"
            : score >= 85
              ? "S"
              : score >= 70
                ? "A"
                : score >= 55
                  ? "B"
                  : "C";

      const charCount = isPlaceholder ? 3 : rankWord.length;

      return (
        <span
          className={`mao-word-rank${isPlaceholder ? " is-placeholder" : ""}`}
          data-chars={charCount}
          aria-hidden="true"
        >
          {rankWord}
        </span>
      );
    }

    default:
      return null;
  }
};

/* ------------------------------------------------------------------ *
 * 实时带宽微图专属组件：流体交织贝塞尔曲线 (BandwidthMicroVisual)
 * 1. 静态模式：完美呈现用户最喜爱的饱满双轨三次贝塞尔曲面与信标粒子；
 * 2. 动态模式：通过轻量 requestAnimationFrame 计算左向相移波场，
 *    上行 (TX, 青蓝) 与下行 (RX, 浅紫) 采用错相位双频谐波，自然交织、穿插缠绕；
 *    右侧端点信标粒子与 RX 主下行曲线实时末端严格数学咬合 (cy = y_rx(100))，永不脱节；
 *    高度随真实上/下行网速对数平滑平移过度，杜绝任何机械顿挫与抖动。
 * ------------------------------------------------------------------ */
interface BandwidthMicroVisualProps {
  metric: OverviewCardId;
  isStatic: boolean;
  netUp?: number;
  netDown?: number;
}

// 8 个采样点：横向从 0 延伸至 112 (向右延伸超出视口 104)，计算量微乎其微
const X_POINTS = [0, 16, 32, 48, 64, 80, 96, 112];

// 三次贝塞尔拟合算法 (Catmull-Rom 导数连续转换，曲线无任何折角)
function pointsToSplinePath(pts: Array<{ x: number; y: number }>): string {
  const n = pts.length;
  if (n < 2) return "";
  const ghostStart = { x: 2 * pts[0].x - pts[1].x, y: 2 * pts[0].y - pts[1].y };
  const ghostEnd = { x: 2 * pts[n - 1].x - pts[n - 2].x, y: 2 * pts[n - 1].y - pts[n - 2].y };
  const ext = [ghostStart, ...pts, ghostEnd];

  const segs = [`M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`];
  for (let i = 1; i < n; i++) {
    const p0 = ext[i - 1];
    const p1 = ext[i];
    const p2 = ext[i + 1];
    const p3 = ext[i + 2];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    segs.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`);
  }
  return segs.join(" ");
}

const BandwidthMicroVisual: React.FC<BandwidthMicroVisualProps> = ({
  metric,
  isStatic,
  netUp = 0,
  netDown = 0,
}) => {
  const gradRxId = `mao-spark-grad-rx-${metric}`;
  const gradTxId = `mao-spark-grad-tx-${metric}`;
  const maskId = `mao-spark-fade-mask-${metric}`;

  // 静态模式下的经典曲线 (横向完整延展，左右两端自然隐退)
  const staticTxArea = "M 0 70 L 0 56 C 14 54, 20 50, 28 50 C 36 50, 42 56, 50 56 C 58 56, 66 42, 74 40 C 82 38, 90 44, 100 32 C 104 28, 108 26, 112 24 L 112 70 Z";
  const staticTxLine = "M 0 56 C 14 54, 20 50, 28 50 C 36 50, 42 56, 50 56 C 58 56, 66 42, 74 40 C 82 38, 90 44, 100 32 C 104 28, 108 26, 112 24";
  const staticRxArea = "M 0 70 L 0 62 C 12 60, 16 52, 24 48 C 32 44, 36 40, 44 34 C 52 28, 58 44, 66 42 C 74 40, 78 24, 88 18 C 94 14, 98 16, 100 16 C 104 16, 108 20, 112 24 L 112 70 Z";
  const staticRxLine = "M 0 62 C 12 60, 16 52, 24 48 C 32 44, 36 40, 44 34 C 52 28, 58 44, 66 42 C 74 40, 78 24, 88 18 C 94 14, 98 16, 100 16 C 104 16, 108 20, 112 24";

  // 动态模式下的曲线状态 (以静态形状为基准平滑过渡)
  const [dynState, setDynState] = useState<{
    txLine: string;
    txArea: string;
    rxLine: string;
    rxArea: string;
    dotY: number;
    pulseDuration: number;
    rxOpacity: number;
  }>({
    txLine: staticTxLine,
    txArea: staticTxArea,
    rxLine: staticRxLine,
    rxArea: staticRxArea,
    dotY: 16,
    pulseDuration: 2.0,
    rxOpacity: 0.45,
  });

  // 真实网速缩放与流速平滑阻尼跟踪
  const trackerRef = useRef({
    rxScale: 0.65,
    txScale: 0.55,
    flowSpeed: 1.0,
  });
  const timeRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isStatic) return;

    // 对数层级映射：
    // 0 ~ 50 KB/s:    微弱待机 (scale 0.25 ~ 0.35, speed 0.55x, 波形平缓慢速沉在下方)
    // 100 KB/s ~ 2MB: 常规业务 (scale 0.45 ~ 0.70, speed 1.0x ~ 1.3x, 自然游动交织)
    // 10MB ~ 100MB+:  高速/暴增 (scale 0.85 ~ 1.15, speed 1.8x ~ 2.4x, 耸立如大浪，奔腾流过)
    const computeMetrics = (bytes: number) => {
      if (bytes <= 512) return { scale: 0.22, speedWeight: 0.5 };
      const logVal = Math.log10(bytes / 512) / Math.log10(104857600 / 512); // 0 ~ 1
      const clamped = Math.min(1.0, Math.max(0, logVal));
      const scale = 0.22 + clamped * 0.93; // 0.22 ~ 1.15
      const speedWeight = 0.5 + clamped * 1.8; // 0.5x ~ 2.3x
      return { scale, speedWeight };
    };

    const txMetrics = computeMetrics(Math.max(0, netUp));
    const rxMetrics = computeMetrics(Math.max(0, netDown));

    const targetTxScale = txMetrics.scale;
    const targetRxScale = rxMetrics.scale;
    // 综合流速取上下行活跃度较高的一侧驱动
    const targetSpeed = Math.max(txMetrics.speedWeight, rxMetrics.speedWeight);

    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.08, (now - lastTimestamp) / 1000);
      lastTimestamp = now;

      // 流体惯性阻尼跟随 (0.04 极平滑追随，确保毫无数值跳变突兀感)
      trackerRef.current.rxScale += (targetRxScale - trackerRef.current.rxScale) * 0.04;
      trackerRef.current.txScale += (targetTxScale - trackerRef.current.txScale) * 0.04;
      trackerRef.current.flowSpeed += (targetSpeed - trackerRef.current.flowSpeed) * 0.04;

      const sRx = trackerRef.current.rxScale;
      const sTx = trackerRef.current.txScale;
      const curSpeed = trackerRef.current.flowSpeed;

      // 随网速自适应流速向前推进
      timeRef.current += dt * curSpeed * 1.15;
      const t = timeRef.current;

      // 计算 7 采样点的实时物理坐标
      const rxPts: Array<{ x: number; y: number }> = [];
      const txPts: Array<{ x: number; y: number }> = [];

      for (let i = 0; i < X_POINTS.length; i++) {
        const x = X_POINTS[i];
        // 相位沿 -x 方向平移，营造流体向左滚动的视觉欺骗
        const p1 = (2 * Math.PI * x) / 76 + t * 1.25;
        const p2 = (2 * Math.PI * x) / 44 + t * 1.85;

        // RX (下行, 主紫色波)：
        // 低速时 rxH 约 8px（贴底平缓），高速时可达 50px（直冲顶部虚线 Y=16）
        const shapeRx = 0.52 + 0.36 * Math.sin(p1) + 0.16 * Math.sin(p2);
        const rxH = 6 + 42 * sRx * shapeRx;
        const yRx = Math.min(68, Math.max(15, 68 - rxH));
        rxPts.push({ x, y: yRx });

        // TX (上行, 青蓝波)：
        // 与 RX 产生相差，交替穿插交错
        const shapeTx = 0.48 + 0.33 * Math.sin(p1 + 2.3) + 0.18 * Math.sin(p2 - 1.4);
        const txH = 5 + 35 * sTx * shapeTx;
        const yTx = Math.min(68, Math.max(17, 68 - txH));
        txPts.push({ x, y: yTx });
      }

      const rxLineStr = pointsToSplinePath(rxPts);
      const txLineStr = pointsToSplinePath(txPts);
      const rxAreaStr = `${rxLineStr} L 112 70 L 0 70 Z`;
      const txAreaStr = `${txLineStr} L 112 70 L 0 70 Z`;

      // 右侧高光粒子 Y 坐标：严格咬合在 x=100 处的采样点 (倒数第 2 个点 rxPts[6])
      const dotPt = rxPts.find((p) => Math.abs(p.x - 96) < 4) || rxPts[rxPts.length - 2] || rxPts[rxPts.length - 1];
      const currentDotY = dotPt.y;

      // 脉冲光晕与渐变辉光动态感应带宽
      const pulseDuration = Math.max(0.9, 2.4 - curSpeed * 0.6);
      const rxOpacity = 0.30 + Math.min(0.35, sRx * 0.3);

      setDynState({
        txLine: txLineStr,
        txArea: txAreaStr,
        rxLine: rxLineStr,
        rxArea: rxAreaStr,
        dotY: currentDotY,
        pulseDuration,
        rxOpacity,
      });

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isStatic, netUp, netDown]);

  const txArea = isStatic ? staticTxArea : dynState.txArea;
  const txLine = isStatic ? staticTxLine : dynState.txLine;
  const rxArea = isStatic ? staticRxArea : dynState.rxArea;
  const rxLine = isStatic ? staticRxLine : dynState.rxLine;
  const dotY = isStatic ? 16 : dynState.dotY;

  return (
    <svg
      viewBox="0 0 104 76"
      className="mao-micro-svg mao-micro-sparkline"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradRxId} x1="0" y1="0" x2="0" y2="1">
          <stop
            offset="0%"
            stopColor="currentColor"
            stopOpacity={isStatic ? 0.45 : dynState.rxOpacity}
          />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.0" />
        </linearGradient>
        <linearGradient id={gradTxId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--traffic-spark-tx, #38bdf8)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--traffic-spark-tx, #38bdf8)" stopOpacity="0.0" />
        </linearGradient>
        {/* 双向无界平滑渐隐遮罩：左侧进入自然消隐，右端在圆点位置 x=96 处彻底收拢淡出为 0 */}
        <mask id={maskId}>
          <linearGradient id={`${maskId}-grad`} x1="0" y1="0" x2="104" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="14%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="25%" stopColor="#fff" stopOpacity="1" />
            <stop offset="82%" stopColor="#fff" stopOpacity="1" />
            <stop offset="92%" stopColor="#fff" stopOpacity="0.1" />
            <stop offset="96%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <rect x="0" y="0" width="104" height="76" fill={`url(#${maskId}-grad)`} />
        </mask>
      </defs>

      {/* 背景微网格线与底轴线 (受 mask 保护，两端均柔和消隐) */}
      <g mask={`url(#${maskId})`}>
        <line x1="0" y1="24" x2="104" y2="24" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="mao-spark-grid" />
        <line x1="0" y1="48" x2="104" y2="48" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="mao-spark-grid" />
        <line x1="0" y1="70" x2="104" y2="70" stroke="currentColor" strokeWidth="1.2" className="mao-spark-axis" />
      </g>

      {/* 平滑渐隐区域内的动态流体双轨曲面 */}
      <g mask={`url(#${maskId})`}>
        {/* 上行流 (TX) 平滑贝塞尔曲面 */}
        <path
          d={txArea}
          fill={`url(#${gradTxId})`}
          className="mao-spark-area-tx"
        />
        <path
          d={txLine}
          fill="none"
          stroke="var(--traffic-spark-tx, #38bdf8)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mao-spark-line-tx"
        />

        {/* 下行流 (RX) 平滑贝塞尔曲面 */}
        <path
          d={rxArea}
          fill={`url(#${gradRxId})`}
          className="mao-spark-area-rx"
        />
        <path
          d={rxLine}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mao-spark-line-rx"
        />
      </g>

      {/* 活跃端点高光粒子：锁定在 x=96 处主波峰位置 */}
      <g className="mao-bandwidth-dot-wrap">
        <circle cx="96" cy={dotY} r="3.6" fill="currentColor" className="mao-spark-dot" />
        <circle
          cx="96"
          cy={dotY}
          r="7.2"
          fill="currentColor"
          className="mao-spark-pulse"
          style={isStatic ? undefined : { animationDuration: `${dynState.pulseDuration.toFixed(2)}s` }}
        />
      </g>
    </svg>
  );
};
