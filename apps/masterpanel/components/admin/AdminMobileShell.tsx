"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Outlet, useNavigate, useLocation } from "@/lib/router-compat";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NavLink } from "@/components/NavLink";
import {
  Menu,
  Search,
  LogOut,
  ChevronDown,
  Command,
  Sparkles,
  ArrowLeft,
  User,
} from "lucide-react";
import { adminNav, mobilePrimary, allAdminItems, type AdminNavItem } from "./admin-nav";
import { AdminCommandPalette } from "./AdminCommandPalette";

const AdminMobileShell: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAdminRole();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [isPhone, setIsPhone] = useState(false);

  // Phone (<640px) gets fewer bottom-tab slots than tablet
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(max-width: 639px)");
    const update = () => setIsPhone(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);


  const { data: profile } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user!.id)
        .single();
      return data;
    },
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
  });

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-mobile"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["site_name", "logo_url", "site_icon_url"]);
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
  const logoUrl =
    (siteSettings?.logo_url as string) || (siteSettings?.site_icon_url as string) || "";

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const firstName = (profile?.full_name || "").split(" ")[0] || "Admin";

  const pageMeta = useMemo(() => {
    const match = allAdminItems.find((i) =>
      i.url === "/"
        ? location.pathname === "/"
        : location.pathname.startsWith(i.url)
    );
    return match ?? { title: "Admin", description: "" };
  }, [location.pathname]);

  const isRoot = location.pathname === "/";

  const mobileSectionLabel = (() => {
    const seg = location.pathname.replace(/\/+$/, "").split("/")[1] ?? "";
    const map: Record<string, string> = {
      "":          "Master Panel",
      "admin":     "Sales Management",
      "seo":       "SEO Management",
      "affiliate": "Affiliate Hub",
      "brandconfig": "Branding Config",
      "backend":   "Backend Controls",
      "settings":  "Site Settings",
      "corporate": "Corporate",
      "master":    "All Sections",
    };
    return map[seg] ?? "Admin";
  })();
  const currentPath = location.pathname;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Working late";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

  const isPrimaryActive = (url: string) =>
    url === "/" ? currentPath === "/" : currentPath.startsWith(url);

  const filterItems = (items: AdminNavItem[]) => {
    const byRole = role === "moderator" ? items.filter((i) => !i.adminOnly) : items;
    if (!query.trim()) return byRole;
    const q = query.toLowerCase();
    return byRole.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.keywords ?? "").toLowerCase().includes(q) ||
        i.children?.some((c) => c.title.toLowerCase().includes(q))
    );
  };

  // Close sheet on route change
  useEffect(() => {
    setSheetOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll behavior + native-feel touch
  useEffect(() => {
    document.body.style.overscrollBehaviorY = "none";
    return () => {
      document.body.style.overscrollBehaviorY = "";
    };
  }, []);

  return (
    <div
      className="relative min-h-[100dvh] flex flex-col w-full bg-background overflow-hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[280px] opacity-80"
        style={{
          background:
            "radial-gradient(120% 100% at 50% 0%, hsl(var(--primary)/0.18) 0%, hsl(var(--primary)/0.06) 35%, transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full blur-3xl opacity-40"
        style={{ background: "hsl(var(--primary)/0.35)" }}
      />

      {/* Top app bar — glass */}
      <header className="relative z-30 flex items-center px-3 h-14 gap-2">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className="h-10 w-10 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 text-foreground shadow-sm active:scale-95 transition"
              aria-label="Open menu"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[320px] p-0 flex flex-col bg-background border-r border-border/60"
          >
            <div className="px-4 py-4 border-b border-border/40 flex items-center gap-3">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={siteName}
                  className="w-10 h-10 rounded-2xl object-cover ring-1 ring-border/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)]">
                  <span className="text-primary-foreground font-bold text-base">
                    {(siteName || "A").charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h2 className="font-display text-[15px] font-bold leading-tight tracking-tight">
                  Control Center
                </h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-[0.16em] leading-tight mt-0.5">
                  {role === "moderator" ? "Moderator" : "Admin"}
                </p>
              </div>
            </div>

            <div className="px-3 pt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search admin…"
                  className="w-full h-10 pl-9 pr-3 text-sm rounded-2xl bg-muted/50 border border-border/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40"
                />
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
              {adminNav.map((section) => {
                const items = filterItems(section.items);
                if (!items.length) return null;
                return (
                  <div key={section.label} className="pb-1">
                    <div className="px-3 h-7 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 font-semibold flex items-center">
                      {section.label}
                    </div>
                    {items.map((item) => {
                      const active = isPrimaryActive(item.url);
                      const hasChildren = !!item.children?.length;
                      const open = openGroups[item.url] ?? active;
                      return (
                        <div key={item.url}>
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() =>
                                setOpenGroups((p) => ({ ...p, [item.url]: !(p[item.url] ?? active) }))
                              }
                              className={`w-full flex items-center gap-3 h-11 px-3 rounded-2xl text-[14px] transition active:scale-[0.99] ${
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-foreground hover:bg-muted/50"
                              }`}
                            >
                              <item.icon className="w-[17px] h-[17px] shrink-0" />
                              <span className="flex-1 text-left truncate">{item.title}</span>
                              <ChevronDown
                                className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`}
                              />
                            </button>
                          ) : (
                            <NavLink
                              to={item.url}
                              end={item.url === "/"}
                              className={`flex items-center gap-3 h-11 px-3 rounded-2xl text-[14px] transition active:scale-[0.99] ${
                                active
                                  ? "bg-primary/10 text-primary font-semibold"
                                  : "text-foreground hover:bg-muted/50"
                              }`}
                            >
                              <item.icon className="w-[17px] h-[17px] shrink-0" />
                              <span className="truncate">{item.title}</span>
                            </NavLink>
                          )}
                          {hasChildren && open && (
                            <div className="ml-7 pl-3 border-l border-border/40 mt-1 mb-1.5 space-y-0.5">
                              {item.children!.map((child) => (
                                <NavLink
                                  key={child.url}
                                  to={child.url}
                                  className="flex items-center h-9 px-3 rounded-xl text-[13px] text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                >
                                  <span className="truncate">{child.title}</span>
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </nav>

            <div className="p-3 border-t border-border/40 flex items-center gap-3">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Admin"
                  className="w-10 h-10 rounded-2xl object-cover ring-2 ring-border/60"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                </div>
              )}
              <div className="flex-1 min-w-0 leading-tight">
                <p className="text-sm font-semibold truncate">{profile?.full_name || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {role === "moderator" ? "Moderator" : "Administrator"}
                </p>
              </div>
              <button
                onClick={() => {
                  signOut();
                  navigate("/auth");
                }}
                className="p-2.5 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1 min-w-0 px-1">
          <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/70 leading-none">
            {isRoot ? greeting : mobileSectionLabel}
          </p>
          <p className="text-[15px] font-semibold text-foreground truncate leading-tight mt-0.5">
            {isRoot ? `Hi, ${firstName}` : pageMeta.title}
          </p>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 text-foreground shadow-sm active:scale-95 transition"
          aria-label="Command palette"
        >
          <Search className="w-[18px] h-[18px]" />
        </button>
        <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 shadow-sm">
          <NotificationBell adminMode />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="relative h-10 w-10 flex items-center justify-center rounded-2xl bg-card/70 backdrop-blur-xl border border-border/50 shadow-sm active:scale-95 transition overflow-hidden"
              aria-label="Open admin profile"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile?.full_name || "Admin"}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="text-[11px] font-bold text-primary-foreground w-full h-full flex items-center justify-center bg-gradient-to-br from-primary to-primary/60">
                  {initials}
                </span>
              )}
              <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={6}
            className="w-48 rounded-2xl border-border/60 bg-card/95 backdrop-blur-xl shadow-xl"
          >
            <DropdownMenuLabel className="text-xs font-semibold px-3 py-2">
              {profile?.full_name || "Admin"}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={() => navigate("/profile")}
              className="rounded-xl px-3 py-2.5 text-sm cursor-pointer focus:bg-accent/80"
            >
              <User className="w-4 h-4 mr-2.5 text-muted-foreground" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                signOut();
                navigate("/auth");
              }}
              className="rounded-xl px-3 py-2.5 text-sm cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Hero row — only on dashboard root */}
      {isRoot && (
        <section className="relative z-10 px-4 pt-1 pb-3">
          <div className="rounded-3xl p-4 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border border-primary/20 backdrop-blur-md flex items-center gap-3 shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-medium text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-emerald-500" />
                </span>
                Live system
              </p>
              <p className="text-[13px] text-foreground/90 mt-1 leading-snug">
                Everything is running smoothly.
              </p>
            </div>
            <button
              onClick={() => setPaletteOpen(true)}
              className="shrink-0 h-10 px-3.5 rounded-2xl bg-foreground text-background text-[12px] font-semibold flex items-center gap-1.5 active:scale-95 transition shadow-lg"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Quick
            </button>
          </div>
        </section>
      )}

      {/* Non-root page sub-header with back chip */}
      {!isRoot && (
        <section className="relative z-10 px-4 pt-1 pb-2">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-card/70 backdrop-blur-md border border-border/50 text-[11px] font-medium text-muted-foreground hover:text-foreground active:scale-95 transition"
          >
            <ArrowLeft className="w-3 h-3" />
            Dashboard
          </button>
        </section>
      )}

      {/* Main content */}
      <main
        className="relative z-10 flex-1 px-3 overflow-auto"
        style={{
          paddingBottom: "calc(72px + env(safe-area-inset-bottom))",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <React.Suspense fallback={<AutoSkeleton />}>
          <Outlet />
        </React.Suspense>
      </main>

      {/* Sticky bottom tab bar (edge-to-edge, 7 slots) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-2xl border-t border-border/60"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch h-[64px] px-1">
          {(() => {
            // Phone: 5 primary + FAB + More = 7 slots. Tablet: 7 primary + FAB + More = 9 slots.
            const primary = isPhone ? mobilePrimary.slice(0, 5) : mobilePrimary;
            const halves = Math.ceil(primary.length / 2);
            const left = primary.slice(0, halves);
            const right = primary.slice(halves);


            const renderItem = (d: (typeof mobilePrimary)[number]) => {
              const active = isPrimaryActive(d.url);
              return (
                <button
                  key={d.url}
                  onClick={() => navigate(d.url)}
                  className="relative flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  aria-label={d.title}
                >
                  <div
                    className={`flex items-center justify-center w-9 h-7 rounded-xl transition-all ${
                      active ? "bg-primary/15 text-primary" : "text-muted-foreground"
                    }`}
                  >
                    <d.icon className="w-[17px] h-[17px]" />
                  </div>
                  <span
                    className={`text-[9px] font-medium leading-none truncate max-w-full px-0.5 ${
                      active ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {d.title}
                  </span>
                  {active && (
                    <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                  )}
                </button>
              );
            };

            return (
              <>
                {left.map(renderItem)}
                {/* Center FAB */}
                <button
                  onClick={() => setPaletteOpen(true)}
                  className="relative flex-1 min-w-0 h-full flex items-center justify-center active:scale-95 transition-transform"
                  aria-label="Command palette"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground shadow-[0_6px_20px_-4px_hsl(var(--primary)/0.7)] -mt-3">
                    <Command className="w-[20px] h-[20px]" />
                  </span>
                </button>
                {right.map(renderItem)}
                <button
                  onClick={() => setSheetOpen(true)}
                  className="flex-1 min-w-0 h-full flex flex-col items-center justify-center gap-0.5 active:scale-95 transition-transform"
                  aria-label="More"
                >
                  <div className="flex items-center justify-center w-9 h-7 rounded-xl text-muted-foreground">
                    <Menu className="w-[17px] h-[17px]" />
                  </div>
                  <span className="text-[9px] font-medium leading-none text-muted-foreground">
                    More
                  </span>
                </button>
              </>
            );
          })()}
        </div>
      </nav>

      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
};

export default AdminMobileShell;
