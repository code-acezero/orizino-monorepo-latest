// Notifies admin/staff via web push when a support conversation needs a human.
// Body: { conversation_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7?bundle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:team@orizino.com";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

try {
  (webpush as any).setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
} catch (e) {
  console.error("VAPID setup failed:", e);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { conversation_id } = await req.json().catch(() => ({}));
    if (!conversation_id) {
      return new Response(JSON.stringify({ error: "conversation_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark conversation as needing human
    await admin.from("support_conversations").update({ needs_human: true }).eq("id", conversation_id);

    // Fetch admin/staff user IDs
    const { data: roles } = await admin.from("user_roles").select("user_id").in("role", ["admin", "staff", "moderator"]);
    const adminIds = (roles || []).map((r: any) => r.user_id);
    if (adminIds.length === 0) {
      return new Response(JSON.stringify({ ok: true, sent: 0, reason: "no admins" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, user_id")
      .in("user_id", adminIds);

    const payload = JSON.stringify({
      title: "Live support requested",
      body: "A customer is asking for a human agent.",
      url: "/origin/support",
      tag: `support-${conversation_id}`,
    });

    let sent = 0;
    let failed = 0;
    for (const s of subs || []) {
      try {
        await (webpush as any).sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (e: any) {
        failed++;
        const sc = e?.statusCode;
        if (sc === 404 || sc === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    }

    // Also create an in-app notification
    await admin.from("notifications").insert(adminIds.map((uid: string) => ({
      user_id: uid,
      title: "Live support requested",
      message: "A customer is asking for a human agent.",
      type: "support",
      link_url: "/origin/support",
    })));

    return new Response(JSON.stringify({ ok: true, sent, failed }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("notify-live-support error:", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});