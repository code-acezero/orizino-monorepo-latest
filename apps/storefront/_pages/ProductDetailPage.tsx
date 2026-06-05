"use client";
import React, { useState, lazy, Suspense, useEffect } from "react";
import { useLayout } from "@/contexts/LayoutContext";
import { useParams, Link, useNavigate } from "@/lib/router-compat";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Shield, Truck, RotateCcw, Package, X, Zap, Tag, Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useProductSeoMeta } from "@/hooks/use-product-seo-meta";
import { useIsMobile } from "@/hooks/use-mobile";
import { addRecentlyViewed } from "@/hooks/use-recently-viewed";
import { trackInteraction } from "@/lib/track-interaction";
import Breadcrumbs from "@/components/Breadcrumbs";
import SectionShimmer from "@/components/skeletons/SectionShimmer";
import ProductCard from "@/components/ProductCard";
import ImageGallery from "@/components/product/ImageGallery";
import InfinityGallery from "@/components/product/InfinityGallery";
import ProductTabs from "@/components/product/ProductTabs";
import ProductActions from "@/components/product/ProductActions";
import CurrencyWidget from "@/components/product/CurrencyWidget";
import { getVariantLabels } from "@/lib/variant-labels";
import VariantSelector from "@/components/product/VariantSelector";
import VariantComparison from "@/components/product/VariantComparison";
import NotifyWhenAvailable from "@/components/product/NotifyWhenAvailable";
import { Badge } from "@/components/ui/badge";
import LogoLoader from "@/components/LogoLoader";

// Lazy load gallery variants
const CoverflowGallery = lazy(() => import("@/components/product/CoverflowGallery"));
const FilmstripGallery = lazy(() => import("@/components/product/FilmstripGallery"));
const GridMosaicGallery = lazy(() => import("@/components/product/GridMosaicGallery"));
const ParallaxStackGallery = lazy(() => import("@/components/product/ParallaxStackGallery"));

// Helper component to set product tray in layout context
const ProductTrayEffect: React.FC<{
  product: any; effectivePrice: number; selectedVariant: any;
  effectiveStock: number; addToCart: () => void; buyNow: () => void; addingToCart: boolean;
  disabled?: boolean; disabledReason?: string;
}> = ({ product, effectivePrice, selectedVariant, effectiveStock, addToCart, buyNow, addingToCart, disabled, disabledReason }) => {
  const { setProductTray } = useLayout();
  useEffect(() => {
    setProductTray({
      product: {
        name: product.name,
        price: effectivePrice,
        thumbnail: selectedVariant?.image_url ?? product.thumbnail,
        stockQuantity: effectiveStock,
      },
      onAddToCart: addToCart,
      onBuyNow: buyNow,
      addingToCart,
      disabled,
      disabledReason,
    });
    return () => setProductTray(undefined);
  }, [product.name, effectivePrice, selectedVariant?.image_url, product.thumbnail, effectiveStock, addToCart, buyNow, addingToCart, disabled, disabledReason, setProductTray]);
  return null;
};

export type LayoutStyle = "dark-luxury" | "glass" | "neon" | "minimal" | "magazine";
export type GalleryStyle = "default" | "infinity" | "coverflow" | "filmstrip" | "mosaic" | "parallax-stack";

