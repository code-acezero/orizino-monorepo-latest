"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Safe local implementation of useDynamicFavicon.
 * Replaces @orizino/shared version to avoid server-side matchMedia call.
 */
export function useDynamicFavicon() {
  const { data: iconUrl } = useQuery({
    queryKey: ["site-favicon"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "site_icon_url")
        .maybeSingle();
      const val = data?.value;
      return (typeof val === "string" ? val : (val as any)?.value as string) || null;
    },
    staleTime: 10 * 60 * 1000,
  });

  useEffect(() => {
    if (!iconUrl) return;
    // Update all favicon link tags
    const links = document.querySelectorAll<HTMLLinkElement>(
      "link[rel~='icon'], link[rel~='apple-touch-icon']"
    );
    links.forEach((link) => {
      link.href = iconUrl;
    });
    // Create one if none exist
    if (links.length === 0) {
      const link = document.createElement("link");
      link.rel = "icon";
      link.href = iconUrl;
      document.head.appendChild(link);
    }
  }, [iconUrl]);
}
