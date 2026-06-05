"use client";
import React, { useCallback } from "react";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ParallaxSlider from "@/components/ParallaxSlider";
import CategoryGrid from "@/components/CategoryGrid";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import HomePopup from "@/components/HomePopup";
import SaleCountdown from "@/components/SaleCountdown";
import SalePopup from "@/components/SalePopup";

import DeliveryOfferBanner from "@/components/DeliveryOfferBanner";
import GradientMeshBg from "@/components/GradientMeshBg";
import { Flame, Loader2 } from "lucide-react";
import DiscoverSection from "@/components/DiscoverSection";
import { usePageViewTracker, useSectionTracker, trackClick } from "@/hooks/use-analytics";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";

interface SaleConfig {
  id: string;
  enabled: boolean;
  title: string;
  subtitle: string;
  icon: string;
  custom_icon_url?: string;
  banner_image?: string;
  color: string;
  button_text: string;
  button_link: string;
  position: string;
  starts_at: string;
  ends_at: string;
  show_countdown: boolean;
  show_products: boolean;
  product_source: string;
  product_count: number;
  sort_order: number;
  trigger_popup: boolean;
}

interface LayoutConfig {
  section_spacing: string;
  container_max_width: string;
  section_animation: string;
  animation_delay: number;
  show_section_dividers: boolean;
  divider_style: string;
  featured_bg: string;
  arrivals_bg: string;
  categories_bg: string;
  featured_columns: number;
  arrivals_columns: number;
  card_style: string;
  section_title_size: string;
  section_title_align: string;
  page_bg: string;
  page_bg_pattern: string;
}

const defaultLayout: LayoutConfig = {
  section_spacing: "16",
  container_max_width: "1440px",
  section_animation: "fade-up",
  animation_delay: 0.05,
  show_section_dividers: false,
  divider_style: "line",
  featured_bg: "none",
  arrivals_bg: "none",
  categories_bg: "none",
  featured_columns: 4,
  arrivals_columns: 4,
  card_style: "default",
  section_title_size: "3xl",
  section_title_align: "left",
  page_bg: "none",
  page_bg_pattern: "none",
};

const isSaleActive = (sale: SaleConfig) => {
  if (!sale.enabled) return false;
  const now = new Date();
  if (sale.starts_at && new Date(sale.starts_at) > now) return false;
  if (sale.ends_at && new Date(sale.ends_at) < now) return false;
  return true;
};

const getSectionBgClass = (bg: string) => {
  switch (bg) {
    case "subtle": return "bg-secondary/30 rounded-3xl p-6 md:p-8";
    case "glass": return "glass rounded-3xl p-6 md:p-8";
    case "primary-tint": return "bg-primary/5 rounded-3xl p-6 md:p-8";
    case "gradient": return "bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-6 md:p-8";
    case "dark": return "bg-foreground/5 rounded-3xl p-6 md:p-8";
    default: return "";
  }
};

const getPatternStyle = (pattern: string): React.CSSProperties => {
  switch (pattern) {
    case "dots": return { backgroundImage: "radial-gradient(circle, hsl(var(--primary) / 0.07) 1px, transparent 1px)", backgroundSize: "20px 20px" };
    case "grid": return { backgroundImage: "linear-gradient(hsl(var(--primary) / 0.04) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary) / 0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" };
    case "diagonal": return { backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, hsl(var(--primary) / 0.03) 10px, hsl(var(--primary) / 0.03) 11px)", backgroundSize: "15px 15px" };
    default: return {};
  }
};

const getDivider = (style: string) => {
  switch (style) {
    case "dashed": return <div className="border-t border-dashed border-border" />;
    case "gradient": return <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />;
    case "dots": return <div className="flex justify-center gap-1">{[...Array(5)].map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-full bg-border" />)}</div>;
    default: return <div className="border-t border-border" />;
  }
};

const getAnimationVariants = (animation: string) => {
  switch (animation) {
    case "fade-in": return { initial: { opacity: 0 }, whileInView: { opacity: 1 } };
    case "scale-up": return { initial: { opacity: 0, scale: 0.95 }, whileInView: { opacity: 1, scale: 1 } };
    case "slide-left": return { initial: { opacity: 0, x: -30 }, whileInView: { opacity: 1, x: 0 } };
    case "slide-right": return { initial: { opacity: 0, x: 30 }, whileInView: { opacity: 1, x: 0 } };
    case "none": return { initial: {}, whileInView: {} };
    default: return { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 } };
  }
};

