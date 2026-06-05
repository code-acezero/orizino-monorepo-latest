// OG image generator — returns an SVG suitable for og:image / twitter:image.
// Public endpoint, no auth. ?type=product|category&slug=...
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function escapeXml(s: string): string {
  return s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c]!));
}

function svgCard(title: string, subtitle: string, accent = "#6366f1"): string {
  const t = escapeXml(title.slice(0, 80));
  const s = escapeXml(subtitle.slice(0, 140));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0b1020"/>
      <stop offset="100%" stop-color="${accent}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="510" rx="32" fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.12)"/>
  <text x="110" y="220" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="64" font-weight="800" fill="#ffffff">${t}</text>
  <text x="110" y="310" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="30" font-weight="400" fill="rgba(255,255,255,0.85)">${s}</text>
  <text x="110" y="540" font-family="system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial" font-size="24" font-weight="600" fill="rgba(255,255,255,0.7)" letter-spacing="2">ORIZINO</text>
</svg>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const type = (url.searchParams.get("type") || "page").toLowerCase();
    const slug = url.searchParams.get("slug") || "";

    let title = "Orizino";
    let subtitle = "Premium e-commerce";

    if (slug && type === "product") {
      const { data } = await admin.from("products").select("name, short_description, description").eq("slug", slug).maybeSingle();
      if (data) {
        title = (data as any).name;
        subtitle = ((data as any).short_description || (data as any).description || "").toString();
      }
    } else if (slug && type === "category") {
      const { data } = await admin.from("categories").select("name, description").eq("slug", slug).maybeSingle();
      if (data) {
        title = (data as any).name;
        subtitle = ((data as any).description || "Browse the collection").toString();
      }
    }

    const svg = svgCard(title, subtitle);
    return new Response(svg, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    return new Response(svgCard("Orizino", "Premium e-commerce"), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "image/svg+xml; charset=utf-8" },
    });
  }
});