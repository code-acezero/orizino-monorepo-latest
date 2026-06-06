"use client";
import React, { createContext, useContext, useMemo } from "react";
import { Navigate, useLocation } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SectionLoader from "@/components/loaders/SectionLoader";
import { useStaffSections } from "@/hooks/use-staff-sections";

type AdminRole = "admin" | "moderator" | null;

const AdminRoleContext = createContext<AdminRole>(null);
export const useAdminRole = () => useContext(AdminRoleContext);

/**
 * Maps `/origin/...` and `/affiliate-hub` paths to the staff_sections key
 * the user must have access to. Keep in sync with admin-nav.ts.
 * Paths not listed here are admin-only.
 */
const PATH_TO_SECTION: Array<[RegExp, string]> = [
  // catalog
  [/^\/products(\/|$|\?)/, "products"],
  [/^\/categories(\/|$|\?)/, "products"],
  [/^\/reviews(\/|$|\?)/, "products"],
  [/^\/requests(\/|$|\?)/, "products"],
  [/^\/showcase(\/|$|\?)/, "products"],
  // sales / fulfillment
  [/^\/orders(\/|$|\?)/, "orders"],
  [/^\/returns(\/|$|\?)/, "orders"],
  [/^\/coupons(\/|$|\?)/, "orders"],
  [/^\/delivery-offers(\/|$|\?)/, "orders"],
  [/^\/couriers(\/|$|\?)/, "orders"],
  [/^\/courier-management(\/|$|\?)/, "orders"],
  [/^\/shipping(\/|$|\?)/, "orders"],
  [/^\/pathao(\/|$|\?)/, "orders"],
  [/^\/payment-gateways(\/|$|\?)/, "orders"],
  [/^\/user-promos(\/|$|\?)/, "orders"],
  // customers / marketing
  [/^\/customers(\/|$|\?)/, "customers"],
  [/^\/support(\/|$|\?)/, "customers"],
  [/^\/announcements(\/|$|\?)/, "customers"],
  [/^\/email-/, "customers"],
  [/^\/affiliate-hub(\/|$|\?)/, "affiliate"],
  // analytics
  [/^\/customer-analytics(\/|$|\?)/, "analytics"],
  [/^\/live-activity(\/|$|\?)/, "analytics"],
  // storefront / portfolio
  [/^\/landing(\/|$|\?)/, "portfolio"],
  [/^\/home(\/|$|\?)/, "portfolio"],
  [/^\/cms-pages(\/|$|\?)/, "portfolio"],
  [/^\/banners(\/|$|\?)/, "storefront_ui"],
  [/^\/footer(\/|$|\?)/, "storefront_ui"],
  [/^\/mobile-ui(\/|$|\?)/, "storefront_ui"],
  [/^\/branding(\/|$|\?)/, "storefront_ui"],
  [/^\/appearance(\/|$|\?)/, "storefront_ui"],
  // growth
  [/^\/seo(\/|$|\?)/, "seo"],
  [/^\/tracking(\/|$|\?)/, "seo"],
  [/^\/ai-settings(\/|$|\?)/, "ai"],
  [/^\/recommendations(\/|$|\?)/, "ai"],
  [/^\/call-settings(\/|$|\?)/, "settings"],
  [/^\/telegram(\/|$|\?)/, "settings"],
  // corporate
  [/^\/corporate(\/|$|\?)/, "employees"],
  [/^\/teams(\/|$|\?)/, "employees"],
  [/^\/employees(\/|$|\?)/, "employees"],
  // system
  [/^\/settings(\/|$|\?)/, "settings"],
  [/^\/db-health(\/|$|\?)/, "settings"],
  [/^\/debug(\/|$|\?)/, "settings"],
];

function sectionForPath(path: string): string | null {
  const cleaned = path.replace(/\/$/, "") || "/";
  if (cleaned === "/") return null;
  for (const [re, key] of PATH_TO_SECTION) {
    if (re.test(cleaned + "/")) return key;
  }
  return null;
}

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const { data: role, isLoading: roleLoading, isError: roleError } = useQuery({
    queryKey: ["user-admin-role", user?.id],
    queryFn: async (): Promise<AdminRole> => {
      const { data: isAdmin, error: adminErr } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });
      if (adminErr) throw adminErr;
      if (isAdmin) return "admin";

      const { data: isMod, error: modErr } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "moderator",
      });
      if (modErr) throw modErr;
      if (isMod) return "moderator";

      return null;
    },
    enabled: !!user,
    retry: 2,
  });

  const { data: staff, isLoading: staffLoading } = useStaffSections();

  const allowed = useMemo(() => {
    if (!role) return false;
    if (role === "admin") return true;
    const section = sectionForPath(location.pathname);
    if (!section) return true;
    return staff?.hasAccess(section) ?? false;
  }, [role, location.pathname, staff]);

  // Still resolving auth state — show loader
  if (loading || roleLoading || (role && role !== "admin" && staffLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <SectionLoader tone="platinum" size={56} />
      </div>
    );
  }

  // Not signed in — proxy.ts should have caught this, but guard client-side too
  if (!user) return <Navigate to="/auth" replace />;

  // has_role RPC failed — could be DB misconfiguration; sign out and go to auth
  if (roleError) return <Navigate to="/auth" replace />;

  // Authenticated but no admin/moderator role assigned — show unauthorized page
  // rather than redirecting to "/" which causes an infinite loop.
  if (role === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 px-6 text-center">
        <div className="text-5xl">🔒</div>
        <h1 className="text-xl font-semibold">Access Denied</h1>
        <p className="text-sm text-muted-foreground max-w-sm">
          Your account doesn't have admin or moderator access. Contact the site owner to get access.
        </p>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="mt-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Sign out
        </button>
      </div>
    );
  }

  // Role exists but current path not allowed for this staff member
  if (!allowed) return <Navigate to="/" replace />;

  // Single-section staff: bypass dashboard and go directly to their section
  const singleSectionRedirect = (() => {
    if (!staff || role === "admin" || location.pathname !== "/") return null;
    const accessible = staff.accessible ?? [];
    if (accessible.length !== 1) return null;
    const sectionKey = accessible[0].key as string;
    const SECTION_URLS: Record<string, string> = {
      products: "/products",
      orders: "/orders",
      offline_orders: "/orders",
      customers: "/customers",
      affiliate: "/affiliate-hub",
      seo: "/seo",
      storefront_ui: "/branding",
      portfolio: "/landing",
      ai: "/ai-settings",
      analytics: "/customer-analytics",
      employees: "/employees",
      settings: "/settings",
    };
    return SECTION_URLS[sectionKey] ?? null;
  })();

  if (singleSectionRedirect) return <Navigate to={singleSectionRedirect} replace />;

  return (
    <AdminRoleContext.Provider value={role}>
      {children}
    </AdminRoleContext.Provider>
  );
};

export default AdminRoute;
