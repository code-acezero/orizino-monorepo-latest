"use client";
import React, { useState, useMemo } from "react";
import SectionShimmer from "@/components/skeletons/SectionShimmer";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ChevronDown, ChevronRight, SlidersHorizontal, Tag, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import StorefrontProductGrid from "@/components/storefront/StorefrontProductGrid";
import { useSeoMeta } from "@/hooks/use-seo-meta";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BottomSheet } from "@/components/mobile";
import { useIsMobile } from "@/hooks/use-mobile";
import DiscoverSection from "@/components/DiscoverSection";

const getColorHex = (name: string) => {
  // Trust browser CSS named-color parsing; falls back to neutral if invalid.
  const n = name.trim().toLowerCase();
  if (!n) return "#888";
  // Use the literal name — browsers map "red", "navy", etc.; unknown names render as transparent → handled via fallback.
  return n;
};

const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Top Rated", value: "rating" },
  { label: "Most Popular", value: "popular" },
];

const ShopPage: React.FC = () => {
  useSeoMeta("shop", "Shop | Store");
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get("cat") || "");
  const [expandedParent, setExpandedParent] = useState<string | null>(null);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCustomFilters, setSelectedCustomFilters] = useState<Record<string, string[]>>({});
  const [showDiscover, setShowDiscover] = useState(false);

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-name"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("key, value").in("key", ["site_name"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => (map[s.key] = s.value));
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  const rawName = siteSettings?.site_name;
  const siteName = ((typeof rawName === "object" && rawName !== null && "value" in rawName ? (rawName as any).value : rawName) as string) || "";

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, icon, icon_url, parent_id, accent_color")
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
  });

  const parentCategories = categories?.filter((c) => !c.parent_id) || [];
  const getChildren = (parentId: string) => categories?.filter((c) => c.parent_id === parentId) || [];

  // Product counts per category (including subcategories)
  const { data: productCounts } = useQuery({
    queryKey: ["product-counts-by-category"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("category_id").eq("is_active", true);
      const counts: Record<string, number> = {};
      (data || []).forEach((p) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] || 0) + 1; });
      return counts;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getCategoryCount = (catId: string): number => {
    const direct = productCounts?.[catId] || 0;
    const children = getChildren(catId);
    return direct + children.reduce((sum, c) => sum + (productCounts?.[c.id] || 0), 0);
  };

  // Resolve which category IDs to use for variant/filter queries
  const activeCategoryIds = useMemo(() => {
    if (!selectedCategory) return null;
    const children = getChildren(selectedCategory);
    return [selectedCategory, ...children.map(c => c.id)];
  }, [selectedCategory, categories]);

  // Fetch variants scoped to selected category (or all if none selected)
  const { data: allVariants } = useQuery({
    queryKey: ["shop-variant-filters", activeCategoryIds],
    queryFn: async () => {
      let query = supabase
        .from("product_variants")
        .select("product_id, size, color")
        .eq("is_active", true);
      
      if (activeCategoryIds) {
        // Need to get product IDs in category first
        const { data: catProducts } = await supabase
          .from("products")
          .select("id")
          .eq("is_active", true)
          .in("category_id", activeCategoryIds);
        const productIds = (catProducts || []).map(p => p.id);
        if (productIds.length === 0) return [];
        query = query.in("product_id", productIds);
      }
      
      const { data } = await query;
      return data || [];
    },
    staleTime: 60000,
  });

  // Fetch category-specific custom filters
  const { data: categoryFilters } = useQuery({
    queryKey: ["category-filters", selectedCategory],
    queryFn: async () => {
      if (!selectedCategory) return [];
      // Get filters for the selected category and its parent
      const cat = categories?.find(c => c.id === selectedCategory);
      const categoryIds = [selectedCategory];
      if (cat?.parent_id) categoryIds.push(cat.parent_id);
      
      const { data } = await supabase
        .from("category_filters")
        .select("*")
        .in("category_id", categoryIds)
        .eq("is_active", true)
        .order("sort_order");
      return data || [];
    },
    staleTime: 60000,
    enabled: !!selectedCategory,
  });

  const availableSizes = useMemo(() => {
    if (!allVariants) return [];
    return [...new Set(allVariants.map(v => v.size).filter(Boolean))] as string[];
  }, [allVariants]);

  const availableColors = useMemo(() => {
    if (!allVariants) return [];
    return [...new Set(allVariants.map(v => v.color).filter(Boolean))] as string[];
  }, [allVariants]);

  // Fetch unique tags from products
  const { data: availableTags } = useQuery({
    queryKey: ["shop-product-tags", activeCategoryIds],
    queryFn: async () => {
      let query = supabase.from("products").select("tags").eq("is_active", true);
      if (activeCategoryIds) query = query.in("category_id", activeCategoryIds);
      const { data } = await query;
      const tagSet = new Set<string>();
      (data || []).forEach(p => (p.tags || []).forEach((t: string) => tagSet.add(t)));
      return [...tagSet].sort();
    },
    staleTime: 60000,
  });

  const variantFilteredProductIds = useMemo(() => {
    if (!allVariants || (selectedSizes.length === 0 && selectedColors.length === 0)) return null;
    return new Set(
      allVariants
        .filter(v => {
          const matchSize = selectedSizes.length === 0 || (v.size && selectedSizes.includes(v.size));
          const matchColor = selectedColors.length === 0 || (v.color && selectedColors.includes(v.color));
          return matchSize && matchColor;
        })
        .map(v => v.product_id)
    );
  }, [allVariants, selectedSizes, selectedColors]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", activeCategoryIds, sort],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("is_active", true);
      if (activeCategoryIds && activeCategoryIds.length > 0) query = query.in("category_id", activeCategoryIds);
      switch (sort) {
        case "price_asc": query = query.order("price", { ascending: true }); break;
        case "price_desc": query = query.order("price", { ascending: false }); break;
        case "rating": query = query.order("avg_rating", { ascending: false }); break;
        case "popular": query = query.order("review_count", { ascending: false }); break;
        default: query = query.order("created_at", { ascending: false });
      }
      const { data } = await query;
      return data || [];
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      const matchesVariants = !variantFilteredProductIds || variantFilteredProductIds.has(p.id);
      const matchesTags = selectedTags.length === 0 || selectedTags.some(t => (p.tags || []).includes(t));
      return matchesSearch && matchesPrice && matchesVariants && matchesTags;
    });
  }, [products, searchQuery, priceRange, variantFilteredProductIds, selectedTags]);

  const getCategoryIcon = (cat: { icon_url: string | null; icon: string | null }) =>
    cat.icon_url || null;

  const handleParentClick = (catId: string) => {
    setExpandedParent(expandedParent === catId ? null : catId);
    setSelectedCategory(catId);
    // Reset filters when category changes
    setSelectedCustomFilters({});
  };

  const handleSubClick = (subId: string) => {
    setSelectedCategory(subId);
    setSelectedCustomFilters({});
  };

  const toggleSize = (size: string) => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size]);
  const toggleColor = (color: string) => setSelectedColors(prev => prev.includes(color) ? prev.filter(c => c !== color) : [...prev, color]);
  const toggleTag = (tag: string) => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  const toggleCustomFilter = (filterName: string, value: string) => {
    setSelectedCustomFilters(prev => {
      const current = prev[filterName] || [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [filterName]: updated };
    });
  };

  const activeFilterCount = selectedSizes.length + selectedColors.length + selectedTags.length +
    Object.values(selectedCustomFilters).reduce((sum, arr) => sum + arr.length, 0) +
    (selectedCategory ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedTags([]);
    setSelectedCustomFilters({});
    setSelectedCategory("");
    setExpandedParent(null);
    setSearchQuery("");
    setPriceRange([0, 10000]);
  };

  // Shared filter sidebar content
  const FilterContent = () => (
    <div className="space-y-6">
      {/* Categories */}
      <div>
        <h3 className="font-semibold text-foreground mb-3" style={{ fontFamily: 'var(--font-title, var(--font-display))' }}>Categories</h3>
        <div className="space-y-0.5">
          <button
            onClick={() => { setSelectedCategory(""); setExpandedParent(null); setSelectedCustomFilters({}); setSelectedSizes([]); setSelectedColors([]); setSelectedTags([]); }}
            className={`flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${!selectedCategory ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
          >
            All Categories
          </button>
          {parentCategories.map((cat) => {
            const children = getChildren(cat.id);
            const isExpanded = expandedParent === cat.id;
            const isSelected = selectedCategory === cat.id;
            const iconSrc = getCategoryIcon(cat);
            return (
              <div key={cat.id}>
                <button
                  onClick={() => handleParentClick(cat.id)}
                  className={`flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group ${isSelected ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}
                >
                  {iconSrc ? <img src={iconSrc} alt="" className="w-6 h-6 rounded-lg object-contain" /> : cat.icon ? <span className="text-base">{cat.icon}</span> : <span className="w-6 h-6 rounded-lg bg-secondary/50" />}
                  <span className="flex-1">{cat.name}</span>
                  {productCounts && <span className="text-[10px] font-medium text-muted-foreground bg-secondary/60 px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{getCategoryCount(cat.id)}</span>}
                  {children.length > 0 && <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
                </button>
                <AnimatePresence>
                  {isExpanded && children.length > 0 && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                      <div className="pl-4 mt-0.5 space-y-0.5 border-l-2 border-border/50 ml-5">
                        {children.map((sub) => (
                          <button key={sub.id} onClick={() => handleSubClick(sub.id)} className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${selectedCategory === sub.id ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
                            {sub.icon_url ? <img src={sub.icon_url} alt="" className="w-4 h-4 rounded object-contain" /> : sub.icon ? <span className="text-xs">{sub.icon}</span> : null}
                            <span className="flex-1">{sub.name}</span>
                            {productCounts && <span className="text-[9px] font-medium text-muted-foreground bg-secondary/40 px-1.5 py-0.5 rounded-full min-w-[18px] text-center">{productCounts[sub.id] || 0}</span>}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Category-scoped filters: only show when a category is selected */}
      {selectedCategory && (
        <>
          {/* Size Filter */}
          {availableSizes.length > 0 && (
            <div>
              <h3 className="font-display font-semibold text-foreground mb-3">Size</h3>
              <div className="flex flex-wrap gap-1.5">
                {availableSizes.map((size) => (
                  <button key={size} onClick={() => toggleSize(size)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedSizes.includes(size) ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color Filter */}
          {availableColors.length > 0 && (
            <div>
              <h3 className="font-display font-semibold text-foreground mb-3">Color</h3>
              <div className="flex flex-wrap gap-2">
                {availableColors.map((color) => (
                  <button key={color} onClick={() => toggleColor(color)} title={color} className={`w-7 h-7 rounded-full border-2 transition-all ${selectedColors.includes(color) ? "border-primary ring-2 ring-primary/30 scale-110" : "border-border/50 hover:border-foreground/30"}`} style={{ backgroundColor: getColorHex(color) }} />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Category Filters */}
          {categoryFilters && categoryFilters.length > 0 && categoryFilters.map((filter: any) => (
            <div key={filter.id}>
              <h3 className="font-display font-semibold text-foreground mb-3">{filter.filter_name}</h3>
              <div className="flex flex-wrap gap-1.5">
                {(filter.filter_values || []).map((val: string) => {
                  const isActive = (selectedCustomFilters[filter.filter_name] || []).includes(val);
                  return (
                    <button key={val} onClick={() => toggleCustomFilter(filter.filter_name, val)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${isActive ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Tags Filter */}
          {availableTags && availableTags.length > 0 && (
            <div>
              <h3 className="font-display font-semibold text-foreground mb-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button key={tag} onClick={() => toggleTag(tag)} className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Price Range */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-3">Price Range</h3>
        <div className="flex gap-2">
          <input type="number" placeholder="Min" value={priceRange[0] || ""} onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])} className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
          <span className="text-muted-foreground self-center">—</span>
          <input type="number" placeholder="Max" value={priceRange[1] === 10000 ? "" : priceRange[1]} onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value) || 10000])} className="w-full px-3 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
        </div>
      </div>

      {/* Sort */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-3">Sort By</h3>
        <div className="space-y-1">
          {sortOptions.map((opt) => (
            <button key={opt.value} onClick={() => setSort(opt.value)} className={`block w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${sort === opt.value ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <main className="container mx-auto px-4 py-4 md:py-8">
        <Breadcrumbs items={[{ label: "Home", href: "/home" }, { label: "Shop" }]} className="mb-3 md:mb-4 hidden md:block" />

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 md:mb-8">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-4xl font-bold font-display text-foreground leading-tight">
                <span className="text-gradient">{siteName}</span> Shop
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{filteredProducts.length} products</p>
            </div>
            {/* Mobile filter trigger lives next to title to save vertical space */}
            <button
              onClick={() => setMobileFilterOpen(true)}
              className="md:hidden inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-secondary/60 backdrop-blur-sm border border-border/60 text-xs font-medium text-foreground hover:bg-secondary transition-colors relative"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <BottomSheet
              open={mobileFilterOpen}
              onOpenChange={setMobileFilterOpen}
              title="Filters"
              description={activeFilterCount > 0 ? `${activeFilterCount} active` : undefined}
              height="tall"
            >
              {activeFilterCount > 0 && (
                <div className="flex justify-end mb-2">
                  <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline">Clear all</button>
                </div>
              )}
              <FilterContent />
            </BottomSheet>
          </div>

          {/* Desktop search */}
          <div className="hidden md:flex gap-3 flex-1 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-secondary/50 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile: horizontal category chip rail */}
        {parentCategories.length > 0 && (
          <div className="md:hidden -mx-4 px-4 mb-4 sticky top-14 z-20 bg-background/85 backdrop-blur-xl py-2 border-b border-border/30">
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar snap-x">
              <button
                onClick={() => { setSelectedCategory(""); setExpandedParent(null); setSelectedCustomFilters({}); }}
                className={`shrink-0 snap-start px-3.5 h-8 inline-flex items-center rounded-full text-xs font-medium border transition-all ${
                  !selectedCategory ? "bg-foreground text-background border-foreground" : "bg-secondary/60 text-foreground border-border/60"
                }`}
              >
                All
              </button>
              {parentCategories.map((cat) => {
                const active = selectedCategory === cat.id;
                const iconSrc = getCategoryIcon(cat);
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleParentClick(cat.id)}
                    className={`shrink-0 snap-start px-3 h-8 inline-flex items-center gap-1.5 rounded-full text-xs font-medium border transition-all ${
                      active ? "bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/30" : "bg-secondary/60 text-foreground border-border/60"
                    }`}
                  >
                    {iconSrc ? (
                      <img src={iconSrc} alt="" className="w-3.5 h-3.5 rounded object-contain" />
                    ) : cat.icon ? (
                      <span className="text-xs leading-none">{cat.icon}</span>
                    ) : null}
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {selectedSizes.map(size => (
              <button key={`size-${size}`} onClick={() => toggleSize(size)} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                Size: {size} <X className="w-3 h-3" />
              </button>
            ))}
            {selectedColors.map(color => (
              <button key={`color-${color}`} onClick={() => toggleColor(color)} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <span className="w-2.5 h-2.5 rounded-full border border-border/50" style={{ backgroundColor: getColorHex(color) }} /> {color} <X className="w-3 h-3" />
              </button>
            ))}
            {selectedTags.map(tag => (
              <button key={`tag-${tag}`} onClick={() => toggleTag(tag)} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                <Tag className="w-2.5 h-2.5" /> {tag} <X className="w-3 h-3" />
              </button>
            ))}
            {Object.entries(selectedCustomFilters).flatMap(([name, values]) =>
              values.map(val => (
                <button key={`${name}-${val}`} onClick={() => toggleCustomFilter(name, val)} className="flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  {name}: {val} <X className="w-3 h-3" />
                </button>
              ))
            )}
            <button onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-foreground underline ml-1">Clear all</button>
          </div>
        )}

        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden md:block w-64 shrink-0">
            <div className="glass-strong rounded-3xl p-6 sticky top-24">
              <FilterContent />
            </div>
          </aside>

          {/* Products Grid */}
          <div className="flex-1 min-w-0">
            {/* Top bar: Discover toggle + sort */}
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <button
                onClick={() => setShowDiscover((v) => !v)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  showDiscover
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-secondary/50 text-foreground border-border hover:bg-secondary"
                }`}
                aria-pressed={showDiscover}
              >
                <Compass className={`w-4 h-4 ${showDiscover ? "" : "text-primary"}`} />
                {showDiscover ? "Showing Discover" : "Discover"}
              </button>
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Sort:</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="px-4 py-2 rounded-xl bg-secondary/50 border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer">
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {showDiscover ? (
              <DiscoverSection surface="shop" limit={12} title="Discover" subtitle="Picked for the way you browse" className="!mt-0" />
            ) : isLoading ? (
              <SectionShimmer of="productGrid" count={9} />
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-lg">No products found</p>
                <p className="text-muted-foreground/60 text-sm mt-1">Try adjusting your filters or search query</p>
              </div>
            ) : (
              <StorefrontProductGrid products={filteredProducts as any} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ShopPage;
