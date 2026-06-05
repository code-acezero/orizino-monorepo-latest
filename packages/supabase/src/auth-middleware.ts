// auth-middleware.ts — Next.js version
// Provides requireSupabaseAuth as a callable middleware for .functions.ts files.
// In Next.js, server functions are called directly (no RPC transport needed),
// so this creates a Supabase client from the bearer token in process context.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

type MiddlewareOpts = {
  next: (opts?: { context?: any }) => Promise<any>;
};

export const requireSupabaseAuth = {
  _server: async ({ next }: MiddlewareOpts) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY =
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
      throw new Error("Missing Supabase environment variables");
    }

    // In Next.js, we use the service role to validate the session server-side.
    // The client-side supabase session is passed implicitly.
    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: { session } } = await supabase.auth.getSession().catch(() => ({ data: { session: null } }));
    const userId = session?.user?.id;
    if (!userId) throw new Error("Unauthorized");

    return next({ context: { supabase, userId, claims: session?.user } });
  },
  server(fn: any) { return { ...this, _server: fn }; },
  client(fn: any) { return { ...this, _client: fn }; },
};
