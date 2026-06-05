// Exports a Google Doc as PDF via Drive API, uploads to Supabase storage, and updates order_documents.
// Body: { order_document_id: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GOOGLE_DRIVE_API_KEY = Deno.env.get("GOOGLE_DRIVE_API_KEY");

const DRIVE_GATEWAY = "https://connector-gateway.lovable.dev/google_drive/v3";
const BUCKET = "site-assets";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: any;
  for (let i = 0; i < attempts; i++) {
    try { return await fn(); } catch (e: any) {
      lastErr = e;
      const status = Number((String(e?.message || "").match(/\b(\d{3})\b/) || [])[1] || 0);
      if (status >= 400 && status < 500 && status !== 408 && status !== 429) throw e;
      if (i === attempts - 1) break;
      await new Promise((r) => setTimeout(r, 400 * Math.pow(2, i)));
      console.warn(`[${label}] retry ${i + 1}`);
    }
  }
  throw lastErr;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (!LOVABLE_API_KEY) return json(500, { error: "LOVABLE_API_KEY not configured", code: "config_missing" });
    if (!GOOGLE_DRIVE_API_KEY) return json(412, { error: "Google Drive not linked", code: "gdrive_not_connected" });

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json(401, { error: "Unauthorized" });
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json(401, { error: "Unauthorized" });
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isStaff = (roles || []).some((r: any) => r.role === "admin" || r.role === "moderator");
    if (!isStaff) return json(403, { error: "Forbidden" });

    const { order_document_id } = await req.json().catch(() => ({}));
    if (!order_document_id) return json(400, { error: "Missing order_document_id" });

    const { data: doc, error: dErr } = await admin.from("order_documents").select("*").eq("id", order_document_id).maybeSingle();
    if (dErr || !doc) return json(404, { error: "Document not found" });

    // Export via Drive
    const res = await withRetry("drive.export", async () => {
      const r = await fetch(`${DRIVE_GATEWAY}/files/${doc.external_doc_id}/export?mimeType=${encodeURIComponent("application/pdf")}`, {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_DRIVE_API_KEY,
        },
      });
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(`Gateway ${r.status}: ${txt.slice(0, 300)}`);
      }
      return r;
    });

    const buf = new Uint8Array(await res.arrayBuffer());
    const path = `order-docs/${doc.order_id}/${doc.doc_type}-${doc.id}.pdf`;
    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, buf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (upErr) throw new Error(`Storage upload failed: ${upErr.message}`);

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const pdfUrl = pub.publicUrl;

    await admin.from("order_documents").update({ pdf_url: pdfUrl }).eq("id", doc.id);

    await admin.from("staff_audit_log").insert({
      actor_id: user.id,
      action: "gdocs_export_pdf",
      entity: "order_documents",
      entity_id: doc.id,
      meta: { order_id: doc.order_id, doc_type: doc.doc_type, pdf_url: pdfUrl },
    });

    return json(200, { ok: true, pdf_url: pdfUrl });
  } catch (e: any) {
    console.error("gdocs-export-pdf error:", e);
    const msg = String(e?.message || "internal");
    const status = Number((msg.match(/Gateway (\d{3})/) || [])[1] || 0);
    return json(status >= 400 && status < 600 ? status : 500, { error: msg });
  }
});
