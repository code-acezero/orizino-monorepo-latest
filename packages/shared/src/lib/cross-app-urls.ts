/**
 * Cross-app URL resolution
 *
 * Each app sets optional env vars. When running locally all three apps
 * are on different ports; in production each is on its own domain.
 *
 * Env vars (set in each app's .env.local / hosting config):
 *   NEXT_PUBLIC_STOREFRONT_URL   — the storefront's public origin (e.g. https://shop.brand.com)
 *   NEXT_PUBLIC_COMPANY_URL      — the company/landing page origin (e.g. https://brand.com)
 *
 * Masterpanel URL is intentionally NOT exposed to other apps.
 */

function env(key: string): string {
  return (
    (typeof process !== "undefined" && process.env[key]) || ""
  ).trim().replace(/\/$/, "");
}

/** Returns the storefront origin. Falls back to localhost:3001 in dev. */
export function getStorefrontUrl(): string {
  return env("NEXT_PUBLIC_STOREFRONT_URL") || "http://localhost:3001";
}

/** Returns the company/landing page origin. Falls back to localhost:3000 in dev. */
export function getCompanyUrl(): string {
  return env("NEXT_PUBLIC_COMPANY_URL") || "http://localhost:3000";
}

/** Navigate to a storefront path from any app. */
export function storefrontHref(path = "/"): string {
  const base = getStorefrontUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Navigate to the company/landing page from any app. */
export function companyHref(path = "/"): string {
  const base = getCompanyUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
