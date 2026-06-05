"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/lib/app-toast";
import { Search, Globe, FileText, AlertCircle, Check, Eye, FileSearch } from "lucide-react";
import SeoAuditTool from "./SeoAuditTool";

interface PageSEO {
  title: string;
  description: string;
  keywords: string;
  og_title: string;
  og_description: string;
  canonical_url: string;
  robots: string;
  structured_data: string;
}

const defaultPageSEO: PageSEO = {
  title: "",
  description: "",
  keywords: "",
  og_title: "",
  og_description: "",
  canonical_url: "",
  robots: "index, follow",
  structured_data: "",
};

const seoPages = [
  { id: "landing", label: "Landing Page", path: "/" },
  { id: "home", label: "Home Page", path: "/home" },
  { id: "shop", label: "Shop Page", path: "/inventory" },
  { id: "cart", label: "Cart Page", path: "/cart" },
  { id: "wishlist", label: "Wishlist Page", path: "/wishlist" },
  { id: "checkout", label: "Checkout Page", path: "/checkout" },
  { id: "profile", label: "Profile Page", path: "/profile" },
  { id: "orders", label: "Orders Page", path: "/orders" },
  { id: "auth", label: "Auth Page", path: "/auth" },
];

const robotsOptions = [
  "index, follow",
  "index, nofollow",
  "noindex, follow",
  "noindex, nofollow",
];

