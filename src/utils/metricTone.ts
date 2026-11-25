import { clamp, toHsl, toOklch } from "@/utils/hsl";
import { formatByteRate } from "@/utils/format";
import type {
  PingLatencyColors,
  PingLatencyThresholds,
  PingLossColors,
  PingLossThresholds,
  TrafficSpectrumColors,
} from "@/types/komari";
import {
  DEFAULT_PING_LATENCY_COLORS,
  DEFAULT_PING_LATENCY_THRESHOLDS,
  DEFAULT_PING_LOSS_COLORS,
  DEFAULT_TRAFFIC_SPECTRUM_COLORS,
} from "@/utils/themeSettings";

// 丢包使用连续 HSL 热力渐变；延迟使用下方独立的离散监控状态阶梯。
const HEAT_RAMP_SEGMENTS = [
  (t: number) => toHsl(145 - 18 * t, 62 + 8 * t, 48 + 3 * t),
  (t: number) => toHsl(127 - 47 * t, 70 + 6 * t, 51 + 1 * t),
  (t: number) => toHsl(80 - 30 * t, 76 + 6 * t, 52 + 1 * t),
  (t: number) => toHsl(50 - 20 * t, 82 + 4 * t, 53 - 1 * t),
  (t: number) => toHsl(30 - 24 * t, 86 - 2 * t, 52 - 8 * t),
];

// `bounds` 为前 4 段的上界(升序),`tailSpan` 是末段(最后上界往上)的归一化跨度。
function heatRamp(
  value: number,
  bounds: [number, number, number, number],
  tailSpan: number,
): string {
  const [b0, b1, b2, b3] = bounds;
  if (value <= b0) return HEAT_RAMP_SEGMENTS[0](clamp(value / b0, 0, 1));
  if (value <= b1) return HEAT_RAMP_SEGMENTS[1](clamp((value - b0) / (b1 - b0), 0, 1));
  if (value <= b2) return HEAT_RAMP_SEGMENTS[2](clamp((value - b1) / (b2 - b1), 0, 1));
  if (value <= b3) return HEAT_RAMP_SEGMENTS[3](clamp((value - b2) / (b3 - b2), 0, 1));
  return HEAT_RAMP_SEGMENTS[4](clamp((value - b3) / tailSpan, 0, 1));
}

export function resolveCustomLatencyColor(
  ms: number | null | undefined,
  thresholds?: PingLatencyThresholds,
  colors?: PingLatencyColors,
): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "var(--text-tertiary)";
  }
  const t = thresholds ?? DEFAULT_PING_LATENCY_THRESHOLDS;
  const c = colors ?? DEFAULT_PING_LATENCY_COLORS;
  if (ms <= t.excellent) return c.excellent;
  if (ms <= t.good) return c.good;
  if (ms <= t.moderate) return c.moderate;
  if (ms <= t.elevated) return c.elevated;
  return c.critical;
}

export function latencyHeatColor(ms: number | null | undefined): string {
  // 0ms 表示亚毫秒成功探测；仅无样本和负值回退中性色。
  if (ms == null || !Number.isFinite(ms) || ms < 0) {
    return "var(--text-tertiary)";
  }
  // 首页是状态巡检而非精密曲线：离散色阶保证 53ms 与 91ms 一眼可分，精确值由数字和 tooltip 承担。
  if (ms <= 60) return "var(--latency-excellent)";
  if (ms <= 100) return "var(--latency-good)";
  if (ms <= 160) return "var(--latency-moderate)";
  if (ms <= 200) return "var(--latency-elevated)";
  return "var(--latency-critical)";
}

// 流量使用率：0–50% 保持绿色，之后随配额耗尽转为琥珀和红色。
export function trafficUsageColor(fraction: number | null | undefined): string {
  if (fraction == null || !Number.isFinite(fraction) || fraction <= 0) {
    return "var(--status-success)";
  }

  const f = clamp(fraction, 0, 1);

  if (f <= 0.5) {
    const t = clamp(f / 0.5, 0, 1);
    return toHsl(150 - 6 * t, 58 + 4 * t, 46 + 2 * t);
  }

  if (f <= 0.78) {
    const t = clamp((f - 0.5) / 0.28, 0, 1);
    return toHsl(144 - 104 * t, 62 + 20 * t, 48 + 4 * t);
  }

  const t = clamp((f - 0.78) / 0.22, 0, 1);
  return toHsl(40 - 34 * t, 82 + 4 * t, 52 - 6 * t);
}

// 按条上绝对位置在 OKLCH 中插值；紧凑卡的 CSS 光谱镜像同一组色标。
const TRAFFIC_QUOTA_STOPS = [
  { pos: 0, l: 0.72, c: 0.16, h: 150 }, // 绿
  { pos: 0.1, l: 0.72, c: 0.16, h: 150 }, // 保持绿(短)
  { pos: 0.28, l: 0.8, c: 0.18, h: 128 }, // 黄绿
  { pos: 0.44, l: 0.86, c: 0.18, h: 110 }, // 黄(亮度峰值)
  { pos: 0.58, l: 0.8, c: 0.18, h: 85 }, // 琥珀黄
  { pos: 0.72, l: 0.72, c: 0.19, h: 62 }, // 橙
  { pos: 0.86, l: 0.65, c: 0.21, h: 40 }, // 红橙
  { pos: 1, l: 0.6, c: 0.22, h: 27 }, // 红
];

