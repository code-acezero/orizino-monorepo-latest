"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  price_override: number | null;
  is_active: boolean;
  image_url: string | null;
}

interface VariantSelectorProps {
  productId: string;
  selectedSize: string | null;
  selectedColor: string | null;
  onSizeChange: (size: string | null) => void;
  onColorChange: (color: string | null) => void;
  layout?: "minimal" | "premium" | "editorial";
}

// Map common color names to CSS colors
const COLOR_MAP: Record<string, string> = {
  red: "#ef4444", blue: "#3b82f6", green: "#22c55e", black: "#000000",
  white: "#ffffff", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
  pink: "#ec4899", gray: "#6b7280", grey: "#6b7280", brown: "#92400e",
  navy: "#1e3a5f", beige: "#d2b48c", maroon: "#800000", teal: "#14b8a6",
  gold: "#d4a017", silver: "#c0c0c0", cream: "#fffdd0", coral: "#ff7f50",
  olive: "#808000", burgundy: "#800020", khaki: "#c3b091", lavender: "#e6e6fa",
};

const getColorHex = (name: string): string => {
  return COLOR_MAP[name.toLowerCase()] || "#888888";
};

const VariantSelector: React.FC<VariantSelectorProps> = ({
   productId, selectedSize, selectedColor, onSizeChange, onColorChange, layout = "premium",
 }) => {
   const isMinimal = layout === "minimal";
   const [hoveredColor, setHoveredColor] = React.useState<string | null>(null);

  const { data: variants = [] } = useQuery<Variant[]>({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity, price_override, is_active, image_url")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("sort_order");
      return (data || []) as Variant[];
    },
    enabled: !!productId,
  });

  if (variants.length === 0) return null;

  const sizes = [...new Set(variants.map((v) => v.size).filter(Boolean))] as string[];
  const colors = [...new Set(variants.map((v) => v.color).filter(Boolean))] as string[];

  // Check if a specific combo is in stock
  const isComboInStock = (size: string | null, color: string | null) => {
    return variants.some(
      (v) =>
        (size === null || v.size === size) &&
        (color === null || v.color === color) &&
        v.stock_quantity > 0
    );
  };

  const getComboStock = (size: string | null, color: string | null): number => {
    const match = variants.find(
      (v) =>
        (size === null || v.size === size) &&
        (color === null || v.color === color)
    );
    return match?.stock_quantity ?? 0;
  };

  return (
    <div className="space-y-4">
      {/* Size selector */}
      {sizes.length > 0 && (
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Size{selectedSize && <span className="text-muted-foreground ml-1">— {selectedSize}</span>}
          </label>
          <div className="flex flex-wrap gap-2">
            {sizes.map((size) => {
              const inStock = isComboInStock(size, selectedColor);
              const isSelected = selectedSize === size;
              return (
                <button
                  key={size}
                  onClick={() => onSizeChange(isSelected ? null : size)}
                  disabled={!inStock}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium rounded-lg border transition-all relative",
                    isSelected
                      ? isMinimal
                        ? "border-foreground bg-foreground text-background"
                        : "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                      : inStock
                        ? "border-border text-foreground hover:border-primary/50"
                        : "border-border/50 text-muted-foreground/40 line-through cursor-not-allowed"
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}

       {/* Color selector */}
       {colors.length > 0 && (
         <div>
           <label className="text-sm font-medium text-foreground mb-2 block">
             Color{selectedColor && <span className="text-muted-foreground ml-1">— {selectedColor}</span>}
           </label>
           <div className="flex flex-wrap gap-2">
             {colors.map((color) => {
               const inStock = isComboInStock(selectedSize, color);
               const isSelected = selectedColor === color;
               const hex = getColorHex(color);
               const isLight = ["white", "cream", "beige", "yellow", "khaki", "lavender"].includes(color.toLowerCase());
               const variantImage = variants.find(
                 (v) => v.color === color && v.image_url && 
                 (selectedSize === null || v.size === selectedSize)
               )?.image_url;
               const isHovered = hoveredColor === color;
               
               return (
                 <div key={color} className="relative">
                   <button
                     onClick={() => onColorChange(isSelected ? null : color)}
                     onMouseEnter={() => setHoveredColor(color)}
                     onMouseLeave={() => setHoveredColor(null)}
                     disabled={!inStock}
                     title={color}
                     className={cn(
                       "w-9 h-9 rounded-full border-2 transition-all flex items-center justify-center",
                       isSelected
                         ? "border-primary ring-2 ring-primary/30 scale-110"
                         : inStock
                           ? "border-border hover:scale-105"
                           : "opacity-30 cursor-not-allowed"
                     )}
                     style={{ backgroundColor: hex }}
                   >
                     {isSelected && (
                       <Check className={cn("w-4 h-4", isLight ? "text-gray-800" : "text-white")} />
                     )}
                   </button>
                   
                   {/* Preview thumbnail on hover */}
                   {isHovered && variantImage && (
                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                       <img
                         src={variantImage}
                         alt={`${color} preview`}
                         className="w-16 h-16 object-cover rounded border border-border shadow-md"
                       />
                     </div>
                   )}
                 </div>
               );
             })}
           </div>
         </div>
       )}

      {/* Stock info for selected combo */}
      {(selectedSize || selectedColor) && (
        <div className="text-xs text-muted-foreground">
          {(() => {
            const stock = getComboStock(selectedSize, selectedColor);
            if (stock === 0) return <span className="text-destructive">This combination is out of stock</span>;
            if (stock <= 5) return <span className="text-amber-500">Only {stock} left for this selection</span>;
            return <span className="text-primary">{stock} in stock</span>;
          })()}
        </div>
      )}
    </div>
  );
};

export default VariantSelector;