const SeoPageCard = ({
  page,
  seo,
  onChange,
}: {
  page: (typeof seoPages)[0];
  seo: PageSEO;
  onChange: (field: keyof PageSEO, value: string) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasSeo = seo.title || seo.description;

  return (
    <Card className={`glass transition-all ${hasSeo ? "border-primary/20" : "border-border/30"}`}>
      <CardHeader className="pb-2 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-sm">{page.label}</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono">{page.path}</Badge>
          </div>
          <div className="flex items-center gap-2">
            {hasSeo ? (
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                <Check className="w-3 h-3 mr-0.5" /> Configured
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">
                <AlertCircle className="w-3 h-3 mr-0.5" /> Not set
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{expanded ? "▲" : "▼"}</span>
          </div>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-4 pt-2">
          {/* SERP Preview */}
          {(seo.title || seo.description) && (
            <div className="p-3 rounded-xl bg-secondary/20 border border-border/30 space-y-1">
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Google Preview</span>
              </div>
              <p className="text-sm text-blue-400 font-medium truncate">{seo.title || page.label}</p>
              <p className="text-xs text-primary/60 font-mono truncate">
                yoursite.com{page.path}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2">{seo.description || "No description set"}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Page Title <span className="text-muted-foreground">({seo.title.length}/60)</span></Label>
              <Input
                value={seo.title}
                onChange={(e) => onChange("title", e.target.value)}
                placeholder={`${page.label} | Your Site Name`}
                maxLength={70}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">OG Title <span className="text-muted-foreground">(Social sharing)</span></Label>
              <Input
                value={seo.og_title}
                onChange={(e) => onChange("og_title", e.target.value)}
                placeholder="Leave empty to use page title"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Meta Description <span className="text-muted-foreground">({seo.description.length}/160)</span></Label>
            <Textarea
              value={seo.description}
              onChange={(e) => onChange("description", e.target.value)}
              placeholder="A compelling description for search engines..."
              maxLength={170}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">OG Description</Label>
            <Textarea
              value={seo.og_description}
              onChange={(e) => onChange("og_description", e.target.value)}
              placeholder="Leave empty to use meta description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Keywords <span className="text-muted-foreground">(comma separated)</span></Label>
              <Input
                value={seo.keywords}
                onChange={(e) => onChange("keywords", e.target.value)}
                placeholder="e-commerce, shop, products"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Canonical URL</Label>
              <Input
                value={seo.canonical_url}
                onChange={(e) => onChange("canonical_url", e.target.value)}
                placeholder="https://yoursite.com/page"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Robots Directive</Label>
            <div className="grid grid-cols-2 gap-1.5">
              {robotsOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => onChange("robots", opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    seo.robots === opt
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 text-muted-foreground hover:bg-secondary/50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">JSON-LD Structured Data <span className="text-muted-foreground">(optional)</span></Label>
            <Textarea
              value={seo.structured_data}
              onChange={(e) => onChange("structured_data", e.target.value)}
              placeholder='{"@context": "https://schema.org", ...}'
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      )}
    </Card>
  );
};

/* ── Global SEO ── */
interface GlobalSEO {
  site_title_suffix: string;
  default_og_image: string;
  google_analytics_id: string;
  google_search_console: string;
  facebook_pixel_id: string;
  sitemap_enabled: boolean;
  auto_generate_meta: boolean;
}

const defaultGlobalSEO: GlobalSEO = {
  site_title_suffix: " | Store",
  default_og_image: "",
  google_analytics_id: "",
  google_search_console: "",
  facebook_pixel_id: "",
  sitemap_enabled: true,
  auto_generate_meta: true,
};

const AdminSeoSettings = () => {
  const qc = useQueryClient();
  const [pageSeo, setPageSeo] = useState<Record<string, PageSEO>>({});
  const [globalSeo, setGlobalSeo] = useState<GlobalSEO>({ ...defaultGlobalSEO });

  const { data: settings } = useQuery({
    queryKey: ["admin-seo-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("*")
        .in("key", ["seo_pages", "seo_global"]);
      return data || [];
    },
  });

  useEffect(() => {
    if (settings) {
      const pagesRow = settings.find((s) => s.key === "seo_pages");
      if (pagesRow?.value) {
        const val = (pagesRow.value as any)?.value ?? pagesRow.value;
        if (typeof val === "object") setPageSeo(val);
      }
      const globalRow = settings.find((s) => s.key === "seo_global");
      if (globalRow?.value) {
        const val = (globalRow.value as any)?.value ?? globalRow.value;
        if (typeof val === "object") setGlobalSeo((prev) => ({ ...prev, ...val }));
      }
    }
  }, [settings]);

  const getPageSeo = (pageId: string): PageSEO => pageSeo[pageId] || { ...defaultPageSEO };

  const updatePageSeo = (pageId: string, field: keyof PageSEO, value: string) => {
    setPageSeo((prev) => ({
      ...prev,
      [pageId]: { ...getPageSeo(pageId), [field]: value },
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const items = [
        { key: "seo_pages", value: { value: pageSeo } },
        { key: "seo_global", value: { value: globalSeo } },
      ];
      for (const item of items) {
        const existing = settings?.find((s) => s.key === item.key);
        if (existing) {
          await supabase.from("site_settings").update({ value: item.value as any }).eq("id", existing.id);
        } else {
          await supabase.from("site_settings").insert({ key: item.key, value: item.value as any });
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-seo-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      toast.success("SEO settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const configuredCount = seoPages.filter((p) => {
    const s = getPageSeo(p.id);
    return s.title || s.description;
  }).length;

  return (
    <Tabs defaultValue="settings" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 max-w-md">
        <TabsTrigger value="settings" className="gap-2">
          <Globe className="w-4 h-4" /> SEO Settings
        </TabsTrigger>
        <TabsTrigger value="audit" className="gap-2">
          <FileSearch className="w-4 h-4" /> SEO Audit
        </TabsTrigger>
      </TabsList>

      <TabsContent value="settings" className="space-y-6">
        {/* Global SEO Settings */}
        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Global SEO Settings
            </CardTitle>
            <CardDescription>
              Settings that apply site-wide. Individual pages can override these.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Title Suffix</Label>
                <Input
                  value={globalSeo.site_title_suffix}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, site_title_suffix: e.target.value })}
                  placeholder=" | Your Site Name"
                />
                <p className="text-[10px] text-muted-foreground">Appended to all page titles</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Default OG Image URL</Label>
                <Input
                  value={globalSeo.default_og_image}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, default_og_image: e.target.value })}
                  placeholder="https://yoursite.com/og-image.jpg"
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Google Analytics ID</Label>
                <Input
                  value={globalSeo.google_analytics_id}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, google_analytics_id: e.target.value })}
                  placeholder="G-XXXXXXXXXX"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Search Console Verification</Label>
                <Input
                  value={globalSeo.google_search_console}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, google_search_console: e.target.value })}
                  placeholder="Verification meta content"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Facebook Pixel ID</Label>
                <Input
                  value={globalSeo.facebook_pixel_id}
                  onChange={(e) => setGlobalSeo({ ...globalSeo, facebook_pixel_id: e.target.value })}
                  placeholder="XXXXXXXXXXXXXXX"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Page SEO */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground">Page-Level SEO</h3>
            <Badge variant="outline" className="text-[10px]">{configuredCount}/{seoPages.length} configured</Badge>
          </div>
        </div>

        <div className="space-y-3">
          {seoPages.map((page) => (
            <SeoPageCard
              key={page.id}
              page={page}
              seo={getPageSeo(page.id)}
              onChange={(field, value) => updatePageSeo(page.id, field, value)}
            />
          ))}
        </div>

        <Button className="w-full" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending ? "Saving..." : "Save All SEO Settings"}
        </Button>
      </TabsContent>

      <TabsContent value="audit">
        <SeoAuditTool />
      </TabsContent>
    </Tabs>
  );
};

export default AdminSeoSettings;
