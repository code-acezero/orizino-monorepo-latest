"use client";
import React, { useEffect } from "react";
import { useParams, Link } from "@/lib/router-compat";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Truck, MapPin, CheckCircle2, RefreshCw, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import OrderTrackingTimeline from "@/components/OrderTrackingTimeline";
import LogoLoader from "@/components/LogoLoader";

const LiveTrackingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const qc = useQueryClient();

  const { data: order, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["order_tracking", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, order_items(*), pathao_shipments(*), steadfast_shipments(*)")
        .eq("id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!id,
    refetchInterval: 30_000, // auto-refresh every 30s
  });

  // Trigger backend sync on load and every 60s
  useEffect(() => {
    if (!order) return;
    const trigger = () => supabase.functions.invoke("sync-shipments", { body: { orderId: order.id } }).catch(() => {});
    trigger();
    const t = setInterval(trigger, 60_000);
    return () => clearInterval(t);
  }, [order?.id]);

  // Realtime
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`order-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pathao_shipments", filter: `order_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["order_tracking", id] }))
      .on("postgres_changes", { event: "*", schema: "public", table: "steadfast_shipments", filter: `order_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["order_tracking", id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, qc]);

  if (isLoading) return <div className="min-h-[60vh] flex items-center justify-center"><LogoLoader /></div>;
  if (!order) return <div className="container mx-auto px-4 py-12 text-center">Order not found.</div>;

  const o = order as any;
  const pathao = o.pathao_shipments?.[0];
  const steadfast = o.steadfast_shipments?.[0];
  const shipment = pathao || steadfast;
  const provider = pathao ? "Pathao" : steadfast ? "Steadfast" : null;
  const status: string = pathao?.order_status || steadfast?.status || o.status;

  const stages = [
    { key: "pending", label: "Order Placed", icon: Package },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "shipped", label: "In Transit", icon: Truck },
    { key: "delivered", label: "Delivered", icon: MapPin },
  ];
  const norm = (status || "").toLowerCase();
  const currentStage = norm.includes("deliver") ? 3
    : norm.includes("transit") || norm.includes("pick") || norm.includes("ship") ? 2
    : norm.includes("confirm") ? 1 : 0;

  return (
    <div className="min-h-screen pb-20 lg:pb-12">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to orders
        </Link>

        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold font-display">Order #{order.order_number}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed {new Date(order.created_at).toLocaleDateString()} · {formatPrice(order.total)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Live status hero */}
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-strong rounded-3xl p-6 mb-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-primary/15">
                <Truck className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground uppercase">Current Status</p>
                <h2 className="text-xl font-bold capitalize">{status?.replace(/_/g, " ") || "Processing"}</h2>
              </div>
              {provider && <Badge variant="outline">{provider}</Badge>}
            </div>

            {/* Stage bar */}
            <div className="flex items-center gap-2">
              {stages.map((s, i) => {
                const Icon = s.icon;
                const reached = i <= currentStage;
                return (
                  <React.Fragment key={s.key}>
                    <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        reached ? "bg-primary text-primary-foreground" : "bg-secondary/40 text-muted-foreground"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] text-muted-foreground text-center max-w-[60px]">{s.label}</span>
                    </div>
                    {i < stages.length - 1 && (
                      <div className={`flex-1 h-0.5 ${i < currentStage ? "bg-primary" : "bg-secondary/40"}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {shipment && (
              <div className="mt-5 pt-5 border-t border-border/50 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Tracking ID</p>
                  <p className="font-mono">{(shipment as any).consignment_id || (shipment as any).tracking_code}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                  <p className="flex items-center gap-1.5"><Clock className="w-3 h-3" />
                    {(shipment as any).last_synced_at ? new Date((shipment as any).last_synced_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <OrderTrackingTimeline status={status || order.status} />

        {/* Items */}
        <div className="glass-strong rounded-3xl p-5 mt-6">
          <h3 className="font-semibold mb-4">Items ({order.order_items?.length || 0})</h3>
          <div className="space-y-3">
            {order.order_items?.map((it: any) => (
              <div key={it.id} className="flex items-center gap-3">
                {it.product_image && <img src={it.product_image} alt={it.product_name} className="w-14 h-14 rounded-xl object-cover" />}
                <div className="flex-1">
                  <p className="text-sm font-medium">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground">Qty {it.quantity} · {formatPrice(it.unit_price)}</p>
                </div>
                <span className="text-sm font-semibold">{formatPrice(it.total_price)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveTrackingPage;
