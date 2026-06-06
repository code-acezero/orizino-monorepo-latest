"use client";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function FaviconSync() {
  const { data: faviconUrl } = useQuery({
    queryKey: ["site-favicon-url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "favicon_url")
        .maybeSingle();
      if (!data?.value) return null;
      const v = data.value;
      return typeof v === "object" && v !== null ? (v as any).value ?? null : String(v);
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!faviconUrl) return;
    const setLink = (rel: string, type?: string) => {
      let el = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!el) {
        el = document.createElement("link");
        el.rel = rel;
        document.head.appendChild(el);
      }
      el.href = faviconUrl;
      if (type) el.type = type;
    };
    setLink("icon", "image/png");
    setLink("shortcut icon");
    setLink("apple-touch-icon");
  }, [faviconUrl]);

  return null;
}
