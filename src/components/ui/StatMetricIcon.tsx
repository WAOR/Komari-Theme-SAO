import type { ElementType } from "react";

export type MetricType =
  | "connections"
  | "cpu"
  | "ram"
  | "disk"
  | "traffic"
  | "uptime"
  | "asset";

export interface StatMetricIconProps {
  metric: MetricType;
  icon: ElementType<{ size?: number | string; className?: string }>;
  size?: number;
  className?: string;
}

/**
 * 标准化指标卡片图标组件
 * - 深色模式：呈现 HUD 科技感微发光阴影与微底框
 * - 浅色模式：保持无微底框状态，颜色与深色模式 100% 同频对应
 */
export function StatMetricIcon({
  metric,
  icon: Icon,
  size = 14,
  className = "",
}: StatMetricIconProps) {
  return (
    <span
      className={`mao-stat-icon-hud mao-stat-icon-${metric}${className ? ` ${className}` : ""}`}
      data-metric={metric}
      aria-hidden="true"
    >
      <Icon size={size} className="mao-stat-icon-svg" />
    </span>
  );
}
