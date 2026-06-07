"use client";
import { useState } from "react";
import FilterChips from "@/components/admin/FilterChips";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { Eye, Trash2, FileText, Printer, CheckCircle2, XCircle, Mail, Smartphone, ShoppingBag, Truck } from "lucide-react";
import OrderGoogleDocs from "@/components/admin/OrderGoogleDocs";
import PageHeader from "@/components/admin/PageHeader";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { Tables } from "@/integrations/supabase/types";
import AdminPaymentProofs from "@/components/admin/AdminPaymentProofs";
import CourierPushDialog from "@/components/admin/CourierPushDialog";

type Order = Tables<"orders">;

const ORDER_STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

const statusColors: Record<string, string> = {
  pending: "secondary",
  processing: "default",
  shipped: "outline",
  delivered: "default",
  cancelled: "destructive",
};

const AdminOrders = () => {
  const qc = useQueryClient();
  const { formatPrice } = useCurrency();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string | null>(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [courierOpen, setCourierOpen] = useState(false);
  const [tab, setTab] = useTabParam("orders", "/admin/orders");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });

  const { data: orderItems = [] } = useQuery({
    queryKey: ["admin-order-items", selectedOrder?.id],
    queryFn: async () => {
      if (!selectedOrder) return [];
      const { data, error } = await supabase.from("order_items").select("*").eq("order_id", selectedOrder.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedOrder,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, tracking }: { id: string; status: string; tracking?: string }) => {
      const update: any = { status, updated_at: new Date().toISOString() };
      if (tracking) update.tracking_number = tracking;
      const { error } = await supabase.from("orders").update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-orders"] }); toast.success("Order updated"); },
    onError: (e) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action, status }: { ids: string[]; action: "delete" | "status"; status?: string }) => {
      if (action === "delete") {
        // Delete order items first, then orders
        const { error: itemsErr } = await supabase.from("order_items").delete().in("order_id", ids);
        if (itemsErr) throw itemsErr;
        const { error } = await supabase.from("orders").delete().in("id", ids);
        if (error) throw error;
      } else if (action === "status" && status) {
        const { error } = await supabase.from("orders").update({ status, updated_at: new Date().toISOString() }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action, status }) => {
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
      setSelected(new Set());
      setBulkStatus(null);
      toast.success(
        action === "delete"
          ? `${ids.length} order${ids.length > 1 ? "s" : ""} deleted`
          : `${ids.length} order${ids.length > 1 ? "s" : ""} updated to ${status}`
      );
    },
    onError: (e: any) => toast.error(e.message),
  });

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1;
    return acc;
  }, {});

  const filtered = filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  const filterOptions = [
    { value: "all", label: "All", count: orders.length },
    { value: "pending", label: "Pending", count: statusCounts["pending"] || 0 },
    { value: "processing", label: "Processing", count: statusCounts["processing"] || 0 },
    { value: "shipped", label: "Shipped", count: statusCounts["shipped"] || 0 },
    { value: "delivered", label: "Delivered", count: statusCounts["delivered"] || 0 },
    { value: "cancelled", label: "Cancelled", count: statusCounts["cancelled"] || 0 },
  ];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o) => o.id)));
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  return (
    <div className="max-w-[1700px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<ShoppingBag className="w-5 h-5" />}
        title="Orders"
        description="Manage orders, payments and shipping in one place."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="hidden">
          <TabsTrigger value="orders"><ShoppingBag className="w-4 h-4 mr-1" /> All Orders</TabsTrigger>
          <TabsTrigger value="payments"><Smartphone className="w-4 h-4 mr-1" /> Payment Verifications</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <AdminPaymentProofs />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4">

      <FilterChips options={filterOptions} value={filterStatus} onChange={(v) => { setFilterStatus(v); setSelected(new Set()); }} />

      {/* Bulk action bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 glass rounded-2xl px-4 py-3"
          >
            <span className="text-sm text-foreground font-medium">
              {selected.size} selected
            </span>
            <div className="flex gap-2 ml-auto">
              {/* Bulk status update */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <div className="flex gap-2 items-center">
                    <Select value={bulkStatus ?? ""} onValueChange={setBulkStatus}>
                      <SelectTrigger className="h-9 w-[140px] text-sm">
                        <SelectValue placeholder="Set status..." />
                      </SelectTrigger>
                      <SelectContent>
                        {ORDER_STATUSES.map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="outline" disabled={!bulkStatus || bulkAction.isPending}>
                      Update Status
                    </Button>
                  </div>
                </AlertDialogTrigger>
                {bulkStatus && (
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Update order status?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will change the status of {selected.size} order{selected.size > 1 ? "s" : ""} to "{bulkStatus}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "status", status: bulkStatus })}>
                        Update
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                )}
              </AlertDialog>

              {/* Bulk delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={bulkAction.isPending}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete orders?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {selected.size} order{selected.size > 1 ? "s" : ""} and their items. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
              </TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="p-0"><TableSkeleton rows={8} cols={6} /></TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No orders found</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id} className={selected.has(o.id) ? "bg-primary/5" : ""}>
                <TableCell>
                  <Checkbox checked={selected.has(o.id)} onCheckedChange={() => toggleSelect(o.id)} aria-label={`Select order ${o.order_number}`} />
                </TableCell>
                <TableCell className="font-medium">{o.order_number}</TableCell>
                <TableCell>{format(new Date(o.created_at), "MMM d, yyyy")}</TableCell>
                <TableCell>{formatPrice(Number(o.total))}</TableCell>
                <TableCell><Badge variant={(statusColors[o.status] as any) ?? "secondary"}>{o.status}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => setSelectedOrder(o)}><Eye className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedOrder} onOpenChange={(v) => !v && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Order {selectedOrder?.order_number}</DialogTitle></DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Subtotal:</span> {formatPrice(Number(selectedOrder.subtotal))}</div>
                <div><span className="text-muted-foreground">Shipping:</span> {formatPrice(Number(selectedOrder.shipping_fee))}</div>
                <div><span className="text-muted-foreground">Total:</span> <span className="font-bold">{formatPrice(Number(selectedOrder.total))}</span></div>
                <div><span className="text-muted-foreground">Payment:</span> {selectedOrder.payment_method}</div>
                {selectedOrder.coupon_code && (
                  <div><span className="text-muted-foreground">Coupon:</span> <Badge variant="outline" className="font-mono text-xs">{selectedOrder.coupon_code}</Badge> (-{formatPrice(Number(selectedOrder.coupon_discount || 0))})</div>
                )}
                {selectedOrder.gift_wrap && (
                  <div><span className="text-muted-foreground">Gift:</span> Yes {selectedOrder.gift_message && `— "${selectedOrder.gift_message}"`}</div>
                )}
              </div>

              {/* Shipping Address */}
              {selectedOrder.shipping_address && typeof selectedOrder.shipping_address === "object" && (
                <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                  <p className="font-medium text-foreground mb-1">Shipping Address</p>
                  {(() => {
                    const addr = selectedOrder.shipping_address as any;
                    return (
                      <div className="text-muted-foreground space-y-0.5">
                        <p>{addr.full_name || addr.name}</p>
                        <p>{addr.phone}</p>
                        <p>{addr.street}, {addr.city}</p>
                        <p>{addr.state} {addr.zip}, {addr.country}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              {selectedOrder.notes && (
                <div className="p-3 rounded-xl bg-secondary/30 text-sm">
                  <p className="font-medium text-foreground mb-1">Customer Notes</p>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              <div>
                <Label>Items</Label>
                <div className="space-y-2 mt-1">
                  {orderItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                      {item.product_image && <img src={item.product_image} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <div className="flex-1">
                        <span className="font-medium">{item.product_name}</span>
                        <span className="text-muted-foreground ml-2">× {item.quantity}</span>
                      </div>
                      <span>{formatPrice(Number(item.total_price))}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Update Status</Label>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(v) => {
                    updateStatus.mutate({ id: selectedOrder.id, status: v });
                    setSelectedOrder({ ...selectedOrder, status: v });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Courier assignment — chosen by admin, not customer */}
              <div className="border-t border-border pt-4">
                <Label className="font-medium mb-2 block flex items-center gap-2"><Truck className="w-4 h-4" /> Assign Courier</Label>
                <Select
                  value={(selectedOrder as any).assigned_courier ?? ""}
                  onValueChange={async (v) => {
                    const { error } = await supabase
                      .from("orders")
                      .update({
                        assigned_courier: v,
                        courier_assigned_at: new Date().toISOString(),
                      } as any)
                      .eq("id", selectedOrder.id);
                    if (error) { toast.error(error.message); return; }
                    setSelectedOrder({ ...(selectedOrder as any), assigned_courier: v } as Order);
                    qc.invalidateQueries({ queryKey: ["admin-orders"] });
                    toast.success(`Assigned to ${v}`);
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Pick courier..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orizino">Orizino (own delivery)</SelectItem>
                    <SelectItem value="pathao">Pathao</SelectItem>
                    <SelectItem value="steadfast">Steadfast</SelectItem>
                  </SelectContent>
                </Select>
                {(selectedOrder as any).assigned_courier && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Assigned to <span className="font-medium text-foreground capitalize">{(selectedOrder as any).assigned_courier}</span>
                    {(selectedOrder as any).courier_assigned_at && ` · ${format(new Date((selectedOrder as any).courier_assigned_at), "MMM d, HH:mm")}`}
                  </p>
                )}
              </div>

              <div>
                <Label>Tracking Number</Label>
                <div className="flex gap-2">
                  <Input
                    defaultValue={selectedOrder.tracking_number ?? ""}
                    id="tracking-input"
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const val = (document.getElementById("tracking-input") as HTMLInputElement)?.value;
                      updateStatus.mutate({ id: selectedOrder.id, status: selectedOrder.status, tracking: val });
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>

              {/* Order Review Actions */}
              {selectedOrder.status === "pending" && (
                <div className="border-t border-border pt-4">
                  <Label className="font-medium mb-2 block">Order Review</Label>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 gap-1.5"
                      onClick={async () => {
                        updateStatus.mutate({ id: selectedOrder.id, status: "processing" });
                        setSelectedOrder({ ...selectedOrder, status: "processing" });
                        // Send notification to user
                        await supabase.from("notifications").insert({
                          user_id: selectedOrder.user_id,
                          title: "Order Confirmed",
                          message: `Your order #${selectedOrder.order_number} has been confirmed and is being processed.`,
                          type: "order",
                          priority: "high",
                          link_url: "/orders",
                          icon: "✅",
                        });
                        toast.success("Order confirmed & customer notified");
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm Order
                    </Button>
                    <Button
                      variant="destructive"
                      className="gap-1.5"
                      onClick={async () => {
                        updateStatus.mutate({ id: selectedOrder.id, status: "cancelled" });
                        setSelectedOrder({ ...selectedOrder, status: "cancelled" });
                        await supabase.from("notifications").insert({
                          user_id: selectedOrder.user_id,
                          title: "Order Cancelled",
                          message: `Your order #${selectedOrder.order_number} has been cancelled. Please contact support for details.`,
                          type: "order",
                          priority: "high",
                          link_url: "/orders",
                          icon: "❌",
                        });
                        toast.success("Order cancelled & customer notified");
                      }}
                    >
                      <XCircle className="w-4 h-4" /> Reject
                    </Button>
                  </div>
                </div>
              )}

              {/* Google Docs Archive */}
              <OrderGoogleDocs orderId={selectedOrder.id} orderNumber={selectedOrder.order_number} />

              {/* Invoice Actions */}
              <div className="border-t border-border pt-4 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={invoiceLoading}
                  onClick={async () => {
                    setInvoiceLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-invoice", {
                        body: { order_id: selectedOrder.id },
                      });
                      if (error || !data?.invoice_html) {
                        toast.error("Failed to generate invoice");
                      } else {
                        const win = window.open("", "_blank");
                        if (win) {
                          win.document.write(data.invoice_html);
                          win.document.close();
                        }
                      }
                    } catch {
                      toast.error("Invoice generation failed");
                    }
                    setInvoiceLoading(false);
                  }}
                >
                  <FileText className="w-4 h-4" /> View Invoice
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={invoiceLoading}
                  onClick={async () => {
                    setInvoiceLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-invoice", {
                        body: { order_id: selectedOrder.id },
                      });
                      if (error || !data?.invoice_html) {
                        toast.error("Failed to generate invoice");
                      } else {
                        const win = window.open("", "_blank");
                        if (win) {
                          win.document.write(data.invoice_html);
                          win.document.close();
                          setTimeout(() => win.print(), 500);
                        }
                      }
                    } catch {
                      toast.error("Print failed");
                    }
                    setInvoiceLoading(false);
                  }}
                >
                  <Printer className="w-4 h-4" /> Print Invoice
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  disabled={invoiceLoading}
                  onClick={async () => {
                    setInvoiceLoading(true);
                    try {
                      const { data, error } = await supabase.functions.invoke("generate-invoice", {
                        body: { order_id: selectedOrder.id, send_email: true },
                      });
                      if (error) {
                        toast.error("Failed to send invoice");
                      } else {
                        await supabase.from("notifications").insert({
                          user_id: selectedOrder.user_id,
                          title: "Invoice Sent",
                          message: `Invoice for order #${selectedOrder.order_number} has been sent to your email.`,
                          type: "order",
                          icon: "📧",
                          link_url: "/orders",
                        });
                        toast.success("Invoice sent to customer");
                      }
                    } catch {
                      toast.error("Failed to send invoice");
                    }
                    setInvoiceLoading(false);
                  }}
                >
                  <Mail className="w-4 h-4" /> Email Invoice
                </Button>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setCourierOpen(true)}
                >
                  <Truck className="w-4 h-4" /> Push to Courier
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {selectedOrder && (
        <CourierPushDialog
          open={courierOpen}
          onOpenChange={setCourierOpen}
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.order_number}
        />
      )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminOrders;
