"use client";
import React, { useRef, useEffect, useState, useMemo, lazy, Suspense } from "react";
import { Link, useNavigate } from "@/lib/router-compat";
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, animate } from "framer-motion";
import { ArrowRight, Sparkles, Star, Zap, Globe, Package, Users, Heart, ChevronRight, ChevronDown, Target, Eye, ShoppingBag, Shield, Truck, RotateCcw, Headphones, Lock, Menu, X } from "lucide-react";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { storefrontHref } from "@/lib/cross-app-urls";
import { useIsMobile } from "@/hooks/use-mobile";

import LightBeams from "@/components/landing/LightBeams";
import { CompanyNav } from "@/components/nav/CompanyNav";

const HeroShowcase3D = lazy(() => import("@/components/landing/HeroShowcase3D"));

const iconMap: Record<string, any> = { ShoppingBag, Shield, Truck, Sparkles, Star, Zap, Globe, Package, Users, Heart };

interface LandingConfig {
  hero_title_line1: string;
  hero_title_line2: string;
  hero_subtitle: string;
  hero_badge: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_bg_url: string;
  features: { icon: string; title: string; desc: string }[];
  stats: { value: string; label: string }[];
  show_stats: boolean;
  show_features: boolean;
  show_categories: boolean;
  show_testimonials: boolean;
  show_cta: boolean;
  show_about: boolean;
  show_mission_vision: boolean;
  show_brand_showcase: boolean;
  cta_title: string;
  cta_subtitle: string;
  cta_button: string;
  testimonials: { name: string; text: string; rating: number }[];
  about_title: string;
  about_text: string;
  mission_text: string;
  vision_text: string;
  showcase_image_url: string;
  showcase_headline: string;
  showcase_description: string;
  showcase_cta_text: string;
  showcase_cta_link: string;
  showcase_product_id: string;
}

const defaultLandingConfig: LandingConfig = {
  hero_title_line1: "", hero_title_line2: "", hero_subtitle: "", hero_badge: "",
  hero_cta_primary: "Start Shopping", hero_cta_secondary: "Explore Categories", hero_bg_url: "",
  features: [], stats: [], show_stats: true, show_features: true, show_categories: true,
  show_testimonials: false, show_cta: true, show_about: true, show_mission_vision: true,
  show_brand_showcase: false,
  cta_title: "", cta_subtitle: "", cta_button: "Create Account", testimonials: [],
  about_title: "", about_text: "",
  mission_text: "", vision_text: "",
  showcase_image_url: "", showcase_headline: "", showcase_description: "",
  showcase_cta_text: "Shop Now", showcase_cta_link: "/home",
  showcase_product_id: "",
};

/* ── Animated Counter ── */
const AnimatedCounter: React.FC<{ value: string; inView: boolean }> = ({ value, inView }) => {
  const num = parseInt(value.replace(/[^0-9]/g, ""));
  const suffix = value.replace(/[0-9]/g, "");
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!inView || isNaN(num)) return;
    const ctrl = animate(0, num, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => ctrl.stop();
  }, [inView, num]);
  if (isNaN(num)) return <span>{value}</span>;
  return <span>{display}{suffix}</span>;
};

/* ── 3D Tilt Card ── */
const TiltCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  const ref = useRef<HTMLDivElement>(null);
  const rotX = useMotionValue(0);
  const rotY = useMotionValue(0);
  const sRotX = useSpring(rotX, { stiffness: 200, damping: 20 });
  const sRotY = useSpring(rotY, { stiffness: 200, damping: 20 });
  return (
    <motion.div ref={ref}
      style={{ rotateX: sRotX, rotateY: sRotY, transformPerspective: 800, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const rect = ref.current?.getBoundingClientRect();
        if (!rect) return;
        rotX.set(((e.clientY - rect.top) / rect.height - 0.5) * -12);
        rotY.set(((e.clientX - rect.left) / rect.width - 0.5) * 12);
      }}
      onMouseLeave={() => { rotX.set(0); rotY.set(0); }}
      className={className}
    >{children}</motion.div>
  );
};

