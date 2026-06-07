"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, ArrowLeft, ChevronDown, Star, StarOff } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "@/lib/router-compat";
import { storefrontHref } from "@/lib/cross-app-urls";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/components/AdminRoute";
import { useStaffSections } from "@/hooks/use-staff-sections";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { adminNav, type AdminNavItem } from "./admin-nav";

const SECTION_LABELS: Record<string, string> = {
  "":          "Admin Management",
  "admin":     "Sales Management",
  "seo":       "SEO Management",
  "affiliate": "Affiliate Hub",
  "brandconfig": "Branding Config",
  "backend":   "Backend Controls",
  "settings":  "Site Settings",
  "corporate": "Corporate",
  "master":    "All Sections",
};

// Maps a URL path segment to which adminNav section labels to show.
// "overview" is always shown (the Dashboard item).
// All nav section labels (used for the master control view)
const ALL_NAV_LABELS = ["Overview", "Admin", "SEO", "Affiliate", "Brand Config", "Backend", "Settings", "Corporate"];

const SEGMENT_TO_NAV_LABELS: Record<string, string[]> = {
  "":            ["Overview"],           // master panel home — only back-link
  "admin":       ["Overview", "Admin"],
  "seo":         ["Overview", "SEO"],
  "affiliate":   ["Overview", "Affiliate"],
  "brandconfig": ["Overview", "Brand Config"],
  "backend":     ["Overview", "Backend"],
  "settings":    ["Overview", "Settings"],
  "corporate":   ["Overview", "Corporate"],
  "master":      ALL_NAV_LABELS,         // /master — shows everything
};

const PINNED_KEY = "admin:pinned-nav";

