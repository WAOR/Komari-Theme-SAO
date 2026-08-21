import { useEffect, useRef } from "react";
import { formatByteRateLabel } from "@/utils/format";

interface TrafficPoint {
  time: number;
  up: number;
  down: number;
}

const MAX_HISTORY_POINTS = 32;

// 动态整值标尺刻度对齐算法：确保 Y 轴在动态缩放时数值始终整洁优雅（如 400 MB/s、200 MB/s、0）
function getNiceRateCeiling(value: number): number {
  const KIB = 1024;
  const MIB = 1024 * 1024;
  const GIB = 1024 * 1024 * 1024;

  if (value <= 0) return 100 * KIB;
  if (value <= 50 * KIB) return 50 * KIB;
  if (value <= 100 * KIB) return 100 * KIB;
  if (value <= 200 * KIB) return 200 * KIB;
  if (value <= 500 * KIB) return 500 * KIB;
  if (value <= 1 * MIB) return 1 * MIB;
  if (value <= 2 * MIB) return 2 * MIB;
  if (value <= 5 * MIB) return 5 * MIB;
  if (value <= 10 * MIB) return 10 * MIB;
  if (value <= 20 * MIB) return 20 * MIB;
  if (value <= 50 * MIB) return 50 * MIB;
  if (value <= 100 * MIB) return 100 * MIB;
  if (value <= 200 * MIB) return 200 * MIB;
  if (value <= 300 * MIB) return 300 * MIB;
  if (value <= 400 * MIB) return 400 * MIB;
  if (value <= 500 * MIB) return 500 * MIB;
  if (value <= 800 * MIB) return 800 * MIB;
  if (value <= 1 * GIB) return 1 * GIB;
  if (value <= 2 * GIB) return 2 * GIB;
  if (value <= 5 * GIB) return 5 * GIB;
  return Math.ceil(value / GIB) * GIB;
}

