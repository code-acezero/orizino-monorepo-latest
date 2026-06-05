/**
 * Universal server function adapter.
 * TanStack's createServerFn posts to /_server/... — we intercept here.
 * In Next.js we replace createServerFn entirely with direct async functions
 * called via client-side fetch to /api/_server-fn, but the simplest approach
 * is to keep createServerFn calls as direct imports since all pages are
 * "use client" and the functions are imported at module level.
 * This route exists as a fallback placeholder.
 */
import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Use direct server action imports" }, { status: 404 });
}
