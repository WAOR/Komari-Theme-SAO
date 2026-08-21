import React from "react";

export interface DiaTextRevealProps extends React.HTMLAttributes<HTMLSpanElement> {
  text?: string | string[];
  children?: React.ReactNode;
  className?: string;
  colors?: string[];
  auroraColors?: string[];
  sweepDuration?: number;
  auroraSpeed?: number;
  delay?: number;
  mode?: "repeat-sweep" | "reveal-then-aurora" | "aurora-only";
}

export function DiaTextReveal({
  text,
  children,
  className,
  colors = ["#c679c4", "#fa3d1d", "#ffb005", "#8b5cf6", "#0358f7"],
  auroraColors,
  sweepDuration = 2.5,
  auroraSpeed = 8,
  delay = 0.2,
  mode = "reveal-then-aurora",
  style,
  ...props
}: DiaTextRevealProps) {
  const content = text
    ? Array.isArray(text)
      ? text[0]
      : text
    : children ?? "";

  const effectiveAuroraColors = auroraColors ?? [...colors, colors[0]];

  const colorStops = colors
    .map((c, i) => `${c} ${35 + (i / (colors.length - 1)) * 30}%`)
    .join(", ");
  const sweepGradient = `linear-gradient(110deg, currentColor 0%, currentColor 25%, ${colorStops}, currentColor 75%, currentColor 100%)`;

  const auroraStops = effectiveAuroraColors
    .map((c, i) => `${c} ${(i / (effectiveAuroraColors.length - 1)) * 100}%`)
    .join(", ");
  const auroraGradient = `linear-gradient(135deg, ${auroraStops})`;

  return (
    <span
      className={`dia-text-reveal-container relative inline-grid place-items-start font-bold tracking-tight select-none ${
        className || ""
      }`}
      style={style}
      {...props}
    >
      {/* 1. Dia Text Reveal Sweep Layer */}
      {mode !== "aurora-only" && (
        <span
          className={`dia-sweep-layer col-start-1 row-start-1 inline-block ${
            mode === "repeat-sweep" ? "dia-text-reveal-repeat" : ""
          } ${mode === "reveal-then-aurora" ? "dia-text-reveal-once" : ""}`}
          style={
            {
              "--dia-gradient": sweepGradient,
              "--dia-duration": `${sweepDuration}s`,
              "--dia-delay": `${delay}s`,
            } as React.CSSProperties
          }
        >
          {content}
        </span>
      )}

      {/* 2. Aurora Text Layer */}
      {mode !== "repeat-sweep" && (
        <span
          className={`aurora-text-layer col-start-1 row-start-1 inline-block ${
            mode === "reveal-then-aurora" ? "aurora-text-layer-animated" : ""
          } ${mode === "aurora-only" ? "aurora-text-layer-only" : ""}`}
          style={
            {
              "--aurora-gradient": auroraGradient,
              "--aurora-speed": `${auroraSpeed}s`,
              "--dia-duration": `${sweepDuration}s`,
              "--dia-delay": `${delay}s`,
            } as React.CSSProperties
          }
        >
          {content}
        </span>
      )}
    </span>
  );
}
