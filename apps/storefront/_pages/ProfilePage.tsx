"use client";
import React, { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Phone, MapPin, Save, LogOut, ShoppingCart, Package, Star, Bell,
  Settings, ChevronRight, Camera, Home, Building2, MapPinned,
  CreditCard, CheckCircle2, Shield, Mail, Calendar, Award, Heart, PhoneCall,
  Sparkles, ArrowUpRight, Trash2,
} from "lucide-react";
import CallHistoryList from "@/components/CallHistoryList";
import MobileProfileShell from "@/components/profile/MobileProfileShell";
import { useIsTabletOrBelow } from "@/hooks/use-breakpoint";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { toast } from "@/lib/app-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { useProfileAppearance } from "@/hooks/use-profile-appearance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import RewardsTab from "@/components/profile/RewardsTab";
import AddressBookTab from "@/components/profile/AddressBookTab";
import PaymentMethodsTab from "@/components/profile/PaymentMethodsTab";
import { useUserLoyalty, useLoyaltyTiers, computeTierProgress } from "@/hooks/use-loyalty";
import { useLanguage } from "@/contexts/LanguageContext";

const addressTypeIcons = { home: Home, office: Building2, other: MapPinned };

type TabId =
  | "profile" | "rewards" | "addresses" | "payments"
  | "orders" | "reviews" | "calls" | "notifications";

