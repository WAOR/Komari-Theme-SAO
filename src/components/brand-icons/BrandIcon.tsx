import type { SVGProps } from "react";
import { getBrandIconComponent, type SiteBrandIconId } from "./types";

export interface BrandIconProps extends SVGProps<SVGSVGElement> {
  id?: SiteBrandIconId | string;
  withGradientDef?: boolean;
}

export function BrandIcon({
  id,
  withGradientDef = true,
  className = "text-(--text-primary)",
  width = 24,
  height = 24,
  ...rest
}: BrandIconProps) {
  const IconComponent = getBrandIconComponent(id);

  return (
    <IconComponent
      width={width}
      height={height}
      className={className}
      {...rest}
    >
      {withGradientDef && (
        <defs>
          <linearGradient
            id="mao-nav-aurora-gradient-dark"
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#b4f475" />
            <stop offset="20%" stopColor="#82dd2d" />
            <stop offset="40%" stopColor="#4ade80" />
            <stop offset="60%" stopColor="#4f8f1c" />
            <stop offset="80%" stopColor="#a6ec62" />
            <stop offset="100%" stopColor="#b4f475" />
          </linearGradient>
          <linearGradient
            id="mao-nav-divergence-gradient-dark"
            x1="0"
            y1="0"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#facc15" />
            <stop offset="20%" stopColor="#ff7700" />
            <stop offset="40%" stopColor="#fb923c" />
            <stop offset="60%" stopColor="#ea580c" />
            <stop offset="80%" stopColor="#dc2626" />
            <stop offset="90%" stopColor="#ff7700" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
        </defs>
      )}
    </IconComponent>
  );
}
