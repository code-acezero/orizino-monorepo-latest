"use client";
import React, { useRef, useCallback, useState } from "react";
import { Link } from "@/lib/router-compat";
import { Heart, ShoppingCart, Star, Loader2, Bell } from "lucide-react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { trackClick } from "@/hooks/use-analytics";
import { trackInteraction } from "@/lib/track-interaction";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "@/lib/app-toast";
import QuickViewModal from "@/components/QuickViewModal";
import FlyToCartAnimation from "@/components/FlyToCartAnimation";
import ShareButton from "@/components/ShareButton";

const COLOR_HEX: Record<string, string> = {
  black: "#000000", white: "#ffffff", red: "#ef4444", blue: "#3b82f6",
  green: "#22c55e", yellow: "#eab308", orange: "#f97316", pink: "#ec4899",
  purple: "#a855f7", gray: "#6b7280", grey: "#6b7280", navy: "#1e3a5f",
  charcoal: "#36454f", beige: "#f5f5dc", brown: "#8b4513", olive: "#808000",
  teal: "#14b8a6", maroon: "#800000", cream: "#fffdd0", khaki: "#c3b091",
};
const getColorHex = (name: string) => COLOR_HEX[name.toLowerCase()] || "#888888";

export interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  compareAtPrice?: number;
  thumbnail?: string;
  avgRating?: number;
  reviewCount?: number;
  slug: string;
  className?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  compareAtPrice,
  thumbnail,
  avgRating = 0,
  reviewCount = 0,
  slug,
  className = "",
}) => {
  const { formatPrice } = useCurrency();
  const cardRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [addingToCart, setAddingToCart] = useState(false);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [togglingWishlist, setTogglingWishlist] = useState(false);
  const [notifyingRestock, setNotifyingRestock] = useState(false);
  const [flyAnim, setFlyAnim] = useState<{ src: string; rect: DOMRect } | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch variant info
  const { data: variantInfo } = useQuery({
    queryKey: ["product-variant-info", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("color, size, stock_quantity")
        .eq("product_id", id)
        .eq("is_active", true);
      const colors = [...new Set((data || []).map(v => v.color).filter(Boolean))] as string[];
      const sizes = [...new Set((data || []).map(v => v.size).filter(Boolean))] as string[];
      const totalVariantStock = (data || []).reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
      return { hasVariants: (data?.length || 0) > 0, colors, sizes, totalVariantStock };
    },
    staleTime: 60000,
  });
  const hasVariants = variantInfo?.hasVariants ?? undefined;
  const totalStock = variantInfo?.hasVariants ? variantInfo.totalVariantStock : undefined;
  const isSoldOut = totalStock !== undefined && totalStock <= 0;

  // Check wishlist status on mount
  React.useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || cancelled) return;
      supabase.from("wishlist_items").select("id").eq("user_id", user.id).eq("product_id", id).maybeSingle()
        .then(({ data }) => { if (!cancelled) setInWishlist(!!data); });
    });
    return () => { cancelled = true; };
  }, [id]);

  const handleToggleWishlist = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in to use wishlist"); return; }
    setTogglingWishlist(true);
    try {
      if (inWishlist) {
        await supabase.from("wishlist_items").delete().eq("user_id", user.id).eq("product_id", id);
        setInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        await supabase.from("wishlist_items").insert({ user_id: user.id, product_id: id });
        setInWishlist(true);
        toast.success("Added to wishlist");
      }
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    } catch { toast.error("Failed to update wishlist"); }
    finally { setTogglingWishlist(false); }
  }, [id, inWishlist, queryClient]);

  const handleAddToCart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasVariants !== false) {
      // Variants required → open the quick-view popup (works on mobile too)
      setQuickViewOpen(true);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in to add items to cart"); return; }
    setAddingToCart(true);
    try {
      const { data: existing } = await supabase
        .from("cart_items")
        .select("id, quantity")
        .eq("user_id", user.id)
        .eq("product_id", id)
        .is("variant_id", null)
        .maybeSingle();
      if (existing) {
        await supabase.from("cart_items").update({ quantity: existing.quantity + 1 }).eq("id", existing.id);
      } else {
        await supabase.from("cart_items").insert({ user_id: user.id, product_id: id, quantity: 1 });
      }
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      queryClient.invalidateQueries({ queryKey: ["cart-count"] });
      toast.success(`${name} added to cart`);
      // Trigger fly animation
      const imgEl = imgRef.current;
      if (imgEl) {
        const rect = imgEl.getBoundingClientRect();
        setFlyAnim({ src: thumbnail || "/placeholder.svg", rect });
      }
    } catch { toast.error("Failed to add to cart"); }
    finally { setAddingToCart(false); }
  }, [id, name, queryClient, hasVariants, isMobile, slug, thumbnail]);


  const handleNotifyRestock = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Please sign in to get restock alerts"); return; }
    setNotifyingRestock(true);
    try {
      const { data: existing } = await supabase
        .from("stock_notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", id)
        .is("variant_id", null)
        .maybeSingle();
      if (existing) {
        toast.info("You're already subscribed to restock alerts for this product");
      } else {
        await supabase.from("stock_notifications").insert({
          user_id: user.id,
          product_id: id,
          email: user.email || null,
        });
        toast.success("You'll be notified when this is back in stock!");
      }
    } catch { toast.error("Failed to subscribe for restock alerts"); }
    finally { setNotifyingRestock(false); }
  }, [id]);

  const discount = compareAtPrice
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : 0;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springCfg = { stiffness: 260, damping: 20 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), springCfg);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), springCfg);
  const glareX = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 100]), springCfg);
  const glareY = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 100]), springCfg);
  const imgX = useSpring(useTransform(mouseX, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 22 });
  const imgY = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 180, damping: 22 });
  const shadowX = useSpring(useTransform(mouseX, [-0.5, 0.5], [12, -12]), springCfg);
  const shadowY = useSpring(useTransform(mouseY, [-0.5, 0.5], [12, -12]), springCfg);
  const boxShadow = useTransform(
    [shadowX, shadowY],
    ([sx, sy]) => `${sx}px ${sy}px 30px -8px hsl(var(--primary) / 0.18), ${(sx as number) * 0.5}px ${(sy as number) * 0.5}px 60px -15px hsl(var(--foreground) / 0.1)`
  );
  const innerTop = useSpring(useTransform(mouseY, [-0.5, 0.5], [0.35, 0]), springCfg);
  const innerBottom = useSpring(useTransform(mouseY, [-0.5, 0.5], [0, 0.35]), springCfg);
  const innerLeft = useSpring(useTransform(mouseX, [-0.5, 0.5], [0.35, 0]), springCfg);
  const innerRight = useSpring(useTransform(mouseX, [-0.5, 0.5], [0, 0.35]), springCfg);
  const textX = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), { stiffness: 200, damping: 24 });
  const textY = useSpring(useTransform(mouseY, [-0.5, 0.5], [-3, 3]), { stiffness: 200, damping: 24 });

  const glareBackground = useTransform(
    [glareX, glareY],
    ([gx, gy]) => `radial-gradient(circle at ${gx}% ${gy}%, hsl(var(--primary) / 0.15) 0%, transparent 60%)`
  );
  const innerBoxShadow = useTransform(
    [innerTop, innerBottom, innerLeft, innerRight],
    ([t, b, l, r]) =>
      `inset 0 ${16 * (t as number)}px ${20 * (t as number)}px -6px hsl(var(--foreground) / ${(t as number) * 0.6}), ` +
      `inset 0 -${16 * (b as number)}px ${20 * (b as number)}px -6px hsl(var(--foreground) / ${(b as number) * 0.6}), ` +
      `inset ${16 * (l as number)}px 0 ${20 * (l as number)}px -6px hsl(var(--foreground) / ${(l as number) * 0.5}), ` +
      `inset -${16 * (r as number)}px 0 ${20 * (r as number)}px -6px hsl(var(--foreground) / ${(r as number) * 0.5})`
  );

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isMobile) return;
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  }, [mouseX, mouseY, isMobile]);

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    // Record hover intent only after a short dwell so accidental passes don't count
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      trackInteraction(id, "hover", { source: "product_card" });
    }, 450);
  }, [id, isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={isMobile ? undefined : handleMouseMove}
      onMouseEnter={isMobile ? undefined : handleMouseEnter}
      onMouseLeave={isMobile ? undefined : handleMouseLeave}
      style={isMobile ? {} : {
        rotateX,
        rotateY,
        transformPerspective: 800,
        transformStyle: "preserve-3d",
        boxShadow,
      }}
      whileHover={isMobile ? undefined : { y: -4 }}
      transition={{ duration: 0.3 }}
      className={`group glass rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col h-full ${className}`}
    >
      <Link to={`/product/${slug}`} className="flex flex-col flex-1" onClick={() => { trackClick("product_card", slug, window.location.pathname, { product_name: name }); trackInteraction(id, "click", { source: "product_card" }); }}>
        {/* Image */}
        <div
          className="relative aspect-[5/6] lg:aspect-[5/6] overflow-hidden bg-secondary/20 cursor-zoom-in"
          style={isMobile ? {} : { transformStyle: "preserve-3d" }}
          onClick={(e) => {
            if (isMobile) return; // let Link navigate on mobile
            e.preventDefault(); e.stopPropagation(); setQuickViewOpen(true);
          }}
        >

          <motion.img
            ref={imgRef}
            src={thumbnail || "/placeholder.svg"}
            alt={name}
            style={isMobile ? {} : { x: imgX, y: imgY, scale: 1.12 }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none"
            loading="lazy"
          />
          {/* Bottom shadow on image */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background/40 to-transparent z-[5] pointer-events-none" />
          {!isMobile && (
            <>
              <motion.div
                className="pointer-events-none absolute inset-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: glareBackground }}
              />
              <motion.div
                className="pointer-events-none absolute inset-0 z-[11] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ boxShadow: innerBoxShadow }}
              />
            </>
          )}
          {discount > 0 && (
            <span className="absolute top-3 left-3 btn-pill bg-destructive text-destructive-foreground text-xs py-1 px-3 z-20">
              -{discount}%
            </span>
          )}
          {/* Sold out overlay */}
          {isSoldOut && (
            <div className="absolute inset-0 z-[15] bg-background/60 flex flex-col items-center justify-center gap-2">
              <span className="text-sm font-bold text-muted-foreground tracking-wider uppercase">Sold Out</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleNotifyRestock}
                disabled={notifyingRestock}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold hover:brightness-110 disabled:opacity-70"
              >
                {notifyingRestock ? <Loader2 className="w-3 h-3 animate-spin" /> : <Bell className="w-3 h-3" />}
                Notify me
              </motion.button>
            </div>
          )}
          {/* Stock badge */}
          {(() => {
            if (totalStock === undefined || totalStock <= 0) return null;
            if (totalStock < 5) return (
              <span className="absolute bottom-3 left-3 bg-destructive/90 text-destructive-foreground text-[10px] font-semibold py-0.5 px-2 rounded-full z-20 group/stock cursor-default">
                Low stock
                <span className="hidden group-hover/stock:inline"> — {totalStock} left</span>
              </span>
            );
            if (totalStock < 10) return (
              <span className="absolute bottom-3 left-3 bg-accent text-accent-foreground text-[10px] font-semibold py-0.5 px-2 rounded-full z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                {totalStock} left
              </span>
            );
            return null;
          })()}
          {/* Quick actions — always visible (icon stack: wishlist · cart · share) */}
          <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 flex flex-col gap-1.5 sm:gap-2 z-20 lg:opacity-0 lg:translate-x-1 lg:group-hover:opacity-100 lg:group-hover:translate-x-0 lg:transition-all lg:duration-300">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleToggleWishlist}
              disabled={togglingWishlist}
              aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              className={`glass rounded-full p-1.5 sm:p-2 !min-h-0 !min-w-0 transition-colors ${inWishlist ? "text-destructive" : "text-foreground hover:text-primary"}`}
            >
              <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${inWishlist ? "fill-destructive" : ""}`} />
            </motion.button>
            {!isSoldOut && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleAddToCart}
                disabled={addingToCart}
                aria-label="Add to cart"
                className="glass rounded-full p-1.5 sm:p-2 !min-h-0 !min-w-0 text-foreground hover:text-primary transition-colors"
              >
                {addingToCart ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              </motion.button>
            )}
            <ShareButton url={`${window.location.origin}/product/${slug}`} title={name} size="sm" />
          </div>
        </div>

        {/* Info */}
        <motion.div
          className="p-1.5 sm:p-2.5 flex flex-col flex-1"
          style={isMobile ? {} : { x: textX, y: textY, translateZ: 30 }}
        >
          <h3 className="font-medium text-foreground text-[11px] sm:text-[13px] line-clamp-2 mb-0.5 sm:mb-1 transition-all duration-300 group-hover:text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]">
            {name}
          </h3>
          <div className="flex items-center gap-0.5 sm:gap-1 mb-0.5 sm:mb-1.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${
                  i < Math.round(avgRating)
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
            <span className="text-[9px] sm:text-[10px] text-muted-foreground ml-0.5">({reviewCount})</span>
          </div>
          <div className="flex items-baseline gap-1 mt-auto">
            <span className="font-bold text-foreground text-[12px] sm:text-[13px] lg:text-sm group-hover:animate-[priceGlow_1.5s_ease-in-out_infinite] transition-all duration-300" style={{ textShadow: 'none' }}>
              {formatPrice(price)}
            </span>
            {compareAtPrice && (
              <span className="text-[9px] sm:text-[10px] lg:text-xs text-muted-foreground line-through">{formatPrice(compareAtPrice)}</span>
            )}
          </div>
        </motion.div>
      </Link>
      <QuickViewModal productId={id} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
      {flyAnim && (
        <FlyToCartAnimation
          imageSrc={flyAnim.src}
          startRect={flyAnim.rect}
          onComplete={() => setFlyAnim(null)}
        />
      )}
    </motion.div>
  );
};

export default ProductCard;
