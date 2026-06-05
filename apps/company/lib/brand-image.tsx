import React from "react";
import { cn } from "@/lib/utils";

export type LogoFilter =
  | "none"
  | "white"
  | "black"
  | "invert"
  | "accent"
  | "custom";

export const LOGO_FILTERS: { id: LogoFilter; label: string; hint: string }[] = [
  { id: "none", label: "Original", hint: "Keep source colors" },
  { id: "white", label: "Force White", hint: "Black → white" },
  { id: "black", label: "Force Black", hint: "White → black" },
  { id: "invert", label: "Invert", hint: "Swap colors" },
  { id: "accent", label: "Accent Tint", hint: "Use theme primary" },
  { id: "custom", label: "Custom Color", hint: "Pick any color" },
];

/** Apply a color treatment to a raster/SVG logo without altering the accent. */
export function getLogoImageStyle(
  filter: LogoFilter,
  src?: string,
  customColor?: string
): { isMask: boolean; style: React.CSSProperties } {
  switch (filter) {
    case "white":
      return { isMask: false, style: { filter: "brightness(0) invert(1)" } };
    case "black":
      return { isMask: false, style: { filter: "brightness(0)" } };
    case "invert":
      return { isMask: false, style: { filter: "invert(1) hue-rotate(180deg)" } };
    case "accent":
      if (!src) return { isMask: false, style: {} };
      return {
        isMask: true,
        style: {
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          backgroundColor: "hsl(var(--primary))",
        } as React.CSSProperties,
      };
    case "custom":
      if (!src) return { isMask: false, style: {} };
      return {
        isMask: true,
        style: {
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          backgroundColor: customColor || "#ffffff",
        } as React.CSSProperties,
      };
    default:
      return { isMask: false, style: {} };
  }
}

export interface BrandImageProps {
  src?: string;
  alt?: string;
  filter?: LogoFilter;
  customColor?: string;
  className?: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}

/** Renders a brand logo/icon and respects the chosen color filter. */
export const BrandImage: React.FC<BrandImageProps> = ({
  src,
  alt = "",
  filter = "none",
  customColor,
  className,
  fallback,
  style: extraStyle,
}) => {
  if (!src) return <>{fallback}</>;
  const { isMask, style } = getLogoImageStyle(filter, src, customColor);
  const merged = { ...style, ...extraStyle };
  if (isMask) {
    return <div role="img" aria-label={alt} className={cn(className)} style={merged} />;
  }
  return <img src={src} alt={alt} className={cn("object-contain", className)} style={merged} />;
};