/* ═══════════════ CUSTOM LANDING NAV ═══════════════ */
const LandingNav: React.FC<{ siteName: string; logoUrl: string }> = ({ siteName, logoUrl }) => {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-background/70 backdrop-blur-2xl border-b border-border/20 shadow-[0_4px_30px_hsl(0_0%_0%/0.1)]"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          {logoUrl && (
            <img src={logoUrl} alt={siteName} className="h-8 w-auto" />
          )}
          <span className="text-lg font-display font-bold text-gradient">{siteName || "Store"}</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          <a href={storefrontHref("/")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</a>
          <a href={storefrontHref("/shop")} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Shop</a>
          <Link to="/support" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Support</Link>
          {user ? (
            <a href={storefrontHref("/")}>
              <motion.span whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20 hover:bg-primary/20 transition-colors">
                Enter Store <ArrowRight className="w-3.5 h-3.5" />
              </motion.span>
            </a>
          ) : (
            <Link to="/auth">
              <motion.span whileHover={{ scale: 1.05 }} className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium shadow-[0_2px_12px_hsl(var(--primary)/0.3)]">
                Sign In <ArrowRight className="w-3.5 h-3.5" />
              </motion.span>
            </Link>
          )}
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={{ height: mobileOpen ? "auto" : 0, opacity: mobileOpen ? 1 : 0 }}
        className="md:hidden overflow-hidden bg-background/90 backdrop-blur-2xl border-b border-border/20"
      >
        <div className="px-4 py-4 space-y-3">
          <a href={storefrontHref("/")} className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Home</a>
          <a href={storefrontHref("/shop")} className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Shop</a>
          <Link to="/support" className="block text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Support</Link>
          <a href={storefrontHref(user ? "/" : "/auth")} className="block text-sm font-medium text-primary" onClick={() => setMobileOpen(false)}>
            {user ? "Enter Store" : "Sign In"}
          </a>
        </div>
      </motion.div>
    </motion.nav>
  );
};

/* Landing uses the shared minimal Footer variant */
import Footer from "@/components/Footer";
const LandingFooter: React.FC<{ siteName: string }> = () => (
  <Footer variantOverride="minimal" />
);

