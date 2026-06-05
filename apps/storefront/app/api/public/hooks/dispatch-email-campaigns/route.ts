import { dispatchDueCampaigns } from "@/lib/email-campaigns.functions";
import { validateCronOrigin } from "@/lib/cron-guard";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const wrongHost = validateCronOrigin(request as any);
  if (wrongHost) return wrongHost;
  const provided = request.headers.get("apikey") || request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if (!expected || provided !== expected) return new Response("unauthorized", { status: 401 });
  try {
    const out = await dispatchDueCampaigns();
    return NextResponse.json({ ok: true, processed: out.length, results: out });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
