import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (secret) {
    const sig = request.headers.get("svix-signature") || request.headers.get("webhook-signature") || "";
    try {
      const expected = createHmac("sha256", secret).update(body).digest("base64");
      const provided = sig.split(",").pop() ?? "";
      if (!provided || !timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) {
        return new Response("invalid signature", { status: 401 });
      }
    } catch {
      return new Response("invalid signature", { status: 401 });
    }
  }
  const payload = JSON.parse(body) as { type?: string; data?: { email_id?: string; to?: string[]; created_at?: string } };
  const SUPABASE_URL = process.env.SUPABASE_URL!;
  const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!;
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const event = payload.type;
  const messageId = payload.data?.email_id;
  const recipient = payload.data?.to?.[0]?.toLowerCase();
  if (!messageId && !recipient) return NextResponse.json({ ok: true });
  const now = new Date().toISOString();
  const mapStatus: Record<string, string> = {
    "email.sent": "sent", "email.delivered": "delivered", "email.opened": "opened",
    "email.clicked": "clicked", "email.bounced": "bounced", "email.complained": "bounced",
    "email.delivery_delayed": "sent",
  };
  const newStatus = event ? mapStatus[event] : undefined;
  const update: Record<string, string> = {};
  if (newStatus) update.status = newStatus;
  if (event === "email.delivered") update.delivered_at = now;
  if (event === "email.opened") update.opened_at = now;
  if (event === "email.clicked") update.clicked_at = now;
  if (event === "email.bounced" || event === "email.complained") update.bounced_at = now;
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });
  const query = admin.from("email_campaign_recipients").update(update);
  const { data: updated } = messageId
    ? await query.eq("provider_message_id", messageId).select("campaign_id, email")
    : await query.eq("email", recipient!).select("campaign_id, email");
  if (updated && updated.length > 0) {
    const counterField = event === "email.opened" ? "opened_count" : event === "email.clicked" ? "clicked_count"
      : event === "email.delivered" ? "delivered_count"
      : event === "email.bounced" || event === "email.complained" ? "bounced_count" : null;
    if (counterField) {
      const campaignIds = [...new Set(updated.map((r: any) => r.campaign_id))];
      for (const cid of campaignIds) {
        await admin.rpc("increment_campaign_counter", { _campaign_id: cid, _field: counterField }).then(() => {}, () => {});
      }
    }
    if (event === "email.bounced" || event === "email.complained") {
      for (const row of updated as any[]) {
        await admin.from("email_suppressions").upsert(
          { email: row.email, reason: event === "email.complained" ? "complaint" : "bounce" },
          { onConflict: "email" }
        );
      }
    }
  }
  return NextResponse.json({ ok: true });
}
