"use client";
import React, { useRef, useState, useEffect, useMemo } from "react";
import { motion, useScroll, useTransform, useSpring, animate } from "framer-motion";
import { ArrowRight, ChevronDown, Star, Package, Users, Shield, Truck, Sparkles, ArrowUpRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { storefrontHref } from "@/lib/cross-app-urls";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { CompanyNav } from "@/components/nav/CompanyNav";
import { FirstVisitSplash } from "@/components/landing/CinematicSplash";
import Footer from "@/components/Footer";

/* ─── Types ─────────────────────────────────────────────────────── */
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

const defaultConfig: LandingConfig = {
  hero_title_line1: "",
  hero_title_line2: "",
  hero_subtitle: "",
  hero_badge: "",
  hero_cta_primary: "",
  hero_cta_secondary: "",
  hero_bg_url: "",
  features: [],
  stats: [],
  show_stats: true,
  show_features: true,
  show_categories: true,
  show_testimonials: false,
  show_cta: true,
  show_about: true,
  show_mission_vision: false,
  show_brand_showcase: false,
  cta_title: "",
  cta_subtitle: "Premium quality, delivered to you.",
  cta_button: "Enter the Store",
  testimonials: [],
  about_title: "Our Story",
  about_text: "We believe fashion is more than clothing — it is a language. A declaration. We craft every piece to tell your story, with the precision of artisans and the vision of poets.",
  mission_text: "",
  vision_text: "",
  showcase_image_url: "",
  showcase_headline: "",
  showcase_description: "",
  showcase_cta_text: "Shop Now",
  showcase_cta_link: "/",
  showcase_product_id: "",
};

/* ─── Animated Counter ───────────────────────────────────────────── */
function AnimatedCounter({ value, trigger }: { value: string; trigger: boolean }) {
  const num = parseInt(value.replace(/\D/g, ""));
  const suffix = value.replace(/\d/g, "");
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!trigger || isNaN(num)) return;
    const ctrl = animate(0, num, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setDisplay(Math.round(v)) });
    return () => ctrl.stop();
  }, [trigger, num]);
  if (isNaN(num)) return <span>{value}</span>;
  return <span>{display}{suffix}</span>;
}

