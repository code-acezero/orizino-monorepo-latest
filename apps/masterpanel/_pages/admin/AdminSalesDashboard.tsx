"use client";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { motion } from "framer-motion";
import { ShoppingCart, Package, Users, Headphones, Key, Truck, BarChart3, Activity, ChevronRight } from "lucide-react";

const HUBS = [
  { title: "Products Management", url: "/admin/products-hub",      icon: Package,    color: "#f59e0b", desc: "Catalogue, promotions, coupons & showcase" },
  { title: "Customer Support",    url: "/admin/customers-hub",     icon: Users,      color: "#38bdf8", desc: "Customers, support, analytics & email" },
  { title: "Payments & Couriers", url: "/admin/payments-couriers", icon: Key,        color: "#a855f7", desc: "Gateways, shipping, couriers & delivery" },
  { title: "Orders",              url: "/admin/orders",            icon: ShoppingCart, color: "#22c55e", desc: "All orders & payment verifications" },
];

const ia = {
  hidden:  { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.05, duration: 0.26, ease: "easeOut" } }),
};

export default function AdminSalesDashboard() {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["sales-dashboard-stats"],
    queryFn: async () => {
      const [ordersRes, productsRes, customersRes, supportRes] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("support_conversations").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        orders:    ordersRes.count    ?? 0,
        products:  productsRes.count  ?? 0,
        customers: customersRes.count ?? 0,
        openSupport: supportRes.count ?? 0,
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  return (
    <div className="space-y-8 pb-8">
      <div>
        <motion.h1 initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-display font-bold">
          Sales Management
        </motion.h1>
        <p className="text-sm text-muted-foreground mt-1">Products, orders, customers, fulfilment & payments</p>
      </div>

      {stats && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Orders",        value: stats.orders,      icon: ShoppingCart, url: "/admin/orders" },
            { label: "Products",      value: stats.products,    icon: Package,      url: "/admin/products-hub" },
            { label: "Customers",     value: stats.customers,   icon: Users,        url: "/admin/customers-hub" },
            { label: "Open Tickets",  value: stats.openSupport, icon: Headphones,   url: "/admin/support" },
          ].map(({ label, value, icon: Icon, url }) => (
            <button key={label} onClick={() => navigate(url)}
              className="flex flex-col items-start gap-1 rounded-xl border border-border/60 bg-card/60 p-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xl font-bold text-foreground leading-none">{value.toLocaleString()}</span>
              <span className="text-[11px] text-muted-foreground">{label}</span>
            </button>
          ))}
        </motion.div>
      )}

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Sections</p>
        <div className="space-y-2">
          {HUBS.map((hub, i) => {
            const Icon = hub.icon;
            return (
              <motion.button key={hub.url} custom={i} variants={ia} initial="hidden" animate="visible"
                onClick={() => navigate(hub.url)}
                className="w-full flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3 text-left hover:bg-card hover:border-border hover:shadow-sm transition-all group">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${hub.color}18`, border: `1px solid ${hub.color}30` }}>
                  <Icon className="w-4 h-4" style={{ color: hub.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{hub.title}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{hub.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Analytics</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Customer Analytics", url: "/admin/customer-analytics", icon: BarChart3 },
            { label: "Live Activity",       url: "/admin/live-activity",      icon: Activity },
          ].map(({ label, url, icon: Icon }) => (
            <button key={url} onClick={() => navigate(url)}
              className="flex items-center gap-2 text-xs px-3 py-2.5 rounded-xl border border-border/50 bg-card/40 text-muted-foreground hover:text-foreground hover:bg-card hover:border-border transition-all">
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
