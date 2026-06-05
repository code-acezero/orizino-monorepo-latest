"use client";
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@orizino/supabase/client";

// Generate a simple session ID per browser tab
const getSessionId = () => {
  let id = sessionStorage.getItem("analytics_session_id");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("analytics_session_id", id);
  }
  return id;
};

/**
 * Send an analytics event through the edge function for geo-enrichment.
 * Falls back to direct insert if the edge function is unavailable.
 */
const trackViaEdge = async (payload: Record<string, any>) => {
  try {
    const { error } = await supabase.functions.invoke("track-visit", {
      body: { ...payload, session_id: getSessionId() },
    });
    if (error) throw error;
  } catch {
    // Fallback: direct insert without geo data
    try {
      await (supabase as any).from("page_analytics").insert({
        ...payload,
        session_id: getSessionId(),
      });
    } catch {
      // silently fail — analytics should never break the app
    }
  }
};

/** Parse basic device/browser info from user agent */
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let browser = "Other";
  if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("OPR/") || ua.includes("Opera")) browser = "Opera";
  else if (ua.includes("Chrome/") && !ua.includes("Edg/")) browser = "Chrome";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let os = "Other";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux") && !ua.includes("Android")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (/iPhone|iPad|iPod/.test(ua)) os = "iOS";

  let device = "Desktop";
  if (/Mobi|Android/i.test(ua)) device = "Mobile";
  else if (/Tablet|iPad/i.test(ua)) device = "Tablet";

  return { browser, os, device };
};

/** Track a page view event (geo-enriched via edge function) */
export const trackPageView = async (page: string) => {
  const { browser, os, device } = getDeviceInfo();
  await trackViaEdge({
    event_type: "page_view",
    page,
    metadata: { browser, os, device_type: device },
  });
};

/** Track a section becoming visible (engagement) */
export const trackSectionView = async (sectionId: string, page = "/home") => {
  try {
    await (supabase as any).from("page_analytics").insert({
      event_type: "section_view",
      page,
      section_id: sectionId,
      session_id: getSessionId(),
    });
  } catch {
    // silently fail
  }
};

/** Track how long a section stays visible */
export const trackSectionDuration = async (
  sectionId: string,
  durationMs: number,
  page = "/home"
) => {
  if (durationMs < 500) return; // ignore very short views
  try {
    await (supabase as any).from("page_analytics").insert({
      event_type: "section_engagement",
      page,
      section_id: sectionId,
      duration_ms: Math.round(durationMs),
      session_id: getSessionId(),
    });
  } catch {
    // silently fail
  }
};

/** Track a click event (CTA, product card, link, etc.) — geo-enriched */
export const trackClick = async (
  clickType: string,
  targetId: string,
  page = "/home",
  metadata?: Record<string, any>
) => {
  await trackViaEdge({
    event_type: "click",
    page,
    section_id: clickType,
    metadata: { target_id: targetId, click_type: clickType, ...metadata },
  });
};

/**
 * Hook: observe when a section scrolls into view and track engagement.
 * Returns a ref to attach to the section container.
 */
export const useSectionTracker = (sectionId: string, page = "/home") => {
  const ref = useRef<HTMLDivElement | null>(null);
  const trackedRef = useRef(false);
  const visibleSince = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Section entered viewport
          if (!trackedRef.current) {
            trackedRef.current = true;
            trackSectionView(sectionId, page);
          }
          visibleSince.current = Date.now();
        } else if (visibleSince.current) {
          // Section left viewport — track duration
          const duration = Date.now() - visibleSince.current;
          trackSectionDuration(sectionId, duration, page);
          visibleSince.current = null;
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      // Track remaining duration on unmount
      if (visibleSince.current) {
        const duration = Date.now() - visibleSince.current;
        trackSectionDuration(sectionId, duration, page);
      }
    };
  }, [sectionId, page]);

  return ref;
};

/** Hook: track page view on mount (once per page load) */
export const usePageViewTracker = (page: string) => {
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current) {
      tracked.current = true;
      trackPageView(page);
    }
  }, [page]);
};
