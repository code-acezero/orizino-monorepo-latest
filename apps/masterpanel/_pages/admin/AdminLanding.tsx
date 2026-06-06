"use client";
import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { motion } from "framer-motion";
import {
  Package, ShoppingCart, Users, BarChart3, Activity,
  Globe, Search, Bot, Settings, Briefcase, Tag, FileText,
  Shield, Users2, ChevronRight, Sparkles, Mail, Phone, Layout,
} from "lucide-react";

interface SectionCard {
  key: string;
  title: string;
  description: string;
  url: string;
  icon: React.ElementType;
  color: string;
  badge?: string;
  adminOnly?: boolean;
}

const SECTIONS: SectionCard[] = [
  { key: "products",      title: "Products",           description: "Manage catalog, variants, inventory & reviews", url: "/products",           icon: Package,    color: "from-violet-500/20 to-violet-600/5 border-violet-500/20 hover:border-violet-400/40" },
  { key: "orders",        title: "Orders & Fulfillment",description: "Orders, returns, coupons, couriers & shipping", url: "/orders",             icon: ShoppingCart,color: "from-amber-500/20 to-amber-600/5 border-amber-500/20 hover:border-amber-400/40" },
  { key: "customers",     title: "Customers",           description: "Customer profiles, segments & support tickets", url: "/customers",          icon: Users,      color: "from-sky-500/20 to-sky-600/5 border-sky-500/20 hover:border-sky-400/40" },
  { key: "analytics",     title: "Analytics",           description: "Live activity, geo breakdown & customer insights",url: "/customer-analytics", icon: BarChart3,  color: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 hover:border-emerald-400/40" },
  { key: "storefront_ui", title: "Storefront UI",       description: "Banners, footer, mobile UI & branding",       url: "/branding",           icon: Layout,     color: "from-pink-500/20 to-pink-600/5 border-pink-500/20 hover:border-pink-400/40" },
  { key: "portfolio",     title: "Portfolio / CMS",     description: "Landing page, home content & CMS pages",      url: "/landing",            icon: Globe,      color: "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20 hover:border-cyan-400/40" },
  { key: "seo",           title: "SEO & Tracking",      description: "Search optimization, schema, pixels & audit", url: "/seo",                icon: Search,     color: "from-orange-500/20 to-orange-600/5 border-orange-500/20 hover:border-orange-400/40" },
  { key: "ai",            title: "AI & Recommendations",description: "AI assistant, discover engine & call routing", url: "/ai-settings",        icon: Bot,        color: "from-indigo-500/20 to-indigo-600/5 border-indigo-500/20 hover:border-indigo-400/40", badge: "AI" },
  { key: "affiliate",     title: "Affiliate Hub",       description: "Partner programs, referral links & commissions",url: "/affiliate-hub",      icon: Tag,        color: "from-lime-500/20 to-lime-600/5 border-lime-500/20 hover:border-lime-400/40" },
  { key: "employees",     title: "Employees & Teams",   description: "Staff roles, team assignments & section access",url: "/employees",          icon: Briefcase,  color: "from-rose-500/20 to-rose-600/5 border-rose-500/20 hover:border-rose-400/40", adminOnly: true },
  { key: "settings",      title: "Settings",            description: "Global preferences, currency & customizer",  url: "/settings",           icon: Settings,   color: "from-zinc-500/20 to-zinc-600/5 border-zinc-500/20 hover:border-zinc-400/40", adminOnly: true },
  { key: "dashboard",     title: "Analytics Dashboard", description: "Revenue, order trends, geographic KPIs",     url: "/home",               icon: Activity,   color: "from-teal-500/20 to-teal-600/5 border-teal-500/20 hover:border-teal-400/40" },
];

const card = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.045, duration: 0.32, ease: "easeOut" } }),
};

