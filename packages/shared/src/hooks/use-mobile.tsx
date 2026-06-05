"use client";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    // Use modern addEventListener, fall back to deprecated addListener for old browsers
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      // @ts-ignore — legacy Safari / older browsers
      mql.addListener(onChange);
    }
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        // @ts-ignore
        mql.removeListener(onChange);
      }
    };
  }, []);

  return !!isMobile;
}
