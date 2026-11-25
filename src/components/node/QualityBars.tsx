import { useCallback, useMemo } from "react";
import { useThemeSettings } from "@/hooks/useThemeSettings";
import { useAppearance } from "@/hooks/useAppearance";
import { CanvasStrip, fillRoundedRect, safeCanvasColor } from "./CanvasStrip";
import {
  getBarGeometry,
  getBarSlot,
  healthBarInteractionModel,
  healthBarSlotModel,
} from "./nodeCardShared";
import type {
  PingLossColors,
  PingLossThresholds,
  PingOverviewBucket,
} from "@/types/komari";

interface QualityBarsProps {
  buckets: PingOverviewBucket[];
  redrawKey?: string;
  height?: number;
  onHoverIndex?: (index: number | null) => void;
  lossThresholds?: PingLossThresholds;
  lossColors?: PingLossColors;
  enablePingLossHatch?: boolean;
}

function fillHatchedRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  isDark: boolean,
  color: string = "",
) {
  const c = color.toLowerCase().trim();
  let baseColor: string;
  let strokeColor: string;
  let borderColor: string;
  let spacing: number;
  let lineWidth: number;

  if (c === "#ef4444" || c === "#dc2626" || c.startsWith("rgb(239") || c.startsWith("rgb(220")) {
    // 熔岩红醒目密斜纹
    baseColor = isDark ? "#3b1616" : "#fee2e2";
    strokeColor = isDark ? "rgba(248, 113, 113, 0.75)" : "rgba(220, 38, 38, 0.75)";
    borderColor = isDark ? "rgba(248, 113, 113, 0.6)" : "rgba(220, 38, 38, 0.6)";
    spacing = 2.4;
    lineWidth = 1.3;
  } else if (c === "#facc15" || c === "#24160e" || c.startsWith("rgb(250, 204, 21")) {
    // 命运石之门 电离微弱干扰斜纹 (浅色：电离金底色 + 琥珀深金斜纹；深色：暗暖焦褐底色 + 辉光暖橙斜纹)
    baseColor = isDark ? "#24160e" : "#facc15";
    strokeColor = isDark ? "rgba(255, 119, 0, 0.45)" : "rgba(146, 64, 14, 0.75)";
    borderColor = isDark ? "rgba(255, 119, 0, 0.35)" : "rgba(146, 64, 14, 0.55)";
    spacing = 3.2;
    lineWidth = 1.1;
  } else if (c === "#dce5da" || c === "#1c251b") {
    // 云雾抹茶 浅灰绿精致警戒斜纹 (浅色：浅灰绿底 + 灰绿斜条纹；深色：暗深灰绿底 + 抹茶亮绿斜条纹)
    baseColor = isDark ? "#1c251b" : "#dce5da";
    strokeColor = isDark ? "rgba(130, 221, 45, 0.35)" : "rgba(100, 125, 95, 0.45)";
    borderColor = isDark ? "rgba(110, 140, 105, 0.4)" : "rgba(120, 140, 115, 0.5)";
    spacing = 3.6;
    lineWidth = 1.0;
  } else if (
    c === "#f58d39" ||
    c === "#f97316" ||
    c.startsWith("rgb(245, 141") ||
    c.startsWith("rgb(249, 115")
  ) {
    // EVA NERV 警报橙色斜纹 (浅色：暖橙浅底 + 警示深暖橙斜纹；深色：暗焦黑紫底 + 警示高亮暖橙斜纹)
    baseColor = isDark ? "#281710" : "#ffedd5";
    strokeColor = isDark ? "rgba(245, 141, 57, 0.95)" : "rgba(234, 88, 12, 0.9)";
    borderColor = isDark ? "rgba(245, 141, 57, 0.75)" : "rgba(234, 88, 12, 0.65)";
    spacing = 3.0;
    lineWidth = 1.2;
  } else {
    // 用户自定义颜色：以用户所选色为真实底色，叠加细腻斜纹
    baseColor = color || (isDark ? "#1c251b" : "#dce5da");
    strokeColor = isDark ? "rgba(255, 255, 255, 0.28)" : "rgba(0, 0, 0, 0.22)";
    borderColor = isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.15)";
    spacing = 3.2;
    lineWidth = 1.0;
  }

  // 1. 绘制底色
  ctx.fillStyle = baseColor;
  fillRoundedRect(ctx, x, y, width, height, radius);

  // 2. 剪裁并在矩形内部精准绘制 45° 细腻斜纹
  ctx.save();
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
  ctx.clip();

  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  for (let offset = -height; offset <= width + height; offset += spacing) {
    ctx.moveTo(x + offset, y + height);
    ctx.lineTo(x + offset + height, y);
  }
  ctx.stroke();

  // 3. 边框强化
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