const LAYOUT_CONFIGS: Record<LayoutStyle, { containerClass: string; textClass: string; priceClass: string; mobilePriceClass: string; cardClass: string; accentBorder: string }> = {
  "dark-luxury": {
    containerClass: "bg-black/40",
    textClass: "text-white",
    priceClass: "text-4xl md:text-5xl font-black tracking-tight text-white",
    mobilePriceClass: "text-2xl font-black tracking-tight text-white",
    cardClass: "bg-white/5 border border-white/10 backdrop-blur-lg",
    accentBorder: "border-amber-400/30",
  },
  glass: {
    containerClass: "",
    textClass: "text-foreground",
    priceClass: "text-4xl font-bold text-gradient",
    mobilePriceClass: "text-2xl font-bold text-gradient",
    cardClass: "glass",
    accentBorder: "border-primary/30",
  },
  neon: {
    containerClass: "",
    textClass: "text-foreground",
    priceClass: "text-4xl font-black text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]",
    mobilePriceClass: "text-2xl font-black text-primary drop-shadow-[0_0_15px_hsl(var(--primary)/0.5)]",
    cardClass: "bg-background/80 border border-primary/20 shadow-[0_0_30px_hsl(var(--primary)/0.1)]",
    accentBorder: "border-primary/40",
  },
  minimal: {
    containerClass: "",
    textClass: "text-foreground",
    priceClass: "text-3xl font-semibold text-foreground tracking-tight",
    mobilePriceClass: "text-xl font-semibold text-foreground tracking-tight",
    cardClass: "bg-transparent",
    accentBorder: "border-border",
  },
  magazine: {
    containerClass: "",
    textClass: "text-foreground",
    priceClass: "text-4xl font-display font-bold text-foreground italic",
    mobilePriceClass: "text-2xl font-display font-bold text-foreground italic",
    cardClass: "glass rounded-3xl",
    accentBorder: "border-primary/20",
  },
};

const GalleryLoader = () => (
  <div className="w-full aspect-square rounded-3xl bg-secondary/10 flex items-center justify-center">
    <LogoLoader size={48} />
  </div>
);

