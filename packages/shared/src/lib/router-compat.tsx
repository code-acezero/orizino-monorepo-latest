"use client";

/**
 * router-compat.tsx — Next.js App Router shim for TanStack Router API.
 * All components importing from @/lib/router-compat work unchanged.
 */

import * as React from "react";
import NextLink from "next/link";
import {
  useRouter as useNextRouter,
  usePathname,
  useSearchParams as useNextSearchParams,
  useParams as useNextParams,
} from "next/navigation";

export function Outlet() { return null; }

export const Link: any = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, children, ...rest }, ref) => {
    // Resolve TanStack-style object `to` props (e.g. { to: "/page", params: {...} })
    // before passing to NextLink — otherwise the object serialises to "[object Object]".
    const resolved =
      typeof to === "object" && to !== null
        ? (resolveTarget(to) ?? "/")
        : (to ?? href ?? "/");
    return <NextLink ref={ref} href={resolved} {...rest}>{children}</NextLink>;
  }
);
Link.displayName = "Link";

export function Navigate({ to, replace }: { to: string; replace?: boolean }) {
  const router = useNextRouter();
  React.useEffect(() => {
    replace ? router.replace(to) : router.push(to);
  }, [to, replace, router]);
  return null;
}

export const NavLink: any = React.forwardRef<HTMLAnchorElement, any>(
  ({ to, href, end, className, children, activeClassName, ...rest }, ref) => {
    const pathname = usePathname();
    const rawDest = to ?? href ?? "/";
    const dest = typeof rawDest === "object" && rawDest !== null
      ? (resolveTarget(rawDest) ?? "/")
      : String(rawDest);
    const isActive = end
      ? pathname === dest
      : pathname === dest || (dest !== "/" && pathname.startsWith(dest));
    const resolvedCN =
      typeof className === "function"
        ? className({ isActive })
        : isActive && activeClassName
        ? `${className ?? ""} ${activeClassName}`.trim()
        : className;
    return (
      <NextLink ref={ref} href={dest} className={resolvedCN} {...rest}>{children}</NextLink>
    );
  }
);
NavLink.displayName = "NavLink";

/**
 * Interpolate TanStack Router path params into a path string.
 * e.g. interpolatePath("/page/$slug", { slug: "privacy" }) → "/page/privacy"
 *      interpolatePath("/items/$id/edit", { id: "42" }) → "/items/42/edit"
 */
function interpolatePath(path: string, params?: Record<string, string>): string {
  if (!params || !path.includes("$")) return path;
  return path.replace(/\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (_, key) =>
    params[key] !== undefined ? encodeURIComponent(String(params[key])) : `$${key}`
  );
}

/**
 * Resolve a navigate target (string or TanStack-style object) to a URL string.
 */
function resolveTarget(
  to: string | { to?: string; pathname?: string; search?: Record<string, any>; hash?: string; params?: Record<string, string>; replace?: boolean },
  opts?: { replace?: boolean; state?: any }
): string | null {
  if (typeof to === "string") {
    return to;
  }
  if (typeof to === "object" && to !== null) {
    const rawPath = to.to ?? to.pathname;
    if (!rawPath) return null;
    let url = interpolatePath(String(rawPath), to.params);
    if (to.search) {
      const entries = Object.entries(to.search as Record<string, any>).map(
        ([k, v]) => [k, String(v)] as [string, string]
      );
      const qs = new URLSearchParams(entries).toString();
      if (qs) url += "?" + qs;
    }
    if (to.hash) url += (to.hash.startsWith("#") ? "" : "#") + to.hash;
    return url;
  }
  return null;
}

export function useNavigate() {
  const router = useNextRouter();
  return React.useCallback(
    (to: any, opts?: { replace?: boolean; state?: any }) => {
      if (typeof to === "number") {
        if (to === -1) router.back();
        else if (to === 1) router.forward();
        return;
      }
      const url = resolveTarget(to, opts);
      if (!url) return;
      const replace = opts?.replace || (typeof to === "object" && to?.replace);
      replace ? router.replace(url) : router.push(url);
    },
    [router]
  );
}

export function useParams<T extends Record<string, string | undefined> = any>(): T {
  return useNextParams() as T;
}

export function useLocation() {
  const pathname = usePathname();
  const [search, setSearch] = React.useState("");
  const [hash, setHash] = React.useState("");
  React.useEffect(() => {
    setSearch(window.location.search);
    setHash(window.location.hash);
  }, [pathname]);
  return {
    pathname,
    search,
    hash,
    state: {},
    key: pathname,
  };
}

export function useSearchParams(): [
  URLSearchParams,
  (next: URLSearchParams | Record<string,string> | ((p: URLSearchParams) => URLSearchParams | Record<string,string>), opts?: { replace?: boolean }) => void
] {
  const router = useNextRouter();
  const pathname = usePathname();
  let nextSP: ReturnType<typeof useNextSearchParams>;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    nextSP = useNextSearchParams();
  } catch {
    nextSP = new URLSearchParams() as any;
  }
  const params = React.useMemo(() => {
    const sp = new URLSearchParams();
    try { nextSP.forEach((v: string, k: string) => sp.set(k, v)); } catch {}
    return sp;
  }, [nextSP]);

  const setParams = React.useCallback(
    (next: any, opts?: { replace?: boolean }) => {
      const resolved = typeof next === "function" ? next(params) : next;
      const sp = resolved instanceof URLSearchParams ? resolved : new URLSearchParams(resolved as Record<string,string>);
      const query = sp.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      opts?.replace ? router.replace(url) : router.push(url);
    },
    [router, pathname, params]
  );

  return [params, setParams];
}

export function matchPath(_pattern: any, _pathname: string) { return null; }

export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}

export function useSearch<T = Record<string, string>>(): T {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [params] = useSearchParams();
  const obj: Record<string, string> = {};
  params.forEach((v, k) => { obj[k] = v; });
  return obj as T;
}
