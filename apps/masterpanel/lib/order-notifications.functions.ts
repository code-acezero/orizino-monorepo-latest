import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";
import { broadcastToTelegram } from "@/lib/telegram.functions";

const RESEND_GATEWAY = "https://connector-gateway.lovable.dev/resend";
const FROM_EMAIL = "Orizino <orders@orizino.com>";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function fmtBDT(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  return `৳${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

async function sendEmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  if (!lovableKey || !resendKey) {
    console.warn("[order-email] missing LOVABLE_API_KEY or RESEND_API_KEY");
    return { skipped: true };
  }
  const res = await fetch(`${RESEND_GATEWAY}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": resendKey,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn("[order-email] failed", res.status, data);
    return { ok: false, error: data };
  }
  return { ok: true, id: data?.id };
}

export const notifyNewOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ order_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Use admin client for read (need order info regardless of RLS scope)
    const sb = hasSupabaseAdminCredentials() ? supabaseAdmin : (context.supabase as any);

    const { data: order, error } = await (sb as any)
      .from("orders")
      .select("id, order_number, status, total, subtotal, shipping_fee, payment_method, shipping_address, user_id, notes, created_at")
      .eq("id", data.order_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("Order not found");

    const { data: items } = await (sb as any)
      .from("order_items")
      .select("product_name, quantity, unit_price, total_price")
      .eq("order_id", order.id);

    const addr = order.shipping_address ?? {};
    const itemLines = (items ?? [])
      .map((i: any) => `• ${escapeHtml(i.product_name)} × ${i.quantity} — ${fmtBDT(i.total_price)}`)
      .join("\n");

    // --- Telegram broadcast ---
    const tgText =
      `🛒 <b>New order ${escapeHtml(order.order_number)}</b>\n` +
      `<b>Customer:</b> ${escapeHtml(addr.full_name || "-")} (${escapeHtml(addr.phone || "-")})\n` +
      `<b>Address:</b> ${escapeHtml([addr.street, addr.area, addr.city].filter(Boolean).join(", "))}\n` +
      `<b>Payment:</b> ${escapeHtml(order.payment_method)}\n` +
      `<b>Total:</b> ${fmtBDT(order.total)} (sub ${fmtBDT(order.subtotal)} + ship ${fmtBDT(order.shipping_fee)})\n\n` +
      `<b>Items:</b>\n${itemLines || "—"}` +
      (order.notes ? `\n\n<b>Notes:</b> ${escapeHtml(order.notes)}` : "");

    const tg = await broadcastToTelegram(sb, "notify_orders", tgText).catch((e) => {
      console.warn("[notify-order] telegram broadcast failed", e);
      return { sent: 0, failed: 0 };
    });

    // --- Customer email ---
    let email: any = { skipped: true };
    if (order.user_id && hasSupabaseAdminCredentials()) {
      const { data: u } = await (supabaseAdmin as any).auth.admin.getUserById(order.user_id);
      const to = u?.user?.email;
      if (to) {
        const html = `
          <div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
            <h1 style="margin:0 0 16px;font-size:22px">Thanks for your order, ${escapeHtml(addr.full_name || "")}!</h1>
            <p>We've received your order <strong>${escapeHtml(order.order_number)}</strong> and will start preparing it shortly.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
              <thead><tr><th align="left" style="border-bottom:1px solid #eee;padding:8px 0">Item</th><th align="right" style="border-bottom:1px solid #eee;padding:8px 0">Total</th></tr></thead>
              <tbody>
                ${(items ?? []).map((i: any) => `<tr><td style="padding:8px 0">${escapeHtml(i.product_name)} × ${i.quantity}</td><td align="right">${fmtBDT(i.total_price)}</td></tr>`).join("")}
              </tbody>
              <tfoot>
                <tr><td style="padding-top:8px">Subtotal</td><td align="right">${fmtBDT(order.subtotal)}</td></tr>
                <tr><td>Shipping</td><td align="right">${fmtBDT(order.shipping_fee)}</td></tr>
                <tr><td style="padding-top:8px;font-weight:600">Total</td><td align="right" style="font-weight:600">${fmtBDT(order.total)}</td></tr>
              </tfoot>
            </table>
            <p style="color:#666;font-size:13px">Payment method: ${escapeHtml(order.payment_method)}</p>
            <p style="color:#666;font-size:13px">— The Orizino team</p>
          </div>`;
        email = await sendEmail(to, `Order ${order.order_number} confirmed`, html);
      }
    }

    return { telegram: tg, email };
  });