/* ═══════════════ MAIN PAGE ═══════════════ */
const LandingPage: React.FC = () => {
  useSeoMeta("landing", "Welcome");
  const heroRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, isMobile ? 80 : 200]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.85]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-landing"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value, updated_at").in("key", ["site_name", "logo_url", "landing_config"]);
      const map: Record<string, any> = {};
      let landingUpdated = 0;
      data?.forEach((s) => {
        const val = s.value;
        map[s.key] = typeof val === "object" && val !== null ? (val as any).value ?? val : val;
        if (s.key === "landing_config" && s.updated_at) {
          landingUpdated = new Date(s.updated_at).getTime();
        }
      });
      map.__landing_updated = landingUpdated;
      return map;
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const rawName = siteSettings?.site_name;
  const siteName = String(typeof rawName === "object" && rawName !== null ? (rawName as any).value ?? "" : rawName ?? "");
  const rawLogo = siteSettings?.logo_url;
  const logoUrl = String(typeof rawLogo === "object" && rawLogo !== null ? (rawLogo as any).value ?? "" : rawLogo ?? "");
  const landingRaw = siteSettings?.landing_config;
  const cfg: LandingConfig = { ...defaultLandingConfig, ...(typeof landingRaw === "object" && landingRaw !== null ? landingRaw : {}) };
  // Cache-buster: when admin updates the landing config, append the updated_at
  // so the browser fetches the new hero image even if the URL string is unchanged.
  const landingUpdated: number = (siteSettings as any)?.__landing_updated || 0;
  const heroBgUrlBusted = cfg.hero_bg_url
    ? `${cfg.hero_bg_url}${cfg.hero_bg_url.includes("?") ? "&" : "?"}v=${landingUpdated || "0"}`
    : "";

  const { data: categories = [] } = useQuery({
    queryKey: ["landing-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name, slug, icon, icon_url, image_url").eq("is_active", true).is("parent_id", null).order("sort_order").limit(6);
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: productCount = 0 } = useQuery({
    queryKey: ["landing-product-count"],
    queryFn: async () => {
      const { count } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true);
      return count || 0;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch showcase product if configured
  const { data: showcaseProduct } = useQuery({
    queryKey: ["showcase-product", cfg.showcase_product_id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("name, slug, price, compare_at_price, short_description, thumbnail, images").eq("id", cfg.showcase_product_id).maybeSingle();
      return data;
    },
    enabled: !!cfg.showcase_product_id,
    staleTime: 10 * 60 * 1000,
  });

  const { formatPrice } = useCurrency();
  const statsRef = useRef(null);
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" });
  const hasHeroContent = cfg.hero_title_line1 || cfg.hero_title_line2 || cfg.hero_subtitle;

  const letterVariants = {
    hidden: { opacity: 0, y: 40, rotateX: -60 },
    visible: (i: number) => ({
      opacity: 1, y: 0, rotateX: 0,
      transition: { delay: 0.4 + i * 0.03, duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
    }),
  };

  const trustSignals = [
    { icon: Truck, title: "Free Shipping", desc: "On orders over $50" },
    { icon: Lock, title: "Secure Payments", desc: "256-bit SSL encryption" },
    { icon: Headphones, title: "24/7 Support", desc: "Always here for you" },
    { icon: RotateCcw, title: "Easy Returns", desc: "30-day return policy" },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      {/* Cinematic intro moved to global FirstVisitIntro (once per device) */}
      {/* Custom minimal landing nav */}
      <LandingNav siteName={siteName} logoUrl={logoUrl} />

      {/* ═══════════════ HERO ═══════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ perspective: "1200px" }}>
        <LightBeams />
        {!isMobile && (
          <div className="absolute right-[-6%] top-[12%] w-[520px] h-[520px] pointer-events-none opacity-90 mix-blend-screen z-[1]">
            <Suspense fallback={null}>
              <HeroShowcase3D />
            </Suspense>
          </div>
        )}
        <div className="absolute inset-0">
          {cfg.hero_bg_url ? (
            <>
              <motion.img key={heroBgUrlBusted} src={heroBgUrlBusted} alt="" className="w-full h-full object-cover"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 20, ease: "easeInOut" }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" />
            </>
          ) : (
            <>
              <div className="absolute inset-0 bg-background" />
              <motion.div className="absolute inset-0" style={{ y: heroY }}>
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-[0.03]" style={{
                  backgroundImage: `linear-gradient(hsl(var(--primary)/0.4) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)/0.4) 1px, transparent 1px)`,
                  backgroundSize: '80px 80px',
                }} />

                {/* Cinematic radial pulse */}
                <motion.div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] rounded-full"
                  style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.1), transparent 60%)" }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.8, 0.4] }}
                  transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                />

                {/* Glow orbs */}
                <motion.div className="absolute top-[10%] right-[15%] w-[600px] h-[600px] rounded-full blur-[180px]"
                  style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.12), transparent 70%)" }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                />
                <motion.div className="absolute bottom-[15%] left-[5%] w-[500px] h-[500px] rounded-full blur-[150px]"
                  style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.1), transparent 70%)" }}
                  animate={{ scale: [1, 1.25, 1] }}
                  transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 2 }}
                />

                {/* Floating 3D shapes — desktop only */}
                {!isMobile && (
                  <>
                    <motion.div className="absolute top-[25%] right-[12%] w-28 h-28 border border-primary/10 rounded-2xl"
                      style={{ transformStyle: "preserve-3d" }}
                      animate={{ rotateX: [0, 360], rotateY: [0, 180], y: [0, -30, 0] }}
                      transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                    />
                    <motion.div className="absolute top-[55%] left-[20%] w-14 h-14 border border-accent/15 rounded-full"
                      animate={{ scale: [1, 1.4, 1], rotateZ: [0, 180, 360], opacity: [0.2, 0.5, 0.2] }}
                      transition={{ repeat: Infinity, duration: 12 }}
                    />
                    <motion.div className="absolute top-[40%] left-[65%] w-20 h-20"
                      style={{ transformStyle: "preserve-3d" }}
                      animate={{ rotateY: [0, 360], rotateX: [0, 90, 0] }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    >
                      <div className="w-full h-full border border-primary/8 transform rotate-45" />
                    </motion.div>

                    {/* Lens flare streaks */}
                    <motion.div className="absolute top-[30%] left-0 w-[60%] h-[1px]"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.15), transparent)" }}
                      animate={{ x: ["-100%", "200%"], opacity: [0, 0.6, 0] }}
                      transition={{ repeat: Infinity, duration: 8, ease: "easeInOut", delay: 3 }}
                    />
                    <motion.div className="absolute top-[60%] right-0 w-[40%] h-[1px]"
                      style={{ background: "linear-gradient(90deg, transparent, hsl(var(--accent)/0.1), transparent)" }}
                      animate={{ x: ["200%", "-100%"], opacity: [0, 0.4, 0] }}
                      transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 5 }}
                    />
                  </>
                )}

              </motion.div>
            </>
          )}
        </div>

        <motion.div className="relative container mx-auto px-4 py-24 pt-32 text-center" style={{ scale: heroScale, opacity: heroOpacity }}>
          <div className="max-w-4xl mx-auto" style={{ transformStyle: "preserve-3d" }}>
            {cfg.hero_badge && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] border border-primary/30 text-primary bg-primary/5 mb-8 backdrop-blur-sm">
                  <Sparkles className="w-3 h-3" /> {cfg.hero_badge}
                </span>
              </motion.div>
            )}
            {hasHeroContent && (
              <div className="mb-8" style={{ perspective: "600px" }}>
                {cfg.hero_title_line1 && (
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-[1.05] tracking-tight text-foreground">
                    {cfg.hero_title_line1.split("").map((char, i) => (
                      <motion.span key={i} custom={i} variants={letterVariants} initial="hidden" animate="visible"
                        className="inline-block" style={{ transformOrigin: "bottom" }}>
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                  </h1>
                )}
                {cfg.hero_title_line2 && (
                  <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold font-display leading-[1.05] tracking-tight text-gradient mt-1">
                    {cfg.hero_title_line2.split("").map((char, i) => (
                      <motion.span key={i} custom={i + (cfg.hero_title_line1?.length || 0)} variants={letterVariants} initial="hidden" animate="visible"
                        className="inline-block" style={{ transformOrigin: "bottom" }}>
                        {char === " " ? "\u00A0" : char}
                      </motion.span>
                    ))}
                  </h1>
                )}
              </div>
            )}
            {cfg.hero_subtitle && (
              <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.8 }}
                className="text-base md:text-lg text-muted-foreground mb-10 max-w-lg mx-auto leading-relaxed">
                {cfg.hero_subtitle}
              </motion.p>
            )}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 1 }} className="flex flex-wrap gap-3 justify-center">
              <a href={storefrontHref("/")}>
                <motion.span whileHover={{ scale: 1.04, boxShadow: "0 8px 40px hsl(var(--primary)/0.4)" }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-[0_4px_20px_hsl(var(--primary)/0.3)] transition-shadow">
                  {cfg.hero_cta_primary || "Start Shopping"} <ArrowRight className="w-4 h-4" />
                </motion.span>
              </a>
              <a href={storefrontHref("/shop")}>
                <motion.span whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-border/60 text-foreground font-medium text-sm hover:bg-secondary/50 backdrop-blur-sm transition-colors">
                  {cfg.hero_cta_secondary || "Explore"} <ChevronRight className="w-4 h-4" />
                </motion.span>
              </a>
            </motion.div>
          </div>
        </motion.div>

        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground/50" />
        </motion.div>
      </section>

      {/* ═══════════════ TRUST SIGNALS ═══════════════ */}
      <section className="py-12 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.02] to-transparent" />
        <div className="container mx-auto px-4 relative">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustSignals.map((signal, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-center p-5 rounded-2xl border border-border/10 bg-card/20 backdrop-blur-sm hover:border-primary/20 transition-all group">
                  <motion.div className="w-10 h-10 mx-auto rounded-xl bg-primary/10 flex items-center justify-center mb-3"
                    whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}>
                    <signal.icon className="w-5 h-5 text-primary" />
                  </motion.div>
                  <p className="text-xs font-semibold text-foreground mb-0.5">{signal.title}</p>
                  <p className="text-[10px] text-muted-foreground">{signal.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ ABOUT US ═══════════════ */}
      {cfg.show_about && (cfg.about_title || cfg.about_text) && (
        <section className="py-20 md:py-28 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)/0.5) 1px, transparent 0)`,
            backgroundSize: '40px 40px',
          }} />
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <motion.div initial={{ opacity: 0, x: -40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-4">About Us</p>
                <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-6 leading-tight">
                  {cfg.about_title || "Our Story"}
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-6">{cfg.about_text}</p>
                <div className="h-1 w-20 bg-gradient-to-r from-primary to-accent rounded-full" />
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 40 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.2 }}
                className="relative flex justify-center">
                <div className="relative w-72 h-72">
                  <motion.div className="absolute inset-0 rounded-3xl border border-primary/20 bg-primary/5 backdrop-blur-sm"
                    animate={{ rotateY: [0, 10, 0, -10, 0], rotateX: [0, -5, 0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 8, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d", perspective: "800px" }}
                  />
                  <motion.div className="absolute inset-4 rounded-2xl border border-accent/15 bg-accent/5"
                    animate={{ rotateY: [0, -8, 0, 8, 0], rotateX: [0, 6, 0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 1 }}
                    style={{ transformStyle: "preserve-3d" }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 4 }}
                      className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center backdrop-blur-sm">
                      <Sparkles className="w-8 h-8 text-primary" />
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ MISSION & VISION ═══════════════ */}
      {cfg.show_mission_vision && (cfg.mission_text || cfg.vision_text) && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-2">What Drives Us</p>
              <h2 className="text-3xl md:text-4xl font-bold font-display text-foreground">Mission & Vision</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {cfg.mission_text && (
                <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-border/30 bg-card/40 backdrop-blur-xl p-8 h-full hover:border-primary/30 transition-colors relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <motion.div className="absolute -top-2 -right-2 w-24 h-24 rounded-full bg-primary/5 blur-2xl"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 4 }}
                      />
                      <div className="relative z-10">
                        <motion.div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                        >
                          <Target className="w-7 h-7 text-primary" />
                        </motion.div>
                        <h3 className="font-display font-bold text-xl text-foreground mb-3">Our Mission</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">{cfg.mission_text}</p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              )}
              {cfg.vision_text && (
                <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}>
                  <TiltCard className="h-full">
                    <div className="rounded-3xl border border-border/30 bg-card/40 backdrop-blur-xl p-8 h-full hover:border-accent/30 transition-colors relative overflow-hidden group">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <motion.div className="absolute -top-2 -left-2 w-24 h-24 rounded-full bg-accent/5 blur-2xl"
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ repeat: Infinity, duration: 5, delay: 1 }}
                      />
                      <div className="relative z-10">
                        <motion.div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-5"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                        >
                          <Eye className="w-7 h-7 text-accent-foreground" />
                        </motion.div>
                        <h3 className="font-display font-bold text-xl text-foreground mb-3">Our Vision</h3>
                        <p className="text-muted-foreground leading-relaxed text-sm">{cfg.vision_text}</p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ BRANDED PRODUCT HIGHLIGHT ═══════════════ */}
      {cfg.show_brand_showcase && (showcaseProduct || cfg.showcase_image_url || cfg.showcase_headline) && (
        <section className="py-20 md:py-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.03] via-transparent to-accent/[0.03]" />
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
              {/* Product image with parallax float */}
              <motion.div initial={{ opacity: 0, x: -60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1 }}>
                <TiltCard>
                  <div className="relative">
                    <motion.div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 blur-2xl"
                      animate={{ scale: [1, 1.05, 1], opacity: [0.3, 0.5, 0.3] }}
                      transition={{ repeat: Infinity, duration: 5 }}
                    />
                    <div className="relative rounded-3xl overflow-hidden border border-border/30 shadow-[0_20px_80px_hsl(var(--primary)/0.15)]">
                      <motion.img
                        src={showcaseProduct?.thumbnail || showcaseProduct?.images?.[0] || cfg.showcase_image_url}
                        alt={showcaseProduct?.name || cfg.showcase_headline || "Brand showcase"}
                        className="w-full h-auto object-cover aspect-square"
                        loading="lazy"
                        animate={{ y: [0, -8, 0] }}
                        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                      />
                    </div>
                  </div>
                </TiltCard>
              </motion.div>

              {/* Product details */}
              <motion.div initial={{ opacity: 0, x: 60 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.2 }}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-4">Featured Product</p>
                <h2 className="text-3xl md:text-5xl font-bold font-display text-foreground mb-4 leading-tight">
                  {showcaseProduct?.name || cfg.showcase_headline || "Premium Quality"}
                </h2>
                {(showcaseProduct?.price || showcaseProduct?.compare_at_price) && (
                  <div className="flex items-baseline gap-3 mb-4">
                    <span className="text-2xl font-bold text-gradient">{formatPrice(showcaseProduct.price)}</span>
                    {showcaseProduct.compare_at_price && showcaseProduct.compare_at_price > showcaseProduct.price && (
                      <span className="text-lg text-muted-foreground line-through">{formatPrice(showcaseProduct.compare_at_price)}</span>
                    )}
                  </div>
                )}
                <p className="text-muted-foreground leading-relaxed mb-8 text-base">
                  {showcaseProduct?.short_description || cfg.showcase_description}
                </p>
                <a href={storefrontHref(showcaseProduct ? `/product/${showcaseProduct.slug}` : "/")}>
                  <motion.span whileHover={{ scale: 1.04, boxShadow: "0 8px 40px hsl(var(--primary)/0.4)" }} whileTap={{ scale: 0.97 }}
                    className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-primary text-primary-foreground font-semibold text-sm shadow-[0_4px_20px_hsl(var(--primary)/0.3)]">
                    {cfg.showcase_cta_text || "Shop Now"} <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </a>
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ STATS ═══════════════ */}
      {cfg.show_stats && cfg.stats.length > 0 && (
        <section ref={statsRef} className="py-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5" />
          <div className="container mx-auto px-4 relative">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {cfg.stats.map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}>
                  <TiltCard>
                    <div className="text-center rounded-2xl border border-border/20 bg-card/30 backdrop-blur-sm p-6 hover:border-primary/20 transition-colors relative overflow-hidden">
                      <motion.div className="absolute inset-0 bg-primary/[0.02]"
                        animate={{ opacity: [0, 0.5, 0] }}
                        transition={{ repeat: Infinity, duration: 3, delay: i * 0.5 }}
                      />
                      <p className="text-3xl md:text-5xl font-bold font-display text-gradient relative z-10">
                        <AnimatedCounter value={stat.value} inView={statsInView} />
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 relative z-10">{stat.label}</p>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ FEATURES ═══════════════ */}
      {cfg.show_features && cfg.features.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-2">Why Choose Us</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Built Different</h2>
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {cfg.features.map((f, i) => {
                const Icon = iconMap[f.icon] || Sparkles;
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <TiltCard>
                      <div className="group rounded-2xl border border-border/30 bg-card/30 backdrop-blur-sm p-6 hover:border-primary/30 transition-all h-full relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <div className="relative z-10">
                          <motion.div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4"
                            whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}>
                            <Icon className="w-6 h-6 text-primary" />
                          </motion.div>
                          <h3 className="font-display font-semibold text-foreground text-sm mb-1.5">{f.title}</h3>
                          <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                        </div>
                      </div>
                    </TiltCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CATEGORIES ═══════════════ */}
      {cfg.show_categories && categories.length > 0 && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-2">Browse</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">Shop by Category</h2>
              {productCount > 0 && <p className="text-sm text-muted-foreground mt-1">{productCount}+ products across {categories.length} categories</p>}
            </motion.div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {categories.map((cat, i) => (
                <motion.div key={cat.slug} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.07 }}>
                  <Link to={`/categories/${cat.slug}`} className="group block rounded-2xl overflow-hidden relative h-40 hover:scale-[1.02] transition-transform">
                    {cat.image_url ? (
                      <motion.img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover" loading="lazy"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.7 }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/10 to-accent/10" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                    <div className="absolute inset-0 flex flex-col items-center justify-end p-4">
                      {cat.icon_url ? (
                        <img src={cat.icon_url} alt="" className="w-8 h-8 rounded-lg object-contain mb-2" />
                      ) : cat.icon ? (
                        <span className="text-xl mb-2">{cat.icon}</span>
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground mb-2" />
                      )}
                      <p className="text-xs font-semibold text-foreground text-center group-hover:text-primary transition-colors">{cat.name}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      {cfg.show_testimonials && cfg.testimonials.length > 0 && (
        <section className="py-16 md:py-24 overflow-hidden">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary mb-2">Testimonials</p>
              <h2 className="text-2xl md:text-3xl font-bold font-display text-foreground">What Our Customers Say</h2>
            </motion.div>
            <div className="relative">
              <motion.div className="flex gap-5"
                animate={{ x: [0, -(cfg.testimonials.length * 320)] }}
                transition={{ repeat: Infinity, duration: cfg.testimonials.length * 8, ease: "linear" }}>
                {[...cfg.testimonials, ...cfg.testimonials].map((t, i) => (
                  <div key={i} className="shrink-0 w-[300px] rounded-2xl border border-border/30 bg-card/40 backdrop-blur-sm p-6">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-primary fill-primary" />)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed italic">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center text-primary-foreground text-xs font-bold">
                        {t.name.charAt(0)}
                      </div>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════ CTA ═══════════════ */}
      {cfg.show_cta && (cfg.cta_title || siteName) && (
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}
              className="rounded-3xl border border-border/30 bg-card/30 backdrop-blur-xl p-10 md:p-16 text-center relative overflow-hidden">
              {/* Floating particle ring */}
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div key={i} className="absolute w-2 h-2 rounded-full bg-primary/20"
                  style={{
                    left: `${50 + 35 * Math.cos((i / 8) * Math.PI * 2)}%`,
                    top: `${50 + 35 * Math.sin((i / 8) * Math.PI * 2)}%`,
                  }}
                  animate={{ scale: [0.5, 1.5, 0.5], opacity: [0.2, 0.6, 0.2] }}
                  transition={{ repeat: Infinity, duration: 3, delay: i * 0.3 }}
                />
              ))}
              <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(circle at 50% 50%, hsl(var(--primary)/0.3), transparent 70%)" }} />
              <div className="relative z-10">
                <h2 className="text-2xl md:text-4xl font-bold font-display text-foreground mb-4">
                  {cfg.cta_title || (siteName ? <>Ready for <span className="text-gradient">{siteName}</span>?</> : "")}
                </h2>
                {cfg.cta_subtitle && <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">{cfg.cta_subtitle}</p>}
                <Link to="/auth">
                  <motion.span
                    whileHover={{ scale: 1.05, boxShadow: "0 8px 40px hsl(var(--primary)/0.4)" }}
                    whileTap={{ scale: 0.97 }}
                    animate={{ boxShadow: ["0 4px 20px hsl(var(--primary)/0.3)", "0 4px 30px hsl(var(--primary)/0.5)", "0 4px 20px hsl(var(--primary)/0.3)"] }}
                    transition={{ boxShadow: { repeat: Infinity, duration: 2 } }}
                    className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    {cfg.cta_button || "Get Started"} <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Landing-specific minimal footer */}
      <LandingFooter siteName={siteName} />
    </div>
  );
};

export default LandingPage;