const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const isMobile = useIsMobile();

  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  // Fetch product page layout setting
  const { data: pageSettings } = useQuery({
    queryKey: ["product-page-layout"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "product_page_layout")
        .maybeSingle();
      const val = (data?.value as any) || {};
      return {
        layout: (val.layout || "glass") as LayoutStyle,
        gallery: (val.gallery || "default") as GalleryStyle,
      };
    },
  });
  const layout: LayoutStyle = pageSettings?.layout || "glass";
  const galleryStyle: GalleryStyle = pageSettings?.gallery || "default";
  const cfg = LAYOUT_CONFIGS[layout] || LAYOUT_CONFIGS.glass;

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*, categories(name, slug, parent_id)")
        .eq("slug", slug!)
        .eq("is_active", true)
        .single();
      return data;
    },
    enabled: !!slug,
  });

  useProductSeoMeta(product as any);

  // Track recently viewed + product_interactions (view + dwell on unmount)
  useEffect(() => {
    if (!product?.id) return;
    addRecentlyViewed(product.id);
    trackInteraction(product.id, "view", { source: "product_detail" });
    const start = Date.now();
    return () => {
      const dwell = Date.now() - start;
      if (dwell > 3000) trackInteraction(product.id, "dwell", { dwell_ms: dwell, source: "product_detail" });
    };
  }, [product?.id]);

  const productCat = product?.categories as any;
  const { data: parentCategory } = useQuery({
    queryKey: ["parent-category", productCat?.parent_id],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("name, slug").eq("id", productCat.parent_id).single();
      return data;
    },
    enabled: !!productCat?.parent_id,
  });

  const { data: reviews } = useQuery<any[]>({
    queryKey: ["reviews", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("public_reviews" as any).select("id, product_id, rating, title, comment, created_at, is_approved")
        .eq("product_id", product!.id).eq("is_approved", true).order("created_at", { ascending: false });
      return (data as any) || [];
    },
    enabled: !!product?.id,
  });

  const { data: ownReviews } = useQuery<any[]>({
    queryKey: ["own-reviews", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("reviews").select("id, product_id, rating, title, comment, created_at, is_approved")
        .eq("product_id", product!.id).eq("user_id", user!.id).order("created_at", { ascending: false });
      return (data || []) as any;
    },
    enabled: !!product?.id && !!user,
  });

  const ownReviewIds = new Set((ownReviews || []).map((r: any) => r.id));
  const pendingOwnReviews = (ownReviews || []).filter((r: any) => !r.is_approved);
  const mergedReviews = [...pendingOwnReviews, ...(reviews || [])].filter((r, i, arr) => arr.findIndex((x) => x.id === r.id) === i);

  const { data: relatedProducts } = useQuery({
    queryKey: ["related-products", product?.category_id, product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("category_id", product!.category_id!)
        .eq("is_active", true).neq("id", product!.id).order("avg_rating", { ascending: false }).limit(4);
      return data || [];
    },
    enabled: !!product?.category_id && !!product?.id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ["product-variants", product?.id],
    queryFn: async () => {
      const { data } = await supabase.from("product_variants").select("id, size, color, stock_quantity, price_override, is_active, image_url")
        .eq("product_id", product!.id).eq("is_active", true).order("sort_order");
      return data || [];
    },
    enabled: !!product?.id,
  });

  // Fetch applicable coupons and delivery offers for this product
  const { data: applicableCoupons } = useQuery({
    queryKey: ["product-coupons", product?.id, product?.category_id],
    queryFn: async () => {
      const { data } = await supabase.from("coupons").select("code, description, discount_type, discount_value, min_order_amount, target_categories, target_products")
        .eq("is_active", true);
      return (data || []).filter(c => {
        const cats = (c as any).target_categories as string[] || [];
        const prods = (c as any).target_products as string[] || [];
        if (cats.length > 0 && product?.category_id && !cats.includes(product.category_id)) return false;
        if (prods.length > 0 && product?.id && !prods.includes(product.id)) return false;
        return true;
      });
    },
    enabled: !!product?.id,
    staleTime: 5 * 60 * 1000,
  });

  const { data: deliveryOffers } = useQuery({
    queryKey: ["active-delivery-offers"],
    queryFn: async () => {
      const { data } = await supabase.from("delivery_offers").select("*").eq("is_active", true);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const hasVariants = variants.length > 0;
  const availableSizes = [...new Set(variants.filter(v => v.size).map(v => v.size))] as string[];
  const availableColors = [...new Set(variants.filter(v => v.color).map(v => v.color))] as string[];
  const needsSize = availableSizes.length > 0 && !selectedSize;
  const needsColor = availableColors.length > 0 && !selectedColor;
  const requiresSelection = hasVariants && (needsSize || needsColor);

  const effectiveStock = hasVariants
    ? (() => {
        const match = variants.find(v => (!selectedSize || v.size === selectedSize) && (!selectedColor || v.color === selectedColor));
        if (selectedSize || selectedColor) return match?.stock_quantity ?? 0;
        return variants.reduce((sum, v) => sum + v.stock_quantity, 0);
      })()
    : product?.stock_quantity ?? 0;

  const selectedVariant = hasVariants
    ? variants.find(v => (!selectedSize || v.size === selectedSize) && (!selectedColor || v.color === selectedColor))
    : null;
  const effectivePrice = selectedVariant?.price_override ?? product?.price ?? 0;

  // Build selection guide for the buy box + disabled reason for the dynamic island
  const { sizeLabel, colorLabel } = getVariantLabels(product as any);
  const selectionSteps = hasVariants
    ? [
        availableSizes.length > 0 ? { label: sizeLabel, complete: !!selectedSize } : null,
        availableColors.length > 0 ? { label: colorLabel, complete: !!selectedColor } : null,
      ].filter(Boolean) as { label: string; complete: boolean }[]
    : [];
  const missingLabels = selectionSteps.filter(s => !s.complete).map(s => s.label.toLowerCase());
  const disabledReason = missingLabels.length > 0
    ? `Select a ${missingLabels.join(" & ")} to continue`
    : undefined;

  const baseImages = product?.images?.length ? product.images : [product?.thumbnail || "/placeholder.svg"];
  const variantImages = selectedColor
    ? variants.filter(v => v.color === selectedColor && (v as any).image_url).map(v => (v as any).image_url as string)
    : [];
  const images = variantImages.length > 0 ? [...variantImages, ...baseImages] : baseImages;
  const discount = product?.compare_at_price
    ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
    : 0;

  // === Cart / Wishlist actions ===
  const addToCart = async () => {
    if (!user) { toast({ title: "Please sign in", description: "You need to be logged in to add items to cart.", variant: "destructive" }); return; }
    if (!product) return;
    if (hasVariants) {
      const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size))];
      const colors = [...new Set(variants.filter(v => v.color).map(v => v.color))];
      if (sizes.length > 0 && !selectedSize) { toast({ title: "Please select a size", variant: "destructive" }); return; }
      if (colors.length > 0 && !selectedColor) { toast({ title: "Please select a color", variant: "destructive" }); return; }
      if (!selectedVariant) { toast({ title: "This combination is unavailable", variant: "destructive" }); return; }
    }
    setAddingToCart(true);
    const variantId = selectedVariant?.id || null;
    let query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id);
    if (variantId) query = query.eq("variant_id", variantId); else query = query.is("variant_id", null);
    const { data: existing } = await query.maybeSingle();
    if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + quantity }).eq("id", existing.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity, variant_id: variantId } as any);
    setAddingToCart(false);
    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(" / ");
    toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${quantity}` });
  };

  const addVariantToCart = async (variantId: string, variantLabel: string, qty: number = 1) => {
    if (!user) { toast({ title: "Please sign in", variant: "destructive" }); return; }
    if (!product) return;
    const query = supabase.from("cart_items").select("id, quantity").eq("user_id", user.id).eq("product_id", product.id).eq("variant_id", variantId);
    const { data: existing } = await query.maybeSingle();
    if (existing) await supabase.from("cart_items").update({ quantity: existing.quantity + qty }).eq("id", existing.id);
    else await supabase.from("cart_items").insert({ user_id: user.id, product_id: product.id, quantity: qty, variant_id: variantId } as any);
    toast({ title: "Added to cart!", description: `${product.name}${variantLabel ? ` (${variantLabel})` : ""} x${qty}` });
  };

  const buyNow = async () => {
    if (!user) { toast({ title: "Please sign in", variant: "destructive" }); return; }
    if (!product) return;
    if (hasVariants) {
      const sizes = [...new Set(variants.filter(v => v.size).map(v => v.size))];
      const colors = [...new Set(variants.filter(v => v.color).map(v => v.color))];
      if (sizes.length > 0 && !selectedSize) { toast({ title: "Please select a size", variant: "destructive" }); return; }
      if (colors.length > 0 && !selectedColor) { toast({ title: "Please select a color", variant: "destructive" }); return; }
      if (!selectedVariant) { toast({ title: "This combination is unavailable", variant: "destructive" }); return; }
    }
    // Navigate to checkout with buy-now state (only this product)
    const variantLabel = [selectedSize, selectedColor].filter(Boolean).join(" / ");
    navigate("/checkout", {
      state: {
        buyNow: true,
        buyNowItem: {
          productId: product.id,
          variantId: selectedVariant?.id || null,
          quantity,
          name: product.name,
          price: effectivePrice,
          thumbnail: selectedVariant?.image_url ?? product.thumbnail,
          variantLabel,
        },
      },
    });
  };

  const toggleWishlist = async () => {
    if (!user) { toast({ title: "Please sign in", variant: "destructive" }); return; }
    if (!product) return;
    const { data: existing } = await supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle();
    if (existing) { await supabase.from("wishlist_items").delete().eq("id", existing.id); toast({ title: "Removed from wishlist" }); }
    else { await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: product.id }); toast({ title: "Added to wishlist!" }); }
  };

  // === Render gallery ===
  const renderGallery = () => {
    const galleryProps = { images, productName: product!.name, discount };
    switch (galleryStyle) {
      case "infinity": return <InfinityGallery key={selectedColor || "default"} {...galleryProps} />;
      case "coverflow": return <Suspense fallback={<GalleryLoader />}><CoverflowGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "filmstrip": return <Suspense fallback={<GalleryLoader />}><FilmstripGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "mosaic": return <Suspense fallback={<GalleryLoader />}><GridMosaicGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      case "parallax-stack": return <Suspense fallback={<GalleryLoader />}><ParallaxStackGallery key={selectedColor || "default"} {...galleryProps} /></Suspense>;
      default: return <ImageGallery key={selectedColor || "default"} {...galleryProps} layout="premium" />;
    }
  };

  // === Skeleton: render page chrome instantly, only shimmer the data region ===
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 py-4 md:py-6">
          <div className="mb-3 md:mb-4">
            <SectionShimmer of="categoryChips" count={3} />
          </div>
          <SectionShimmer of="productHero" />
          <div className="mt-8 md:mt-10">
            <SectionShimmer of="reviewList" count={2} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-3 sm:px-4 py-16 md:py-20 text-center">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Product not found</h1>
        </div>
      </div>
    );
  }

  const trustBadges = [
    { icon: Truck, label: "Free Shipping", sub: "On orders over $50" },
    { icon: Shield, label: "Secure Payment", sub: "100% protected" },
    { icon: RotateCcw, label: "Easy Returns", sub: "30-day policy" },
    { icon: Package, label: "Quality Guaranteed", sub: "Authentic products" },
  ];

  // === Shared variant badge section ===
  const VariantBadges = () => (
    <AnimatePresence>
      {(selectedSize || selectedColor) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <span className="text-[10px] sm:text-xs text-muted-foreground">Selected:</span>
          <AnimatePresence mode="popLayout">
            {selectedSize && (
              <motion.div key="size" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge variant="secondary" className="gap-1 pl-2 pr-1 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                  Size: {selectedSize}
                  <button onClick={() => setSelectedSize(null)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                </Badge>
              </motion.div>
            )}
            {selectedColor && (
              <motion.div key="color" layout initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                <Badge variant="secondary" className="gap-1 pl-1.5 pr-1 py-0.5 sm:py-1 text-[10px] sm:text-xs">
                  <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border border-border/50 inline-block shrink-0" style={{ backgroundColor: selectedColor.toLowerCase() }} />
                  {selectedColor}
                  <button onClick={() => setSelectedColor(null)} className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"><X className="w-2.5 h-2.5 sm:w-3 sm:h-3" /></button>
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // === Shared product info section ===
  const ProductInfo = () => {
    return (
    <div className="space-y-3 sm:space-y-4 md:space-y-5">
      {productCat && (
        <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="inline-block text-[10px] sm:text-xs font-semibold tracking-[0.15em] sm:tracking-[0.2em] uppercase text-primary">
          {productCat.name}
        </motion.span>
      )}

      <h1 className={`font-display leading-[1.05] tracking-tight ${
        isMobile
          ? "text-2xl"
          : layout === "magazine"
            ? "text-5xl md:text-6xl italic font-normal"
            : "text-4xl md:text-5xl font-normal"
      } ${cfg.textClass}`} style={{ fontFamily: 'var(--font-title, var(--font-display))' }}>
        {product.name}
      </h1>


      {/* Rating */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${i < Math.round(product.avg_rating || 0)
              ? layout === "neon" ? "fill-primary text-primary drop-shadow-[0_0_4px_hsl(var(--primary)/0.6)]" : "fill-primary text-primary"
              : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <span className="text-xs sm:text-sm text-muted-foreground">{product.avg_rating?.toFixed(1) || "0"} ({product.review_count || 0})</span>
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-2 sm:gap-3 flex-wrap">
        <span className={isMobile ? cfg.mobilePriceClass : cfg.priceClass}>{formatPrice(effectivePrice)}</span>
        {product.compare_at_price && (
          <span className="text-sm sm:text-lg text-muted-foreground line-through">{formatPrice(product.compare_at_price)}</span>
        )}
        {discount > 0 && (
          <span className={`text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${
            layout === "neon" ? "bg-primary/20 text-primary border border-primary/30" : "bg-primary/10 text-primary"
          }`}>
            {layout === "neon" && <Zap className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline mr-0.5 sm:mr-1" />}
            Save {discount}%
          </span>
        )}
      </div>

      <CurrencyWidget price={effectivePrice} />

      {product.short_description && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{product.short_description}</p>
      )}

      {hasVariants && (
        <VariantSelector productId={product.id} selectedSize={selectedSize} selectedColor={selectedColor}
          onSizeChange={setSelectedSize} onColorChange={setSelectedColor} layout={layout === "minimal" ? "minimal" : "premium"} />
      )}

      <VariantBadges />

      {hasVariants && product && (
        <VariantComparison productId={product.id} basePrice={product.price} compareAtPrice={product.compare_at_price}
          productName={product.name} productThumbnail={product.thumbnail} onAddToCart={addVariantToCart} />
      )}

      <ProductActions
        quantity={quantity} setQuantity={setQuantity} maxQuantity={effectiveStock}
        onAddToCart={addToCart} onBuyNow={buyNow} onToggleWishlist={toggleWishlist}
        addingToCart={addingToCart} inStock={effectiveStock > 0}
        layout={layout === "minimal" ? "minimal" : "premium"}
        disabled={requiresSelection}
        disabledReason={disabledReason}
        selectionSteps={selectionSteps}
      />

      {effectiveStock === 0 && (
        <NotifyWhenAvailable productId={product.id} variantId={selectedVariant?.id}
          variantLabel={[selectedSize, selectedColor].filter(Boolean).join(" / ") || undefined} />
      )}

      {/* Trust badges — editorial hairline row */}
      {layout !== "minimal" && (
        <div className="grid grid-cols-2 gap-px bg-border/40 border border-border/40 rounded-xl overflow-hidden mt-1 sm:mt-2">
          {trustBadges.map((badge) => (
            <div key={badge.label} className="bg-background/40 backdrop-blur-sm px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-2.5">
              <badge.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" strokeWidth={1.25} />
              <div className="min-w-0">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.15em] font-medium text-foreground leading-tight truncate">{badge.label}</p>
                <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight truncate">{badge.sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Available offers & vouchers — red bar accent */}
      {((applicableCoupons && applicableCoupons.length > 0) || (deliveryOffers && deliveryOffers.length > 0)) && layout !== "minimal" && (
        <div className="space-y-2 pt-1">
          <p className="text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Available Offers
          </p>
          <div className="space-y-1.5">
            {applicableCoupons?.slice(0, 3).map(c => (
              <div key={c.code} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border border-primary/20 bg-primary/[0.04] border-l-2 border-l-primary">
                <Tag className="w-3.5 h-3.5 text-primary shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[11px] sm:text-xs font-semibold tracking-wider text-primary">{c.code}</span>
                    <Badge variant="secondary" className="text-[8px] sm:text-[9px] px-1.5 font-normal">
                      {c.discount_type === "percentage" ? `${c.discount_value}%` : `৳${Number(c.discount_value).toFixed(0)}`} off
                    </Badge>
                  </div>
                  {c.description && <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{c.description}</p>}
                </div>
              </div>
            ))}
            {deliveryOffers?.slice(0, 2).map(offer => (
              <div key={offer.id} className="flex items-center gap-3 p-2.5 sm:p-3 rounded-lg border border-green-500/20 bg-green-500/[0.04] border-l-2 border-l-green-500">
                <Truck className="w-3.5 h-3.5 text-green-500 shrink-0" strokeWidth={1.5} />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] sm:text-[11px] font-medium text-foreground uppercase tracking-wide">{offer.title}</p>
                  {offer.description && <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{offer.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
    );
  };

  // === MAGAZINE layout: full-width gallery, then split content ===
  const isMagazine = layout === "magazine";

  return (
    <div className={`min-h-screen ${layout === "dark-luxury" ? "bg-black/20" : ""}`}>
      <ProductTrayEffect product={product} effectivePrice={effectivePrice} selectedVariant={selectedVariant} effectiveStock={effectiveStock} addToCart={addToCart} buyNow={buyNow} addingToCart={addingToCart} disabled={requiresSelection} disabledReason={disabledReason} />
      <main className={`container mx-auto px-3 sm:px-4 py-4 sm:py-6 md:py-8 ${isMagazine ? "max-w-6xl" : ""}`}>
        <Breadcrumbs
          items={[
            { label: "Home", href: "/home" },
            ...(parentCategory ? [{ label: parentCategory.name, href: `/categories/${parentCategory.slug}` }] : []),
            ...(productCat ? [{ label: productCat.name, href: `/categories/${productCat.slug}` }] : []),
            { label: product.name },
          ]}
          className="mb-3 sm:mb-4 md:mb-6"
        />

        {isMagazine ? (
          /* Magazine: Full-width gallery then split content */
          <div className="space-y-6 sm:space-y-8 md:space-y-12">
            {renderGallery()}
            <div className="grid md:grid-cols-5 gap-6 sm:gap-8 md:gap-12">
              <div className="md:col-span-3 space-y-6 sm:space-y-8">
                <ProductInfo />
              </div>
              <div className="md:col-span-2">
                <ProductTabs
                  product={{ id: product.id, description: product.description, specifications: product.specifications as any }}
                  reviews={mergedReviews} ownReviewIds={ownReviewIds} layout="editorial"
                />
              </div>
            </div>
          </div>
        ) : (
          /* All other layouts: side-by-side on desktop, stacked on mobile */
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-10 items-start">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 md:sticky md:top-20 md:self-start">
                {renderGallery()}
                {/* Fill space under gallery: product highlights / specs preview */}
                {product.specifications && Object.keys(product.specifications as Record<string, any>).length > 0 && (
                  <div className={`${cfg.cardClass} rounded-2xl p-4 sm:p-5 space-y-3`}>
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" /> Quick Specs
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(product.specifications as Record<string, any>).slice(0, 6).map(([key, val]) => (
                        <div key={key} className="text-xs">
                          <span className="text-muted-foreground">{key}</span>
                          <p className="text-foreground font-medium truncate">{String(val)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Tags */}
                {product.tags && product.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {product.tags.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <ProductInfo />
              </motion.div>
            </div>
            <section className="mt-10 sm:mt-14">
              <ProductTabs
                product={{ id: product.id, description: product.description, specifications: product.specifications as any }}
                reviews={mergedReviews} ownReviewIds={ownReviewIds} layout={layout === "minimal" ? "minimal" : "premium"}
              />
            </section>
          </>
        )}

        {/* Related Products */}
        {relatedProducts && relatedProducts.length > 0 && (
          <section className="mt-10 sm:mt-14">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className={`font-bold font-display text-foreground ${layout === "minimal" ? "text-lg sm:text-xl" : "text-xl sm:text-2xl"}`}>
                {layout === "neon" && <Flame className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1.5 sm:mr-2 text-primary" />}
                You May Also Like
              </h2>
              {productCat && (
                <Link to={`/categories/${productCat.slug}`} className="text-xs sm:text-sm text-primary hover:underline">
                  View all
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4 auto-rows-fr">
              {relatedProducts.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <ProductCard id={p.id} name={p.name} price={p.price}
                    compareAtPrice={p.compare_at_price ?? undefined} thumbnail={p.thumbnail ?? undefined}
                    avgRating={p.avg_rating ?? undefined} reviewCount={p.review_count ?? undefined} slug={p.slug} />
                </motion.div>
              ))}
            </div>
          </section>
        )}
      </main>

    </div>
  );
};

export default ProductDetailPage;
