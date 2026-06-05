"use client";
import React, { useState } from "react";
import { Link } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Minus, Plus, ShoppingBag, ArrowRight, Globe, Tag, Gift,
  Truck, X, CheckCircle2, AlertCircle, Heart, Share2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/lib/app-toast";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StickyActionBar } from "@/components/mobile";

const CartPage: React.FC = () => {
  useSeoMeta("cart", "Cart | Store");
  const { user } = useAuth();
  const { formatPrice, currency, setCurrency, enabledCurrencies, config } = useCurrency();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftMessage, setGiftMessage] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const { data: cartItems, isLoading } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(id, name, price, compare_at_price, thumbnail, slug, stock_quantity), product_variants(id, size, color, price_override, stock_quantity)")
        .eq("user_id", user!.id)
        .order("created_at");
      return data || [];
    },
    enabled: !!user,
  });

  const { data: shippingMethods } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  // Fetch available coupons to show to user
  const { data: availableCoupons } = useQuery({
    queryKey: ["available-coupons"],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("code, description, discount_type, discount_value, min_order_amount, max_discount_amount, first_order_only, target_categories, target_products")
        .eq("is_active", true);
      // Filter out expired and future ones client-side (RLS already filters is_active)
      return (data || []).filter(c => !c.first_order_only); // Don't show first-order-only to avoid confusion
    },
    staleTime: 5 * 60 * 1000,
  });

  const [showCoupons, setShowCoupons] = useState(false);
  const [selectedShipping, setSelectedShipping] = useState<string | null>(null);

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) await supabase.from("cart_items").delete().eq("id", id);
      else await supabase.from("cart_items").update({ quantity }).eq("id", id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => { await supabase.from("cart_items").delete().eq("id", id); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    },
  });

  const moveToWishlist = async (productId: string, cartItemId: string) => {
    if (!user) return;
    const { data: existing } = await supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", productId).maybeSingle();
    if (!existing) await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: productId });
    await supabase.from("cart_items").delete().eq("id", cartItemId);
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["cart-count"] });
    queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    toast({ title: "Moved to wishlist" });
  };

  const subtotal = cartItems?.reduce((sum, item) => {
    const product = item.products as any;
    const variant = (item as any).product_variants as any;
    const price = variant?.price_override ?? product?.price ?? 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    const { data, error } = await supabase.from("coupons").select("*").eq("code", couponCode.trim().toUpperCase()).eq("is_active", true).maybeSingle();
    setCouponLoading(false);
    if (!data || error) { toast({ title: "Invalid coupon code", variant: "destructive" }); return; }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { toast({ title: "Coupon expired", variant: "destructive" }); return; }
    if (data.starts_at && new Date(data.starts_at) > new Date()) { toast({ title: "Coupon not yet active", variant: "destructive" }); return; }
    if (data.usage_limit && (data.used_count ?? 0) >= data.usage_limit) { toast({ title: "Coupon usage limit reached", variant: "destructive" }); return; }
    if (data.min_order_amount && subtotal < Number(data.min_order_amount)) { toast({ title: `Min order ${formatPrice(Number(data.min_order_amount))}`, variant: "destructive" }); return; }

    // Check min items
    const itemCount = cartItems?.reduce((s, i) => s + i.quantity, 0) || 0;
    if ((data as any).min_items && itemCount < (data as any).min_items) { toast({ title: `Minimum ${(data as any).min_items} items required`, variant: "destructive" }); return; }

    // Check category targeting
    const targetCats = (data as any).target_categories as string[] || [];
    if (targetCats.length > 0 && cartItems) {
      const cartCatIds = new Set(cartItems.map(i => (i.products as any)?.category_id).filter(Boolean));
      const hasMatchingCat = targetCats.some(c => cartCatIds.has(c));
      if (!hasMatchingCat) { toast({ title: "Coupon not applicable to items in your cart", variant: "destructive" }); return; }
    }

    // Check product targeting
    const targetProds = (data as any).target_products as string[] || [];
    if (targetProds.length > 0 && cartItems) {
      const cartProdIds = new Set(cartItems.map(i => i.product_id));
      const hasMatchingProd = targetProds.some(p => cartProdIds.has(p));
      if (!hasMatchingProd) { toast({ title: "Coupon not applicable to items in your cart", variant: "destructive" }); return; }
    }

    // Check first order only
    if ((data as any).first_order_only && user) {
      const { count } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("user_id", user.id);
      if ((count || 0) > 0) { toast({ title: "This coupon is only for first-time orders", variant: "destructive" }); return; }
    }

    setAppliedCoupon(data);
    toast({ title: "Coupon applied!", description: data.description || `${data.discount_type === "percentage" ? `${data.discount_value}% off` : formatPrice(Number(data.discount_value)) + " off"}` });
  };

  const removeCoupon = () => { setAppliedCoupon(null); setCouponCode(""); };

  // Auto-select first shipping
  React.useEffect(() => {
    if (shippingMethods?.length && !selectedShipping) setSelectedShipping(shippingMethods[0].id);
  }, [shippingMethods, selectedShipping]);

  if (!user) {
    return (
      <div className="min-h-screen pb-20 lg:pb-0">
          <div className="container mx-auto px-4 py-20 text-center">
          <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold font-display text-foreground mb-2">{t("nav.cart")}</h1>
          <p className="text-muted-foreground mb-6">Please sign in to view your cart</p>
          <Link to="/auth" className="btn-pill bg-gradient-primary text-primary-foreground font-semibold px-8 py-3 inline-flex items-center gap-2">{t("nav.signIn")} <ArrowRight className="w-4 h-4" /></Link>
        </div>
      </div>
    );
  }

  const itemCount = cartItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  // Coupon discount
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      couponDiscount = subtotal * (Number(appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(appliedCoupon.max_discount_amount));
    } else {
      couponDiscount = Number(appliedCoupon.discount_value);
    }
  }

  // Shipping
  const shipping = shippingMethods?.find((m) => m.id === selectedShipping) || shippingMethods?.[0];
  const shippingFee = shipping ? (shipping.min_order_free && subtotal >= Number(shipping.min_order_free) ? 0 : Number(shipping.price)) : 0;

  const giftWrapFee = giftWrap ? 50 : 0;
  const total = Math.max(0, subtotal - couponDiscount + shippingFee + giftWrapFee);

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <main className="container mx-auto px-4 py-8 sm:py-12 max-w-7xl">
        <div className="flex items-end justify-between mb-8 sm:mb-12 pb-6 border-b border-border/40">
          <div>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-primary font-medium mb-2">Your Selection</p>
            <h1 className="text-3xl sm:text-5xl font-display font-normal tracking-tight text-foreground">{t("nav.cart")}</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{itemCount} item{itemCount !== 1 ? "s" : ""}</p>
        </div>


        {isLoading ? (
          <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="glass rounded-3xl p-6 h-28 animate-pulse" />)}</div>
        ) : !cartItems || cartItems.length === 0 ? (
          <div className="text-center py-20">
            <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">{t("cart.empty")}</p>
            <Link to="/inventory" className="btn-pill bg-gradient-primary text-primary-foreground font-semibold px-8 py-3 mt-6 inline-flex items-center gap-2">{t("cart.continueShopping")} <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {/* Cart Items */}
              <AnimatePresence>
                {cartItems.map((item) => {
                  const product = item.products as any;
                  const variant = (item as any).product_variants as any;
                  if (!product) return null;
                  const itemPrice = variant?.price_override ?? product.price;
                  const variantLabel = [variant?.size, variant?.color].filter(Boolean).join(" / ");
                  const maxQty = variant?.stock_quantity ?? product.stock_quantity;
                  const savings = product.compare_at_price ? (Number(product.compare_at_price) - itemPrice) * item.quantity : 0;

                  return (
                    <motion.div key={item.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -100 }} className="border-b border-border/40 pb-5 sm:pb-6 last:border-b-0">
                      <div className="flex gap-4 sm:gap-6">
                        <Link to={`/product/${product.slug}`} className="w-24 h-32 sm:w-32 sm:h-40 overflow-hidden shrink-0 bg-secondary/20">
                          <img src={product.thumbnail || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
                        </Link>
                        <div className="flex-1 min-w-0 flex flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <Link to={`/product/${product.slug}`} className="font-display text-base sm:text-xl text-foreground hover:text-primary transition-colors line-clamp-2 leading-tight">{product.name}</Link>
                              {variantLabel && <p className="text-[10px] sm:text-xs uppercase tracking-[0.15em] text-muted-foreground mt-1.5">{variantLabel}</p>}
                            </div>
                            <span className="font-display text-base sm:text-lg text-foreground whitespace-nowrap">{formatPrice(itemPrice * item.quantity)}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs sm:text-sm text-muted-foreground">{formatPrice(itemPrice)} each</span>
                            {product.compare_at_price && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground/60 line-through">{formatPrice(product.compare_at_price)}</span>
                            )}
                          </div>
                          {savings > 0 && <p className="text-[10px] sm:text-xs text-green-500 mt-0.5">You save {formatPrice(savings)}</p>}
                          {maxQty <= 5 && <p className="text-[10px] sm:text-xs text-orange-400 mt-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Only {maxQty} left</p>}
                          <div className="flex items-center justify-between mt-auto pt-3">
                            <div className="flex items-center border border-border/60 rounded-none">
                              <button onClick={() => updateQty.mutate({ id: item.id, quantity: item.quantity - 1 })} className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/40"><Minus className="w-3 h-3" /></button>
                              <span className="w-8 text-center text-xs sm:text-sm font-medium text-foreground tabular-nums">{item.quantity}</span>
                              <button onClick={() => updateQty.mutate({ id: item.id, quantity: Math.min(maxQty, item.quantity + 1) })} disabled={item.quantity >= maxQty} className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary/40 disabled:opacity-30"><Plus className="w-3 h-3" /></button>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => moveToWishlist(product.id, item.id)} className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground hover:text-primary flex items-center gap-1.5" title="Move to wishlist">
                                <Heart className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span>
                              </button>
                              <button onClick={() => removeItem.mutate(item.id)} className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground hover:text-destructive flex items-center gap-1.5">
                                <Trash2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Remove</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                  );
                })}
              </AnimatePresence>

              {/* Shipping Methods */}
              {shippingMethods && shippingMethods.length > 0 && (
                <div className="glass-strong rounded-3xl p-5 space-y-3">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><Truck className="w-5 h-5 text-primary" /> Shipping Method</h3>
                  <div className="space-y-2">
                    {shippingMethods.map((method) => {
                      const isFree = method.min_order_free && subtotal >= Number(method.min_order_free);
                      return (
                        <button key={method.id} onClick={() => setSelectedShipping(method.id)}
                          className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${selectedShipping === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedShipping === method.id ? "border-primary" : "border-muted-foreground"}`}>
                              {selectedShipping === method.id && <div className="w-2 h-2 rounded-full bg-primary" />}
                            </div>
                            <div className="text-left">
                              <p className="text-sm font-medium text-foreground">{method.name}</p>
                              <p className="text-xs text-muted-foreground">{method.estimated_days}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            {isFree ? <Badge className="text-[10px]">Free</Badge> : <span className="text-sm font-medium text-foreground">{formatPrice(Number(method.price))}</span>}
                            {method.min_order_free && !isFree && <p className="text-[10px] text-muted-foreground">Free over {formatPrice(Number(method.min_order_free))}</p>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Gift Wrap & Notes */}
              <div className="glass-strong rounded-3xl p-5 space-y-4">
                <button onClick={() => setGiftWrap(!giftWrap)} className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${giftWrap ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                  <div className="flex items-center gap-3">
                    <Gift className={`w-5 h-5 ${giftWrap ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Gift Wrap</p>
                      <p className="text-xs text-muted-foreground">Premium gift wrapping + card</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-foreground">{formatPrice(50)}</span>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${giftWrap ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                      {giftWrap && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                    </div>
                  </div>
                </button>
                {giftWrap && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                    <textarea value={giftMessage} onChange={(e) => setGiftMessage(e.target.value)} placeholder="Add a gift message (optional)..." rows={2}
                      className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
                  </motion.div>
                )}
                <textarea value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} placeholder="Special instructions for your order (optional)..." rows={2}
                  className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="space-y-4">
              <div className="border border-border/60 rounded-lg p-5 sm:p-6 sticky top-24 space-y-5 bg-background/40 backdrop-blur-sm">
                <div className="pb-4 border-b border-border/40">
                  <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-medium mb-1">Summary</p>
                  <h3 className="font-display text-xl text-foreground">Order Total</h3>
                </div>


                {/* Coupon */}
                <div className="space-y-2">
                  {appliedCoupon ? (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-green-500/10 border border-green-500/30">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-sm font-medium text-green-500">{appliedCoupon.code}</p>
                          <p className="text-[10px] text-green-500/70">{appliedCoupon.description}</p>
                        </div>
                      </div>
                      <button onClick={removeCoupon} className="p-1 rounded-full hover:bg-secondary/50"><X className="w-4 h-4 text-muted-foreground" /></button>
                    </div>
                  ) : (
                     <div className="flex gap-2">
                      <Input value={couponCode} onChange={(e) => setCouponCode(e.target.value.toUpperCase())} placeholder="Coupon code" className="rounded-xl text-sm" onKeyDown={(e) => e.key === "Enter" && applyCoupon()} />
                      <Button size="sm" onClick={applyCoupon} disabled={couponLoading} className="rounded-xl px-4 whitespace-nowrap">
                        {couponLoading ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                  )}
                  {!appliedCoupon && availableCoupons && availableCoupons.length > 0 && (
                    <div>
                      <button onClick={() => setShowCoupons(!showCoupons)} className="text-xs text-primary hover:underline flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {showCoupons ? "Hide" : "View"} available vouchers ({availableCoupons.length})
                      </button>
                      {showCoupons && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto">
                          {availableCoupons.map(c => (
                            <button key={c.code} onClick={() => { setCouponCode(c.code); setShowCoupons(false); }}
                              className="w-full text-left p-2.5 rounded-xl border border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all">
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-primary">{c.code}</span>
                                <Badge variant="secondary" className="text-[10px]">
                                  {c.discount_type === "percentage" ? `${c.discount_value}% off` : `৳${Number(c.discount_value).toFixed(0)} off`}
                                </Badge>
                              </div>
                              {c.description && <p className="text-[10px] text-muted-foreground mt-0.5">{c.description}</p>}
                              {Number(c.min_order_amount) > 0 && <p className="text-[9px] text-muted-foreground/70">Min order: {formatPrice(Number(c.min_order_amount))}</p>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.subtotal")} ({itemCount})</span><span className="text-foreground">{formatPrice(subtotal)}</span></div>
                  {couponDiscount > 0 && <div className="flex justify-between text-green-500"><span>{t("checkout.discount")}</span><span>-{formatPrice(couponDiscount)}</span></div>}
                  <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.shipping")}</span><span className="text-foreground">{shippingFee === 0 ? <Badge variant="secondary" className="text-[10px]">Free</Badge> : formatPrice(shippingFee)}</span></div>
                  {giftWrap && <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.giftWrap")}</span><span className="text-foreground">{formatPrice(giftWrapFee)}</span></div>}
                </div>

                <div className="border-t border-border pt-4 flex justify-between font-bold text-foreground text-lg">
                  <span>{t("checkout.orderTotal")}</span><span>{formatPrice(total)}</span>
                </div>

                {/* Currency converter */}
                {enabledCurrencies.length > 1 && (
                  <div className="rounded-2xl border border-border/50 bg-secondary/20 p-3 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> View in other currencies</p>
                    <div className="flex flex-wrap gap-2">
                      {enabledCurrencies.filter((c) => c.code !== currency).map((c) => {
                        const rate = config.exchange_rates[c.code];
                        if (!rate && c.code !== config.default_currency) return null;
                        const converted = c.code === config.default_currency ? total : total * rate;
                        const noDecimal = ["JPY", "KRW", "VND", "IRR"].includes(c.code);
                        return (
                          <button key={c.code} onClick={() => setCurrency(c.code)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/40 bg-background/50 hover:border-primary/40 hover:bg-primary/5 transition-all text-sm">
                            <span className="font-display">{c.symbol}</span>
                            <span className="text-foreground font-medium">{converted.toLocaleString(undefined, { minimumFractionDigits: noDecimal ? 0 : 2, maximumFractionDigits: noDecimal ? 0 : 2 })}</span>
                            <span className="text-muted-foreground text-xs">{c.code}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Link to="/checkout" state={{ coupon: appliedCoupon, giftWrap, giftMessage, orderNotes, shippingMethodId: selectedShipping }} className="hidden md:block">
                  <motion.span whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                    className="w-full bg-primary text-primary-foreground font-medium uppercase tracking-[0.2em] text-xs sm:text-sm py-4 flex items-center justify-center gap-2 rounded-md hover:bg-primary/90 transition-colors">
                    Proceed to Checkout <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </Link>

                <p className="hidden md:block text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Secure Checkout</p>
              </div>
            </div>

          </div>
        )}
        {/* Mobile-only sticky checkout action bar */}
        {cartItems && cartItems.length > 0 && (
          <div className="md:hidden h-32" aria-hidden="true" />
        )}
      </main>
      {cartItems && cartItems.length > 0 && (
        <StickyActionBar aboveBottomNav className="md:hidden">
          <Link
            to="/checkout"
            state={{ coupon: appliedCoupon, giftWrap, giftMessage, orderNotes, shippingMethodId: selectedShipping }}
            className="block"
          >
            <motion.span
              whileTap={{ scale: 0.98 }}
              className="w-full bg-primary text-primary-foreground font-semibold text-sm py-3.5 flex items-center justify-center gap-2 rounded-xl"
            >
              Checkout · {formatPrice(total)} <ArrowRight className="w-4 h-4" />
            </motion.span>
          </Link>
        </StickyActionBar>
      )}
    </div>
  );
};

export default CartPage;
