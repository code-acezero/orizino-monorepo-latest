"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import { motion } from "framer-motion";
import {
  ShoppingCart, Search, Tag, Palette, Activity,
  Settings, Users2, ChevronRight, Package, Users,
  BarChart3, Sparkles, LayoutGrid,
} from "lucide-react";

const SECTIONS = [
  {
    key: "admin",
    title: "Sales Management",
    sub: "Products, orders, fulfilment & payments",
    url: "/admin",
    icon: ShoppingCart,
    color: "#f59e0b",
    adminOnly: false,
  },
  {
    key: "seo",
    title: "SEO Management",
    sub: "Search, tracking, email campaigns & automations",
    url: "/seo",
    icon: Search,
    color: "#f97316",
    adminOnly: false,
  },
  {
    key: "affiliate",
    title: "Affiliate Hub",
    sub: "Partner programs, referral links & commissions",
    url: "/affiliate",
    icon: Tag,
    color: "#84cc16",
    adminOnly: true,
  },
  {
    key: "brandconfig",
    title: "Branding Config",
    sub: "Theme, appearance, banners, landing & CMS pages",
    url: "/brandconfig",
    icon: Palette,
    color: "#ec4899",
    adminOnly: false,
  },
  {
    key: "backend",
    title: "Backend Controls",
    sub: "DB health, debug tools & edge function controls",
    url: "/backend",
    icon: Activity,
    color: "#38bdf8",
    adminOnly: true,
  },
  {
    key: "settings",
    title: "Site Settings",
    sub: "Global config, AI agent, call center & Telegram",
    url: "/settings",
    icon: Settings,
    color: "#94a3b8",
    adminOnly: true,
  },
  {
    key: "corporate",
    title: "Corporate",
    sub: "Teams, staff, role assignments & audit log",
    url: "/corporate",
    icon: Users2,
    color: "#a855f7",
    adminOnly: true,
  },
];

const itemAnim = {
  hidden:  { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.05, duration: 0.28, ease: "easeOut" },
  }),
};

export default function AdminLanding() {
  const { user } = useAuth();
  const router = useRouter();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const canSeeMasterControl = role === "admin" || !!staff?.isAdmin ||
    (staff?.accessible?.length ?? 0) >= 2;

  const { data: profile } = useQuery({
    queryKey: ["admin-profile-landing", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: stats } = useQuery({
    queryKey: ["landing-stats"],
    queryFn: async () => {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return {
        orders:    ordersRes.count    ?? 0,
        products:  productsRes.count  ?? 0,
        customers: customersRes.count ?? 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Working late" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.full_name?.split(" ")[0] || "Admin";

  const visibleSections = role === "admin"
    ? SECTIONS
    : SECTIONS.filter((s) => !s.adminOnly);

  return (
    <div className="space-y-8 pb-8">

      {/* ── Greeting ── */}
      <div>
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-3xl font-display font-bold"
        >
          {greeting}, {firstName} 👋
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === "admin"
            ? "Master Panel — select a section to get started"
            : "Your accessible sections are shown below"}
        </p>
      </div>

      {/* ── Quick stats ── */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          {[
            { label: "Orders",    value: stats.orders,    icon: ShoppingCart, url: "/admin/orders" },
            { label: "Products",  value: stats.products,  icon: Package,      url: "/admin/products" },
            { label: "Customers", value: stats.customers, icon: Users,        url: "/admin/customers" },
          ].map(({ label, value, icon: Icon, url }) => (
            <button
              key={label}
              onClick={() => router.push(url)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-card/60 p-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all"
            >
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground leading-none">{value.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Section list ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Sections
        </p>
        <div className="space-y-2">
          {visibleSections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <motion.button
                key={sec.key}
                custom={i}
                variants={itemAnim}
                initial="hidden"
                animate="visible"
                onClick={() => router.push(sec.url)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group"
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${sec.color}20`, border: `1px solid ${sec.color}33` }}
                >
                  <Icon className="w-4 h-4" style={{ color: sec.color }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{sec.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{sec.sub}</p>
                </div>

                {/* URL pill + chevron */}
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-[10px] font-mono text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded">
                    {sec.url}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ── Master Control shortcut ── */}
      {role === "admin" && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            Quick Access
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { label: "Analytics",    url: "/admin/customer-analytics", icon: BarChart3 },
              { label: "Live Activity",url: "/admin/live-activity",      icon: Activity },
              { label: "Audit Log",    url: "/corporate/audit-log",      icon: Users2 },
              { label: "Recommendations", url: "/settings/recommendations", icon: Sparkles },
            ].map(({ label, url, icon: Icon }) => (
              <button
                key={url}
                onClick={() => router.push(url)}
                className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border transition-all"
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Master Control Panel link ── */}
      {canSeeMasterControl && <div className="pt-2 border-t border-border/40">
        <button
          onClick={() => router.push("/master")}
          className="w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 hover:bg-primary/10 px-4 py-3.5 text-left transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <LayoutGrid className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary leading-tight">Master Control</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Full sidebar with all sections combined</p>
          </div>
          <ChevronRight className="w-4 h-4 text-primary/50 group-hover:text-primary transition-colors shrink-0" />
        </button>
      </div>}

    </div>
  );
}
