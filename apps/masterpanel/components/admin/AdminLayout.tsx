"use client";
import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "@/lib/router-compat";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "./AdminSidebar";
import { AdminCommandPalette } from "./AdminCommandPalette";
import AdminMobileShell from "./AdminMobileShell";
import { PresenceAvatars } from "./PresenceAvatars";
import { ShortcutsHelp } from "./ShortcutsHelp";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBreakpoint } from "@/hooks/use-breakpoint";
import { useAdminHotkeys } from "@/hooks/use-admin-hotkeys";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import NotificationBell from "@/components/NotificationBell";
import AdminFooter from "./AdminFooter";
import { LogOut, ChevronRight, Command, Activity, Keyboard } from "lucide-react";
import { allAdminItems } from "./admin-nav";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";


const AdminLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = useAdminRole();
  const isMobile = useIsMobile();
  const bp = useBreakpoint();
  const isTablet = bp === "tablet";
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  useAdminHotkeys(() => setHelpOpen(true));
  const realtimeStatus = useRealtimeStatus();
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent);
  const modKey = isMac ? "⌘" : "Ctrl";

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

  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  const pageMeta = useMemo(() => {
    const match = allAdminItems.find((i) =>
      i.url === "/origin"
        ? location.pathname === "/origin"
        : location.pathname.startsWith(i.url)
    );
    return match ?? { title: "Admin", description: "" };
  }, [location.pathname]);

  const isRoot = location.pathname === "/origin";

  // Mobile and tablet use the mobile shell to avoid sidebar layout breakage.
  if (isMobile || isTablet) {
    return <AdminMobileShell />;
  }

  return (
    <SidebarProvider defaultOpen={!isTablet}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/40">
        <AdminSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className={`h-14 flex items-center border-b border-border/60 ${isTablet ? "px-3" : "px-4"} bg-background/70 backdrop-blur-xl sticky top-0 z-20`}>
            <SidebarTrigger className="mr-3 text-muted-foreground hover:text-foreground" />

            <div className="flex items-center gap-1.5 text-sm min-w-0">
              <span className="text-muted-foreground">Admin</span>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <span className="font-medium text-foreground truncate">
                {isRoot ? "Dashboard" : pageMeta.title}
              </span>
            </div>

            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden md:flex ml-6 items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-colors min-w-[220px]"
            >
              <Command className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Quick jump…</span>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-background border border-border/60 text-[10px] font-mono text-muted-foreground">
                <span aria-hidden>{modKey}</span>
                <span>K</span>
              </kbd>
            </button>

            <div className="ml-auto flex items-center gap-2">
              <PresenceAvatars currentName={profile?.full_name || user?.email} />

              {(() => {
                const cfg = {
                  live: { label: "Live", cls: "bg-emerald-500/10 text-emerald-500", dot: "bg-emerald-500", ping: true },
                  connecting: { label: "Connecting", cls: "bg-amber-500/10 text-amber-500", dot: "bg-amber-500", ping: true },
                  offline: { label: "Offline", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground", ping: false },
                }[realtimeStatus];
                return (
                  <div
                    className={`hidden md:flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium ${cfg.cls}`}
                    role="status"
                    aria-live="polite"
                    title={`Realtime status: ${cfg.label}`}
                  >
                    <span className="relative flex w-1.5 h-1.5">
                      {cfg.ping && (
                        <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${cfg.dot}`} />
                      )}
                      <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${cfg.dot}`} />
                    </span>
                    <Activity className="w-3 h-3" />
                    {cfg.label}
                  </div>
                );
              })()}

              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                title="Keyboard shortcuts (?)"
                className="hidden md:inline-flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Keyboard className="w-4 h-4" />
              </button>

              <NotificationBell adminMode />

              <div className="h-6 w-px bg-border/60 mx-1" />

              <div className="flex items-center gap-2.5 pl-1">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Admin"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-border/60"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center ring-2 ring-border/40">
                    <span className="text-xs font-semibold text-primary-foreground">{initials}</span>
                  </div>
                )}
                <div className="hidden md:block leading-tight">
                  <p className="text-xs font-medium text-foreground">{profile?.full_name || "Admin"}</p>
                  <p className="text-[10px] text-muted-foreground capitalize">
                    {role === "moderator" ? "Moderator" : "Administrator"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  signOut();
                  navigate("/auth");
                }}
                className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            <div className="max-w-[1600px] mx-auto">
              <React.Suspense fallback={<AutoSkeleton />}>
                {children}
              </React.Suspense>
            </div>
          </main>
          <AdminFooter onOpenShortcuts={() => setHelpOpen(true)} />
        </div>


        <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
        <ShortcutsHelp open={helpOpen} onOpenChange={setHelpOpen} />
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
