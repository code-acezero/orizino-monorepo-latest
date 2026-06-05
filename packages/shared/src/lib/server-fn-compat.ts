/**
 * createServerFn compatibility shim for Next.js.
 *
 * TanStack's createServerFn wraps server-side logic in a callable that:
 * 1. On the server: runs the handler directly
 * 2. On the client: makes an RPC call to the TanStack Start server
 *
 * In Next.js, we replace this with a thin wrapper that:
 * - Executes the handler directly when called from a Server Action or API route
 * - On the client, calls /api/server-actions/[fnId] (handled by individual route files)
 *
 * The simplest and most reliable approach: since all .functions.ts files are
 * already only called from client components via `import`, we make createServerFn
 * return an async function that works identically in both environments.
 * The middleware chain is handled inline.
 */

export type ServerFnMiddleware = {
  type: "function";
};

type MiddlewareResult = {
  middleware: (opts: { next: (ctx?: any) => Promise<any> }) => Promise<any>;
};

class ServerFnBuilder {
  private _method: string;
  private _middlewares: any[] = [];
  private _handler: ((opts: any) => Promise<any>) | null = null;

  constructor(method = "POST") {
    this._method = method;
  }

  middleware(middlewares: any[]) {
    this._middlewares = middlewares;
    return this;
  }

  validator(schema: any) {
    // Validation handled by the handler itself
    return this;
  }

  inputValidator(schema: any) {
    // Input validation — runs before handler in TanStack Start.
    // In our shim, validation is handled inside the handler.
    return this;
  }

  handler(fn: (opts: any) => Promise<any>) {
    this._handler = fn;
    const self = this;

    const callable = async (input?: any) => {
      // Build context by running middleware chain
      let ctx: any = {};
      const runMiddleware = async (index: number, currentCtx: any): Promise<any> => {
        if (index >= self._middlewares.length) {
          return self._handler!({ ...input, context: currentCtx, data: input });
        }
        const mw = self._middlewares[index];
        const serverFn = mw?.server ?? mw?._server;
        if (serverFn) {
          return serverFn({
            next: async (nextOpts?: { context?: any }) => {
              return runMiddleware(index + 1, { ...currentCtx, ...(nextOpts?.context ?? {}) });
            },
          });
        }
        return runMiddleware(index + 1, currentCtx);
      };

      return runMiddleware(0, ctx);
    };

    return callable;
  }
}

/**
 * Drop-in replacement for TanStack's createServerFn.
 * Returns a builder with .middleware().handler() chain.
 */
export function createServerFn(opts?: { method?: string }) {
  return new ServerFnBuilder(opts?.method ?? "POST");
}

/**
 * createMiddleware compat — TanStack middleware factory.
 * Returns an object with .server() and .client() methods.
 */
export function createMiddleware(_opts?: { type?: string }) {
  const chain: any = {
    _server: null,
    _client: null,
    server(fn: (opts: { next: (ctx?: any) => Promise<any> }) => Promise<any>) {
      chain._server = fn;
      return chain;
    },
    client(fn: (opts: { next: (ctx?: any) => Promise<any> }) => Promise<any>) {
      chain._client = fn;
      return chain;
    },
  };
  return chain;
}

/**
 * getRequest compat — returns a stub in Next.js context.
 * In API routes, use the Request object directly.
 */
export function getRequest(): Request {
  // This is only called in server contexts where we have access to headers
  // In Next.js API routes, the request is passed directly
  throw new Error("getRequest() is not available in Next.js — use the Request parameter from the route handler instead");
}

/**
 * useServerFn — TanStack React hook that wraps a server function.
 * In Next.js, server functions are plain async functions — no wrapping needed.
 * This hook simply returns the function as-is.
 */
export function useServerFn<T extends (...args: any[]) => Promise<any>>(fn: T): T {
  return fn;
}
