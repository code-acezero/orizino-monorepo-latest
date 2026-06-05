import { runScheduledReport } from "@/lib/affiliate-report.functions";
import { NextResponse } from "next/server";
export async function POST() {
  try { const result = await runScheduledReport("weekly"); return NextResponse.json({ ok: true, ...result }); }
  catch (err: any) { return NextResponse.json({ ok: false, error: String(err?.message ?? err) }, { status: 500 }); }
}