function usePinned() {
  const [pinned, setPinned] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
    } catch {
      return [];
    }
  });
  const toggle = (url: string) => {
    setPinned((prev) => {
      const next = prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url];
      try {
        localStorage.setItem(PINNED_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  return { pinned, toggle };
}

export function AdminSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const role = useAdminRole();
  const { data: staff } = useStaffSections();
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const { pinned, toggle: togglePin } = usePinned();

  const sectionLabel = (() => {
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    return SECTION_LABELS[seg] ?? "Admin Management";
  })();

  // Only show nav sections relevant to the current route segment
  const visibleNavLabels = (() => {
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    return SEGMENT_TO_NAV_LABELS[seg] ?? ["Overview", "Admin"];
  })();

  // Master Control is only shown when user has access to 2+ sections (or is admin)
  const canSeeMasterControl = !!staff?.isAdmin || role === "admin" ||
    (staff?.accessible?.length ?? 0) >= 2;

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-sidebar"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url", "logo_display_style"]);
      const map: Record<string, any> = {};
      data?.forEach((s) => {
        const val: any = s.value;
        map[s.key] = typeof val === "object" && val !== null ? val.value ?? val : val;
      });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });
  const siteName = (siteSettings?.site_name as string) || "";
  const logoUrl = (siteSettings?.logo_url as string) || "";
  const siteIconUrl = (siteSettings?.site_icon_url as string) || "";
  const logoStyle = (siteSettings?.logo_display_style as string) || "rounded";
  const logoShapeClass =
    logoStyle === "square"
      ? "rounded-lg"
      : logoStyle === "circle" || logoStyle === "pill"
      ? "rounded-full"
      : "rounded-lg";

  const { data: openSupportCount = 0, refetch: refetchSupport } = useQuery({
    queryKey: ["admin-open-support-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("support_conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      return count || 0;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const ch = supabase
      .channel("admin-support-count")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_conversations" },
        () => refetchSupport()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [refetchSupport]);

  const currentPath = location.pathname;
  const isActive = (path: string) => {
    const cleanPath = path.split("?")[0];
    if (cleanPath === "/") return currentPath === "/";
    // For section landing pages that are exact (e.g. "/admin", "/seo"),
    // match exactly so they don't stay lit on every sub-page
    const isLandingPage = !cleanPath.includes("/", 1) || cleanPath === "/admin" || cleanPath === "/seo" || cleanPath === "/affiliate" || cleanPath === "/brandconfig" || cleanPath === "/backend" || cleanPath === "/settings" || cleanPath === "/corporate" || cleanPath === "/master";
    if (isLandingPage) return currentPath === cleanPath || currentPath === cleanPath + "/";
    return currentPath.startsWith(cleanPath);
  };

  const isChildActive = (childUrl: string) => {
    const [base, qs] = childUrl.split("?");
    if (!currentPath.startsWith(base)) return false;
    if (!qs) return location.search === "" || location.search === "?";
    return location.search.includes(qs);
  };

  const getBadge = (url: string) =>
    url === "/admin/support" && openSupportCount > 0 ? openSupportCount : null;

  // Auto-open the group containing the active route.
  useEffect(() => {
    const next: Record<string, boolean> = {};
    adminNav.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children && isActive(item.url)) {
          next[item.url] = true;
        }
      });
    });
    setOpenGroups((prev) => ({ ...prev, ...next }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPath]);

  const filterItems = (items: AdminNavItem[]) => {
    // Admins always see everything; staff (non-admin) are gated by
    // staff_section_access via useStaffSections().hasAccess(section).
    // Legacy moderators (no section grants) fall back to !adminOnly.
    const isAdmin = !!staff?.isAdmin || role === "admin";
    const hasAnyGrant = (staff?.accessible?.length ?? 0) > 0;
    const sectionFiltered = items.filter((i) => {
      if (isAdmin) return true;
      // Master Control item: require 2+ accessible sections
      if (i.url === "/master") return canSeeMasterControl;
      if (i.section) return staff?.hasAccess(i.section) ?? false;
      // No section assigned — fall back to legacy rule
      return hasAnyGrant ? false : !i.adminOnly;
    });
    if (!query.trim()) return sectionFiltered;
    const q = query.toLowerCase();
    return sectionFiltered.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.keywords ?? "").toLowerCase().includes(q) ||
        i.children?.some((c) => c.title.toLowerCase().includes(q))
    );
  };

  const pinnedItems = useMemo(() => {
    const all = adminNav.flatMap((s) => s.items);
    return pinned
      .map((url) => all.find((i) => i.url === url))
      .filter(Boolean) as AdminNavItem[];
  }, [pinned]);

  const closeOnMobile = () => {
    if (isMobile) setOpenMobile(false);
  };

  const renderItem = (item: AdminNavItem, showPin = true) => {
    const badge = getBadge(item.url);
    const active = isActive(item.url);
    const hasChildren = !!item.children?.length;
    const open = openGroups[item.url] ?? false;
    const isPinned = pinned.includes(item.url);

    return (
      <SidebarMenuItem key={item.url + item.title}>
        <div className="group/item relative flex items-center">
          <SidebarMenuButton
            asChild={!hasChildren}
            size="sm"
            tooltip={collapsed ? item.title : undefined}
            onClick={hasChildren ? () => {
              if (collapsed) {
                navigate(item.url);
                closeOnMobile();
              } else {
                setOpenGroups((p) => ({ ...p, [item.url]: !p[item.url] }));
              }
            } : undefined}
            className={
              (active
                ? "h-9 text-[13px] bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary font-medium relative before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[2px] before:rounded-full before:bg-primary rounded-lg"
                : "h-9 text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-lg") +
              (!collapsed && showPin ? (hasChildren ? " pr-12" : " pr-7") : "")
            }
          >
            {hasChildren ? (
              <span className="w-full flex items-center gap-2">
                <item.icon className="shrink-0 !size-[15px]" />
                <span className="truncate flex-1 text-left">{item.title}</span>
                {!collapsed && (
                  <ChevronDown
                    className={`!size-3.5 shrink-0 transition-transform duration-200 ${
                      open ? "rotate-180" : ""
                    }`}
                  />
                )}
              </span>
            ) : (
              <NavLink to={item.url} end={item.url === "/"} onClick={closeOnMobile}>
                <item.icon className="shrink-0 !size-[15px]" />
                <span className="truncate">{item.title}</span>
                {badge != null && !collapsed && (
                  <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5">
                    {badge}
                  </span>
                )}
                {badge != null && collapsed && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-destructive" />
                )}
              </NavLink>
            )}
          </SidebarMenuButton>
          {!collapsed && showPin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePin(item.url);
              }}
              className={`absolute ${hasChildren ? "right-7" : "right-1"} top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover/item:opacity-100 transition-opacity hover:bg-muted ${
                isPinned ? "!opacity-100 text-primary" : "text-muted-foreground"
              }`}
              title={isPinned ? "Unpin" : "Pin to favorites"}
            >
              {isPinned ? <Star className="w-3 h-3 fill-current" /> : <StarOff className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Children */}
        {hasChildren && open && !collapsed && (
          <div className="ml-4 mt-0.5 pl-3 border-l border-border/40 space-y-0.5">
            {item.children!.map((child) => {
              const cActive = isChildActive(child.url);
              return (
                <NavLink
                  key={child.url}
                  to={child.url}
                  onClick={closeOnMobile}
                  className={`flex items-center h-7 px-2 rounded-md text-[12px] transition-colors ${
                    cActive
                      ? "text-primary bg-primary/8 font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                  }`}
                >
                  <span className="truncate">{child.title}</span>
                </NavLink>
              );
            })}
          </div>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/40 group-data-[collapsible=icon]:p-2 p-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={siteName}
              className="w-6 h-6 rounded object-contain shrink-0"
            />
          ) : siteIconUrl ? (
            <img
              src={siteIconUrl}
              alt={siteName}
              className="w-6 h-6 rounded object-contain shrink-0"
            />
          ) : (
            <div
              className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shrink-0"
            >
              <span className="text-primary-foreground font-bold text-[10px]">
                {(siteName || "A").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-display text-sm font-bold text-foreground leading-tight tracking-tight">
                Control Panel
              </h2>
              <p className="text-[10px] text-muted-foreground leading-tight uppercase tracking-wider">
                {sectionLabel}
              </p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="relative mt-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              id="admin-sidebar-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search… (press /)"
              className="w-full h-8 pl-8 pr-2 text-xs rounded-lg bg-muted/40 border border-border/40 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 transition"
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 gap-0">
        {/* Pinned */}
        {pinnedItems.length > 0 && !query && (
          <SidebarGroup className="px-0 py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold px-3 h-6 flex items-center gap-1">
                <Star className="w-2.5 h-2.5 fill-current" /> Pinned
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {pinnedItems.map((item) => renderItem(item, true))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {adminNav.map((section) => {
          if (!visibleNavLabels.includes(section.label)) return null;
          const filtered = filterItems(section.items);
          if (filtered.length === 0) return null;
          return (
            <SidebarGroup key={section.label} className="px-0 py-1">
              {!collapsed && (
                <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60 font-semibold px-3 h-6">
                  {section.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu className="gap-0.5">
                  {filtered.map((item) => renderItem(item))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="sm"
              tooltip={collapsed ? "Back to Store" : undefined}
              className="h-8 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg"
            >
              <a
                href={storefrontHref("/")}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-8 px-2 text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg transition-colors w-full"
              >
                <ArrowLeft className="shrink-0 !size-[15px]" />
                <span className="truncate">Back to Store</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
