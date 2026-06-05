"use client";
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search, X, Upload, Loader2, ImagePlus, Bell, CheckCheck, Eye, EyeOff, Download, Mail, Package } from "lucide-react";
import PageHeader from "@/components/admin/PageHeader";
import TableSkeleton from "@/components/skeletons/TableSkeleton";
import { useServerFn } from "@/lib/server-fn-compat";
import { notifyAboutProducts } from "@/lib/email-broadcasts.functions";
import BulkUpload from "@/components/admin/BulkUpload";
import { exportProducts, exportVariants } from "@/components/admin/bulkExport";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/lib/app-toast";
import ImageUpload from "@/components/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CommerceSettingsPanel from "@/components/admin/CommerceSettingsPanel";
import ProductSettingsPanel from "@/components/admin/ProductSettingsPanel";

const PRODUCT_TYPES = [
  { value: "general", label: "General" },
  { value: "clothing", label: "Clothing & Apparel" },
  { value: "shoes", label: "Shoes & Footwear" },
  { value: "electronics", label: "Electronics" },
  { value: "grocery", label: "Grocery & Food" },
  { value: "liquid", label: "Liquid / Beverage" },
  { value: "cosmetics", label: "Cosmetics & Beauty" },
  { value: "furniture", label: "Furniture & Home" },
  { value: "books", label: "Books & Stationery" },
  { value: "accessories", label: "Accessories & Jewelry" },
] as const;

const CLOTHING_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL"];
const SHOE_SIZES = ["36", "37", "38", "39", "40", "41", "42", "43", "44", "45", "46"];
const COMMON_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
  { name: "Red", hex: "#EF4444" },
  { name: "Blue", hex: "#3B82F6" },
  { name: "Green", hex: "#22C55E" },
  { name: "Yellow", hex: "#EAB308" },
  { name: "Purple", hex: "#A855F7" },
  { name: "Pink", hex: "#EC4899" },
  { name: "Orange", hex: "#F97316" },
  { name: "Gray", hex: "#6B7280" },
  { name: "Brown", hex: "#92400E" },
  { name: "Navy", hex: "#1E3A5F" },
];

