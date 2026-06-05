"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ChevronRight, Clock, ChevronDown, ChevronUp, Truck } from "lucide-react";
import LogoLoader from "@/components/LogoLoader";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";
import { LargeTitleHeader } from "@/components/mobile";

const OrdersPage: React.FC = () => {
  useSeoMeta("orders", "My Orders | Store");
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(id, product_name, product_image, quantity, unit_price, total_price), pathao_shipments(consignment_id, order_status, order_status_slug, recipient_city_name, recipient_zone_name, last_synced_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.warn("[OrdersPage] Failed to fetch orders:", error.message, error.code);
        throw error;
      }
      return data || [];
    },
    enabled: !!user,
  });

  const toggleExpand = (id: string) => {
    setExpandedOrder((prev) => (prev === id ? null : id));
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <div className="md:hidden">
        <LargeTitleHeader
          title="My Orders"
          subtitle={orders ? `${orders.length} ${orders.length === 1 ? "order" : "orders"}` : undefined}
        />
      </div>
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="hidden md:block text-3xl font-bold font-display text-foreground mb-8">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-strong rounded-3xl p-6 animate-pulse">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="h-4 bg-secondary/40 rounded-full w-28 mb-2" />
                    <div className="h-3 bg-secondary/30 rounded-full w-20" />
                  </div>
                  <div className="h-5 bg-secondary/40 rounded-full w-16" />
                </div>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex-1 h-1.5 rounded-full bg-secondary/30" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">No orders yet</p>
            <Link to="/inventory" className="btn-pill bg-gradient-primary text-primary-foreground font-semibold px-8 py-3 mt-6 inline-block">
              Start Shopping
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-strong rounded-3xl overflow-hidden">
                {/* Header */}
                <button onClick={() => toggleExpand(order.id)} className="w-full p-6 text-left">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="font-display font-semibold text-foreground">{order.order_number}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{formatPrice(order.total)}</span>
                      {expandedOrder === order.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Tracking Timeline - always visible */}
                  <OrderTrackingTimeline
                    status={order.status}
                    trackingNumber={order.tracking_number}
                    updatedAt={order.updated_at}
                  />

                  {/* Pathao live status */}
                  {(order as any).pathao_shipments?.[0] && (
                    <div className="mt-3 flex items-center gap-2 text-xs bg-primary/10 border border-primary/20 rounded-xl px-3 py-2">
                      <Package className="w-3.5 h-3.5 text-primary" />
                      <span className="text-primary font-medium">Pathao:</span>
                      <span className="text-foreground capitalize">
                        {((order as any).pathao_shipments[0].order_status || "").toString().replace(/_/g, " ") || "Pending"}
                      </span>
                      <span className="text-muted-foreground ml-auto font-mono">
                        {(order as any).pathao_shipments[0].consignment_id}
                      </span>
                    </div>
                  )}
                </button>

                {/* Expanded details */}
                <AnimatePresence>
                  {expandedOrder === order.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-6 space-y-3 border-t border-border pt-4">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Order Items</p>
                        {(order.order_items as any[])?.map((item: any) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <img src={item.product_image || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-xl object-cover" />
                            <span className="text-sm text-foreground flex-1 line-clamp-1">{item.product_name}</span>
                            <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                            <span className="text-sm font-medium text-foreground">{formatPrice(item.total_price)}</span>
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-sm text-muted-foreground">Payment: <span className="text-foreground capitalize">{order.payment_method}</span></span>
                          <span className="font-bold text-foreground">Total: {formatPrice(order.total)}</span>
                        </div>

                        <Link
                          to={`/orders/${order.id}/track`}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 hover:bg-primary/20 text-primary font-semibold text-sm transition-all"
                        >
                          <Truck className="w-4 h-4" /> Live Tracking
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default OrdersPage;