export default function AdminLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = useAdminRole();

  const { data: profile } = useQuery({
    queryKey: ["admin-profile-landing", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: teamsSummary } = useQuery({
    queryKey: ["teams-summary"],
    queryFn: async () => {
      const [teamsRes, membersRes] = await Promise.all([
        supabase.from("teams").select("id, name, color"),
        supabase.from("team_members").select("team_id"),
      ]);
      return { count: (teamsRes.data ?? []).length, memberCount: (membersRes.data ?? []).length, teams: teamsRes.data ?? [] };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: quickStats } = useQuery({
    queryKey: ["landing-quick-stats"],
    queryFn: async () => {
      const [ordersRes, productsRes, customersRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      return { orders: ordersRes.count ?? 0, products: productsRes.count ?? 0, customers: customersRes.count ?? 0 };
    },
    staleTime: 5 * 60 * 1000,
  });

  const firstName = profile?.full_name?.split(" ")[0] || "Admin";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const visibleSections = useMemo(() => role === "admin" ? SECTIONS : SECTIONS.filter((s) => !s.adminOnly), [role]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-3xl font-display font-bold">
            {greeting}, {firstName} 👋
          </motion.h1>
          <p className="text-sm text-muted-foreground mt-1">
            {role === "admin" ? "Master control center — full access" : "Your assigned sections are shown below"}
          </p>
        </div>
        {quickStats && (
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 flex-wrap">
            {[
              { label: "Orders", value: quickStats.orders, icon: ShoppingCart },
              { label: "Products", value: quickStats.products, icon: Package },
              { label: "Customers", value: quickStats.customers, icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 bg-muted/40 border border-border/50 rounded-lg px-3 py-1.5 text-xs">
                <Icon className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-foreground">{value.toLocaleString()}</span>
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Teams bar (admin only) */}
      {role === "admin" && teamsSummary && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="flex items-center gap-4 rounded-xl border border-border/60 bg-card/50 px-5 py-3.5 cursor-pointer group"
          onClick={() => navigate("/teams")}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {teamsSummary.count === 0
                  ? "No teams created yet"
                  : `${teamsSummary.count} team${teamsSummary.count !== 1 ? "s" : ""} · ${teamsSummary.memberCount} member${teamsSummary.memberCount !== 1 ? "s" : ""}`}
              </p>
              <p className="text-xs text-muted-foreground">Manage teams and section access</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {teamsSummary.teams.slice(0, 5).map((t: any) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: `${t.color}22`, color: t.color, border: `1px solid ${t.color}44` }}>
                {t.name}
              </span>
            ))}
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
          </div>
        </motion.div>
      )}

      {/* Section grid */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Control Sections</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleSections.map((sec, i) => {
            const Icon = sec.icon;
            return (
              <motion.div key={sec.key} custom={i} variants={card} initial="hidden" animate="visible"
                className={`relative group rounded-xl border bg-gradient-to-br ${sec.color} p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5`}
                onClick={() => navigate(sec.url)}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-lg bg-background/60 backdrop-blur-sm flex items-center justify-center shadow-sm">
                    <Icon className="w-5 h-5" />
                  </div>
                  {sec.badge && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-primary/20 text-primary border border-primary/30">{sec.badge}</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity absolute top-4 right-4" />
                </div>
                <h3 className="font-semibold text-sm text-foreground mb-1">{sec.title}</h3>
                <p className="text-xs text-muted-foreground leading-snug">{sec.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
        {[
          { label: "Email Campaigns", url: "/email-campaigns", icon: Mail },
          { label: "Announcements",   url: "/announcements",   icon: Sparkles },
          { label: "Live Activity",   url: "/live-activity",   icon: Activity },
          { label: "DB Health",       url: "/db-health",       icon: Shield },
          { label: "Audit Log",       url: "/corporate/audit-log", icon: FileText },
          { label: "Call Center",     url: "/call-settings",   icon: Phone },
        ].map(({ label, url, icon: Icon }) => (
          <button key={url} onClick={() => navigate(url)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:border-border transition-all">
            <Icon className="w-3 h-3" />{label}
          </button>
        ))}
      </div>
    </div>
  );
}
