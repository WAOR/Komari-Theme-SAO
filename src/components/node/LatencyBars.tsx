import { useCallback, useMemo } from "react";
import { CanvasStrip, fillRoundedRect, safeCanvasColor } from "./CanvasStrip";
import { getBarGeometry, getBarSlot, healthBarSlotModel } from "./nodeCardShared";
import type { PingOverviewBucket } from "@/types/komari";

interface LatencyBarsProps {
  buckets: PingOverviewBucket[];
  max: number;
  redrawKey?: string;
  height?: number;
  onHoverIndex?: (index: number | null) => void;
}

export function LatencyBars({ buckets, max, redrawKey, height = 16, onHoverIndex }: LatencyBarsProps) {
  const bars = useMemo(
    () => {
      // CSS 色变化时需要重新解析预计算的 canvas 色值。
      void redrawKey;
      return buckets.map((bucket) => {
        const slot = healthBarSlotModel(bucket, "latency", max);
        return { ...slot, tone: safeCanvasColor(slot.color) };
      });
    },
    [buckets, max, redrawKey],
  );

  const getHoverIndex = useCallback(
    (offsetX: number, width: number) => getBarSlot(offsetX, width, bars.length),
    [bars],
  );

  const draw = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const { gap, barWidth } = getBarGeometry(width, bars.length);

      bars.forEach(({ heightFraction, alpha, tone }, index) => {
        const barHeight = height * heightFraction;
        const x = index * (barWidth + gap);
        const y = height - barHeight;

        ctx.globalAlpha = alpha;
        ctx.fillStyle = tone;
        fillRoundedRect(ctx, x, y, barWidth, barHeight, 2);
      });

      ctx.globalAlpha = 1;
    },
    [bars],
  );

  return (
    <CanvasStrip
      className="health-bar-row"
      height={height}
      redrawKey={redrawKey}
      getHoverIndex={getHoverIndex}
      onHoverIndex={onHoverIndex}
      draw={draw}
    />
  );
}