const titleSizeMap: Record<string, string> = { "2xl": "text-lg sm:text-2xl md:text-3xl", "3xl": "text-xl sm:text-3xl md:text-4xl", "4xl": "text-2xl sm:text-4xl md:text-5xl", "5xl": "text-3xl sm:text-5xl md:text-6xl" };
const colsMap: Record<number, string> = { 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5" };
const cardStyleMap: Record<string, string> = { default: "", minimal: "border-0 shadow-none", bordered: "border-2 border-border", elevated: "shadow-xl" };

const spacingMap: Record<string, string> = {
  "8": "gap-4 sm:gap-6", "12": "gap-5 sm:gap-8", "16": "gap-6 sm:gap-10", "20": "gap-7 sm:gap-12", "24": "gap-8 sm:gap-16",
};

interface SectionConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  title?: string;
  subtitle?: string;
  product_count?: number;
  columns?: number;
  view_all_link?: string;
}

const defaultSectionOrder: SectionConfig[] = [
  { id: "slider", label: "Showcase Slider", icon: "🎠", visible: true },
  { id: "categories", label: "Category Grid", icon: "📂", visible: true, title: "Shop by Category" },
  { id: "category-sections", label: "Category Product Sections", icon: "📦", visible: true, product_count: 8, columns: 4 },
  { id: "featured", label: "Featured Products", icon: "⭐", visible: true, title: "Featured Products", subtitle: "Handpicked just for you", product_count: 8, columns: 4, view_all_link: "/inventory" },
  { id: "discover", label: "Discover (Personalized)", icon: "🧭", visible: true, title: "Discover", subtitle: "Picked for the way you browse", product_count: 8 },
  { id: "arrivals", label: "New Arrivals", icon: "✨", visible: true, title: "New Arrivals", subtitle: "Fresh drops just landed", product_count: 8, columns: 4, view_all_link: "/inventory" },
];


/** Wrapper that tracks section visibility via Intersection Observer */
const TrackedSection: React.FC<{ sectionId: string; children: React.ReactNode }> = ({ sectionId, children }) => {
  const ref = useSectionTracker(sectionId);
  return <div ref={ref}>{children}</div>;
};

