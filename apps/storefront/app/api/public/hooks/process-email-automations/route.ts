import { createClient } from "@supabase/supabase-js";
import { sendBatch } from "@/lib/resend.server";
import { validateCronOrigin } from "@/lib/cron-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const wrongHost = validateCronOrigin(request as any);
  if (wrongHost) return wrongHost;
  const provided = request.headers.get("apikey") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!expected || provided !== expected) return new Response("unauthorized", { status: 401 });
  const sb = createClient(process.env.SUPABASE_URL!, (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY)!, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: events } = await sb.from("email_automation_events").select("*").is("processed_at", null).order("created_at").limit(50);
  const processed: string[] = [];
  for (const ev of events ?? []) {
    const { data: rules } = await sb.from("email_automations").select("*, template:email_templates(*)").eq("event", ev.event).eq("is_active", true);
    for (const rule of rules ?? []) {
      if (!rule.template) continue;
      const now = new Date();
      const hour = now.getHours();
      if (rule.quiet_hours_start != null && rule.quiet_hours_end != null) {
        const s = rule.quiet_hours_start, e = rule.quiet_hours_end;
        const inQuiet = s <= e ? (hour >= s && hour < e) : (hour >= s || hour < e);
        if (inQuiet) continue;
      }
      const tpl: any = rule.template;
      const subject = rule.subject_override || tpl.subject || ev.payload?.title || ev.payload?.subject || "Update";
      const html = (tpl.html || "").replace(/\{\{\s*(\w+)\s*\}\}/g, (_: any, k: string) => { const v = (ev.payload ?? {})[k]; return v == null ? "" : String(v); });
      if (rule.audience_type === "staff_support") {
        const { data: roles } = await sb.from("user_roles").select("user_id").in("role", ["admin", "moderator", "support"]);
        const ids = Array.from(new Set((roles ?? []).map((r: any) => r.user_id as string)));
        if (ids.length > 0) {
          const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
          const emails = (list?.users ?? []).filter((u: any) => u.email && ids.includes(u.id)).map((u: any) => u.email as string);
          if (emails.length > 0) {
            await sendBatch(emails.map((to: string) => ({ from: "Support <contact@orizino.com>", to: [to], subject, html })));
          }
        }
      } else {
        const scheduleAt = new Date(Date.now() + (rule.delay_minutes ?? 0) * 60_000).toISOString();
        await sb.from("email_campaigns").insert({ name: `[Auto] ${rule.name}`, subject, html, template_id: tpl.id, audience_type: rule.audience_type, audience_filter: {}, status: "scheduled", schedule_at: scheduleAt });
      }
      await sb.from("email_automations").update({ last_run_at: now.toISOString(), run_count: (rule.run_count ?? 0) + 1 }).eq("id", rule.id);
    }
    await sb.from("email_automation_events").update({ processed_at: new Date().toISOString() }).eq("id", ev.id);
    processed.push(ev.id);
  }
  return NextResponse.json({ ok: true, processed: processed.length });
}
