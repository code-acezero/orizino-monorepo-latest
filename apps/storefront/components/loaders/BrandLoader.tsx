"use client";
import * as React from "react";
import "./loaders.css";

export interface BrandLoaderProps {
  size?: number;
  withBackdrop?: boolean;
  show?: boolean;
  className?: string;
  testid?: string;
}

const OUTER =
  "M256.71,300.89c39.06-35.04,56.91-87.54,49.33-138.97-6.32-35.37-23.54-65.82-49.67-90.19" +
  "-34.86-31.85-80.38-46.84-127.79-43.48-33.4,2.37-62.79,14.22-91.98,31.42" +
  "C63.93,29.81,100.45,9.81,139.81,2.86c84.1-14.84,166.03,29.2,200.46,106.38" +
  ",31.19,69.92,15.38,151.71-41.14,203.91-52.51,46.87-129.32,59.15-186.95,14" +
  ",51.01,18.78,104.11,9.99,144.53-26.27Z";

const INNER =
  "M69.38,178.27c-25.06,27.51-31.37,65.53-19.62,100.19,8.04,23.71,22.45,43.39,41.44,59.69" +
  ",35.02,30.07,79.29,42.06,127.07,38.26-41.02,14.18-87.85,12.89-128.47-5.31" +
  "C12.67,336.52-25.91,250.36,19.29,174.39c24.02-40.38,67.68-64.44,114.83-61.48" +
  ",34.35,2.16,65.49,19.96,82.75,49.44,19.21,32.82,14.48,73.65-12.45,100.04" +
  "-27.76,27.22-72.8,28.91-100.68,1.37,17.14,5.88,33.3,8.19,49.92,1.8" +
  ",30.96-11.91,46.59-47.87,32.92-78.55-9.95-22.33-32.26-35.24-56.57-35.71" +
  "-23.33-.45-44.51,9.26-60.63,26.96Z";

/**
 * BrandLoader — full brand spiral logo with stroke-draw → fill animation.
 * Draws each path from nothing → filled, then fades out and repeats.
 * Use for high-impact loading moments (splash, first-paint, etc.).
 */
const BrandLoader: React.FC<BrandLoaderProps> = ({
  size = 220,
  withBackdrop = false,
  show = true,
  className = "",
  testid = "brand-loader",
}) => {
  if (!show) return null;

  return (
    <div
      data-testid={testid}
      className={`ldr-fullscreen ${withBackdrop ? "ldr-backdrop" : ""} ${className}`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="ldr-stage" style={{ width: size, height: size }}>
        <div className="ldr-halo" />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 356.03 386.03"
          width={size}
          height={size}
          aria-hidden="true"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="bl-g-outer" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#ff5a6e" />
              <stop offset="45%"  stopColor="#d40015" />
              <stop offset="100%" stopColor="#8d0003" />
            </linearGradient>
            <linearGradient id="bl-g-inner" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#ff3040" />
              <stop offset="100%" stopColor="#ad0423" />
            </linearGradient>
          </defs>

          {/* ── Outer path ── */}
          <path
            d={OUTER}
            fill="none"
            stroke="url(#bl-g-outer)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            className="ldr-brand-stroke"
            style={{ "--ldr-brand-delay": "0s" } as React.CSSProperties}
          />
          <path
            d={OUTER}
            fill="rgb(173,4,35)"
            className="ldr-brand-fill"
            style={{ "--ldr-brand-delay": "0s" } as React.CSSProperties}
          />

          {/* ── Inner path (slight stagger) ── */}
          <path
            d={INNER}
            fill="none"
            stroke="url(#bl-g-inner)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            className="ldr-brand-stroke"
            style={{ "--ldr-brand-delay": "0.15s" } as React.CSSProperties}
          />
          <path
            d={INNER}
            fill="rgb(173,4,35)"
            className="ldr-brand-fill"
            style={{ "--ldr-brand-delay": "0.15s" } as React.CSSProperties}
          />
        </svg>

        {withBackdrop && <div className="ldr-grain" />}
      </div>
    </div>
  );
};

export default BrandLoader;