export function QualityBars({
  buckets,
  redrawKey,
  height = 16,
  onHoverIndex,
  lossThresholds,
  lossColors,
  enablePingLossHatch,
}: QualityBarsProps) {
  const themeSettings = useThemeSettings();
  const appearance = useAppearance();
  const isDark = appearance === "dark";
  const effectiveThresholds = lossThresholds ?? themeSettings.pingLossThresholds;
  const effectiveColors = lossColors ?? themeSettings.pingLossColors;
  const effectiveEnableHatch =
    typeof enablePingLossHatch === "boolean"
      ? enablePingLossHatch
      : (themeSettings.enablePingLossHatch ?? false);

  const bars = useMemo(
    () => {
      // CSS 色或配置变化时需要重新解析预计算的 canvas 色值。
      void redrawKey;
      return buckets.map((bucket) => {
        const slot = healthBarSlotModel(bucket, "loss", {
          lossThresholds: effectiveThresholds,
          lossColors: effectiveColors,
        });
        const lossVal = bucket.loss ?? 0;
        let tier: "low" | "medium" | "high" = "medium";
        if (lossVal <= effectiveThresholds.low) {
          tier = "low";
        } else if (lossVal > effectiveThresholds.medium) {
          tier = "high";
        }
        return {
          ...slot,
          lossVal,
          tier,
          tone: safeCanvasColor(slot.color),
        };
      });
    },
    [buckets, redrawKey, effectiveThresholds, effectiveColors],
  );

  const getHoverIndex = useCallback(
    (offsetX: number, width: number) => getBarSlot(offsetX, width, bars.length),
    [bars],
  );

  const draw = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      interaction: { hoverIndex: number | null; hoverProgress: number },
    ) => {
      const { gap, barWidth } = getBarGeometry(width, bars.length);
      const zeroLower = effectiveColors.zero?.toLowerCase() || "";

      bars.forEach(({ active, heightFraction, alpha, tone, color, lossVal }, index) => {
        const visual = healthBarInteractionModel(
          { active, heightFraction, color: tone, alpha },
          interaction.hoverIndex === index,
          interaction.hoverProgress,
        );
        const barHeight = height * visual.heightFraction;
        const y = height - barHeight;
        const x = index * (barWidth + gap);
        ctx.globalAlpha = visual.alpha;

        // 无样本（!active）：渲染实心纯灰色槽，绝不渲染斜纹
        if (!active) {
          ctx.fillStyle = tone;
          fillRoundedRect(ctx, x, y, barWidth, barHeight, 2);
          return;
        }

        const cLower = (color || tone)?.toLowerCase() || "";
        const isLoss = lossVal > 0 || cLower !== zeroLower;

        // 丢包光柱渲染：若开启斜条纹则叠加精致斜纹，否则保持实心纯色
        if (isLoss && effectiveEnableHatch) {
          fillHatchedRoundedRect(ctx, x, y, barWidth, barHeight, 2, isDark, cLower || tone);
        } else if (isLoss) {
          let solidColor = tone;
          if (cLower === "#dce5da" || cLower === "#1c251b") {
            solidColor = isDark ? "#1c251b" : "#dce5da";
          } else if (cLower === "#facc15" || cLower === "#24160e") {
            solidColor = isDark ? "#24160e" : "#facc15";
          }
          ctx.fillStyle = solidColor;
          fillRoundedRect(ctx, x, y, barWidth, barHeight, 2);
        } else {
          ctx.fillStyle = tone;
          fillRoundedRect(ctx, x, y, barWidth, barHeight, 2);
        }
      });

      ctx.globalAlpha = 1;
    },
    [bars, effectiveColors.zero, effectiveEnableHatch, isDark],
  );

  const internalRedrawKey = `${redrawKey ?? ""}:${appearance}:${effectiveColors.zero}:${effectiveColors.loss ?? effectiveColors.low ?? ""}:${effectiveEnableHatch}`;

  return (
    <CanvasStrip
      className="health-bar-row"
      height={height}
      redrawKey={internalRedrawKey}
      getHoverIndex={getHoverIndex}
      onHoverIndex={onHoverIndex}
      draw={draw}
    />
  );
}
