"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// Supabase Realtime reads navigator.connection and calls .addListener() on it —
// a deprecated Network Information API not available in Firefox or many mobile browsers.
// We patch it here so the crash never reaches user code, regardless of timing.
function patchNavigatorConnection() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return;

  const stub = {
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };

  try {
    const conn = (navigator as any).connection;
    if (!conn) {
      // Not present at all — define an own property that shadows the missing getter.
      Object.defineProperty(navigator, "connection", {
        value: stub,
        configurable: true,
        writable: true,
      });
    } else if (typeof conn.addListener !== "function") {
      // Present but missing the deprecated addListener (e.g. modern Chrome).
      conn.addListener = () => {};
      conn.removeListener = () => {};
    }
  } catch {
    // Object.defineProperty failed (sealed object in some environments).
    // Patch the Navigator prototype as a fallback so the getter always returns a stub.
    try {
      Object.defineProperty(Navigator.prototype, "connection", {
        get() { return stub; },
        configurable: true,
      });
    } catch { /* give up silently */ }
  }
}

patchNavigatorConnection();

export const supabase = createBrowserClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? ""
);
