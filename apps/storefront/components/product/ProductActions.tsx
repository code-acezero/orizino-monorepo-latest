"use client";
import React from "react";
import { motion } from "framer-motion";
import { ShoppingCart, Heart, Minus, Plus, Zap, Check, AlertCircle, Info } from "lucide-react";
import ShareButton from "@/components/ShareButton";

interface ProductActionsProps {
  quantity: number;
  setQuantity: (q: number) => void;
  maxQuantity: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  onToggleWishlist: () => void;
  addingToCart: boolean;
  inStock: boolean;
  layout?: "minimal" | "premium" | "editorial";
  disabled?: boolean;
  disabledReason?: string;
  selectionSteps?: { label: string; complete: boolean }[];
}

const ProductActions: React.FC<ProductActionsProps> = ({
  quantity, setQuantity, maxQuantity, onAddToCart, onBuyNow, onToggleWishlist,
  addingToCart, inStock, layout = "premium", disabled = false, disabledReason, selectionSteps,
}) => {
  const isMinimal = layout === "minimal";
  const isLocked = disabled || !inStock;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Stock indicator */}
      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
        {inStock ? (
          <>
            <span className="flex items-center gap-1 sm:gap-1.5 text-primary">
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              In Stock
            </span>
            {maxQuantity <= 10 && (
              <span className="text-amber-500 dark:text-amber-400 text-[10px] sm:text-xs font-medium">
                Only {maxQuantity} left!
              </span>
            )}
          </>
        ) : (
          <span className="text-destructive font-medium">Out of Stock</span>
        )}
      </div>

      {/* Selection guide chips */}
      {selectionSteps && selectionSteps.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70 font-medium">Steps:</span>
          {selectionSteps.map((step) => (
            <span
              key={step.label}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border transition-colors ${
                step.complete
                  ? "bg-primary/10 text-primary border-primary/30"
                  : "bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/30"
              }`}
            >
              {step.complete ? <Check className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
              {step.label}
            </span>
          ))}
        </div>
      )}

      {/* ── Mobile / Tablet: two rows ── */}
      <div className="lg:hidden space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-1.5 py-0.5 sm:py-1 shrink-0 ${isMinimal ? "border border-border rounded-lg" : "glass rounded-full"}`}>
            <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1 sm:p-1.5 rounded-full hover:bg-secondary/50">
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <span className="w-6 sm:w-7 text-center font-semibold text-foreground text-xs sm:text-sm">{quantity}</span>
            <button onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="p-1 sm:p-1.5 rounded-full hover:bg-secondary/50">
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <div className="flex-1" />
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onToggleWishlist}
            className={`p-2 sm:p-2.5 shrink-0 text-foreground hover:text-primary ${isMinimal ? "border border-border rounded-lg" : "glass rounded-full"}`}>
            <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </motion.button>
          <ShareButton size="sm" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <motion.button whileHover={!isLocked ? { scale: 1.02 } : undefined} whileTap={!isLocked ? { scale: 0.98 } : undefined} onClick={onAddToCart} disabled={addingToCart || isLocked}
            className={`flex-1 min-w-0 font-semibold py-2 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
              isMinimal ? "bg-foreground text-background rounded-lg" : "btn-pill bg-gradient-primary text-primary-foreground"
            }`}>
            {addingToCart ? (
              <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <><ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="truncate">Add to Cart</span></>
            )}
          </motion.button>
          <motion.button whileHover={!isLocked ? { scale: 1.02 } : undefined} whileTap={!isLocked ? { scale: 0.98 } : undefined} onClick={onBuyNow} disabled={isLocked}
            className={`flex-1 min-w-0 font-semibold py-2 sm:py-2.5 flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
              isMinimal ? "border border-border rounded-lg text-foreground hover:bg-secondary/30" : "btn-pill glass-strong text-foreground hover:border-primary/30"
            }`}>
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" /><span className="truncate">Buy Now</span>
          </motion.button>
        </div>
      </div>

      {/* ── Desktop: single row ── */}
      <div className="hidden lg:flex items-center gap-2">
        <div className={`flex items-center gap-1 px-1.5 py-1 shrink-0 ${isMinimal ? "border border-border rounded-lg" : "glass rounded-full"}`}>
          <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1.5 rounded-full hover:bg-secondary/50">
            <Minus className="w-4 h-4" />
          </button>
          <span className="w-7 text-center font-semibold text-foreground text-sm">{quantity}</span>
          <button onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))} className="p-1.5 rounded-full hover:bg-secondary/50">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <motion.button whileHover={!isLocked ? { scale: 1.02 } : undefined} whileTap={!isLocked ? { scale: 0.98 } : undefined} onClick={onAddToCart} disabled={addingToCart || isLocked}
          className={`flex-1 min-w-0 font-semibold py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
            isMinimal ? "bg-foreground text-background rounded-lg" : "btn-pill bg-gradient-primary text-primary-foreground"
          }`}>
          {addingToCart ? (
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <><ShoppingCart className="w-4 h-4" /><span className="truncate">Add to Cart</span></>
          )}
        </motion.button>
        <motion.button whileHover={!isLocked ? { scale: 1.02 } : undefined} whileTap={!isLocked ? { scale: 0.98 } : undefined} onClick={onBuyNow} disabled={isLocked}
          className={`flex-1 min-w-0 font-semibold py-2.5 flex items-center justify-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed ${
            isMinimal ? "border border-border rounded-lg text-foreground hover:bg-secondary/30" : "btn-pill glass-strong text-foreground hover:border-primary/30"
          }`}>
          <Zap className="w-4 h-4" /><span className="truncate">Buy Now</span>
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onToggleWishlist}
          className={`p-2.5 shrink-0 text-foreground hover:text-primary ${isMinimal ? "border border-border rounded-lg" : "glass rounded-full"}`}>
          <Heart className="w-4 h-4" />
        </motion.button>
        <ShareButton size="md" />
      </div>

      {/* Helper line */}
      {disabled && disabledReason && (
        <p className="flex items-center gap-1.5 text-[11px] sm:text-xs text-amber-600 dark:text-amber-400 font-medium">
          <Info className="w-3 h-3 shrink-0" /> {disabledReason}
        </p>
      )}
    </div>
  );
};

export default ProductActions;