const ProfilePage: React.FC = () => {
  useSeoMeta("profile", "Profile");
  const { user, signOut } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const { rootProps } = useProfileAppearance();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).single().then(({ data }) => {
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setAvatarUrl(data.avatar_url || "");
      }
    });
  }, [user]);

  const { data: orders } = useQuery({
    queryKey: ["profile-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders")
        .select("id, order_number, status, total, created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: cartCount } = useQuery({
    queryKey: ["cart-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("cart_items")
        .select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: wishlistCount } = useQuery({
    queryKey: ["wishlist-count", user?.id],
    queryFn: async () => {
      const { count } = await supabase.from("wishlist_items")
        .select("*", { count: "exact", head: true }).eq("user_id", user!.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const { data: reviews } = useQuery({
    queryKey: ["profile-reviews", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews")
        .select("id, rating, title, comment, created_at, product_id")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(6);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ["profile-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("notifications")
        .select("*")
        .or(`user_id.eq.${user!.id},user_id.is.null`)
        .not("type", "in", '("support","call","admin","order_status","low_stock")')
        .order("created_at", { ascending: false }).limit(15);
      return data || [];
    },
    enabled: !!user,
  });

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles")
      .update({ full_name: fullName, phone, avatar_url: avatarUrl }).eq("id", user.id);
    setLoading(false);
    if (error) toast({ title: "Error saving", description: error.message, variant: "destructive" });
    else toast({ title: "Profile updated" });
  };

  const markNotificationRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["profile-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["bell-notifications"] });
  };

  const clearAllNotifications = async () => {
    if (!user || !notifications?.length) return;
    const ownIds = notifications.filter((n) => n.user_id === user.id).map((n) => n.id);
    const broadcastIds = notifications.filter((n) => n.user_id !== user.id).map((n) => n.id);
    if (ownIds.length) {
      const { error } = await supabase.from("notifications").delete().in("id", ownIds);
      if (error) { toast({ title: "Couldn't clear notifications", description: error.message, variant: "destructive" }); return; }
    }
    if (broadcastIds.length && typeof window !== "undefined") {
      try {
        const key = `notif-dismissed:${user.id}`;
        const raw = window.localStorage.getItem(key);
        const set = new Set<string>(raw ? JSON.parse(raw) : []);
        broadcastIds.forEach((id) => set.add(id));
        window.localStorage.setItem(key, JSON.stringify(Array.from(set)));
      } catch { /* ignore */ }
    }
    queryClient.invalidateQueries({ queryKey: ["profile-notifications"] });
    queryClient.invalidateQueries({ queryKey: ["bell-notifications"] });
    toast({ title: "Notifications cleared" });
  };

  const handleAvatarUpload = async (file: File) => {
    if (!file || !user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast({ title: "Upload failed", variant: "destructive" }); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(urlData.publicUrl);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);
    toast({ title: "Avatar updated" });
  };

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
    processing: "bg-blue-500/15 text-blue-500 border-blue-500/20",
    shipped: "bg-purple-500/15 text-purple-500 border-purple-500/20",
    delivered: "bg-emerald-500/15 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/15 text-red-500 border-red-500/20",
  };

  const navItems: { id: TabId; icon: any; label: string; badge?: number | string }[] = [
    { id: "profile", icon: User, label: t("profile.personalInfo") || "Personal" },
    { id: "rewards", icon: Award, label: "Rewards" },
    { id: "addresses", icon: MapPin, label: t("profile.addresses") || "Addresses" },
    { id: "payments", icon: CreditCard, label: t("profile.payments") || "Payments" },
    { id: "orders", icon: Package, label: t("profile.myOrders") || "Orders", badge: orders?.length },
    { id: "reviews", icon: Star, label: t("profile.reviews") || "Reviews", badge: reviews?.length },
    { id: "calls", icon: PhoneCall, label: "Calls" },
    { id: "notifications", icon: Bell, label: "Alerts" },
  ];

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;
  navItems[7].badge = unreadCount || undefined;

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "";
  const { data: userLoyalty } = useUserLoyalty();
  const { data: loyaltyTiers } = useLoyaltyTiers();
  const tierInfo = computeTierProgress(userLoyalty, loyaltyTiers);

  const initial = (fullName || user?.email || "U").charAt(0).toUpperCase();

  const stats = [
    { icon: ShoppingCart, count: cartCount ?? 0, label: "Cart", href: "/cart" },
    { icon: Package, count: orders?.length ?? 0, label: "Orders", href: "/orders" },
    { icon: Heart, count: wishlistCount ?? 0, label: "Wishlist", href: "/wishlist" },
    { icon: Star, count: reviews?.length ?? 0, label: "Reviews" },
  ];

  const isTabletOrBelow = useIsTabletOrBelow();

  if (isTabletOrBelow) {
    return (
      <div {...rootProps}>
        <MobileProfileShell
          user={user}
          fullName={fullName}
          setFullName={setFullName}
          phone={phone}
          setPhone={setPhone}
          avatarUrl={avatarUrl}
          loading={loading}
          handleSave={handleSave}
          handleAvatarUpload={handleAvatarUpload}
          signOut={signOut}
          orders={orders}
          reviews={reviews}
          notifications={notifications}
          cartCount={cartCount}
          wishlistCount={wishlistCount}
          markNotificationRead={markNotificationRead}
          clearAllNotifications={clearAllNotifications}
          formatPrice={formatPrice}
          tierInfo={tierInfo}
          memberSince={memberSince}
        />
      </div>
    );
  }

  return (
    <div {...rootProps} className="min-h-screen pb-24 lg:pb-12 relative">
      {/* Ambient cover */}
      <div className="absolute inset-x-0 top-0 h-[420px] -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.25),transparent_55%),radial-gradient(ellipse_at_top_right,hsl(var(--accent)/0.18),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
      </div>

      <main className="container mx-auto px-3 sm:px-6 pt-10 sm:pt-16 pb-8 max-w-6xl relative">
        {/* ============ HERO BENTO ============ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="grid grid-cols-12 gap-3 sm:gap-4 mb-4 sm:mb-5"
        >
          {/* Identity card (large) */}
          <div className="col-span-12 lg:col-span-8 glass-strong rounded-3xl p-5 sm:p-7 border border-border/50 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-0" />
            <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative group flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-2 ring-primary/40 shadow-lg" />
                ) : (
                  <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-4xl font-display shadow-lg">
                    {initial}
                  </div>
                )}
                <label className="absolute inset-0 rounded-3xl bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                  <Camera className="w-6 h-6 text-white" />
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])} />
                </label>
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center border-2 border-background">
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>

              {/* Identity */}
              <div className="flex-1 text-center sm:text-left min-w-0">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-1">Welcome back</p>
                <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground leading-tight truncate">
                  {fullName || "Your Profile"}
                </h1>
                <p className="text-sm text-muted-foreground flex items-center gap-1.5 justify-center sm:justify-start mt-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{user?.email}</span>
                </p>
                <div className="flex items-center gap-2 justify-center sm:justify-start mt-3 flex-wrap">
                  <Badge variant="secondary" className="text-xs gap-1 rounded-full px-2.5 py-0.5">
                    <Calendar className="w-3 h-3" /> {memberSince}
                  </Badge>
                  <Badge variant="secondary" className="text-xs gap-1 rounded-full px-2.5 py-0.5">
                    <Shield className="w-3 h-3" /> Verified
                  </Badge>
                  {tierInfo && (
                    <button
                      onClick={() => setActiveTab("rewards")}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-semibold transition-transform hover:scale-105"
                      style={{
                        background: `${tierInfo.current.badge_color}22`,
                        color: tierInfo.current.badge_color,
                        border: `1px solid ${tierInfo.current.badge_color}55`,
                      }}
                    >
                      <Award className="w-3 h-3" /> {tierInfo.current.name}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action tile */}
          <div className="col-span-12 lg:col-span-4 grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
            <Link
              to="/settings"
              className="glass rounded-3xl p-5 flex items-center justify-between group hover:border-primary/40 transition-all"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <p className="text-sm font-semibold text-foreground">Settings</p>
                <p className="text-xs text-muted-foreground">Manage account</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
            </Link>
            <button
              onClick={signOut}
              className="glass rounded-3xl p-5 flex items-center justify-between group hover:border-destructive/40 transition-all text-left"
            >
              <div>
                <div className="w-10 h-10 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
                  <LogOut className="w-5 h-5 text-destructive" />
                </div>
                <p className="text-sm font-semibold text-foreground">Sign Out</p>
                <p className="text-xs text-muted-foreground">End session</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-destructive transition-colors" />
            </button>
          </div>
        </motion.section>

        {/* ============ STATS BENTO ============ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-5"
        >
          {stats.map((s) => {
            const Wrapper: any = s.href ? Link : "div";
            return (
              <Wrapper
                key={s.label}
                {...(s.href ? { to: s.href } : {})}
                className="glass rounded-3xl p-4 sm:p-5 hover:border-primary/40 transition-all group cursor-pointer relative overflow-hidden"
              >
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-primary/5 group-hover:bg-primary/10 transition-colors" />
                <div className="relative">
                  <s.icon className="w-5 h-5 text-primary mb-3 group-hover:scale-110 transition-transform" />
                  <p className="text-2xl sm:text-3xl font-bold font-display text-foreground tabular-nums">{s.count}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </Wrapper>
            );
          })}
        </motion.section>

        {/* ============ MAIN BENTO (nav + content) ============ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-12 gap-3 sm:gap-4"
        >
          {/* Sticky vertical nav (desktop) */}
          <aside className="hidden lg:block col-span-3">
            <div className="glass-strong rounded-3xl p-3 sticky top-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground px-3 pt-2 pb-3">Account</p>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm font-medium transition-all ${
                        active
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge ? (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          {item.badge}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Mobile horizontal nav */}
          <div className="col-span-12 lg:hidden">
            <div className="flex gap-2 p-1.5 rounded-2xl glass overflow-x-auto no-scrollbar">
              {navItems.map((item) => {
                const active = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                      active ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="text-[9px] px-1 rounded bg-background/30">{item.badge}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content panel */}
          <div className="col-span-12 lg:col-span-9 min-w-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === "profile" && (
                  <div className="glass-strong rounded-3xl p-5 sm:p-7 space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold font-display text-foreground">Personal Information</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Keep your details up to date</p>
                      </div>
                      <Sparkles className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={fullName} onChange={(e) => setFullName(e.target.value)}
                            placeholder="Your name" className="pl-10 rounded-xl bg-secondary/40 border-border/60 h-11" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Phone Number</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input value={phone} onChange={(e) => setPhone(e.target.value)}
                            placeholder="+1 (555) 000-0000" className="pl-10 rounded-xl bg-secondary/40 border-border/60 h-11" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input value={user?.email || ""} disabled
                          className="pl-10 rounded-xl bg-secondary/20 border-border/60 h-11 opacity-70" />
                      </div>
                      <p className="text-[11px] text-muted-foreground pl-1">Contact support to change your email</p>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button onClick={handleSave} disabled={loading} className="rounded-xl h-11 px-6 gap-2">
                        {loading
                          ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                          : <><Save className="w-4 h-4" /> Save Changes</>}
                      </Button>
                    </div>
                  </div>
                )}

                {activeTab === "rewards" && <RewardsTab />}
                {activeTab === "addresses" && <AddressBookTab />}
                {activeTab === "payments" && <PaymentMethodsTab />}

                {activeTab === "orders" && (
                  <div className="space-y-3">
                    <div className="glass-strong rounded-3xl p-5 sm:p-6 flex items-center justify-between">
                      <div>
                        <h2 className="text-xl font-semibold font-display text-foreground">Recent Orders</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">Your latest purchase activity</p>
                      </div>
                      <Link to="/orders" className="text-xs text-primary hover:underline flex items-center gap-1">
                        View all <ChevronRight className="w-3 h-3" />
                      </Link>
                    </div>
                    {orders?.length === 0 && (
                      <div className="glass rounded-3xl p-10 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground mb-2">No orders yet</p>
                        <Link to="/inventory" className="text-primary text-sm hover:underline">Start shopping →</Link>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {orders?.map((order) => (
                        <Link key={order.id} to="/orders"
                          className="glass rounded-2xl p-4 hover:border-primary/40 transition-all flex items-center justify-between gap-3 group">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">#{order.order_number}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                            <p className="text-sm font-bold text-foreground mt-1.5">{formatPrice(Number(order.total))}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusColors[order.status] || "bg-secondary text-foreground border-border"}`}>
                              {order.status}
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "reviews" && (
                  <div className="space-y-3">
                    <div className="glass-strong rounded-3xl p-5 sm:p-6">
                      <h2 className="text-xl font-semibold font-display text-foreground">Your Reviews</h2>
                      <p className="text-xs text-muted-foreground mt-0.5">Feedback you've shared on products</p>
                    </div>
                    {reviews?.length === 0 && (
                      <div className="glass rounded-3xl p-10 text-center">
                        <Star className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No reviews yet</p>
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {reviews?.map((review) => (
                        <div key={review.id} className="glass rounded-2xl p-4">
                          <div className="flex items-center gap-1 mb-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/40"}`} />
                            ))}
                            <span className="text-[11px] text-muted-foreground ml-auto">
                              {new Date(review.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          {review.title && <p className="text-sm font-semibold text-foreground">{review.title}</p>}
                          {review.comment && <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{review.comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === "calls" && (
                  <div className="glass-strong rounded-3xl p-5 sm:p-7">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <PhoneCall className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold font-display text-foreground">Call History</h2>
                        <p className="text-xs text-muted-foreground">Your recent calls with support</p>
                      </div>
                    </div>
                    <CallHistoryList limit={50} />
                  </div>
                )}

                {activeTab === "notifications" && (
                  <div className="space-y-3">
                    <div className="glass-strong rounded-3xl p-5 sm:p-6 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="text-xl font-semibold font-display text-foreground">Notifications</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {notifications && notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs font-semibold hover:bg-destructive/15 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Clear all
                          </button>
                        )}
                        <Bell className="w-5 h-5 text-primary/60" />
                      </div>
                    </div>
                    {notifications?.length === 0 && (
                      <div className="glass rounded-3xl p-10 text-center">
                        <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <p className="text-muted-foreground">No notifications</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {notifications?.map((n) => (
                        <button key={n.id}
                          onClick={() => !n.is_read && markNotificationRead(n.id)}
                          className={`w-full text-left glass rounded-2xl p-4 transition-all ${!n.is_read ? "border-primary/30" : "opacity-70"}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.is_read ? "bg-primary animate-pulse" : "bg-muted-foreground"}`} />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-foreground">{n.title}</p>
                              {n.message && <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>}
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {new Date(n.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default ProfilePage;
