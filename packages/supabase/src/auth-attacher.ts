// auth-attacher.ts — Next.js version
// The TanStack Start middleware that attached Supabase auth headers to serverFn calls
// is not needed in Next.js because server actions/API routes handle auth directly.
// This file is kept as a no-op stub to avoid import errors.

export const attachSupabaseAuth = {
  _server: null,
  _client: null,
  server: (fn: any) => ({ _server: fn }),
  client: (fn: any) => ({ _client: fn }),
};
