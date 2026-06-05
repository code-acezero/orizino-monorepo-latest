// Archives an order's invoice or shipping sticker to Google Docs via the Lovable connector gateway.
// Body: { order_id: string, doc_type: "invoice" | "sticker", trigger_reason?: string, export_pdf?: boolean }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-trigger",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_DOCS_API_KEY = Deno.env.get("GOOGLE_DOCS_API_KEY");
const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");

const DOCS_GATEWAY = "https://connector-gateway.lovable.dev/google_docs/v1";
const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/v3";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function money(n: any): string {
  return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTemplate(tpl: string, ctx: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) => ctx[k] ?? "");
}

interface GReq {
  insertText?: { text: string; location: { index: number } };
  updateTextStyle?: {
    range: { startIndex: number; endIndex: number };
    textStyle: Record<string, any>;
    fields: string;
  };
  updateParagraphStyle?: {
    range: { startIndex: number; endIndex: number };
    paragraphStyle: Record<string, any>;
    fields: string;
  };
}

function buildInvoiceDoc(order: any, items: any[], brand: any) {
  const addr = order.shipping_address || {};
  const lines: { text: string; style?: "h1" | "h2" | "bold" | "muted" }[] = [];
  lines.push({ text: `${brand.name} — INVOICE`, style: "h1" });
  lines.push({ text: `Invoice #${order.order_number}`, style: "h2" });
  lines.push({ text: `Date: ${new Date(order.created_at).toLocaleDateString()}`, style: "muted" });
  lines.push({ text: `Status: ${String(order.status || "").toUpperCase()}`, style: "muted" });
  lines.push({ text: "" });
  lines.push({ text: "Bill To", style: "bold" });
  lines.push({ text: `${addr.full_name || addr.name || ""}` });
  if (addr.phone) lines.push({ text: `Phone: ${addr.phone}` });
  if (addr.email) lines.push({ text: `Email: ${addr.email}` });
  const fullAddr = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(", ");
  if (fullAddr) lines.push({ text: fullAddr });
  lines.push({ text: "" });
  lines.push({ text: "Items", style: "bold" });
  for (const it of items) {
    lines.push({ text: `• ${it.product_name}  ×${it.quantity}  @ ${money(it.unit_price)}  =  ${money(it.total_price)}` });
  }
  lines.push({ text: "" });
  lines.push({ text: `Subtotal:   ${money(order.subtotal)}` });
  if (order.shipping_fee) lines.push({ text: `Shipping:   ${money(order.shipping_fee)}` });
  if (order.coupon_discount) lines.push({ text: `Discount:  -${money(order.coupon_discount)}` });
  if (order.loyalty_discount) lines.push({ text: `Loyalty:   -${money(order.loyalty_discount)}` });
  lines.push({ text: `TOTAL:      ${money(order.total)}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Thank you for shopping with ${brand.name}.`, style: "muted" });
  return lines;
}