export function OverviewTrafficChart({
  netUp,
  netDown,
  trafficUp: _trafficUp,
  trafficDown: _trafficDown,
  bandwidthRating,
}: {
  netUp: number;
  netDown: number;
  trafficUp: number;
  trafficDown: number;
  bandwidthRating?: { level: 0 | 1 | 2 | 3; label: string } | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const historyRef = useRef<TrafficPoint[]>([]);

  // 记录滚动历史点
  useEffect(() => {
    const now = Date.now();
    const history = historyRef.current;
    if (history.length === 0) {
      // 初始填充平滑历史点
      for (let i = 10; i >= 1; i--) {
        history.push({
          time: now - i * 1500,
          up: Math.max(0, netUp * (0.88 + Math.random() * 0.24)),
          down: Math.max(0, netDown * (0.88 + Math.random() * 0.24)),
        });
      }
    }
    history.push({ time: now, up: netUp, down: netDown });
    if (history.length > MAX_HISTORY_POINTS) {
      history.shift();
    }
  }, [netUp, netDown]);

  // Canvas 绘制曲线与波形
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = rect.width;
      const height = rect.height;

      if (width === 0 || height === 0) return;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const history = historyRef.current;
      const points =
        history.length > 1
          ? history
          : [
              { time: Date.now() - 2000, up: 0, down: 0 },
              { time: Date.now(), up: netUp, down: netDown },
            ];

      // 动态计算当前区间的最高速率并对齐整值刻度
      let peakRate = 0;
      for (const p of points) {
        if (p.down > peakRate) peakRate = p.down;
        if (p.up > peakRate) peakRate = p.up;
      }
      const maxVal = getNiceRateCeiling(peakRate);

      const isMobile = width < 420;
      const paddingLeft = isMobile ? 62 : 68;
      const paddingBottom = 20;
      const paddingTop = 8;
      const paddingRight = isMobile ? 28 : 22;
      const plotWidth = width - paddingLeft - paddingRight;
      const plotHeight = height - paddingTop - paddingBottom;

      // 绘制背景参考网格线
      ctx.strokeStyle = "rgba(140, 140, 140, 0.14)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.font = isMobile
        ? "9px Inter, system-ui, -apple-system, sans-serif"
        : "10px Inter, system-ui, -apple-system, sans-serif";
      ctx.fillStyle = "rgba(140, 140, 140, 0.75)";
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";

      const gridSteps = 2;
      for (let i = 0; i <= gridSteps; i++) {
        const y = paddingTop + (plotHeight / gridSteps) * i;
        const val = maxVal * (1 - i / gridSteps);

        ctx.beginPath();
        ctx.moveTo(paddingLeft, y);
        ctx.lineTo(width - paddingRight, y);
        ctx.stroke();

        ctx.fillText(formatByteRateLabel(val), paddingLeft - 5, y);
      }

      ctx.setLineDash([]);

      // 绘制 X 轴时间刻度
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      const timeSteps = isMobile ? 2 : 3;
      const startTime = points[0].time;
      const endTime = points[points.length - 1].time;
      const timeSpan = Math.max(1000, endTime - startTime);

      for (let i = 0; i <= timeSteps; i++) {
        const x = paddingLeft + (plotWidth / timeSteps) * i;
        const t = new Date(startTime + (timeSpan / timeSteps) * i);
        const timeStr = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}:${String(t.getSeconds()).padStart(2, "0")}`;
        if (i === 0) {
          ctx.textAlign = "left";
        } else if (i === timeSteps) {
          ctx.textAlign = "right";
        } else {
          ctx.textAlign = "center";
        }
        ctx.fillText(timeStr, x, height - paddingBottom + 5);
      }

      if (points.length > 1) {
        // 下行流量 (Downstream: 绿色区域与绿色曲线)
        const downGradient = ctx.createLinearGradient(0, paddingTop, 0, paddingTop + plotHeight);
        downGradient.addColorStop(0, "rgba(47, 158, 101, 0.22)");
        downGradient.addColorStop(1, "rgba(47, 158, 101, 0.01)");

        ctx.beginPath();
        points.forEach((p, idx) => {
          const x = paddingLeft + (idx / (points.length - 1)) * plotWidth;
          const y = paddingTop + plotHeight - (p.down / maxVal) * plotHeight;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
        ctx.lineTo(paddingLeft, paddingTop + plotHeight);
        ctx.closePath();
        ctx.fillStyle = downGradient;
        ctx.fill();

        // 下行流量折线 (Downstream Line - Green)
        ctx.beginPath();
        points.forEach((p, idx) => {
          const x = paddingLeft + (idx / (points.length - 1)) * plotWidth;
          const y = paddingTop + plotHeight - (p.down / maxVal) * plotHeight;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#2f9e65";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 上行流量折线 (Upstream Line - Blue)
        ctx.beginPath();
        points.forEach((p, idx) => {
          const x = paddingLeft + (idx / (points.length - 1)) * plotWidth;
          const y = paddingTop + plotHeight - (p.up / maxVal) * plotHeight;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 1.8;
        ctx.stroke();

        // 最新采样点发光端点
        const latestIdx = points.length - 1;
        const latestX = paddingLeft + plotWidth;
        const latestDownY = paddingTop + plotHeight - (points[latestIdx].down / maxVal) * plotHeight;
        const latestUpY = paddingTop + plotHeight - (points[latestIdx].up / maxVal) * plotHeight;

        // 下行最新点 (Green)
        ctx.beginPath();
        ctx.arc(latestX, latestDownY, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = "#2f9e65";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 上行最新点 (Blue)
        ctx.beginPath();
        ctx.arc(latestX, latestUpY, 3.2, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore();
    };

    draw();
    const animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [netUp, netDown]);

  return (
    <div className="mao-realtime-chart-card">
      <div className="mao-realtime-chart-head">
        <div className="mao-realtime-chart-title">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--status-success)]"
          >
            <rect width="6" height="6" x="9" y="2" rx="1" />
            <rect width="6" height="6" x="2" y="16" rx="1" />
            <rect width="6" height="6" x="16" y="16" rx="1" />
            <path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
            <path d="M12 8v4" />
          </svg>
          <span>网络</span>
        </div>
        {bandwidthRating && (
          <span
            className="overview-card-rating"
            data-rating-level={bandwidthRating.level}
            title={`实时带宽评级: ${bandwidthRating.label}`}
          >
            {bandwidthRating.label}
          </span>
        )}
      </div>
      <div className="mao-realtime-chart-rates">
        <span style={{ color: "var(--traffic-up, #3b82f6)" }}>↑ {formatByteRateLabel(netUp)}</span>
        <span className="text-[var(--text-tertiary)]">/</span>
        <span style={{ color: "var(--traffic-down, #2f9e65)" }}>↓ {formatByteRateLabel(netDown)}</span>
      </div>
      <div className="mao-realtime-chart-canvas-wrap">
        <canvas ref={canvasRef} className="mao-realtime-chart-canvas" />
      </div>
    </div>
  );
}