/* ─── Stats strip ───────────────────────────────────────────────── */
function StatsStrip({ stats }: { stats: { value: string; label: string }[] }) {
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTriggered(true); }, { threshold: 0.3 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/5">
      {stats.map((s, i) => (
        <div key={i} className="bg-[#080808] px-8 py-10 text-center">
          <p className="text-4xl sm:text-5xl font-bold font-display text-white mb-1">
            <AnimatedCounter value={s.value} trigger={triggered} />
          </p>
          <p className="text-xs text-white/40 uppercase tracking-widest">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Word reveal (individual word component for hook rules) ─────── */
function RevealWord({ word, progress, start, end }: { word: string; progress: any; start: number; end: number }) {
  const opacity = useTransform(progress, [start, Math.min(end, 0.92)], [0.08, 1]);
  return (
    <motion.span style={{ opacity }} className="inline-block">
      {word}&nbsp;
    </motion.span>
  );
}
function ScrollText({ text, progress, className }: { text: string; progress: any; className?: string }) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((w, i) => (
        <RevealWord
          key={i}
          word={w}
          progress={progress}
          start={(i / words.length) * 0.88}
          end={((i + 1) / words.length) * 0.88}
        />
      ))}
    </span>
  );
}

/* ─── Product rail card ──────────────────────────────────────────── */
function ProductRailCard({ p }: { p: any }) {
  const { formatPrice } = useCurrency();
  return (
    <motion.a
      href={storefrontHref(`/product/${p.slug}`)}
      className="shrink-0 w-52 sm:w-64 group"
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="relative aspect-[3/4] rounded-2xl overflow-hidden mb-3 bg-white/5 border border-white/10">
        {p.thumbnail || (p.images && p.images[0]) ? (
          <img
            src={p.thumbnail || p.images[0]}
            alt={p.name}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-3 left-3 right-3 translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
          <span className="text-xs text-white/80 font-medium">View Product →</span>
        </div>
      </div>
      <p className="text-white/90 text-sm font-medium truncate">{p.name}</p>
      {p.price && (
        <p className="text-[hsl(355,99%,60%)] text-sm font-semibold mt-0.5">{formatPrice(p.price)}</p>
      )}
    </motion.a>
  );
}

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  useSeoMeta("landing", "Welcome");
  const { user } = useAuth();

  /* ── Data ── */
  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-landing"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key,value")
        .in("key", ["site_name", "logo_url", "landing_config"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const v = s.value;
        map[s.key] = typeof v === "object" && v !== null ? (v as any).value ?? v : v;
      });
      return map;
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: products } = useQuery({
    queryKey: ["landing-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,slug,price,thumbnail,images,compare_at_price")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(8);
      return data ?? [];
    },
    staleTime: 60000,
  });

  const { data: portfolioItems } = useQuery({
    queryKey: ["landing-portfolio"],
    queryFn: async () => {
      const { data } = await supabase
        .from("portfolio_items")
        .select("id,title,category,image_url")
        .eq("is_active", true)
        .order("sort_order")
        .limit(6);
      return data ?? [];
    },
    staleTime: 60000,
  });

  const { data: newsItems } = useQuery({
    queryKey: ["landing-news"],
    queryFn: async () => {
      const { data } = await supabase
        .from("news_articles")
        .select("id,title,slug,excerpt,cover_image_url,category,published_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false })
        .limit(3);
      return data ?? [];
    },
    staleTime: 60000,
  });

  const cfg: LandingConfig = useMemo(() => {
    const raw = siteSettings?.landing_config;
    if (!raw || typeof raw !== "object") return defaultConfig;
    return { ...defaultConfig, ...(raw as Partial<LandingConfig>) };
  }, [siteSettings]);

  const siteName = String(siteSettings?.site_name ?? "Orizino");
  const heroBgUrl = cfg.hero_bg_url
    ? `${cfg.hero_bg_url}?v=${(siteSettings as any)?.__ts ?? 0}`
    : "";

  /* ── Section refs ── */
  const heroRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const collectionRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLDivElement>(null);

  /* ── Hero scroll transforms ── */
  const { scrollYProgress: heroP } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroScale = useTransform(heroP, [0, 0.7], [1, 1.2]);
  const heroOpacity = useTransform(heroP, [0, 0.55], [1, 0]);
  const heroY = useTransform(heroP, [0, 0.7], [0, -100]);
  const heroBgScale = useTransform(heroP, [0, 1], [1, 1.18]);
  const curtainOpacity = useTransform(heroP, [0.25, 0.75], [0, 1]);

  /* ── Story scroll transforms ── */
  const { scrollYProgress: storyP } = useScroll({
    target: storyRef,
    offset: ["start start", "end end"],
  });
  const storyLabelOpacity = useTransform(storyP, [0, 0.1], [0, 1]);

  /* ── Collection scroll ── */
  const { scrollYProgress: collectionP } = useScroll({
    target: collectionRef,
    offset: ["start start", "end end"],
  });
  const productCount = products?.length ?? 0;
  const maxShift = -(productCount * 276 + 300);
  const railXRaw = useTransform(collectionP, [0.05, 0.95], [0, maxShift]);
  const railX = useSpring(railXRaw, { stiffness: 55, damping: 18 });

  /* ── Values scroll stagger ── */
  const { scrollYProgress: valuesP } = useScroll({
    target: valuesRef,
    offset: ["start start", "end end"],
  });
  const va = useTransform(valuesP, [0.0, 0.22], [0, 1]);
  const vb = useTransform(valuesP, [0.2, 0.42], [0, 1]);
  const vc = useTransform(valuesP, [0.4, 0.62], [0, 1]);
  const vd = useTransform(valuesP, [0.6, 0.82], [0, 1]);
  const yA = useTransform(valuesP, [0.0, 0.22], [60, 0]);
  const yB = useTransform(valuesP, [0.2, 0.42], [60, 0]);
  const yC = useTransform(valuesP, [0.4, 0.62], [60, 0]);
  const yD = useTransform(valuesP, [0.6, 0.82], [60, 0]);
  const cardOpacities = [va, vb, vc, vd];
  const cardYs = [yA, yB, yC, yD];

  const iconMap: Record<string, React.ElementType> = {
    Shield, Truck, Users, Sparkles, Star, Package,
    ShoppingBag: Package, Zap: Sparkles, Globe: Users, Heart: Star, RotateCcw: Truck,
  };

  const features = cfg.features.slice(0, 4);

  const stats = cfg.show_stats ? cfg.stats : [];

  const storyCtaOpacity = useTransform(storyP, [0.82, 1], [0, 1]);
  const storyText = cfg.about_text || defaultConfig.about_text;

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  return (
    <div className="bg-[#080808] text-white overflow-x-hidden">
      <FirstVisitSplash />
      <CompanyNav />

      {/* ═══════════════════════════════════════════════════════════
          §1  CINEMATIC HERO — scroll zooms the world behind you
          ═══════════════════════════════════════════════════════════ */}
      <div ref={heroRef} style={{ height: "220vh" }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center">

          {/* Background layer — scales slowly like a cinematic pull-back */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ scale: heroBgScale, transformOrigin: "center" }}
          >
            {heroBgUrl ? (
              <img src={heroBgUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(140deg, #010c17 0%, #030f1e 35%, #040e1a 65%, #020b15 100%)" }}
              >
                {/* Subtle noise grain */}
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
                    backgroundSize: "150px",
                  }}
                />
                {/* Mint-teal accent glows */}
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 55% at 15% 55%, rgba(20,184,166,0.10) 0%, transparent 65%), radial-gradient(ellipse 40% 40% at 78% 25%, rgba(6,182,212,0.06) 0%, transparent 55%)",
                  }}
                />
                {/* Glossy top-left highlight */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(170deg, rgba(255,255,255,0.025) 0%, transparent 45%)" }}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-[#080808]" />
          </motion.div>

          {/* Red scan line — cinematic film-strip feel */}
          <motion.div
            className="absolute top-0 left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,hsl(355,99%,38%),transparent)" }}
            animate={{ x: ["-100%", "100%"] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", repeatDelay: 4 }}
          />

          {/* Dark curtain that fades in as you leave this section */}
          <motion.div
            className="absolute inset-0 bg-[#080808] pointer-events-none"
            style={{ opacity: curtainOpacity }}
          />

          {/* Hero content — scale + opacity driven by heroP */}
          <motion.div
            className="relative z-10 text-left px-8 sm:px-16 lg:px-24 max-w-3xl"
            style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
          >
            {cfg.hero_badge && (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mb-8"
              >
                <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[hsl(355,99%,38%)]/40 text-[hsl(355,99%,60%)] text-[10px] font-semibold uppercase tracking-[0.25em] bg-[hsl(355,99%,38%)]/5 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-[hsl(355,99%,60%)] animate-pulse" />
                  {cfg.hero_badge}
                </span>
              </motion.div>
            )}

            {(cfg.hero_title_line1 || cfg.hero_title_line2) && (
              <motion.h1
                className="font-display font-black leading-[0.9] tracking-tight"
                style={{ fontSize: "clamp(1.8rem, 5.5vw, 4.5rem)" }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {cfg.hero_title_line1 && (
                  <span className="block text-white">{cfg.hero_title_line1}</span>
                )}
                {cfg.hero_title_line2 && (
                  <span
                    className="block"
                    style={{
                      WebkitTextStroke: "1.5px hsl(355,99%,38%)",
                      color: "transparent",
                    }}
                  >
                    {cfg.hero_title_line2}
                  </span>
                )}
              </motion.h1>
            )}

            {cfg.hero_subtitle && (
              <motion.p
                className="mt-8 text-white/45 text-base sm:text-lg max-w-xl font-light tracking-wide leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9, duration: 0.8 }}
              >
                {cfg.hero_subtitle}
              </motion.p>
            )}

            <motion.div
              className="mt-10 flex flex-wrap gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1, duration: 0.7 }}
            >
              <a href={storefrontHref("/")}>
                <motion.span
                  whileHover={{ scale: 1.05, boxShadow: "0 0 50px hsl(355,99%,38%,0.45)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[hsl(355,99%,38%)] text-white font-semibold text-sm shadow-[0_0_35px_hsl(355,99%,38%,0.3)]"
                >
                  {cfg.hero_cta_primary} <ArrowRight className="w-4 h-4" />
                </motion.span>
              </a>
              <a href="#story">
                <motion.span
                  whileHover={{ scale: 1.04, borderColor: "rgba(255,255,255,0.4)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border border-white/20 text-white/75 font-medium text-sm backdrop-blur-sm hover:text-white transition-colors"
                >
                  {cfg.hero_cta_secondary}
                </motion.span>
              </a>
            </motion.div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            className="absolute bottom-10 left-8 sm:left-16 flex flex-col items-center gap-1.5 pointer-events-none"
            style={{ opacity: heroOpacity }}
          >
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1.8 }}>
              <ChevronDown className="w-4 h-4 text-white/25" />
            </motion.div>
            <span className="text-[9px] uppercase tracking-widest text-white/20">Scroll</span>
          </motion.div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          §2  BRAND STORY — word-by-word scroll text reveal
          ═══════════════════════════════════════════════════════════ */}
      <div id="story" ref={storyRef} style={{ height: "270vh" }}>
        <div className="sticky top-0 h-screen overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 bg-[#080808]" />
          {/* Ambient glow */}
          <motion.div
            className="absolute w-[900px] h-[900px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(355,99%,38%,0.065), transparent 65%)",
              top: "50%",
              left: "50%",
              x: "-50%",
              y: "-50%",
            }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
          />
          <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
            <motion.p
              className="text-[10px] uppercase tracking-[0.35em] text-[hsl(355,99%,50%)] mb-10"
              style={{ opacity: storyLabelOpacity }}
            >
              {cfg.show_about ? cfg.about_title || "Our Story" : "Our Story"}
            </motion.p>

            <div
              className="font-display font-bold leading-[1.18] tracking-tight text-white"
              style={{ fontSize: "clamp(1.6rem, 4vw, 3.2rem)" }}
            >
              <ScrollText text={storyText} progress={storyP} />
            </div>

            {cfg.show_mission_vision && cfg.mission_text && (
              <div className="mt-12 font-light text-white/35 leading-relaxed" style={{ fontSize: "clamp(1rem, 2vw, 1.25rem)" }}>
                <ScrollText text={cfg.mission_text} progress={storyP} />
              </div>
            )}

            <motion.div
              className="mt-16"
              style={{ opacity: storyCtaOpacity }}
            >
              <a href={storefrontHref("/")} className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
                Explore the collection <ArrowRight className="w-4 h-4" />
              </a>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      {stats.length > 0 && <StatsStrip stats={stats} />}

      {/* ═══════════════════════════════════════════════════════════
          EXPLORE NAV — always visible, links to all pages
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 border-t border-white/[0.06] bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-3">Discover</p>
          <h2 className="font-display font-bold text-white text-2xl mb-8">Explore Orizino</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Portfolio", href: "/portfolio", Icon: Sparkles, desc: "Our creative work" },
              { label: "News", href: "/news", Icon: Star, desc: "Latest updates" },
              { label: "Products", href: "/products", Icon: Package, desc: "Product highlights" },
              { label: "Shop", href: storefrontHref("/"), Icon: ArrowUpRight, desc: "Enter the store", external: true },
            ].map(({ label, href, Icon, desc, external }) => (
              <motion.a
                key={label}
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noopener noreferrer" : undefined}
                className="group rounded-2xl border border-white/8 bg-white/[0.025] p-5 hover:border-[hsl(355,99%,38%)]/40 hover:bg-[hsl(355,99%,38%)]/5 transition-all duration-300 flex flex-col gap-3"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
              >
                <div className="w-10 h-10 rounded-xl bg-[hsl(355,99%,38%)]/10 border border-[hsl(355,99%,38%)]/20 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[hsl(355,99%,55%)]" />
                </div>
                <div>
                  <p className="font-display font-bold text-white text-sm">{label}</p>
                  <p className="text-xs text-white/35 mt-0.5">{desc}</p>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          §3  COLLECTION RAIL — horizontal travel on vertical scroll
          ═══════════════════════════════════════════════════════════ */}
      {products && products.length > 0 && (
        <div ref={collectionRef} style={{ height: `${Math.max(220, productCount * 28)}vh` }}>
          <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center bg-[#080808]">
            <div className="relative z-10 px-6 sm:px-12 mb-8 flex items-end justify-between max-w-full">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-2">
                  This Season
                </p>
                <h2
                  className="font-display font-black text-white leading-tight"
                  style={{ fontSize: "clamp(2.2rem, 6vw, 4.5rem)" }}
                >
                  The Collection
                </h2>
              </div>
              <a
                href={storefrontHref("/shop")}
                className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white transition-colors shrink-0 mb-1"
              >
                View all <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            {/* Horizontal rail — driven by vertical scroll */}
            <div className="overflow-visible pl-6 sm:pl-12">
              <motion.div className="flex gap-5" style={{ x: railX }}>
                {products.map((p) => (
                  <ProductRailCard key={p.id} p={p} />
                ))}
                {/* End CTA card */}
                <motion.a
                  href={storefrontHref("/shop")}
                  className="shrink-0 w-52 sm:w-64 aspect-[3/4] rounded-2xl border border-[hsl(355,99%,38%)]/25 bg-[hsl(355,99%,38%)]/5 flex flex-col items-center justify-center gap-4 hover:bg-[hsl(355,99%,38%)]/10 transition-colors group"
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="w-14 h-14 rounded-full border border-[hsl(355,99%,38%)]/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <ArrowRight className="w-6 h-6 text-[hsl(355,99%,50%)]" />
                  </div>
                  <p className="text-sm font-semibold text-white/60 group-hover:text-white/90 transition-colors">
                    Shop All
                  </p>
                </motion.a>
              </motion.div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §4  BRAND VALUES — scroll-staggered card reveals
          ═══════════════════════════════════════════════════════════ */}
      {cfg.show_features && (
        <div ref={valuesRef} style={{ height: "200vh" }}>
          <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center bg-[#080808]">
            <div className="relative z-10 w-full max-w-6xl mx-auto px-6">
              <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-4 text-center">
                What We Stand For
              </p>
              <h2
                className="font-display font-black text-white text-center mb-12 leading-tight"
                style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
              >
                Built Different
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {features.map((f, i) => {
                  const Icon = iconMap[f.icon] || Sparkles;
                  return (
                    <motion.div
                      key={i}
                      style={{ opacity: cardOpacities[i], y: cardYs[i] }}
                      className="group rounded-2xl border border-white/8 bg-white/[0.025] p-7 hover:border-[hsl(355,99%,38%)]/40 hover:bg-[hsl(355,99%,38%)]/5 transition-all duration-500"
                    >
                      <div className="w-12 h-12 rounded-xl bg-[hsl(355,99%,38%)]/10 border border-[hsl(355,99%,38%)]/20 flex items-center justify-center mb-5">
                        <Icon className="w-5 h-5 text-[hsl(355,99%,55%)]" />
                      </div>
                      <h3 className="font-display font-bold text-white text-[15px] mb-2">{f.title}</h3>
                      <p className="text-sm text-white/35 leading-relaxed">{f.desc}</p>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §5  PORTFOLIO TEASER
          ═══════════════════════════════════════════════════════════ */}
      {(
        <section className="py-24 sm:py-32 bg-[#080808]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-2">Creative Work</p>
                <h2
                  className="font-display font-black text-white leading-tight"
                  style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
                >
                  Portfolio
                </h2>
              </div>
              <a href="/portfolio" className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white transition-colors mb-1">
                All projects <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
              {!(portfolioItems ?? []).length ? (
                <div className="col-span-2 md:col-span-3 text-center py-12 text-white/20 text-sm">Portfolio coming soon — check back shortly.</div>
              ) : (portfolioItems ?? []).slice(0, 6).map((item, i) => (
                <motion.a
                  key={item.id}
                  href="/portfolio"
                  className="group relative overflow-hidden rounded-xl sm:rounded-2xl aspect-[4/5] bg-white/5 border border-white/8 block"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.6 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[hsl(355,99%,38%)]/10 to-transparent" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <p className="text-white text-sm font-semibold truncate">{item.title}</p>
                    {item.category && <p className="text-white/50 text-xs mt-0.5">{item.category}</p>}
                  </div>
                </motion.a>
              ))}
            </div>

            <div className="text-center mt-10">
              <a href="/portfolio">
                <motion.span
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full border border-white/15 text-white/60 text-sm font-medium hover:border-white/30 hover:text-white transition-all"
                >
                  See Full Portfolio <ArrowRight className="w-4 h-4" />
                </motion.span>
              </a>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §6  LATEST NEWS
          ═══════════════════════════════════════════════════════════ */}
      {(
        <section className="py-24 sm:py-32 border-t border-white/[0.06] bg-[#080808]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-2">Updates</p>
                <h2
                  className="font-display font-black text-white leading-tight"
                  style={{ fontSize: "clamp(2rem, 5vw, 4rem)" }}
                >
                  Latest News
                </h2>
              </div>
              <a href="/news" className="flex items-center gap-1.5 text-sm text-white/35 hover:text-white transition-colors mb-1">
                All articles <ArrowUpRight className="w-4 h-4" />
              </a>
            </div>

            <div className="grid md:grid-cols-3 gap-5">
              {!(newsItems ?? []).length ? (
                <div className="col-span-3 text-center py-12 text-white/20 text-sm">Latest news coming soon — stay tuned.</div>
              ) : (newsItems ?? []).map((item, i) => (
                <motion.a
                  key={item.id}
                  href="/news"
                  className="group flex flex-col rounded-2xl border border-white/8 overflow-hidden hover:border-[hsl(355,99%,38%)]/30 transition-all duration-300 block"
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                >
                  <div className="aspect-[16/9] overflow-hidden bg-white/5">
                    {item.cover_image_url ? (
                      <img
                        src={item.cover_image_url}
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[hsl(355,99%,38%)]/10 to-transparent flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white/10" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 p-5">
                    {item.category && (
                      <p className="text-[10px] uppercase tracking-wider text-[hsl(355,99%,50%)] mb-2">{item.category}</p>
                    )}
                    <h3 className="font-display font-bold text-white text-[15px] leading-snug mb-2 group-hover:text-[hsl(355,99%,60%)] transition-colors">
                      {item.title}
                    </h3>
                    {item.excerpt && (
                      <p className="text-white/35 text-xs leading-relaxed line-clamp-2 flex-1">{item.excerpt}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      {item.published_at && (
                        <span className="text-[10px] text-white/20">
                          {new Date(item.published_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      <span className="text-xs text-white/35 group-hover:text-white/65 transition-colors flex items-center gap-1">
                        Read <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════════════════════
          §7  SHOP CTA — links directly to the storefront
          ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 border-t border-white/[0.06] bg-[#080808]">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-1">Storefront</p>
            <h3 className="font-display font-bold text-white text-2xl sm:text-3xl">Shop the Collection</h3>
            <p className="text-white/35 text-sm mt-1">Browse and buy the full Orizino catalogue.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a href={storefrontHref("/shop")}>
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: "0 0 30px hsl(355,99%,38%,0.35)" }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-[hsl(355,99%,38%)] text-white text-sm font-semibold shadow-[0_0_20px_hsl(355,99%,38%,0.2)]"
              >
                Shop Now <ArrowRight className="w-4 h-4" />
              </motion.span>
            </a>
            <a href="/products" className="text-sm text-white/35 hover:text-white/60 transition-colors">
              Product highlights →
            </a>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          §8  CINEMATIC CTA — full screen, glowing red
          ═══════════════════════════════════════════════════════════ */}
      {cfg.show_cta && (
        <section className="relative h-screen flex items-center justify-center overflow-hidden border-t border-white/[0.06] bg-[#080808]">
          {/* Pulsing red glow */}
          <motion.div
            className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
            style={{
              background: "radial-gradient(circle, hsl(355,99%,38%,0.13), transparent 65%)",
              top: "50%",
              left: "50%",
              x: "-50%",
              y: "-50%",
            }}
            animate={{ scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
          />
          {/* Film-scan line */}
          <motion.div
            className="absolute left-0 right-0 h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg,transparent,hsl(355,99%,38%,0.3),transparent)" }}
            animate={{ y: ["-45vh", "45vh"] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: "linear" }}
          />

          <motion.div
            className="relative z-10 text-center px-6 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
          >
            <p className="text-[10px] uppercase tracking-widest text-[hsl(355,99%,50%)] mb-7">
              Enter the World
            </p>
            <h2
              className="font-display font-black text-white leading-[0.9] mb-7"
              style={{ fontSize: "clamp(2.5rem, 9vw, 7rem)" }}
            >
              {cfg.cta_title || (
                <>
                  {siteName}
                  <br />
                  <span style={{ WebkitTextStroke: "1.5px hsl(355,99%,38%)", color: "transparent" }}>
                    Awaits You
                  </span>
                </>
              )}
            </h2>
            {cfg.cta_subtitle && (
              <p className="text-white/35 text-base mb-10 max-w-lg mx-auto leading-relaxed">
                {cfg.cta_subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-4 justify-center">
              <a href={storefrontHref("/")}>
                <motion.span
                  whileHover={{ scale: 1.06, boxShadow: "0 0 70px hsl(355,99%,38%,0.55)" }}
                  whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center gap-2.5 px-9 py-4 rounded-full bg-[hsl(355,99%,38%)] text-white font-bold text-sm shadow-[0_0_45px_hsl(355,99%,38%,0.3)]"
                >
                  {cfg.cta_button || "Enter the Store"} <ArrowRight className="w-4 h-4" />
                </motion.span>
              </a>
            </div>
          </motion.div>
        </section>
      )}

      <Footer variantOverride="editorial" />
    </div>
  );
}