function buildStickerDoc(order: any, brand: any) {
  const addr = order.shipping_address || {};
  const lines: { text: string; style?: "h1" | "h2" | "bold" | "muted" }[] = [];
  lines.push({ text: `SHIPPING LABEL`, style: "h1" });
  lines.push({ text: `Order #${order.order_number}`, style: "h2" });
  lines.push({ text: "" });
  lines.push({ text: "FROM:", style: "bold" });
  lines.push({ text: brand.name });
  if (brand.addr) lines.push({ text: brand.addr });
  lines.push({ text: "" });
  lines.push({ text: "DELIVER TO:", style: "bold" });
  lines.push({ text: `${addr.full_name || addr.name || ""}`, style: "bold" });
  const fullAddr = [addr.address_line1, addr.address_line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(", ");
  if (fullAddr) lines.push({ text: fullAddr });
  if (addr.phone) lines.push({ text: `Phone: ${addr.phone}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Method: ${String(order.payment_method || "").toUpperCase()}` });
  lines.push({ text: `COD Amount: ${order.status === "paid" ? "0.00" : money(order.total)}`, style: "bold" });
  lines.push({ text: "" });
  lines.push({ text: `Tracking: ${order.tracking_number || "—"}`, style: "muted" });
  return lines;
}

function linesToRequests(lines: { text: string; style?: string }[]): GReq[] {
  const reqs: GReq[] = [];
  let idx = 1;
  for (const ln of lines) {
    const text = (ln.text || "") + "\n";
    reqs.push({ insertText: { text, location: { index: idx } } });
    const start = idx;
    const end = idx + text.length - 1;
    if (ln.style === "h1") {
      reqs.push({ updateParagraphStyle: { range: { startIndex: start, endIndex: end + 1 }, paragraphStyle: { namedStyleType: "HEADING_1" }, fields: "namedStyleType" } });
    } else if (ln.style === "h2") {
      reqs.push({ updateParagraphStyle: { range: { startIndex: start, endIndex: end + 1 }, paragraphStyle: { namedStyleType: "HEADING_2" }, fields: "namedStyleType" } });
    } else if (ln.style === "bold" && end > start) {
      reqs.push({ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: { bold: true }, fields: "bold" } });
    } else if (ln.style === "muted" && end > start) {
      reqs.push({ updateTextStyle: { range: { startIndex: start, endIndex: end }, textStyle: { foregroundColor: { color: { rgbColor: { red: 0.4, green: 0.4, blue: 0.4 } } } }, fields: "foregroundColor" } });
    }
    idx += text.length;
  }
  return reqs;
}

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (e: any) {
      lastErr = e;
      const msg = String(e?.message || e);
      const status = Number((msg.match(/\b(\d{3})\b/) || [])[1] || 0);
      // Don't retry client errors except 408/429
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
      if (i === attempts - 1) break;
      const delay = 400 * Math.pow(2, i) + Math.floor(Math.random() * 200);
      console.warn(`[${label}] attempt ${i + 1} failed: ${msg}; retry in ${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function gFetch(gateway: string, path: string, apiKey: string, init: RequestInit) {
  const res = await fetch(`${gateway}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": apiKey,
      ...(init.body && !(init.headers as any)?.["Content-Type"] ? { "Content-Type": "application/json" } : {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text.slice(0, 400)}`);
  return text ? JSON.parse(text) : {};
}

async function audit(actorId: string | null, action: string, entityId: string, meta: Record<string, unknown>) {
  try {
    await admin.from("staff_audit_log").insert({
      actor_id: actorId,
      action,
      entity: "order_documents",
      entity_id: entityId,
      meta,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured", code: "config_missing" });
    if (!GOOGLE_DOCS_API_KEY) return json(412, { error: "Google Docs connection not linked", code: "gdocs_not_connected" });

    const authHeader = req.headers.get("Authorization") || "";
    const internal = req.headers.get("x-internal-trigger") === "1";
    let actorId: string | null = null;

    if (!internal) {
      const token = authHeader.replace("Bearer ", "");
      if (!token) return json(401, { error: "Unauthorized", code: "no_auth" });
      const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await authClient.auth.getUser();
      if (!user) return json(401, { error: "Unauthorized", code: "bad_token" });
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      const isStaff = (roles || []).some((r: any) => r.role === "admin" || r.role === "moderator");
      if (!isStaff) return json(403, { error: "Forbidden", code: "not_staff" });
      actorId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const { order_id, doc_type, trigger_reason = "manual", export_pdf = false } = body;
    if (!order_id || !["invoice", "sticker"].includes(doc_type)) {
      return json(400, { error: "Invalid input", code: "bad_input" });
    }

    // Skip duplicate auto-archive for the same reason
    if (trigger_reason !== "manual") {
      const { data: existing } = await admin
        .from("order_documents")
        .select("id")
        .eq("order_id", order_id)
        .eq("doc_type", doc_type)
        .eq("trigger_reason", trigger_reason)
        .eq("status", "archived")
        .maybeSingle();
      if (existing) return json(200, { ok: true, skipped: "already_archived", document_id: existing.id });
    }

    const { data: order, error: oErr } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (oErr) return json(500, { error: oErr.message, code: "db_error" });
    if (!order) return json(404, { error: "Order not found", code: "not_found" });

    const { data: items } = await admin.from("order_items").select("*").eq("order_id", order_id);

    let brand = { name: "Orizino", addr: "", email: "team@orizino.com" };
    let settings: any = {};
    try {
      const [{ data: b }, { data: g }] = await Promise.all([
        admin.from("site_settings").select("value").eq("key", "brand_settings").maybeSingle(),
        admin.from("site_settings").select("value").eq("key", "gdocs_settings").maybeSingle(),
      ]);
      const v: any = b?.value || {};
      brand = { name: v.brand_name || v.site_name || "Orizino", addr: v.address || "", email: v.support_email || "team@orizino.com" };
      settings = g?.value || {};
    } catch {}

    const addr: any = order.shipping_address || {};
    const ctx: Record<string, string> = {
      order_number: order.order_number || "",
      brand_name: brand.name,
      customer_name: addr.full_name || addr.name || "",
      status: order.status || "",
      total: money(order.total),
      date: new Date(order.created_at).toLocaleDateString(),
      trigger: trigger_reason,
    };

    const defaultTitles: Record<string, string> = {
      invoice: "Invoice — {{order_number}} — {{brand_name}}",
      sticker: "Shipping Label — {{order_number}} — {{customer_name}}",
    };
    const tpl = settings[`${doc_type}_title_template`] || defaultTitles[doc_type];
    const title = renderTemplate(tpl, ctx).trim() || `${doc_type} ${order.order_number}`;

    const lines = doc_type === "invoice"
      ? buildInvoiceDoc(order, items || [], brand)
      : buildStickerDoc(order, brand);

    // 1. Create the doc with retry
    const created = await withRetry("docs.create", () =>
      gFetch(DOCS_GATEWAY, `/documents`, GOOGLE_DOCS_API_KEY, {
        method: "POST",
        body: JSON.stringify({ title }),
      }),
    );
    const documentId: string = created.documentId;

    // 2. Insert content
    const requests = linesToRequests(lines);
    if (requests.length) {
      await withRetry("docs.batchUpdate", () =>
        gFetch(DOCS_GATEWAY, `/documents/${documentId}:batchUpdate`, GOOGLE_DOCS_API_KEY, {
          method: "POST",
          body: JSON.stringify({ requests }),
        }),
      );
    }

    // 3. Move to folder (if configured & drive connected)
    const folders = settings.folders || {};
    const folderId: string | undefined = folders[trigger_reason] || folders[order.status] || undefined;
    if (folderId && GOOGLE_DRIVE_API_KEY) {
      try {
        await withRetry("drive.move", () =>
          gFetch(DRIVE_GATEWAY, `/files/${documentId}?addParents=${encodeURIComponent(folderId)}&supportsAllDrives=true&fields=id,parents`, GOOGLE_DRIVE_API_KEY, {
            method: "PATCH",
            body: JSON.stringify({}),
          }),
        );
      } catch (e) {
        console.warn("drive move failed:", e);
      }
    }

    // 4. Optional PDF export
    let pdfUrl: string | null = null;
    if (export_pdf && GOOGLE_DRIVE_API_KEY) {
      try {
        pdfUrl = `https://docs.google.com/document/d/${documentId}/export?format=pdf`;
      } catch (e) {
        console.warn("pdf export failed:", e);
      }
    }

    const docUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    const { data: saved, error: insErr } = await admin.from("order_documents").insert({
      order_id,
      doc_type,
      provider: "google_docs",
      external_doc_id: documentId,
      external_url: docUrl,
      title,
      created_by: actorId,
      trigger_reason,
      folder_id: folderId || null,
      status: "archived",
      pdf_url: pdfUrl,
    }).select().single();
    if (insErr) throw new Error(insErr.message);

    await audit(actorId, "gdocs_archive", saved.id, { order_id, doc_type, trigger_reason, document_id: documentId, title });

    return json(200, { ok: true, document: saved });
  } catch (e: any) {
    console.error("archive-to-gdocs error:", e);
    const msg = String(e?.message || "internal");
    const status = Number((msg.match(/Gateway (\d{3})/) || [])[1] || 0);
    return json(status >= 400 && status < 600 ? status : 500, {
      error: msg,
      code: status === 401 ? "gdocs_auth" : status === 429 ? "rate_limit" : "internal",
    });
  }
});
