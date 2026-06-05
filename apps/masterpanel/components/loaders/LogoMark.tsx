"use client";
import * as React from "react";

export type LogoMarkVariant = "solid" | "outline" | "clip";

export interface LogoMarkProps {
  size?: number;
  variant?: LogoMarkVariant;
  uid?: string;
  showShimmer?: boolean;
  className?: string;
}

/**
 * LogoMark — inline SVG of the brand mark.
 * Each shape is split so it can be animated independently
 * (snap-together, stroke draw, liquid fill, shimmer).
 */
const LogoMark: React.FC<LogoMarkProps> = ({
  size = 220,
  variant = "solid",
  uid = "ldr",
  showShimmer = false,
  className = "",
}) => {
  const idTop = `${uid}-grad-top`;
  const idRight = `${uid}-grad-right`;
  const idRed = `${uid}-grad-red`;
  const idShimmer = `${uid}-grad-shimmer`;
  const idAllClip = `${uid}-clip-all`;

  const dTop =
    "M94.31,71.82l24.46-26.75-57.16-1.64-7.82-.4c3.96-1.29,7.4-1.9,11.35-2.56l57.36-9.59,46.58-7.6-7.5,7.42c-27.24,26.3-54.38,52.23-82.57,77.95l11.18-32.48,4.11-4.34Z";
  const dRight =
    "M112.57,141.03 L73.26,124.27 L95.31,117.93 L166.02,100.22 L112.57,141.03 Z";
  const dRed =
    "M87.11,143.39 L11.67,147.48 L40.98,119.31 L72.79,88.94 L57.53,129.94 L87.11,143.39 Z";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 177.89 177.89"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={idTop} x1="131.28" y1="78.47" x2="96.56" y2="18.34" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#474747" />
          <stop offset=".26" stopColor="#adadad" />
          <stop offset=".41" stopColor="#fefefe" />
          <stop offset=".73" stopColor="#aeaeae" />
          <stop offset="1" stopColor="#4d4d4d" />
        </linearGradient>
        <linearGradient id={idRight} x1="102.46" y1="95.07" x2="136.82" y2="129.43" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#404040" />
          <stop offset=".35" stopColor="#cdcdcd" />
          <stop offset=".61" stopColor="#fefefe" />
          <stop offset=".97" stopColor="#5c5c5c" />
          <stop offset="1" stopColor="#4d4d4d" />
        </linearGradient>
        <linearGradient id={idRed} x1="49.39" y1="147.48" x2="49.39" y2="88.94" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8d0003" />
          <stop offset=".43" stopColor="#ff0a14" />
          <stop offset="1" stopColor="#b00006" />
        </linearGradient>
        <linearGradient id={idShimmer} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={idAllClip}>
          <path d={dTop} />
          <path d={dRight} />
          <path d={dRed} />
        </clipPath>
      </defs>

      {variant === "solid" && (
        <g>
          <path d={dTop} fill={`url(#${idTop})`} className="ldr-shape ldr-snap-top" />
          <path d={dRight} fill={`url(#${idRight})`} className="ldr-shape ldr-snap-right" />
          <path
            d={dRed}
            fill={`url(#${idRed})`}
            className={showShimmer ? "ldr-shape ldr-snap-red" : "ldr-shape ldr-shape-pulse"}
          />
          {!showShimmer && (
            <circle
              cx="89"
              cy="89"
              r="14"
              fill="#ff1a2e"
              className="ldr-burst"
              opacity="0"
              style={{ filter: "blur(8px)" }}
            />
          )}
        </g>
      )}

      {variant === "outline" && (
        <g>
          <path
            d={dTop}
            stroke={`url(#${idTop})`}
            className="ldr-stroke-path"
            style={{ "--ldr-len": 360 } as React.CSSProperties}
          />
          <path
            d={dRight}
            stroke={`url(#${idRight})`}
            className="ldr-stroke-path"
            style={{ "--ldr-len": 220, animationDelay: "0.1s" } as React.CSSProperties}
          />
          <path
            d={dRed}
            stroke={`url(#${idRed})`}
            className="ldr-stroke-path"
            style={{ "--ldr-len": 320, animationDelay: "0.2s" } as React.CSSProperties}
          />
          <path d={dTop} fill={`url(#${idTop})`} className="ldr-stroke-fill" />
          <path d={dRight} fill={`url(#${idRight})`} className="ldr-stroke-fill" style={{ animationDelay: "0.1s" }} />
          <path d={dRed} fill={`url(#${idRed})`} className="ldr-stroke-fill" style={{ animationDelay: "0.2s" }} />
        </g>
      )}

      {showShimmer && (
        <g clipPath={`url(#${idAllClip})`}>
          <rect
            x="-80"
            y="-30"
            width="60"
            height="240"
            fill={`url(#${idShimmer})`}
            className="ldr-shimmer-rect"
          />
        </g>
      )}
    </svg>
  );
};

export default LogoMark;
