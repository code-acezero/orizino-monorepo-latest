// Syncs shipment tracking for a single order from Pathao + Steadfast APIs.
// Body: { orderId: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Pathao
async function getPathaoToken(env: "sandbox" | "live"): Promise<string | null> {
  const prefix = env === "live" ? "PATHAO_LIVE" : "PATHAO_SANDBOX";
  const client_id = Deno.env.get(`${prefix}_CLIENT_ID`);
  const client_secret = Deno.env.get(`${prefix}_CLIENT_SECRET`);
  const username = Deno.env.get(`${prefix}_USERNAME`);
  const password = Deno.env.get(`${prefix}_PASSWORD`);
  if (!client_id || !client_secret || !username || !password) return null;
  const host = env === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";
  const res = await fetch(`${host}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id, client_secret, username, password, grant_type: "password" }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.access_token || null;
}

async function syncPathao(row: any): Promise<{ updated: boolean; status?: string; error?: string }> {
  const env = (row.environment === "live" ? "live" : "sandbox") as "live" | "sandbox";
  const token = await getPathaoToken(env);
  if (!token) return { updated: false, error: "pathao token unavailable" };
  const host = env === "live" ? "https://api-hermes.pathao.com" : "https://courier-api-sandbox.pathao.com";
  const res = await fetch(`${host}/aladdin/api/v1/orders/${row.consignment_id}/info`, {
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) return { updated: false, error: `pathao ${res.status}` };
  const json = await res.json();
  const d = json?.data || {};
  const status = d.order_status || d.status || row.order_status;
  const status_slug = d.order_status_slug || d.status_slug || row.order_status_slug;
  await admin.from("pathao_shipments").update({
    order_status: status,
    order_status_slug: status_slug,
    raw_response: json,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
  return { updated: true, status };
}

async function syncSteadfast(row: any): Promise<{ updated: boolean; status?: string; error?: string }> {
  const api_key = Deno.env.get("STEADFAST_API_KEY");
  const secret = Deno.env.get("STEADFAST_SECRET_KEY");
  if (!api_key || !secret) return { updated: false, error: "steadfast keys missing" };
  const res = await fetch(`https://portal.packzy.com/api/v1/status_by_cid/${row.consignment_id}`, {
    headers: { "Api-Key": api_key, "Secret-Key": secret, "Content-Type": "application/json" },
  });
  if (!res.ok) return { updated: false, error: `steadfast ${res.status}` };
  const json = await res.json();
  const status = json.delivery_status || json.status || row.status;
  await admin.from("steadfast_shipments").update({
    status,
    tracking_message: json.message || row.tracking_message,
    raw_response: json,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", row.id);
  return { updated: true, status };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { orderId } = await req.json().catch(() => ({}));
    if (!orderId) {
      return new Response(JSON.stringify({ error: "orderId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: any = { pathao: [], steadfast: [] };

    const { data: pRows } = await admin.from("pathao_shipments").select("*").eq("order_id", orderId);
    for (const r of pRows || []) {
      const out = await syncPathao(r).catch((e) => ({ updated: false, error: String(e?.message || e) }));
      results.pathao.push({ consignment_id: r.consignment_id, ...out });
    }

    const { data: sRows } = await admin.from("steadfast_shipments").select("*").eq("order_id", orderId);
    for (const r of sRows || []) {
      const out = await syncSteadfast(r).catch((e) => ({ updated: false, error: String(e?.message || e) }));
      results.steadfast.push({ consignment_id: r.consignment_id, ...out });
    }

    const total = results.pathao.length + results.steadfast.length;
    return new Response(JSON.stringify({ ok: true, total, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("sync-shipments error:", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});