const HomePage: React.FC = () => {
  useSeoMeta("home", "Home | Store");
  usePageViewTracker("/home");
  const queryClient = useQueryClient();

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries();
    await new Promise((r) => setTimeout(r, 600));
  }, [queryClient]);

  const { pullDistance, refreshing } = usePullToRefresh(handleRefresh);
  const { data: featuredProducts = [], isLoading } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug").eq("is_active", true).eq("is_featured", true).order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const { data: catSectionsConfig } = useQuery({
    queryKey: ["home-category-sections"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_category_sections").maybeSingle();
      if (error) throw error;
      if (!data?.value) return [];
      const val = data.value as any;
      const sections = val?.value ?? val;
      return Array.isArray(sections) ? sections.sort((a: any, b: any) => a.sort_order - b.sort_order) : [];
    },
    staleTime: 30 * 1000,
  });

  const { data: salesConfig = [] } = useQuery({
    queryKey: ["home-sales-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_sales_config").maybeSingle();
      if (error) throw error;
      if (!data?.value) return [];
      const val = data.value as any;
      const sales = val?.value ?? val;
      return Array.isArray(sales) ? sales.filter(isSaleActive).sort((a: any, b: any) => a.sort_order - b.sort_order) : [];
    },
    staleTime: 30 * 1000,
  });

  const { data: newArrivalsConfig } = useQuery({
    queryKey: ["home-new-arrivals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_new_arrivals").maybeSingle();
      if (error) throw error;
      if (!data?.value) return { enabled: true, title: "New Arrivals", subtitle: "Fresh drops just landed", product_count: 8 };
      const val = data.value as any;
      return val?.value ?? val;
    },
    staleTime: 30 * 1000,
  });

  const { data: layoutConfigRaw } = useQuery({
    queryKey: ["home-layout-config"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_layout_config").maybeSingle();
      if (error) throw error;
      if (!data?.value) return defaultLayout;
      const val = data.value as any;
      const config = val?.value ?? val;
      return { ...defaultLayout, ...config };
    },
    staleTime: 30 * 1000,
  });

  const { data: sectionOrderConfig } = useQuery({
    queryKey: ["home-section-order"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("value").eq("key", "home_section_order").maybeSingle();
      if (error) throw error;
      if (!data?.value) return defaultSectionOrder;
      const val = data.value as any;
      const order = val?.value ?? val;
      if (Array.isArray(order)) {
        // Handle both old string format and new object format with visibility
        const normalizedOrder = order.map((item: any) => {
          if (typeof item === "string") {
            // Legacy format: convert string ID to object
            return defaultSectionOrder.find((d) => d.id === item) || { id: item, visible: true };
          }
          // New format: merge with defaults to ensure all properties
          const defaultSection = defaultSectionOrder.find((d) => d.id === item.id);
          return defaultSection ? { ...defaultSection, ...item } : item;
        });
        // Add any missing default sections — insert each at its default index
        // so newly-introduced sections (e.g. "discover") land in the right slot
        // instead of being appended at the bottom of an old saved order.
        const missing = defaultSectionOrder.filter((d) => !normalizedOrder.some((o: any) => o.id === d.id));
        const merged = [...normalizedOrder];
        for (const m of missing) {
          const defaultIdx = defaultSectionOrder.findIndex((d) => d.id === m.id);
          merged.splice(Math.min(defaultIdx, merged.length), 0, m);
        }
        return merged;
      }
      return defaultSectionOrder;
    },
    staleTime: 30 * 1000,
  });

  const sectionOrder: SectionConfig[] = (sectionOrderConfig || defaultSectionOrder) as SectionConfig[];

  // Helper to get section config by ID
  const getSectionCfg = (id: string): SectionConfig => sectionOrder.find((s) => s.id === id) || defaultSectionOrder.find((s) => s.id === id) || { id, label: id, icon: "", visible: true };

  const layout = layoutConfigRaw || defaultLayout;
  const anim = getAnimationVariants(layout.section_animation);
  const titleSize = titleSizeMap[layout.section_title_size] || titleSizeMap["3xl"];
  const titleAlign = layout.section_title_align === "center" ? "text-center justify-center" : "justify-between";
  const cardExtra = cardStyleMap[layout.card_style] || "";

  const arrivalsCfg = getSectionCfg("arrivals");
  const newArrivalsCount = arrivalsCfg.product_count || newArrivalsConfig?.product_count || 8;
  const { data: newArrivals = [] } = useQuery({
    queryKey: ["new-arrival-products", newArrivalsCount],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug").eq("is_active", true).order("created_at", { ascending: false }).limit(newArrivalsCount);
      if (error) throw error;
      return data;
    },
    staleTime: 60 * 1000,
  });

  const sectionCatIds = (catSectionsConfig || []).map((s: any) => s.category_id).filter(Boolean);
  const { data: sectionCategories = [] } = useQuery({
    queryKey: ["home-section-categories", sectionCatIds],
    queryFn: async () => {
      if (sectionCatIds.length === 0) return [];
      const { data, error } = await supabase.from("categories").select("id, name, slug, accent_color").in("id", sectionCatIds);
      if (error) throw error;
      return data;
    },
    enabled: sectionCatIds.length > 0,
    staleTime: 60 * 1000,
  });

  const { data: sectionProducts = {} } = useQuery({
    queryKey: ["home-section-products", sectionCatIds],
    queryFn: async () => {
      if (sectionCatIds.length === 0) return {};
      const result: Record<string, any[]> = {};
      for (const section of catSectionsConfig || []) {
        const limit = section.product_count || 8;
        const { data } = await supabase.from("products").select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug").eq("is_active", true).eq("category_id", section.category_id).order("created_at", { ascending: false }).limit(limit);
        result[section.category_id] = data || [];
      }
      return result;
    },
    enabled: sectionCatIds.length > 0,
    staleTime: 60 * 1000,
  });

  const saleProductSources = salesConfig.filter((s: SaleConfig) => s.show_products && s.product_source).map((s: SaleConfig) => ({ id: s.id, source: s.product_source, count: s.product_count || 4 }));

  const { data: saleProducts = {} } = useQuery({
    queryKey: ["sale-products", saleProductSources],
    queryFn: async () => {
      const result: Record<string, any[]> = {};
      for (const sp of saleProductSources) {
        let query = supabase.from("products").select("id, name, price, compare_at_price, thumbnail, avg_rating, review_count, slug").eq("is_active", true);
        if (sp.source === "featured") query = query.eq("is_featured", true);
        else if (sp.source !== "latest") query = query.eq("category_id", sp.source);
        const { data } = await query.order("created_at", { ascending: false }).limit(sp.count);
        result[sp.id] = data || [];
      }
      return result;
    },
    enabled: saleProductSources.length > 0,
    staleTime: 60 * 1000,
  });

  const renderSaleBanner = (sale: SaleConfig) => {
    const bgColor = sale.color?.startsWith("var") ? `hsl(var(--primary))` : `hsl(${sale.color})`;
    const gradBg = sale.color?.startsWith("var")
      ? `linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.6))`
      : `linear-gradient(135deg, hsl(${sale.color}), hsl(${sale.color} / 0.6))`;
    const products = (saleProducts as Record<string, any[]>)[sale.id] || [];

    return (
      <motion.section key={sale.id} {...anim} viewport={{ once: true }}>
        <div
          className="glass-strong rounded-3xl p-5 md:p-8 relative overflow-hidden"
          style={sale.banner_image ? { backgroundImage: `url(${sale.banner_image})`, backgroundSize: "cover", backgroundPosition: "center" } : {}}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: gradBg }} />
          {sale.banner_image && <div className="absolute inset-0 bg-background/50" />}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl" style={{ background: `${bgColor}20` }}>
                {sale.custom_icon_url ? <img src={sale.custom_icon_url} className="w-8 h-8 object-contain" alt="" /> : sale.icon}
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold font-display text-foreground">{sale.title}</h3>
                <p className="text-sm text-muted-foreground">{sale.subtitle}</p>
                {sale.show_countdown && sale.ends_at && <SaleCountdown endsAt={sale.ends_at} color={sale.color} />}
                {!sale.show_countdown && sale.ends_at && (
                  <p className="text-xs text-muted-foreground/70 mt-1">Ends {new Date(sale.ends_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <a href={sale.button_link || "/inventory"} className="btn-pill text-white font-semibold px-8 py-3 whitespace-nowrap" style={{ background: bgColor }}
              onClick={() => trackClick("sale_cta", sale.id, "/home", { sale_title: sale.title, link: sale.button_link })}>
              {sale.button_text || "Shop Now"}
            </a>
          </div>
        </div>
        {sale.show_products && products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6">
            {products.map((product: any, i: number) => (
              <motion.div key={product.id} {...anim} viewport={{ once: true }} transition={{ delay: i * layout.animation_delay }}>
                <ProductCard id={product.id} name={product.name} price={Number(product.price)} compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined} thumbnail={product.thumbnail ?? undefined} avgRating={product.avg_rating ? Number(product.avg_rating) : undefined} reviewCount={product.review_count ?? undefined} slug={product.slug} className={cardExtra} />
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>
    );
  };

  const salesByPos = (pos: string) => salesConfig.filter((s: SaleConfig) => s.position === pos);
  const popupSales = salesConfig.filter((s: SaleConfig) => s.trigger_popup);
  const showNewArrivals = newArrivalsConfig?.enabled !== false && newArrivals.length > 0;

  const divider = layout.show_section_dividers ? getDivider(layout.divider_style) : null;
  const spacingClass = spacingMap[layout.section_spacing] || "gap-16";

  // Map section IDs to their sale position suffixes
  const sectionSaleMap: Record<string, string> = {
    slider: "after-slider",
    categories: "after-categories",
    featured: "after-featured",
    arrivals: "after-arrivals",
  };

  const renderSection = (sectionId: string) => {
    const cfg = getSectionCfg(sectionId);
    const sectionCols = cfg.columns ? colsMap[cfg.columns] || "lg:grid-cols-4" : colsMap[layout.featured_columns] || "lg:grid-cols-4";
    const viewAllLink = cfg.view_all_link || "/inventory";

    switch (sectionId) {
      case "slider":
        return <ParallaxSlider key="slider" />;

      case "discover":
        return (
          <DiscoverSection
            key="discover"
            surface="home"
            limit={cfg.product_count || 8}
            title={cfg.title || "Discover"}
            subtitle={cfg.subtitle || "Picked for the way you browse"}
            className="!mt-0"
          />
        );


      case "categories":
        return (
          <div key="categories" className={getSectionBgClass(layout.categories_bg)}>
            <CategoryGrid />
          </div>
        );

      case "category-sections":
        return (catSectionsConfig || []).map((section: any) => {
          const cat = sectionCategories.find((c) => c.id === section.category_id);
          const products = (sectionProducts as Record<string, any[]>)[section.category_id] || [];
          if (!cat || products.length === 0) return null;
          return (
            <section key={section.category_id}>
              <motion.div {...anim} viewport={{ once: true }} className={`flex items-center ${titleAlign} mb-3 sm:mb-6 gap-2`}>
                <div className={layout.section_title_align === "center" ? "text-center" : ""}>
                  <h2 className={`${titleSize} font-bold font-display text-foreground`}>{cat.name}</h2>
                  <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-1">Explore our {cat.name.toLowerCase()} collection</p>
                </div>
                {layout.section_title_align !== "center" && (
                  <a href={`/categories/${cat.slug}`} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors" onClick={() => trackClick("view_all", cat.slug, "/home", { section: "category" })}>View All</a>
                )}
              </motion.div>
              <div className={`grid grid-cols-2 md:grid-cols-3 ${sectionCols} gap-3 sm:gap-4`}>
                {products.map((product: any, i: number) => (
                  <motion.div key={product.id} {...anim} viewport={{ once: true }} transition={{ delay: i * layout.animation_delay }}>
                    <ProductCard id={product.id} name={product.name} price={Number(product.price)} compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined} thumbnail={product.thumbnail ?? undefined} avgRating={product.avg_rating ? Number(product.avg_rating) : undefined} reviewCount={product.review_count ?? undefined} slug={product.slug} className={cardExtra} />
                  </motion.div>
                ))}
              </div>
              {layout.section_title_align === "center" && (
                <div className="text-center mt-6">
                  <a href={`/categories/${cat.slug}`} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors">View All</a>
                </div>
              )}
            </section>
          );
        });

      case "featured": {
        const featuredTitle = cfg.title || "Featured Products";
        const featuredSubtitle = cfg.subtitle || "Handpicked just for you";
        const featuredLink = cfg.view_all_link || "/inventory";
        if (!isLoading && featuredProducts.length === 0) return null;
        return (
          <section key="featured" className={getSectionBgClass(layout.featured_bg)}>
            <motion.div {...anim} viewport={{ once: true }} className={`flex items-center ${titleAlign} mb-3 sm:mb-6 gap-2`}>
              <div className={layout.section_title_align === "center" ? "text-center" : ""}>
                <h2 className={`${titleSize} font-bold font-display text-foreground`}>{featuredTitle}</h2>
                {featuredSubtitle && <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-1">{featuredSubtitle}</p>}
              </div>
              {layout.section_title_align !== "center" && (
                <a href={featuredLink} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors" onClick={() => trackClick("view_all", "featured", "/home")}>View All</a>
              )}
            </motion.div>
            <div className={`grid grid-cols-2 md:grid-cols-3 ${sectionCols} gap-3 sm:gap-4`}>
              {isLoading
                ? Array.from({ length: cfg.product_count || 8 }).map((_, i) => <ProductCardSkeleton key={i} className={cardExtra} />)
                : featuredProducts.slice(0, cfg.product_count || 8).map((product, i) => (
                    <motion.div key={product.id} {...anim} viewport={{ once: true }} transition={{ delay: i * layout.animation_delay }}>
                      <ProductCard id={product.id} name={product.name} price={Number(product.price)} compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined} thumbnail={product.thumbnail ?? undefined} avgRating={product.avg_rating ? Number(product.avg_rating) : undefined} reviewCount={product.review_count ?? undefined} slug={product.slug} className={cardExtra} />
                    </motion.div>
                  ))}
            </div>
            {layout.section_title_align === "center" && (
              <div className="text-center mt-6">
                <a href={featuredLink} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors" onClick={() => trackClick("view_all", "featured", "/home")}>View All</a>
              </div>
            )}
          </section>
        );
      }

      case "arrivals": {
        const arrivalsTitle = cfg.title || newArrivalsConfig?.title || "New Arrivals";
        const arrivalsSubtitle = cfg.subtitle || newArrivalsConfig?.subtitle || "Fresh drops just landed";
        const arrivalsLink = cfg.view_all_link || "/inventory";
        const arrivalsCols = cfg.columns ? colsMap[cfg.columns] || "lg:grid-cols-4" : colsMap[layout.arrivals_columns] || "lg:grid-cols-4";
        if (!showNewArrivals) return null;
        return (
          <section key="arrivals" className={getSectionBgClass(layout.arrivals_bg)}>
            <motion.div {...anim} viewport={{ once: true }} className={`flex items-center ${titleAlign} mb-3 sm:mb-6 gap-2`}>
              <div className={`flex items-center gap-3 ${layout.section_title_align === "center" ? "justify-center" : ""}`}>
                <Flame className="w-5 h-5 sm:w-7 sm:h-7 text-primary shrink-0" />
                <div className={layout.section_title_align === "center" ? "text-center" : ""}>
                  <h2 className={`${titleSize} font-bold font-display text-foreground`}>{arrivalsTitle}</h2>
                  {arrivalsSubtitle && <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 sm:mt-1 line-clamp-1">{arrivalsSubtitle}</p>}
                </div>
              </div>
              {layout.section_title_align !== "center" && (
                <a href={arrivalsLink} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors" onClick={() => trackClick("view_all", "arrivals", "/home")}>View All</a>
              )}
            </motion.div>
            <div className={`grid grid-cols-2 md:grid-cols-3 ${arrivalsCols} gap-3 sm:gap-4`}>
              {newArrivals.map((product, i) => (
                <motion.div key={product.id} {...anim} viewport={{ once: true }} transition={{ delay: i * layout.animation_delay }}>
                  <ProductCard id={product.id} name={product.name} price={Number(product.price)} compareAtPrice={product.compare_at_price ? Number(product.compare_at_price) : undefined} thumbnail={product.thumbnail ?? undefined} avgRating={product.avg_rating ? Number(product.avg_rating) : undefined} reviewCount={product.review_count ?? undefined} slug={product.slug} className={cardExtra} />
                </motion.div>
              ))}
            </div>
            {layout.section_title_align === "center" && (
              <div className="text-center mt-6">
                <a href={arrivalsLink} className="btn-pill glass text-[11px] sm:text-sm px-3 py-1.5 sm:px-4 sm:py-2 whitespace-nowrap shrink-0 text-foreground hover:text-primary transition-colors" onClick={() => trackClick("view_all", "arrivals", "/home")}>View All</a>
              </div>
            )}
          </section>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pb-20 lg:pb-0 relative" style={getPatternStyle(layout.page_bg_pattern)}>
      {/* Animated gradient mesh background */}
      <GradientMeshBg variant="mixed" />
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || refreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-[100] flex justify-center pointer-events-none"
          style={{ transform: `translateY(${refreshing ? 60 : pullDistance}px)`, transition: refreshing ? "transform 0.3s ease" : "none" }}
        >
          <div className="glass rounded-full p-2.5 shadow-lg mt-2">
            <Loader2 className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
              style={{ transform: refreshing ? "none" : `rotate(${pullDistance * 3}deg)` }} />
          </div>
        </div>
      )}
      <HomePopup />
      {popupSales.map((sale: SaleConfig) => <SalePopup key={sale.id} sale={sale} />)}

      <main className={`mx-auto px-3 sm:px-4 pt-3 sm:pt-6 flex flex-col ${spacingClass}`} style={{ maxWidth: layout.container_max_width }}>
        <DeliveryOfferBanner />
        {sectionOrder.map((section, idx) => {
          // Check visibility (default to visible if not specified)
          const isVisible = (section as any).visible !== false;
          if (!isVisible) return null;
          
          return (
            <React.Fragment key={section.id}>
              <TrackedSection sectionId={section.id}>
                {renderSection(section.id)}
              </TrackedSection>
              {sectionSaleMap[section.id] && salesByPos(sectionSaleMap[section.id]).map(renderSaleBanner)}
              {idx < sectionOrder.length - 1 && divider}
            </React.Fragment>
          );
        })}
        {salesByPos("bottom").map(renderSaleBanner)}
      </main>

      
    </div>
  );
};

export default HomePage;