export function trafficQuotaSegmentColor(pos: number): string {
  const p = clamp(pos, 0, 1);
  for (let i = 0; i < TRAFFIC_QUOTA_STOPS.length - 1; i++) {
    const a = TRAFFIC_QUOTA_STOPS[i];
    const b = TRAFFIC_QUOTA_STOPS[i + 1];
    if (p >= a.pos && p <= b.pos) {
      const t = b.pos === a.pos ? 0 : (p - a.pos) / (b.pos - a.pos);
      return toOklch(a.l + (b.l - a.l) * t, a.c + (b.c - a.c) * t, a.h + (b.h - a.h) * t);
    }
  }
  return toOklch(0.6, 0.22, 27);
}

function parseHexColor(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  if (Number.isNaN(num)) return [0, 0, 0];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

export function interpolateHex(hexA: string, hexB: string, t: number): string {
  const factor = clamp(t, 0, 1);
  const [r1, g1, b1] = parseHexColor(hexA);
  const [r2, g2, b2] = parseHexColor(hexB);
  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function resolveTrafficSegmentColor(
  pos: number,
  colors?: TrafficSpectrumColors,
): string {
  const p = clamp(pos, 0, 1);
  if (!colors) {
    return trafficQuotaSegmentColor(p);
  }
  const { start, mid, high, end } = colors;
  if (p <= 0.15) return start;
  if (p <= 0.50) {
    const t = (p - 0.15) / 0.35;
    return interpolateHex(start, mid, t);
  }
  if (p <= 0.80) {
    const t = (p - 0.50) / 0.30;
    return interpolateHex(mid, high, t);
  }
  const t = (p - 0.80) / 0.20;
  return interpolateHex(high, end, t);
}

export function buildTrafficHeatSpectrum(colors?: TrafficSpectrumColors): string {
  const c = colors ?? DEFAULT_TRAFFIC_SPECTRUM_COLORS;
  return `linear-gradient(to right, ${c.start} 0%, ${c.start} 15%, ${c.mid} 50%, ${c.high} 80%, ${c.end} 100%)`;
}

export const TRAFFIC_QUOTA_SEGMENTS = 18;

export function buildTrafficQuotaSegmentColors(colors?: TrafficSpectrumColors): string[] {
  return Array.from({ length: TRAFFIC_QUOTA_SEGMENTS }, (_, i) =>
    resolveTrafficSegmentColor((i + 0.5) / TRAFFIC_QUOTA_SEGMENTS, colors),
  );
}

export function trafficQuotaLitCount(
  fraction: number,
  segments: number = TRAFFIC_QUOTA_SEGMENTS,
): number {
  let count = 0;
  for (let i = 0; i < segments; i++) {
    if ((i + 0.5) / segments <= fraction) count += 1;
    else break;
  }
  if (count === 0 && fraction > 0) return -1;
  return count;
}

// 速率按 B/KB/MB/GB 四档着色，TB/PB 沿用最高档。
const SPEED_RATE_COLOR: Record<string, string> = {
  "B/s": "var(--speed-idle)",
  "KB/s": "var(--speed-low)",
  "MB/s": "var(--speed-high)",
  "GB/s": "var(--speed-max)",
  "TB/s": "var(--speed-max)",
  "PB/s": "var(--speed-max)",
};

type SpeedMetricColors = Partial<
  Record<"speedIdle" | "speedLow" | "speedHigh" | "speedMax", string>
>;

export function speedRateColor(unit: string, metricColors?: SpeedMetricColors): string {
  if (metricColors) {
    if (unit === "B/s" && metricColors.speedIdle) return metricColors.speedIdle;
    if (unit === "KB/s" && metricColors.speedLow) return metricColors.speedLow;
    if (unit === "MB/s" && metricColors.speedHigh) return metricColors.speedHigh;
    if ((unit === "GB/s" || unit === "TB/s" || unit === "PB/s") && metricColors.speedMax) {
      return metricColors.speedMax;
    }
  }
  return SPEED_RATE_COLOR[unit] ?? "var(--text-tertiary)";
}

export function speedRateColorFromBytes(
  bytesPerSec: number,
  metricColors?: SpeedMetricColors,
): string {
  return speedRateColor(formatByteRate(bytesPerSec).unit, metricColors);
}

export function resolveCustomLossColor(
  pct: number | null | undefined,
  thresholds?: PingLossThresholds,
  colors?: PingLossColors,
): string {
  if (pct == null || !Number.isFinite(pct) || pct < 0) {
    return "var(--text-tertiary)";
  }
  const c = colors ?? DEFAULT_PING_LOSS_COLORS;
  if (pct === 0) return c.zero;
  if (c.loss) return c.loss;
  // 兼容未提供 loss 的旧阈值测试或配置对象
  if (thresholds && c.low && c.medium && c.high && (c.low !== c.high || c.medium !== c.high)) {
    if (pct <= thresholds.low) return c.low;
    if (pct <= thresholds.medium) return c.medium;
    return c.high;
  }
  return (
    c.loss ??
    c.low ??
    c.high ??
    DEFAULT_PING_LOSS_COLORS.loss ??
    DEFAULT_PING_LOSS_COLORS.high ??
    "#ef4444"
  );
}

export function lossHeatColor(pct: number | null | undefined): string {
  if (pct == null || !Number.isFinite(pct) || pct < 0) {
    return "var(--text-tertiary)";
  }
  return heatRamp(pct, [1, 3, 5, 10], 20);
}
