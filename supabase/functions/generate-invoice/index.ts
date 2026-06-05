// Generates an HTML invoice for an order. Optionally emails it via Resend.
// Body: { order_id: string, send_email?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function esc(s: any): string {
  return String(s ?? "").replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&#39;", '"': "&quot;" }[c]!));
}

function money(n: any): string {
  const v = Number(n || 0);
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface InvoiceOpts {
  invoice_prefix: string;
  accent_color: string;
  footer_note: string;
  terms: string;
  show_tax_line: boolean;
  show_paid_stamp: boolean;
  tax_rate: number;
}

function buildHtml(
  order: any,
  items: any[],
  profile: any,
  brand: { name: string; addr: string; email: string },
  opts: InvoiceOpts,
): string {
  const addr = order.shipping_address || {};
  const accent = esc(opts.accent_color || "#B8902F");
  const rows = items.map((it, i) => `
    <tr style="background:${i % 2 ? "#FBF8F1" : "#fff"}">
      <td>${esc(it.product_name)}</td>
      <td style="text-align:center">${it.quantity}</td>
      <td style="text-align:right">${money(it.unit_price)}</td>
      <td style="text-align:right;font-weight:600">${money(it.total_price)}</td>
    </tr>`).join("");

  const isPaid = String(order.payment_status || "").toLowerCase() === "paid"
    || String(order.status || "").toLowerCase() === "delivered";
  const invoiceNumber = `${opts.invoice_prefix}-${esc(order.order_number)}`;
  const subtotal = Number(order.subtotal || 0);
  const taxAmount = opts.show_tax_line && opts.tax_rate > 0
    ? subtotal * (opts.tax_rate / 100)
    : 0;
  const fullAddr = [addr.address_line1, addr.address_line2, addr.address, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).map(esc).join(", ");

  return `<!doctype html><html><head><meta charset="utf-8"><title>Invoice ${esc(invoiceNumber)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box}
    body{font-family:'Inter',-apple-system,Segoe UI,Roboto,sans-serif;color:#14110F;margin:0;padding:48px 40px;max-width:880px;margin:auto;background:#fff;position:relative;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .serif{font-family:'Cormorant Garamond',Georgia,serif}
    .topbar{height:6px;background:linear-gradient(90deg,${accent},#E4C879 55%,${accent});border-radius:99px;margin-bottom:36px}
    .head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px}
    .brand-name{font-size:34px;font-weight:700;letter-spacing:.5px;margin:0;line-height:1}
    .muted{color:#6B6B6B;font-size:13px;line-height:1.6}
    .doc-title{font-size:46px;font-weight:700;color:${accent};margin:0;line-height:1;letter-spacing:1px}
    .tag{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#9a9a9a;margin-top:4px}
    .inv-no{font-size:15px;font-weight:700;margin-top:10px}
    .status{display:inline-block;margin-top:8px;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent}}
    .rule{height:1px;background:${accent};opacity:.5;margin:30px 0}
    .info{display:flex;gap:16px;margin-bottom:8px}
    .info .box{flex:1;background:#FBF8F1;border-radius:12px;padding:18px 20px}
    .lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin-bottom:8px}
    .strong{font-weight:700;font-size:15px}
    table.items{width:100%;border-collapse:collapse;margin-top:8px;border-radius:10px;overflow:hidden}
    table.items thead th{background:#14110F;color:#fff;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:12px 14px;text-align:left}
    table.items td{padding:13px 14px;border-bottom:1px solid #EFEBE0;font-size:14px}
    .section-lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${accent};margin:32px 0 6px}
    .totals{margin-top:18px;width:320px;margin-left:auto;border-collapse:collapse}
    .totals td{padding:7px 4px;font-size:14px;color:#6B6B6B}
    .totals td.v{text-align:right;color:#14110F}
    .totals tr.grand td{background:#14110F;color:#fff;font-weight:700;font-size:17px;padding:14px 16px;border-radius:8px}
    .totals tr.grand td.v{color:${accent}}
    .footer{text-align:center;margin-top:48px}
    .footer .ty{font-size:18px;font-style:italic}
    .terms{margin-top:28px;padding-top:14px;border-top:1px solid #EFEBE0;font-size:11px;color:#888;line-height:1.6}
    @media print{body{padding:24px}}
  </style></head><body>
    <div class="topbar"></div>
    <div class="head">
      <div>
        <h1 class="brand-name serif">${esc(brand.name)}</h1>
        <div class="muted" style="margin-top:8px">${esc(brand.addr)}</div>
        <div class="muted">${esc(brand.email)}</div>
      </div>
      <div style="text-align:right">
        <h1 class="doc-title serif">INVOICE</h1>
        <div class="tag">Tax Invoice</div>
        <div class="inv-no">No. ${esc(invoiceNumber)}</div>
        <div class="muted">${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
        <div class="status">&#9670; ${esc(order.status)}</div>
      </div>
    </div>
    <div class="rule"></div>
    <div class="info">
      <div class="box">
        <div class="lbl">Billed To</div>
        <div class="strong">${esc(profile?.full_name || addr.full_name || addr.name || "Customer")}</div>
        <div class="muted" style="margin-top:6px">${fullAddr || esc(addr.address || "")}</div>
        ${addr.phone ? `<div class="muted">Phone: ${esc(addr.phone)}</div>` : ""}
        ${addr.email ? `<div class="muted">${esc(addr.email)}</div>` : ""}
      </div>
      <div class="box">
        <div class="lbl">Payment</div>
        <div class="strong">${esc(String(order.payment_method || "—").toUpperCase())}</div>
        ${order.transaction_id ? `<div class="muted" style="margin-top:6px">Txn: ${esc(order.transaction_id)}</div>` : ""}
        <div class="muted" style="margin-top:6px;font-style:italic;color:${isPaid ? "#2F7D4F" : "#6B6B6B"}">${isPaid ? "Settled in full" : "Payment outstanding"}</div>
      </div>
    </div>
    <div class="section-lbl">Order Summary</div>
    <table class="items"><thead><tr><th>Description</th><th style="text-align:center">Qty</th><th style="text-align:right">Unit</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="totals"><tbody>
      <tr><td>Subtotal</td><td class="v">${money(subtotal)}</td></tr>
      ${taxAmount > 0 ? `<tr><td>Tax (${opts.tax_rate}%)</td><td class="v">${money(taxAmount)}</td></tr>` : ""}
      <tr><td>Shipping</td><td class="v">${money(order.shipping_fee)}</td></tr>
      ${order.coupon_discount ? `<tr><td>Discount (${esc(order.coupon_code)})</td><td class="v" style="color:#2F7D4F">−${money(order.coupon_discount)}</td></tr>` : ""}
      ${order.loyalty_discount ? `<tr><td>Loyalty Reward</td><td class="v" style="color:#2F7D4F">−${money(order.loyalty_discount)}</td></tr>` : ""}
      <tr class="grand"><td>Total Due</td><td class="v">${money(order.total)}</td></tr>
    </tbody></table>
    <div class="footer">
      <div class="rule" style="margin-bottom:18px"></div>
      <div class="ty serif">${esc(opts.footer_note || `Thank you for choosing ${brand.name}.`)}</div>
      <div class="muted" style="margin-top:6px">This is a computer-generated invoice and does not require a signature.</div>
    </div>
    ${opts.terms ? `<div class="terms"><strong>Terms &amp; Conditions</strong><br/>${esc(opts.terms)}</div>` : ""}
  </body></html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { order_id, send_email } = await req.json().catch(() => ({}));
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: order, error: orderErr } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: items } = await admin.from("order_items").select("*").eq("order_id", order_id);
    const { data: profile } = await admin.from("profiles").select("full_name").eq("id", (order as any).user_id).maybeSingle();

    // Brand info from site settings (best-effort)
    let brand = { name: "Orizino", addr: "", email: "team@orizino.com" };
    try {
      const { data: brandSet } = await admin.from("site_settings").select("value").eq("key", "brand_settings").maybeSingle();
      const v: any = brandSet?.value || {};
      brand = {
        name: v.brand_name || v.site_name || "Orizino",
        addr: v.address || "",
        email: v.support_email || "team@orizino.com",
      };
    } catch { /* ignore */ }

    // Invoice + tax options
    const opts = {
      invoice_prefix: "INV",
      accent_color: "#B8902F",
      footer_note: "",
      terms: "",
      show_tax_line: true,
      show_paid_stamp: true,
      tax_rate: 0,
    };
    try {
      const { data: settingsRows } = await admin
        .from("site_settings")
        .select("key, value")
        .in("key", ["invoice_settings", "invoice_prefix", "tax_rate"]);
      for (const row of settingsRows || []) {
        const v: any = (row as any).value?.value ?? (row as any).value;
        if ((row as any).key === "invoice_settings" && v && typeof v === "object") {
          Object.assign(opts, v);
        } else if ((row as any).key === "invoice_prefix" && v) {
          opts.invoice_prefix = String(v);
        } else if ((row as any).key === "tax_rate" && v != null) {
          opts.tax_rate = Number(v) || 0;
        }
      }
    } catch { /* ignore */ }

    const invoice_html = buildHtml(order, items || [], profile, brand, opts);

    let emailed = false;
    let emailError: string | null = null;
    if (send_email && RESEND_API_KEY) {
      const addr: any = (order as any).shipping_address || {};
      const recipient = addr.email || null;
      if (!recipient) {
        emailError = "No recipient email on order";
      } else {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: `${brand.name} <${brand.email}>`,
            to: [recipient],
            subject: `Invoice for order #${(order as any).order_number}`,
            html: invoice_html,
          }),
        });
        if (res.ok) {
          emailed = true;
        } else {
          emailError = `Resend ${res.status}: ${await res.text()}`;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, invoice_html, emailed, emailError }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-invoice error:", e);
    return new Response(JSON.stringify({ error: e?.message || "internal" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});