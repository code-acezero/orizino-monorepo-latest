"use client";
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { ClientOnly } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  MapPin, CreditCard, Truck, Check, ArrowRight, Gift, Tag, Shield,
  Smartphone, Building2, Wallet, ChevronDown, ChevronUp, Home, MapPinned, Camera
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { notifyNewOrder } from "@/lib/order-notifications.functions";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import MFSPaymentProof from "@/components/checkout/MFSPaymentProof";
const StripeCardPayment = React.lazy(() => import("@/components/checkout/StripeCardPayment"));
import { useUserAddresses } from "@/hooks/use-user-addresses";
import { useUserLoyalty, useLoyaltyTiers, computeTierProgress } from "@/hooks/use-loyalty";
import { Award } from "lucide-react";
import { StickyActionBar } from "@/components/mobile";

const MFS_METHODS = ["bkash", "nagad", "upay", "rocket"];

const addressTypeIcons: Record<string, any> = { home: Home, office: Building2, other: MapPinned };

const CheckoutPage: React.FC = () => {
  useSeoMeta("checkout", "Checkout");
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const cartState = location.state as any || {};
  const isBuyNow = !!cartState.buyNow;

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [address, setAddress] = useState({ full_name: "", phone: "", street: "", city: "", state: "", zip: "", country: "Bangladesh" });
  const [notes, setNotes] = useState(cartState.orderNotes || "");
  const [giftWrap, setGiftWrap] = useState(cartState.giftWrap || false);
  const [giftMessage, setGiftMessage] = useState(cartState.giftMessage || "");
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddress, setSelectedSavedAddress] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(true);
  const [step, setStep] = useState(1);
  const [mfsProofData, setMfsProofData] = useState<{ screenshotUrl: string; transactionId: string } | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Fetch payment gateway config
  const { data: paymentConfig } = useQuery({
    queryKey: ["payment-gateways-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "payment_gateways_config").maybeSingle();
      return (data?.value as any) || {};
    },
    staleTime: 5 * 60 * 1000,
  });

  // Build available payment methods dynamically
  const availableGateways = React.useMemo(() => {
    const gateways: { id: string; name: string; desc: string; icon: any; color: string }[] = [];

    // COD is always available unless system is off
    if (!paymentConfig?.mfs_system_enabled || paymentConfig?.cod_enabled !== false) {
      gateways.push({ id: "cod", name: "Cash on Delivery", desc: "Pay when you receive", icon: Truck, color: "text-green-500" });
    }

    // MFS personal accounts
    if (paymentConfig?.personal_bkash?.enabled) {
      gateways.push({ id: "bkash", name: "bKash", desc: "Send money & upload proof", icon: Smartphone, color: "text-pink-500" });
    }
    if (paymentConfig?.personal_nagad?.enabled) {
      gateways.push({ id: "nagad", name: "Nagad", desc: "Send money & upload proof", icon: Smartphone, color: "text-orange-500" });
    }
    if (paymentConfig?.personal_upay?.enabled) {
      gateways.push({ id: "upay", name: "Upay", desc: "Send money & upload proof", icon: Smartphone, color: "text-blue-500" });
    }
    if (paymentConfig?.personal_rocket?.enabled) {
      gateways.push({ id: "rocket", name: "Rocket", desc: "Send money & upload proof", icon: Smartphone, color: "text-purple-500" });
    }

    // Stripe
    if (paymentConfig?.stripe?.enabled) {
      gateways.push({ id: "card", name: "Credit/Debit Card", desc: "Visa, Mastercard, AMEX", icon: CreditCard, color: "text-purple-500" });
    }

    return gateways;
  }, [paymentConfig]);

  // Auto-select first available method
  useEffect(() => {
    if (availableGateways.length > 0 && !availableGateways.find(g => g.id === paymentMethod)) {
      setPaymentMethod(availableGateways[0].id);
    }
  }, [availableGateways, paymentMethod]);

  // Load user's saved payment methods to auto-pick default at step 2
  const { data: savedPaymentMethods = [] } = useQuery({
    queryKey: ["user_payment_methods", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("user_payment_methods" as any)
        .select("provider, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false });
      return (data || []) as unknown as Array<{ provider: string; is_default: boolean }>;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const [paymentAutoPicked, setPaymentAutoPicked] = useState(false);
  useEffect(() => {
    if (step !== 2 || paymentAutoPicked || availableGateways.length === 0 || savedPaymentMethods.length === 0) return;
    const def = savedPaymentMethods.find((m) => m.is_default) || savedPaymentMethods[0];
    if (def && availableGateways.find((g) => g.id === def.provider)) {
      setPaymentMethod(def.provider);
    }
    setPaymentAutoPicked(true);
  }, [step, savedPaymentMethods, availableGateways, paymentAutoPicked]);

  const isMFSMethod = MFS_METHODS.includes(paymentMethod);
  const mfsAccountInfo = paymentConfig?.[`personal_${paymentMethod}`] as any;

  // Load saved addresses from relational table
  const { data: userAddresses = [] } = useUserAddresses();

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, phone, address").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setAddress((prev) => ({
          ...prev,
          full_name: prev.full_name || data.full_name || "",
          phone: prev.phone || data.phone || "",
        }));
      }
    });
  }, [user]);

  // When saved addresses load, auto-select default
  useEffect(() => {
    if (userAddresses.length === 0 || selectedSavedAddress) return;
    const mapped = userAddresses.map((a) => ({
      id: a.id,
      label: a.label,
      type: a.address_type,
      name: a.full_name,
      phone: a.phone,
      street: [a.address_line1, a.address_line2].filter(Boolean).join(", "),
      city: a.city,
      state: a.area || "",
      zip: a.postal_code || "",
      country: a.country,
      isDefault: a.is_default,
    }));
    setSavedAddresses(mapped);
    const def = mapped.find((a) => a.isDefault) || mapped[0];
    if (def) {
      setSelectedSavedAddress(def.id);
      setAddress({
        full_name: def.name,
        phone: def.phone,
        street: def.street,
        city: def.city,
        state: def.state,
        zip: def.zip,
        country: def.country,
      });
      setShowAddressForm(false);
    }
  }, [userAddresses, selectedSavedAddress]);

  const selectSavedAddress = (addr: any) => {
    setSelectedSavedAddress(addr.id);
    setAddress({
      full_name: addr.name || "",
      phone: addr.phone || "",
      street: addr.street || "",
      city: addr.city || "",
      state: addr.state || "",
      zip: addr.zip || "",
      country: addr.country || "Bangladesh",
    });
    setShowAddressForm(false);
  };

  const buyNowItems = isBuyNow && cartState.buyNowItem ? [{
    id: "buy-now",
    product_id: cartState.buyNowItem.productId,
    quantity: cartState.buyNowItem.quantity,
    variant_id: cartState.buyNowItem.variantId,
    products: {
      id: cartState.buyNowItem.productId,
      name: cartState.buyNowItem.name,
      price: cartState.buyNowItem.price,
      thumbnail: cartState.buyNowItem.thumbnail,
      stock_quantity: 999,
    },
    product_variants: cartState.buyNowItem.variantId ? {
      id: cartState.buyNowItem.variantId,
      size: cartState.buyNowItem.selectedSize ?? null,
      color: cartState.buyNowItem.selectedColor ?? null,
      price_override: cartState.buyNowItem.price,
    } : null,
  }] : null;

  const { data: fetchedCartItems } = useQuery({
    queryKey: ["cart", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("cart_items")
        .select("*, products(id, name, price, thumbnail, stock_quantity), product_variants(id, size, color, price_override)")
        .eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user && !isBuyNow,
  });

  const cartItems = isBuyNow ? buyNowItems : fetchedCartItems;

  const { data: shippingMethods } = useQuery({
    queryKey: ["shipping-methods"],
    queryFn: async () => {
      const { data } = await supabase.from("shipping_methods").select("*").eq("is_active", true).order("sort_order");
      return data || [];
    },
  });

  const { data: deliveryOffers } = useQuery({
    queryKey: ["delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_offers").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const subtotal = cartItems?.reduce((sum, item) => {
    const variant = (item as any).product_variants as any;
    const price = variant?.price_override ?? (item.products as any)?.price ?? 0;
    return sum + price * item.quantity;
  }, 0) || 0;

  const appliedCoupon = cartState.coupon;
  let couponDiscount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discount_type === "percentage") {
      couponDiscount = subtotal * (Number(appliedCoupon.discount_value) / 100);
      if (appliedCoupon.max_discount_amount) couponDiscount = Math.min(couponDiscount, Number(appliedCoupon.max_discount_amount));
    } else couponDiscount = Number(appliedCoupon.discount_value);
  }

  const shippingMethodId = cartState.shippingMethodId;
  const selectedShipping = shippingMethods?.find((m) => m.id === shippingMethodId) || shippingMethods?.[0];
  // Base shipping fee from the selected shipping method (customer-facing).
  // Courier carrier is decided by admin after order placement, so we don't
  // expose a per-courier price here — we use the storefront shipping method
  // as the customer-facing rate, and admin reconciles actual courier cost
  // internally on the order detail page.
  let baseShippingFee = selectedShipping
    ? (selectedShipping.min_order_free && subtotal >= Number(selectedShipping.min_order_free)
        ? 0
        : Number(selectedShipping.price))
    : 0;

  // Find the best matching active delivery offer for this cart/destination.
  // When a free_delivery offer applies, the customer sees Delivery: Free and
  // the shop absorbs the actual cost internally (recorded on the order at
  // courier-assignment time by the admin).
  let deliveryDiscount = 0;
  let appliedDeliveryOffer: any = null;
  if (deliveryOffers) {
    for (const offer of deliveryOffers) {
      if (Number(offer.min_order_amount) > 0 && subtotal < Number(offer.min_order_amount)) continue;
      const areas: string[] = offer.target_areas || [];
      if (areas.length > 0 && address.city) {
        const cityLower = address.city.toLowerCase();
        if (!areas.some((a: string) => cityLower.includes(a.toLowerCase()))) continue;
      }
      let disc = 0;
      if (offer.offer_type === "free_delivery") disc = Math.max(baseShippingFee, 1); // wins even when base is 0
      else if (offer.offer_type === "reduced_delivery") disc = Math.min(Number(offer.discount_value), baseShippingFee);
      else if (offer.offer_type === "flat_rate") disc = Math.max(0, baseShippingFee - Number(offer.discount_value));
      if (disc >= deliveryDiscount) { deliveryDiscount = disc; appliedDeliveryOffer = offer; }
    }
  }
  // free_delivery clamps shipping to 0; other types subtract from base.
  const shippingFee = appliedDeliveryOffer?.offer_type === "free_delivery"
    ? 0
    : Math.max(0, baseShippingFee - deliveryDiscount);
  const giftWrapFee = giftWrap ? 50 : 0;

  // Loyalty tier auto-discount
  const { data: userLoyalty } = useUserLoyalty();
  const { data: loyaltyTiers } = useLoyaltyTiers();
  const tierInfo = computeTierProgress(userLoyalty, loyaltyTiers);
  const tierDiscountPct = Number(tierInfo?.current?.discount_percentage || 0);
  const tierDiscount = tierDiscountPct > 0 ? (subtotal - couponDiscount) * (tierDiscountPct / 100) : 0;

  // Loyalty points redemption (1 point = 1 BDT)
  const pointsBalance = Number(userLoyalty?.points_balance || 0);
  const maxRedeemable = Math.min(
    pointsBalance,
    Math.max(0, Math.floor(subtotal - couponDiscount - tierDiscount))
  );
  const safePointsRedeemed = Math.min(Math.max(0, Math.floor(pointsToRedeem)), maxRedeemable);
  const pointsDiscount = safePointsRedeemed;
  const loyaltyDiscount = tierDiscount + pointsDiscount;

  const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount + shippingFee + giftWrapFee);

  const canProceedToReview = () => {
    if (isMFSMethod && !mfsProofData) return false;
    return true;
  };

  const handleOrder = async (eOrPiId?: React.FormEvent | string) => {
    // Allow being called directly with a Stripe PaymentIntent id (from <StripeCardPayment onSuccess>).
    let stripePaymentIntentId: string | null = null;
    if (typeof eOrPiId === "string") {
      stripePaymentIntentId = eOrPiId;
    } else if (eOrPiId && "preventDefault" in eOrPiId) {
      eOrPiId.preventDefault();
    }
    if (!user || !cartItems?.length) return;
    if (!address.full_name || !address.phone || !address.street || !address.city) {
      toast({ title: "Please fill in all required address fields", variant: "destructive" });
      setStep(1);
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-order", {
      body: {
        shipping_address: address,
        notes,
        payment_method: paymentMethod,
        coupon_code: appliedCoupon?.code,
        coupon_discount: couponDiscount,
        gift_wrap: giftWrap,
        gift_message: giftMessage,
        shipping_method_id: selectedShipping?.id,
        buy_now_item: isBuyNow ? cartState.buyNowItem : null,
        transaction_id: stripePaymentIntentId || mfsProofData?.transactionId || null,
        preferred_courier: null,
        hub_pickup: false,
        pickup_hub_id: null,
        shipping_fee_override: shippingFee,
        loyalty_discount: loyaltyDiscount,
        loyalty_points_used: safePointsRedeemed,
      },
    });


    if (error || !data?.success) {
      setLoading(false);
      toast({ title: "Order failed", description: data?.error || "Something went wrong", variant: "destructive" });
      return;
    }

    // Lookup the new order id (used for notifications + optional payment proof)
    const { data: orderRow } = await supabase
      .from("orders")
      .select("id")
      .eq("order_number", data.order_number)
      .single();

    // Silently record delivery offer accounting (customer doesn't see this).
    if (orderRow?.id && appliedDeliveryOffer) {
      const absorbed = appliedDeliveryOffer.offer_type === "free_delivery"
        ? baseShippingFee
        : Math.max(0, baseShippingFee - shippingFee);
      await supabase
        .from("orders")
        .update({
          delivery_offer_id: appliedDeliveryOffer.id,
          delivery_cost_actual: baseShippingFee,
          margin_absorbed: absorbed,
        } as any)
        .eq("id", orderRow.id);
    }

    // Fire notifications (Telegram + customer email) in background
    if (orderRow?.id) {
      notifyNewOrder({ data: { order_id: orderRow.id } }).catch((e) =>
        console.warn("[checkout] notifyNewOrder failed", e),
      );
    }

    // If MFS, create payment proof record and sync to sheets
    if (isMFSMethod && mfsProofData && orderRow) {
      const { data: proofRow } = await supabase.from("payment_proofs").insert({
        order_id: orderRow.id,
        user_id: user.id,
        payment_method: paymentMethod,
        screenshot_url: mfsProofData.screenshotUrl,
        transaction_id: mfsProofData.transactionId || null,
        amount: total,
        customer_name: address.full_name,
        customer_phone: address.phone,
      }).select("id").single();

      // Sync to Google Sheets in background
      if (proofRow) {
        supabase.functions.invoke("sync-payment-proof", {
          body: { proof_id: proofRow.id },
        }).catch(console.error);
      }
    }

    setLoading(false);

    if (isMFSMethod) {
      setOrderSuccess(data.order_number);
    } else {
      toast({ title: "🎉 Order placed!", description: `Order ${data.order_number} confirmed.` });
      navigate("/orders");
    }
  };

  if (!user) { navigate("/auth"); return null; }

  // Success screen for MFS orders
  if (orderSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center pb-20 lg:pb-0">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md mx-auto px-6 space-y-6">
          <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">Order Placed!</h1>
          <p className="text-muted-foreground">
            Your order <span className="font-mono font-bold text-foreground">{orderSuccess}</span> has been placed successfully.
          </p>
          <div className="glass-strong rounded-2xl p-4 text-sm text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">📞 What happens next?</p>
            <p>You'll receive a confirmation call within <strong className="text-foreground">24 hours</strong> to verify your order and payment.</p>
            <p>Your order will be confirmed once our team reviews the payment proof.</p>
          </div>
          <Button onClick={() => navigate("/orders")} className="rounded-xl h-11 w-full">
            View My Orders <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "Address", icon: MapPin },
    { num: 2, label: "Payment", icon: CreditCard },
    { num: 3, label: "Review", icon: Check },
  ];

  return (
    <div className="min-h-screen pb-40 md:pb-0">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-3xl font-bold font-display text-foreground mb-6">Checkout</h1>





        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <React.Fragment key={s.num}>
              <button onClick={() => setStep(s.num)} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${step >= s.num ? "text-primary" : "text-muted-foreground"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s.num ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
              </button>
              {i < steps.length - 1 && <div className={`h-0.5 w-8 sm:w-16 ${step > s.num ? "bg-primary" : "bg-border"}`} />}
            </React.Fragment>
          ))}
        </div>

        <form onSubmit={handleOrder} className="grid md:grid-cols-5 gap-8">
          <div className="md:col-span-3 space-y-6">
            {/* Step 1: Address */}
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                {savedAddresses.length > 0 && (
                  <div className="glass-strong rounded-3xl p-5 space-y-3">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Saved Addresses</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedAddresses.map((addr: any) => {
                        const TypeIcon = addressTypeIcons[addr.type] || MapPinned;
                        return (
                          <button key={addr.id} type="button" onClick={() => selectSavedAddress(addr)}
                            className={`text-left p-3 rounded-2xl border transition-all ${selectedSavedAddress === addr.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                            <div className="flex items-center gap-2 mb-1">
                              <TypeIcon className="w-4 h-4 text-primary" />
                              <span className="text-sm font-medium text-foreground">{addr.label || addr.type}</span>
                              {addr.isDefault && <Badge className="text-[9px]">Default</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{addr.street}, {addr.city}</p>
                          </button>
                        );
                      })}
                    </div>
                    <button type="button" onClick={() => { setSelectedSavedAddress(null); setShowAddressForm(true); }} className="text-sm text-primary hover:underline">
                      + Use a different address
                    </button>
                  </div>
                )}

                {(showAddressForm || savedAddresses.length === 0) && (
                  <div className="glass-strong rounded-3xl p-5 space-y-4">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><MapPin className="w-5 h-5 text-primary" /> Shipping Address</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Full Name *</Label>
                        <Input value={address.full_name} onChange={(e) => setAddress({ ...address, full_name: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Phone *</Label>
                        <Input value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <Label className="text-xs text-muted-foreground">Street Address *</Label>
                        <Input value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">City *</Label>
                        <Input value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} required className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">District / State</Label>
                        <Input value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">ZIP Code</Label>
                        <Input value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Country</Label>
                        <Input value={address.country} onChange={(e) => setAddress({ ...address, country: e.target.value })} className="rounded-xl" />
                      </div>
                    </div>
                  </div>
                )}

                <Button type="button" onClick={() => setStep(2)} className="w-full rounded-xl h-12">Continue to Payment <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </motion.div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="glass-strong rounded-3xl p-5 space-y-3">
                  <h3 className="font-display font-semibold text-foreground flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Payment Method</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableGateways.map((gw) => (
                      <button key={gw.id} type="button" onClick={() => { setPaymentMethod(gw.id); setMfsProofData(null); }}
                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${paymentMethod === gw.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}>
                        <div className={`w-10 h-10 rounded-xl bg-secondary/50 flex items-center justify-center`}>
                          <gw.icon className={`w-5 h-5 ${gw.color}`} />
                        </div>
                        <div className="text-left flex-1">
                          <p className="text-sm font-medium text-foreground">{gw.name}</p>
                          <p className="text-[11px] text-muted-foreground">{gw.desc}</p>
                        </div>
                        {paymentMethod === gw.id && <Check className="w-5 h-5 text-primary" />}
                      </button>
                    ))}
                  </div>

                  {/* MFS Payment Proof Section */}
                  {isMFSMethod && mfsAccountInfo && (
                    <MFSPaymentProof
                      method={paymentMethod}
                      accountInfo={mfsAccountInfo}
                      amount={total}
                      formatPrice={formatPrice}
                      onProofSubmitted={(screenshotUrl, transactionId) => {
                        setMfsProofData({ screenshotUrl, transactionId });
                      }}
                    />
                  )}

                  {paymentMethod === "cod" && (
                    <div className="p-4 rounded-2xl bg-secondary/30 border border-border">
                      <p className="text-sm text-muted-foreground text-center">Pay with cash when your order is delivered.</p>
                    </div>
                  )}
                </div>

                {/* Delivery info — courier is chosen by admin after order placement. */}
                <div className="glass-strong rounded-3xl p-5 flex items-start gap-3">
                  <Truck className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-foreground">Delivery</p>
                    <p className="text-muted-foreground text-xs mt-0.5">
                      We'll dispatch your order via our own Orizino delivery or a partner courier — chosen for the fastest route to your area.
                      {appliedDeliveryOffer && (
                        <> Your order qualifies for <span className="text-green-500 font-medium">{appliedDeliveryOffer.title}</span>.</>
                      )}
                    </p>
                  </div>
                </div>

                <div className="glass-strong rounded-3xl p-5 space-y-3">
                  <h3 className="text-sm font-medium text-foreground">Order Notes (optional)</h3>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..." rows={2}
                    className="w-full px-4 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none text-sm" />
                </div>

                {/* Loyalty Points Redemption */}
                <div className="glass-strong rounded-3xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
                      <Award className="w-5 h-5 text-amber-500" /> {t("loyalty.redeemPoints")}
                    </h3>
                    <Badge variant="secondary" className="text-[10px]">
                      {t("loyalty.balance")}: {pointsBalance.toLocaleString()}
                    </Badge>
                  </div>
                  {pointsBalance === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      {t("loyalty.noPoints")} — {t("loyalty.earnByOrdering")}.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        {t("loyalty.pointEquivalent")} = {formatPrice(1)}. {t("loyalty.redeemUpTo")} {maxRedeemable.toLocaleString()} {t("loyalty.points")}.
                      </p>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={maxRedeemable}
                          disabled={maxRedeemable === 0}
                          value={pointsToRedeem || ""}
                          onChange={(e) => setPointsToRedeem(Math.min(maxRedeemable, Math.max(0, parseInt(e.target.value || "0", 10))))}
                          placeholder="0"
                          className="rounded-xl flex-1"
                        />
                        <Button type="button" size="sm" variant="outline" disabled={maxRedeemable === 0} onClick={() => setPointsToRedeem(maxRedeemable)} className="rounded-xl">
                          {t("loyalty.max")}
                        </Button>
                        {pointsToRedeem > 0 && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setPointsToRedeem(0)} className="rounded-xl">
                            {t("loyalty.clear")}
                          </Button>
                        )}
                      </div>
                      {safePointsRedeemed > 0 && (
                        <p className="text-xs text-amber-500">
                          {t("loyalty.saving")} {formatPrice(pointsDiscount)} — {safePointsRedeemed.toLocaleString()} {t("loyalty.points")}
                        </p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl h-12">Back</Button>
                  <Button type="button" onClick={() => setStep(3)} disabled={!canProceedToReview()}
                    className="flex-1 rounded-xl h-12">
                    {isMFSMethod && !mfsProofData ? (
                      <><Camera className="w-4 h-4 mr-2" /> Upload proof first</>
                    ) : (
                      <>Review Order <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="glass-strong rounded-3xl p-5 space-y-4">
                  <h3 className="font-display font-semibold text-foreground">Order Review</h3>

                  <div className="p-3 rounded-2xl bg-secondary/30 space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Shipping to:</p>
                    <p className="text-sm text-foreground font-medium">{address.full_name} — {address.phone}</p>
                    <p className="text-sm text-muted-foreground">{address.street}, {address.city}, {address.state} {address.zip}</p>
                  </div>

                  <div className="p-3 rounded-2xl bg-secondary/30">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><CreditCard className="w-3 h-3" /> Payment:</p>
                    <p className="text-sm text-foreground font-medium">{availableGateways.find((g) => g.id === paymentMethod)?.name}</p>
                    {isMFSMethod && mfsProofData && (
                      <p className="text-xs text-green-500 mt-1 flex items-center gap-1"><Check className="w-3 h-3" /> Payment proof submitted</p>
                    )}
                  </div>

                  {selectedShipping && (
                    <div className="p-3 rounded-2xl bg-secondary/30">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Truck className="w-3 h-3" /> Shipping:</p>
                      <p className="text-sm text-foreground font-medium">{selectedShipping.name} — {selectedShipping.estimated_days}</p>
                    </div>
                  )}

                  {giftWrap && (
                    <div className="p-3 rounded-2xl bg-secondary/30">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Gift className="w-3 h-3" /> Gift wrapped</p>
                      {giftMessage && <p className="text-xs text-muted-foreground mt-1">"{giftMessage}"</p>}
                    </div>
                  )}

                  {appliedCoupon && (
                    <div className="p-3 rounded-2xl bg-green-500/10 border border-green-500/20">
                      <p className="text-xs font-medium text-green-500 flex items-center gap-1"><Tag className="w-3 h-3" /> Coupon: {appliedCoupon.code} — {formatPrice(couponDiscount)} off</p>
                    </div>
                  )}
                </div>

                {paymentMethod === "card" ? (
                  <div className="space-y-3">
                    <ClientOnly fallback={<div className="glass-strong rounded-2xl p-6 text-sm text-muted-foreground text-center">Loading secure card form…</div>}>
                      <React.Suspense fallback={<div className="glass-strong rounded-2xl p-6 text-sm text-muted-foreground text-center">Loading secure card form…</div>}>
                        <StripeCardPayment
                          amount={total}
                          currency="USD"
                          description={`Order for ${address.full_name || user?.email || "customer"}`}
                          metadata={{ user_id: user?.id || "", channel: "web-checkout" }}
                          onSuccess={(piId) => handleOrder(piId)}
                          disabled={loading || !cartItems?.length}
                          submitLabel={`Pay ${formatPrice(total)}`}
                        />
                      </React.Suspense>
                    </ClientOnly>
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full rounded-xl h-11">
                      Back
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 rounded-xl h-12">Back</Button>
                    <Button type="submit" disabled={loading || !cartItems?.length} className="flex-1 rounded-xl h-12">
                      {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <>Place Order <ArrowRight className="w-4 h-4 ml-2" /></>}
                    </Button>
                  </div>
                )}

                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Your payment information is secure and encrypted</p>

              </motion.div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="md:col-span-2">
            <div className="glass-strong rounded-3xl p-5 sticky top-24 space-y-4">
              <h3 className="font-display font-semibold text-foreground text-lg">{t("checkout.orderSummary")}</h3>

              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {cartItems?.map((item) => {
                  const product = item.products as any;
                  const variant = (item as any).product_variants as any;
                  if (!product) return null;
                  const price = variant?.price_override ?? product.price;
                  const variantLabel = [variant?.size, variant?.color].filter(Boolean).join(" / ");
                  return (
                    <div key={item.id} className="flex gap-3">
                      <img src={product.thumbnail || "/placeholder.svg"} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground line-clamp-1">{product.name}</p>
                        {variantLabel && <p className="text-xs text-muted-foreground">{variantLabel}</p>}
                        <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                      </div>
                      <span className="text-sm font-medium text-foreground whitespace-nowrap">{formatPrice(price * item.quantity)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.subtotal")}</span><span className="text-foreground">{formatPrice(subtotal)}</span></div>
                {couponDiscount > 0 && <div className="flex justify-between text-green-500"><span>{t("checkout.discount")}</span><span>-{formatPrice(couponDiscount)}</span></div>}
                <div className="flex justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> {t("checkout.shipping")}
                  </span>
                  {shippingFee === 0 ? (
                    <Badge variant="secondary" className="text-[10px] bg-green-500/15 text-green-500 border-0">Free</Badge>
                  ) : (
                    <span className="text-foreground">{formatPrice(shippingFee)}</span>
                  )}
                </div>
                {appliedDeliveryOffer && shippingFee === 0 && (
                  <p className="text-[11px] text-green-500 -mt-1">
                    Applied: {appliedDeliveryOffer.title}
                  </p>
                )}
                {tierDiscount > 0 && (
                  <div className="flex justify-between text-amber-500">
                    <span className="flex items-center gap-1 text-xs"><Award className="w-3 h-3" /> {tierInfo?.current.name} {t("checkout.tierDiscount")} ({tierDiscountPct}%)</span>
                    <span>-{formatPrice(tierDiscount)}</span>
                  </div>
                )}
                {pointsDiscount > 0 && (
                  <div className="flex justify-between text-amber-500">
                    <span className="flex items-center gap-1 text-xs"><Award className="w-3 h-3" /> {t("checkout.points")} ({safePointsRedeemed.toLocaleString()})</span>
                    <span>-{formatPrice(pointsDiscount)}</span>
                  </div>
                )}
                {giftWrap && <div className="flex justify-between"><span className="text-muted-foreground">{t("checkout.giftWrap")}</span><span className="text-foreground">{formatPrice(giftWrapFee)}</span></div>}
              </div>

              <div className="border-t border-border pt-3 flex justify-between font-bold text-foreground text-lg">
                <span>{t("checkout.orderTotal")}</span><span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>

          {/* Mobile sticky CTA — mirrors the active step's primary action */}
          {!(step === 3 && paymentMethod === "card") && (
            <div className="md:hidden">
              <StickyActionBar aboveBottomNav>
                {step === 1 && (
                  <Button type="button" onClick={() => setStep(2)} className="w-full rounded-xl h-12">
                    Continue to Payment <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
                {step === 2 && (
                  <Button
                    type="button"
                    onClick={() => setStep(3)}
                    disabled={!canProceedToReview()}
                    className="w-full rounded-xl h-12"
                  >
                    {isMFSMethod && !mfsProofData ? (
                      <><Camera className="w-4 h-4 mr-2" /> Upload proof first</>
                    ) : (
                      <>Review Order <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                )}
                {step === 3 && (
                  <Button type="submit" disabled={loading || !cartItems?.length} className="w-full rounded-xl h-12">
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Place Order · {formatPrice(total)} <ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </Button>
                )}
              </StickyActionBar>
            </div>
          )}
        </form>
      </main>
    </div>
  );
};

export default CheckoutPage;
