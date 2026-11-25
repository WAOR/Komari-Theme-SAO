import { memo, useState } from "react";
import { clsx } from "clsx";
import { useMetricColorsVersion } from "@/hooks/useMetricColors";
import { usePreferences } from "@/hooks/usePreferences";
import type { HomepagePingDisplayLine } from "@/types/komari";
import { isFallbackTaskName } from "@/utils/pingTasks";
import { HealthBucketTooltip } from "./HealthBucketTooltip";
import { LatencyBars } from "./LatencyBars";
import { QualityBars } from "./QualityBars";
import { formatHealthBucketTooltip } from "./pingBucketText";

/**
 * 架构设计规范（重要）：
 * 网络延迟与丢包数值文本严格统一使用中性次级色（var(--text-secondary)），与左侧线路名称保持绝对一致。
 * 状态评估与主题色彩完全由下方的光柱（LatencyBars / QualityBars）负责表达。
 * 严禁在此处或任何新配色方案中对数值文本进行染色，避免浅色/低对比度方案下文字看不清或产生视觉杂乱。
 */

type MultiPingStatusDensity = "large" | "compact";
type MultiPingMetric = "latency" | "loss";

const MultiPingMetricRow = memo(function MultiPingMetricRow({
  line,
  metric,
  density,
  redrawKey,
}: {
  line: HomepagePingDisplayLine;
  metric: MultiPingMetric;
  density: MultiPingStatusDensity;
  redrawKey: string;
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const isLoading = line.loadState === "pending";
  const isError = line.loadState === "error";
  const staleError = isError && (line.lastValue != null || line.loss != null);
  const latencyLabel =
    isLoading && line.lastValue == null
      ? "加载中"
      : isError && line.lastValue == null
        ? "加载失败"
        : line.lastValue == null
          ? "无样本"
          : `${Math.round(line.lastValue)}ms`;
  const lossLabel =
    isLoading && line.loss == null
      ? "加载中"
      : isError && line.loss == null
        ? "加载失败"
        : line.loss == null
          ? "—"
          : `${line.loss.toFixed(1)}%`;
  const hoveredBucket =
    hoveredIndex == null ? null : (line.buckets[hoveredIndex] ?? null);
  const tooltip = hoveredBucket
    ? formatHealthBucketTooltip(hoveredBucket, metric)
    : null;
  const chartHeight = density === "compact" ? 9 : 11;
  const value = metric === "latency" ? line.lastValue : line.loss;
  const unit = metric === "latency" ? "ms" : "%";
  const waiting = isLoading && value == null;
  const displayValue =
    waiting
      ? "..."
      : isError && value == null
        ? "!"
        : value == null
          ? "—"
          : metric === "latency"
            ? Math.round(value)
            : value.toFixed(1);
  const isNameFallback = isFallbackTaskName(line.taskName);
  const showNameSkeleton = isLoading && isNameFallback;
  const displayTaskName = showNameSkeleton ? "加载中" : line.taskName;
  return (
    <div
      className="multi-ping-metric-row"
      data-load-state={line.loadState ?? "ready"}
      title={`${displayTaskName} · 延迟 ${latencyLabel} · 丢包 ${lossLabel}${
        staleError ? " · 刷新失败，显示上次数据" : ""
      }`}
    >
      <div
        className={clsx(
          "multi-ping-metric-head",
          metric === "loss" && "is-value-only",
        )}
      >
        {metric === "latency" && (
          <span className="multi-ping-name">
            {showNameSkeleton ? (
              <span className="multi-ping-name-skeleton" aria-label="加载中" />
            ) : (
              line.taskName
            )}
          </span>
        )}
        <strong
          className={clsx(
            "multi-ping-value tabular",
            value == null && "is-empty",
          )}
        >
          {displayValue}
          {value != null && <small>{unit}</small>}
        </strong>
      </div>
      <span className="multi-ping-buckets" title="">
        {metric === "latency" ? (
          <LatencyBars
            buckets={line.buckets}
            redrawKey={redrawKey}
            height={chartHeight}
            onHoverIndex={setHoveredIndex}
          />
        ) : (
          <QualityBars
            buckets={line.buckets}
            redrawKey={redrawKey}
            height={chartHeight}
            onHoverIndex={setHoveredIndex}
          />
        )}
        <HealthBucketTooltip
          text={tooltip}
          index={hoveredIndex}
          count={line.buckets.length}
        />
      </span>
    </div>
  );
});

const MultiPingMetricColumn = memo(function MultiPingMetricColumn({
  lines,
  metric,
  density,
  redrawKey,
}: {
  lines: HomepagePingDisplayLine[];
  metric: MultiPingMetric;
  density: MultiPingStatusDensity;
  redrawKey: string;
}) {
  return (
    <div
      className="multi-ping-metric-column"
      aria-label={metric === "latency" ? "延迟" : "丢包"}
    >
      {lines.map((line) => (
        <MultiPingMetricRow
          key={line.taskId}
          line={line}
          metric={metric}
          density={density}
          redrawKey={redrawKey}
        />
      ))}
    </div>
  );
});

export const MultiPingStatus = memo(function MultiPingStatus({
  lines,
  density,
  className,
}: {
  lines: HomepagePingDisplayLine[];
  density: MultiPingStatusDensity;
  className?: string;
}) {
  const { resolvedAppearance } = usePreferences();
  const colorsVersion = useMetricColorsVersion();
  const redrawKey = `${resolvedAppearance}:${colorsVersion}`;

  return (
    <div
      className={clsx("multi-ping-status", `is-${density}`, className)}
      role="group"
      aria-label="三网延迟与丢包"
    >
      <div className="multi-ping-columns">
        <MultiPingMetricColumn
          lines={lines}
          metric="latency"
          density={density}
          redrawKey={redrawKey}
        />
        <MultiPingMetricColumn
          lines={lines}
          metric="loss"
          density={density}
          redrawKey={redrawKey}
        />
      </div>
    </div>
  );
});