const AdminProducts = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const urlTab = new URLSearchParams(location.search).get("tab") || "list";
  const [activeMainTab, setActiveMainTab] = useState(urlTab);
  useEffect(() => {
    setActiveMainTab(urlTab);
  }, [urlTab]);
  const handleTabChange = (v: string) => {
    setActiveMainTab(v);
    navigate(`/origin/products?tab=${v}`);
  };
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const notifyProductsFn = useServerFn(notifyAboutProducts);
  const notifyMut = useMutation({
    mutationFn: (ids: string[]) => notifyProductsFn({ data: { productIds: ids, audience_type: "subscribers", sendNow: true } }),
    onSuccess: () => { toast.success("Email queued to subscribers ✉️"); setSelected(new Set()); },
    onError: (e: any) => toast.error(e?.message ?? "Failed to send"),
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("*, categories(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("id, name, parent_id").eq("is_active", true).order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const parentCategories = categories.filter((c) => !c.parent_id);
  const getChildren = (parentId: string) => categories.filter((c) => c.parent_id === parentId);

  const saveMutation = useMutation({
    mutationFn: async (product: any) => {
      const slug = product.slug || product.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      const payload = { ...product, slug };
      delete payload.categories;
      if (product.id) {
        const { error } = await supabase.from("products").update(payload as any).eq("id", product.id);
        if (error) throw error;
      } else {
        delete payload.id;
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setDialogOpen(false);
      setEditing(null);
      toast.success("Product saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      toast.success("Product deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkAction = useMutation({
    mutationFn: async ({ ids, action }: { ids: string[]; action: "delete" | "activate" | "deactivate" }) => {
      if (action === "delete") {
        const { error } = await supabase.from("products").delete().in("id", ids);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").update({ is_active: action === "activate" }).in("id", ids);
        if (error) throw error;
      }
    },
    onSuccess: (_, { ids, action }) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      setSelected(new Set());
      toast.success(`${ids.length} product${ids.length > 1 ? "s" : ""} ${action === "delete" ? "deleted" : action === "activate" ? "activated" : "deactivated"}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = products.filter((p: any) => p.name.toLowerCase().includes(search.toLowerCase()));

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((p: any) => p.id)));
  };

  const allSelected = filtered.length > 0 && selected.size === filtered.length;
  const someSelected = selected.size > 0;

  const openEdit = (product?: any) => {
    setEditing(
      product
        ? { ...product, specifications: product.specifications || {} }
        : {
            name: "", slug: "", price: 0, stock_quantity: 0, description: "",
            short_description: "", is_active: true, is_featured: false,
            thumbnail: "", images: [], tags: [], category_id: null,
            video_url: "", meta_title: "", meta_description: "", meta_keywords: "",
            specifications: { product_type: "general", sizes: [], colors: [], weight: "", weight_unit: "kg", specs: [] },
          }
    );
    setDialogOpen(true);
  };

  const updateField = (field: string, value: any) => {
    setEditing((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  // Get selected parent category id for subcategory filtering
  const selectedCategoryId = editing?.category_id;
  const selectedParent = categories.find((c) => c.id === selectedCategoryId);
  const isSubcategory = selectedParent?.parent_id != null;
  const effectiveParentId = isSubcategory ? selectedParent?.parent_id : selectedCategoryId;

  const addImage = (url: string) => {
    if (!editing) return;
    const current = editing.images || [];
    if (current.length >= 5) {
      toast.error("Maximum 5 images allowed");
      return;
    }
    updateField("images", [...current, url]);
  };

  const removeImage = (index: number) => {
    if (!editing) return;
    const current = [...(editing.images || [])];
    current.splice(index, 1);
    updateField("images", current);
  };

  const specs = editing?.specifications || {};
  const productType = specs.product_type || "general";

  const updateSpec = (key: string, value: any) => {
    updateField("specifications", { ...specs, [key]: value });
  };

  const toggleSize = (size: string) => {
    const current = specs.sizes || [];
    updateSpec("sizes", current.includes(size) ? current.filter((s: string) => s !== size) : [...current, size]);
  };

  const toggleColor = (color: string) => {
    const current = specs.colors || [];
    updateSpec("colors", current.includes(color) ? current.filter((c: string) => c !== color) : [...current, color]);
  };

  const addSpecRow = () => {
    const current = specs.specs || [];
    updateSpec("specs", [...current, { key: "", value: "" }]);
  };

  const updateSpecRow = (index: number, field: string, value: string) => {
    const current = [...(specs.specs || [])];
    current[index] = { ...current[index], [field]: value };
    updateSpec("specs", current);
  };

  const removeSpecRow = (index: number) => {
    const current = [...(specs.specs || [])];
    current.splice(index, 1);
    updateSpec("specs", current);
  };

  // --- Variants ---
  const [variants, setVariants] = useState<any[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const variantImageRefs = useRef<Record<number, HTMLInputElement>>({});
  const bulkInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `variants/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("products").upload(path, file, { cacheControl: "3600", upsert: false });
    if (error) return null;
    const { data: urlData } = supabase.storage.from("products").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleVariantImageUpload = async (idx: number, file?: File | null) => {
    if (!file) return;
    const url = await uploadSingleFile(file);
    if (!url) { toast.error("Upload failed"); return; }
    updateVariant(idx, "image_url", url);
    toast.success("Variant image uploaded");
  };

  const handleBulkImageUpload = async (files: FileList | File[]) => {
    const fileArr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (fileArr.length === 0) return;

    // Find variants without images, assign in order
    const emptyIndices = variants.map((v, i) => (!v.image_url ? i : -1)).filter((i) => i >= 0);
    const assignCount = Math.min(fileArr.length, emptyIndices.length || fileArr.length);

    setBulkUploading(true);
    let uploaded = 0;
    for (let f = 0; f < fileArr.length; f++) {
      const url = await uploadSingleFile(fileArr[f]);
      if (url) {
        const targetIdx = emptyIndices.length > 0 ? emptyIndices[f] : f;
        if (targetIdx !== undefined && targetIdx < variants.length) {
          updateVariant(targetIdx, "image_url", url);
          uploaded++;
        }
      }
    }
    setBulkUploading(false);
    if (uploaded > 0) toast.success(`Uploaded ${uploaded} image${uploaded > 1 ? "s" : ""} to variants`);
    else toast.error("No images could be uploaded");
  };

  const loadVariants = async (productId: string) => {
    setVariantsLoading(true);
    const { data } = await supabase.from("product_variants" as any).select("*").eq("product_id", productId).order("sort_order");
    setVariants((data as any[]) || []);
    setVariantsLoading(false);
  };

  useEffect(() => {
    if (editing?.id && dialogOpen) loadVariants(editing.id);
    else setVariants([]);
  }, [editing?.id, dialogOpen]);

  const addVariant = () => {
    setVariants([...variants, { id: null, product_id: editing?.id, size: "", color: "", sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: variants.length }]);
  };

  const updateVariant = (idx: number, field: string, value: any) => {
    const u = [...variants]; u[idx] = { ...u[idx], [field]: value }; setVariants(u);
  };

  const removeVariant = (idx: number) => {
    const v = variants[idx];
    if (v.id) supabase.from("product_variants" as any).delete().eq("id", v.id).then(() => { setVariants(variants.filter((_, i) => i !== idx)); toast.success("Variant deleted"); });
    else setVariants(variants.filter((_, i) => i !== idx));
  };

  const saveVariants = async () => {
    if (!editing?.id) { toast.error("Save the product first"); return; }
    try {
      for (const v of variants) {
        const p = { product_id: editing.id, size: v.size || null, color: v.color || null, sku: v.sku || null, price_override: v.price_override || null, stock_quantity: v.stock_quantity || 0, is_active: v.is_active, sort_order: v.sort_order, image_url: v.image_url || null };
        if (v.id) await supabase.from("product_variants" as any).update(p).eq("id", v.id);
        else await supabase.from("product_variants" as any).insert(p);
      }
      toast.success("Variants saved"); loadVariants(editing.id);
    } catch (e: any) { toast.error(e.message); }
  };

  const notifyRestockSubscribers = async () => {
    if (!editing?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("notify-restock", {
        body: { product_id: editing.id },
      });
      if (error) throw error;
      toast.success(data?.message || "Notifications sent");
    } catch (e: any) { toast.error("Failed: " + e.message); }
  };

  const generateVariants = () => {
    if (!editing?.id) { toast.error("Save the product first"); return; }
    const sizes = specs.sizes || []; const colors = specs.colors || [];
    const nv: any[] = []; let ord = variants.length;
    if (sizes.length > 0 && colors.length > 0) {
      for (const s of sizes) for (const c of colors) if (!variants.some((v) => v.size === s && v.color === c)) nv.push({ id: null, product_id: editing.id, size: s, color: c, sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    } else if (sizes.length > 0) {
      for (const s of sizes) if (!variants.some((v) => v.size === s && !v.color)) nv.push({ id: null, product_id: editing.id, size: s, color: "", sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    } else if (colors.length > 0) {
      for (const c of colors) if (!variants.some((v) => v.color === c && !v.size)) nv.push({ id: null, product_id: editing.id, size: "", color: c, sku: "", price_override: null, stock_quantity: 0, is_active: true, sort_order: ord++ });
    }
    if (nv.length === 0) { toast.error("No new combos. Add sizes/colors in Attributes first."); return; }
    setVariants([...variants, ...nv]); toast.success(`Generated ${nv.length} variant(s)`);
  };

  const needsWeight = ["grocery", "liquid", "cosmetics"].includes(productType);
  const showsColors = !["grocery", "books"].includes(productType);
  const showsSizes = ["clothing", "shoes"].includes(productType);
  const showsSpecs = ["electronics", "furniture"].includes(productType);
  const showsMaterial = ["clothing", "shoes", "furniture", "accessories"].includes(productType);

  return (
    <div className="max-w-[1700px] mx-auto w-full space-y-6">
      <PageHeader
        icon={<Package className="w-5 h-5" />}
        title="Products"
        description={`${products.length} products · ${categories.length} categories`}
        actions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportProducts} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Products
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportVariants} className="gap-2 cursor-pointer">
                  <Download className="h-3.5 w-3.5" /> Variants
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <BulkUpload mode="variants" onComplete={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} products={products.map((p: any) => ({ id: p.id, name: p.name, slug: p.slug }))} />
            <BulkUpload mode="products" onComplete={() => qc.invalidateQueries({ queryKey: ["admin-products"] })} categories={categories.map(c => ({ id: c.id, name: c.name, slug: "" }))} />
            <Button onClick={() => openEdit()} className="gap-2"><Plus className="h-4 w-4" /> Add Product</Button>
          </>
        }
      />

      <Tabs value={activeMainTab} onValueChange={handleTabChange}>
        <TabsList className="hidden">
          <TabsTrigger value="list">All Products</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="commerce">Commerce</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => { setSearch(e.target.value); setSelected(new Set()); }} className="pl-10" />
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {someSelected && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-3 glass rounded-2xl px-4 py-3"
              >
                <span className="text-sm text-foreground font-medium">
                  {selected.size} selected
                </span>
                <div className="flex gap-2 ml-auto">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={bulkAction.isPending}>
                        <Eye className="w-4 h-4 text-primary" /> Activate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Activate products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will activate {selected.size} product{selected.size > 1 ? "s" : ""} and make them visible to customers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "activate" })}>
                          Activate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5" disabled={bulkAction.isPending}>
                        <EyeOff className="w-4 h-4" /> Deactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will deactivate {selected.size} product{selected.size > 1 ? "s" : ""} and hide them from customers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "deactivate" })}>
                          Deactivate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" disabled={bulkAction.isPending}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete products?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete {selected.size} product{selected.size > 1 ? "s" : ""}. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => bulkAction.mutate({ ids: Array.from(selected), action: "delete" })}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="gap-1.5 bg-gradient-primary text-primary-foreground" disabled={notifyMut.isPending}>
                        <Mail className="w-4 h-4" /> Notify subscribers
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Email subscribers about these {selected.size} product{selected.size > 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A single email containing one card per product (image, name, price, link) will be sent to all active newsletter subscribers from <strong>updates@orizino.com</strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => notifyMut.mutate(Array.from(selected))}>
                          Send now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-lg border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="p-0"><TableSkeleton rows={8} cols={8} /></TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No products found</TableCell></TableRow>
                ) : filtered.map((p: any) => (
                  <TableRow key={p.id} className={selected.has(p.id) ? "bg-primary/5" : ""}>
                    <TableCell>
                      <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleSelect(p.id)} aria-label={`Select ${p.name}`} />
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.categories?.name || "—"}</TableCell>
                    <TableCell>${Number(p.price).toFixed(2)}</TableCell>
                    <TableCell>{p.stock_quantity}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(p.specifications as any)?.product_type || "general"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "secondary"}>{p.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete product?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete "{p.name}". This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => deleteMutation.mutate(p.id)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <ProductSettingsPanel />
        </TabsContent>

        <TabsContent value="commerce" className="mt-4">
          <CommerceSettingsPanel />
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Product" : "Add Product"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <Tabs defaultValue="general" className="w-full">
              <TabsList className="w-full flex-wrap">
                <TabsTrigger value="general" className="flex-1">General</TabsTrigger>
                <TabsTrigger value="attributes" className="flex-1">Attributes</TabsTrigger>
                <TabsTrigger value="variants" className="flex-1">Variants{variants.length > 0 ? ` (${variants.length})` : ""}</TabsTrigger>
                <TabsTrigger value="media" className="flex-1">Media</TabsTrigger>
                <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4 mt-4">
                <div><Label>Name</Label><Input value={editing.name ?? ""} onChange={(e) => updateField("name", e.target.value)} /></div>
                <div><Label>Slug</Label><Input value={editing.slug ?? ""} onChange={(e) => updateField("slug", e.target.value)} placeholder="auto-generated" /></div>

                {/* Category & Subcategory */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={effectiveParentId ?? "none"}
                      onValueChange={(v) => updateField("category_id", v === "none" ? null : v)}
                    >
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {parentCategories.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Subcategory</Label>
                    <Select
                      value={isSubcategory ? selectedCategoryId : "none"}
                      onValueChange={(v) => updateField("category_id", v === "none" ? effectiveParentId : v)}
                      disabled={!effectiveParentId || effectiveParentId === "none"}
                    >
                      <SelectTrigger><SelectValue placeholder="Select subcategory" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {effectiveParentId && effectiveParentId !== "none" && getChildren(effectiveParentId).map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div><Label>Price</Label><Input type="number" value={editing.price ?? 0} onChange={(e) => updateField("price", +e.target.value)} /></div>
                  <div><Label>Compare Price</Label><Input type="number" value={editing.compare_at_price ?? ""} onChange={(e) => updateField("compare_at_price", e.target.value ? +e.target.value : null)} /></div>
                  <div><Label>Stock</Label><Input type="number" value={editing.stock_quantity ?? 0} onChange={(e) => updateField("stock_quantity", +e.target.value)} /></div>
                </div>

                <div><Label>Short Description</Label><Input value={editing.short_description ?? ""} onChange={(e) => updateField("short_description", e.target.value)} /></div>
                <div><Label>Description</Label><Textarea value={editing.description ?? ""} onChange={(e) => updateField("description", e.target.value)} rows={3} /></div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2"><Switch checked={editing.is_active ?? true} onCheckedChange={(v) => updateField("is_active", v)} /><Label>Active</Label></div>
                  <div className="flex items-center gap-2"><Switch checked={editing.is_featured ?? false} onCheckedChange={(v) => updateField("is_featured", v)} /><Label>Featured</Label></div>
                </div>
              </TabsContent>

              {/* Attributes Tab */}
              <TabsContent value="attributes" className="space-y-4 mt-4">
                <div>
                  <Label>Product Type</Label>
                  <Select value={productType} onValueChange={(v) => updateSpec("product_type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PRODUCT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">Select the product type to show relevant attribute fields.</p>
                </div>

                {/* Colors */}
                {showsColors && (
                  <div>
                    <Label>Available Colors</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {COMMON_COLORS.map((c) => {
                        const selected = (specs.colors || []).includes(c.name);
                        return (
                          <button key={c.name} type="button" onClick={() => toggleColor(c.name)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border-2 text-xs font-medium transition-all ${selected ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                            <span className="w-3.5 h-3.5 rounded-full border border-border/50 shrink-0" style={{ background: c.hex }} />
                            {c.name}
                          </button>
                        );
                      })}
                    </div>
                    <Input placeholder="Add custom color name (press Enter)..." className="h-8 text-sm mt-2"
                      onKeyDown={(e) => { if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) { toggleColor((e.target as HTMLInputElement).value.trim()); (e.target as HTMLInputElement).value = ""; } }} />
                  </div>
                )}

                {/* Clothing Sizes */}
                {productType === "clothing" && (
                  <div>
                    <Label>Available Sizes</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {CLOTHING_SIZES.map((size) => (
                        <button key={size} type="button" onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${(specs.sizes || []).includes(size) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Shoe Sizes */}
                {productType === "shoes" && (
                  <div>
                    <Label>Available Sizes (EU)</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {SHOE_SIZES.map((size) => (
                        <button key={size} type="button" onClick={() => toggleSize(size)}
                          className={`px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all ${(specs.sizes || []).includes(size) ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Weight / Volume — grocery, liquid, cosmetics */}
                {needsWeight && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>{productType === "liquid" ? "Volume" : "Weight"}</Label>
                      <Input type="number" value={specs.weight || ""} onChange={(e) => updateSpec("weight", e.target.value)} placeholder="e.g. 500" />
                    </div>
                    <div>
                      <Label>Unit</Label>
                      <Select value={specs.weight_unit || (productType === "liquid" ? "ml" : "kg")} onValueChange={(v) => updateSpec("weight_unit", v)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="g">Grams (g)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="lb">Pounds (lb)</SelectItem>
                          <SelectItem value="oz">Ounces (oz)</SelectItem>
                          <SelectItem value="ml">Milliliters (ml)</SelectItem>
                          <SelectItem value="l">Liters (L)</SelectItem>
                          <SelectItem value="fl_oz">Fluid Ounces (fl oz)</SelectItem>
                          <SelectItem value="gal">Gallons (gal)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Material */}
                {showsMaterial && (
                  <div>
                    <Label>Material</Label>
                    <Input value={specs.material || ""} onChange={(e) => updateSpec("material", e.target.value)} placeholder="e.g. Cotton, Leather, Stainless Steel" />
                  </div>
                )}

                {/* Dimensions — furniture */}
                {productType === "furniture" && (
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label>Length (cm)</Label><Input type="number" value={specs.length || ""} onChange={(e) => updateSpec("length", e.target.value)} /></div>
                    <div><Label>Width (cm)</Label><Input type="number" value={specs.width || ""} onChange={(e) => updateSpec("width", e.target.value)} /></div>
                    <div><Label>Height (cm)</Label><Input type="number" value={specs.height || ""} onChange={(e) => updateSpec("height", e.target.value)} /></div>
                  </div>
                )}

                {/* Cosmetics-specific fields */}
                {productType === "cosmetics" && (
                  <div className="space-y-3">
                    <div><Label>Skin Type</Label><Input value={specs.skin_type || ""} onChange={(e) => updateSpec("skin_type", e.target.value)} placeholder="e.g. Oily, Dry, All" /></div>
                    <div><Label>Ingredients</Label><Textarea value={specs.ingredients || ""} onChange={(e) => updateSpec("ingredients", e.target.value)} placeholder="Key ingredients..." rows={2} /></div>
                    <div className="flex items-center gap-2">
                      <Switch checked={specs.is_organic || false} onCheckedChange={(v) => updateSpec("is_organic", v)} />
                      <Label>Organic / Natural</Label>
                    </div>
                  </div>
                )}

                {/* Liquid-specific fields */}
                {productType === "liquid" && (
                  <div className="space-y-3">
                    <div><Label>Flavor / Scent</Label><Input value={specs.flavor || ""} onChange={(e) => updateSpec("flavor", e.target.value)} placeholder="e.g. Vanilla, Unscented" /></div>
                    <div><Label>Ingredients</Label><Textarea value={specs.ingredients || ""} onChange={(e) => updateSpec("ingredients", e.target.value)} placeholder="Key ingredients..." rows={2} /></div>
                  </div>
                )}

                {/* Books-specific fields */}
                {productType === "books" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Author</Label><Input value={specs.author || ""} onChange={(e) => updateSpec("author", e.target.value)} /></div>
                      <div><Label>ISBN</Label><Input value={specs.isbn || ""} onChange={(e) => updateSpec("isbn", e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Publisher</Label><Input value={specs.publisher || ""} onChange={(e) => updateSpec("publisher", e.target.value)} /></div>
                      <div><Label>Pages</Label><Input type="number" value={specs.pages || ""} onChange={(e) => updateSpec("pages", e.target.value)} /></div>
                    </div>
                    <div><Label>Language</Label><Input value={specs.language || ""} onChange={(e) => updateSpec("language", e.target.value)} placeholder="e.g. English" /></div>
                  </div>
                )}

                {/* Accessories-specific */}
                {productType === "accessories" && (
                  <div>
                    <Label>Accessory Type</Label>
                    <Input value={specs.accessory_type || ""} onChange={(e) => updateSpec("accessory_type", e.target.value)} placeholder="e.g. Necklace, Ring, Watch, Belt" />
                  </div>
                )}

                {/* Technical Specs — electronics, furniture */}
                {showsSpecs && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Technical Specifications</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSpecRow} className="gap-1"><Plus className="w-3 h-3" /> Add Spec</Button>
                    </div>
                    <div className="space-y-2">
                      {(specs.specs || []).map((spec: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={spec.key} onChange={(e) => updateSpecRow(i, "key", e.target.value)} placeholder="e.g. Processor" className="h-9 flex-1" />
                          <Input value={spec.value} onChange={(e) => updateSpecRow(i, "value", e.target.value)} placeholder="e.g. Snapdragon 8 Gen 3" className="h-9 flex-1" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeSpecRow(i)}><X className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      ))}
                      {(specs.specs || []).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No specs added. Click "Add Spec" to start.</p>}
                    </div>
                  </div>
                )}

                {/* Custom key-value pairs for general */}
                {productType === "general" && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Custom Attributes</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addSpecRow} className="gap-1"><Plus className="w-3 h-3" /> Add Attribute</Button>
                    </div>
                    <div className="space-y-2">
                      {(specs.specs || []).map((spec: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <Input value={spec.key} onChange={(e) => updateSpecRow(i, "key", e.target.value)} placeholder="Attribute name" className="h-9 flex-1" />
                          <Input value={spec.value} onChange={(e) => updateSpecRow(i, "value", e.target.value)} placeholder="Value" className="h-9 flex-1" />
                          <Button type="button" variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeSpecRow(i)}><X className="w-3.5 h-3.5 text-destructive" /></Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="space-y-4 mt-4">
                {!editing?.id ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Save the product first to manage variants.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Size / Color Variants</p>
                        <p className="text-xs text-muted-foreground">Track inventory per size and color combination.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={generateVariants} className="gap-1 text-xs">
                          ⚡ Auto-Generate
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={addVariant} className="gap-1">
                          <Plus className="w-3 h-3" /> Add Variant
                        </Button>
                      </div>
                    </div>

                    {variantsLoading ? (
                      <p className="text-center text-muted-foreground py-8">Loading variants...</p>
                    ) : variants.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                        <p className="text-muted-foreground text-sm">No variants yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Add sizes/colors in Attributes tab, then click "Auto-Generate" to create all combinations.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* Bulk drag-and-drop upload zone */}
                        <div
                          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                          onDragLeave={() => setDragOver(false)}
                          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleBulkImageUpload(e.dataTransfer.files); }}
                          onClick={() => bulkInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-xl p-4 flex items-center justify-center gap-3 cursor-pointer transition-all ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        >
                          {bulkUploading ? (
                            <Loader2 className="w-5 h-5 animate-spin text-primary" />
                          ) : (
                            <ImagePlus className="w-5 h-5 text-muted-foreground" />
                          )}
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {bulkUploading ? "Uploading..." : "Drop images here to bulk-assign to variants"}
                            </p>
                            <p className="text-xs text-muted-foreground">Images are assigned in order to variants without images</p>
                          </div>
                          <input ref={bulkInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) handleBulkImageUpload(e.target.files); e.target.value = ""; }} />
                        </div>

                        {variants.some((v) => v.image_url) && (
                          <div className="flex justify-end">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                                >
                                  <Trash2 className="w-3 h-3" /> Clear All Images
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Clear all variant images?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will remove images from all {variants.filter((v) => v.image_url).length} variant(s). You'll need to save variants to apply the change. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={() => {
                                      setVariants(variants.map((v) => ({ ...v, image_url: "" })));
                                      toast.success("All variant images cleared — save variants to apply");
                                    }}
                                  >
                                    Clear All
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        )}

                        <div className="space-y-2">
                        <div className="grid grid-cols-[1fr_1fr_80px_80px_80px_60px_40px] gap-2 px-2 text-xs font-medium text-muted-foreground">
                          <span>Size</span><span>Color</span><span>SKU</span><span>Price ±</span><span>Stock</span><span>Image</span><span></span>
                        </div>
                        {variants.map((v, i) => (
                          <div key={i} className={`grid grid-cols-[1fr_1fr_80px_80px_80px_60px_40px] gap-2 items-center p-2 rounded-lg border transition-all ${v.is_active ? "border-border bg-secondary/10" : "border-border/40 bg-muted/20 opacity-60"}`}>
                            <Input value={v.size || ""} onChange={(e) => updateVariant(i, "size", e.target.value)} placeholder="Size" className="h-8 text-sm" />
                            <Input value={v.color || ""} onChange={(e) => updateVariant(i, "color", e.target.value)} placeholder="Color" className="h-8 text-sm" />
                            <Input value={v.sku || ""} onChange={(e) => updateVariant(i, "sku", e.target.value)} placeholder="SKU" className="h-8 text-xs" />
                            <Input type="number" value={v.price_override ?? ""} onChange={(e) => updateVariant(i, "price_override", e.target.value ? +e.target.value : null)} placeholder="—" className="h-8 text-sm" />
                            <Input type="number" value={v.stock_quantity} onChange={(e) => updateVariant(i, "stock_quantity", +e.target.value)} className="h-8 text-sm" />
                            <div className="flex items-center justify-center">
                              {v.image_url ? (
                                <div className="relative group w-10 h-10">
                                  <img src={v.image_url} alt="Variant" className="w-10 h-10 object-cover rounded border border-border" />
                                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-0.5">
                                    <button type="button" onClick={() => variantImageRefs.current[i]?.click()} className="p-0.5 rounded-full bg-primary text-primary-foreground"><Upload className="w-3 h-3" /></button>
                                    <button type="button" onClick={() => updateVariant(i, "image_url", "")} className="p-0.5 rounded-full bg-destructive text-destructive-foreground"><X className="w-3 h-3" /></button>
                                  </div>
                                </div>
                              ) : (
                                <button type="button" onClick={() => variantImageRefs.current[i]?.click()} className="w-10 h-10 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors">
                                  <Upload className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <input ref={(el) => { if (el) variantImageRefs.current[i] = el; }} type="file" accept="image/*" className="hidden" onChange={(e) => { handleVariantImageUpload(i, e.target.files?.[0]); e.target.value = ""; }} />
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVariant(i)}>
                              <X className="w-3.5 h-3.5 text-destructive" />
                            </Button>
                          </div>
                        ))}

                        <div className="flex items-center justify-between pt-2">
                          <p className="text-xs text-muted-foreground">
                            Total stock: <span className="font-bold text-foreground">{variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)}</span> units across {variants.length} variants
                          </p>
                          <div className="flex gap-2">
                            <Button type="button" size="sm" variant="outline" onClick={notifyRestockSubscribers} className="gap-1">
                              <Bell className="w-3 h-3" /> Notify Subscribers
                            </Button>
                            <Button type="button" size="sm" onClick={saveVariants}>Save Variants</Button>
                          </div>
                        </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="media" className="space-y-4 mt-4">
                <div>
                  <Label>Thumbnail</Label>
                  <ImageUpload bucket="products" folder="thumbnails" value={editing.thumbnail ?? ""} onUploaded={(url) => updateField("thumbnail", url)} />
                </div>

                <div>
                  <Label>Product Images (up to 5)</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {(editing.images || []).map((img: string, i: number) => (
                      <div key={i} className="relative group">
                        <img src={img} alt={`Product ${i + 1}`} className="w-full h-24 object-cover rounded-xl border border-border" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(editing.images || []).length < 5 && (
                      <ImageUpload bucket="products" folder="images" value="" onUploaded={addImage} />
                    )}
                  </div>
                </div>

                <div>
                  <Label>Video URL</Label>
                  <Input
                    value={editing.video_url ?? ""}
                    onChange={(e) => updateField("video_url", e.target.value)}
                    placeholder="YouTube or direct video URL"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Paste a YouTube link or direct video file URL</p>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div>
                  <Label>Meta Title</Label>
                  <Input value={editing.meta_title ?? ""} onChange={(e) => updateField("meta_title", e.target.value)} placeholder="Product page title (max 60 chars)" maxLength={60} />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_title ?? "").length}/60</p>
                </div>
                <div>
                  <Label>Meta Description</Label>
                  <Textarea value={editing.meta_description ?? ""} onChange={(e) => updateField("meta_description", e.target.value)} placeholder="Product page description (max 160 chars)" rows={3} maxLength={160} />
                  <p className="text-xs text-muted-foreground mt-1">{(editing.meta_description ?? "").length}/160</p>
                </div>
                <div>
                  <Label>Meta Keywords</Label>
                  <Input value={editing.meta_keywords ?? ""} onChange={(e) => updateField("meta_keywords", e.target.value)} placeholder="keyword1, keyword2, keyword3" />
                </div>
              </TabsContent>

              <Button className="w-full mt-4" onClick={() => saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : "Save Product"}
              </Button>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminProducts;
