"use client";
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminRole } from "@/components/AdminRoute";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@/lib/router-compat";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRealtimeStatus } from "@/hooks/use-realtime-status";
import NotificationBell from "@/components/NotificationBell";
import AdminFooter from "./AdminFooter";
import { AdminCommandPalette } from "./AdminCommandPalette";
import { LogOut, Command, Activity } from "lucide-react";
import AutoSkeleton from "@/components/skeletons/AutoSkeleton";

/**
 * Master Panel layout — clean, sidebar-free shell.
 * Used only at "/" (the section navigator / home page).
 */
const MasterPanelLayout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const role = useAdminRole();
  const isMobile = useIsMobile();
  const realtimeStatus = useRealtimeStatus();
  const [paletteOpen, setPaletteOpen] = useState(false);
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

  const { data: siteSettings } = useQuery({
    queryKey: ["site-settings-admin-sidebar"],
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

  const siteName = (siteSettings?.site_name as string) || "Control Panel";
  const logoUrl = (siteSettings?.logo_url as string) || "";
  const siteIconUrl = (siteSettings?.site_icon_url as string) || "";

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "AD";

  // On mobile use same layout (no sidebar anyway)
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/40">
      {/* Top bar */}
      <header className="h-14 flex items-center border-b border-border/60 px-4 bg-background/70 backdrop-blur-xl sticky top-0 z-20">
        {/* Logo + brand */}
        <div className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="w-6 h-6 rounded object-contain shrink-0" />
          ) : siteIconUrl ? (
            <img src={siteIconUrl} alt={siteName} className="w-6 h-6 rounded object-contain shrink-0" />
          ) : (
            <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-[10px]">
                {(siteName || "A").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground leading-none">Control Panel</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5 uppercase tracking-wider">Master Panel</p>
          </div>
        </div>

        {/* Command palette trigger */}
        {!isMobile && (
          <button
            onClick={() => setPaletteOpen(true)}
            className="hidden md:flex ml-6 items-center gap-2 h-8 pl-2.5 pr-2 rounded-lg border border-border/60 bg-muted/40 hover:bg-muted/70 text-xs text-muted-foreground transition-colors min-w-[200px]"
          >
            <Command className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Quick jump…</span>
            <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 h-5 rounded bg-background border border-border/60 text-[10px] font-mono text-muted-foreground">
              <span aria-hidden>{modKey}</span>
              <span>K</span>
            </kbd>
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Realtime status dot */}
          {(() => {
            const cfg = {
              live:       { dot: "bg-emerald-500", ping: true },
              connecting: { dot: "bg-amber-500",   ping: true },
              offline:    { dot: "bg-muted-foreground", ping: false },
            }[realtimeStatus];
            return (
              <span className="relative flex w-1.5 h-1.5 ml-1">
                {cfg.ping && (
                  <span className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${cfg.dot}`} />
                )}
                <span className={`relative inline-flex rounded-full w-1.5 h-1.5 ${cfg.dot}`} />
              </span>
            );
          })()}

          <NotificationBell adminMode />

          <div className="h-6 w-px bg-border/60 mx-1" />

          <div className="flex items-center gap-2 pl-1">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Admin"
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-[11px] font-semibold text-primary-foreground">{initials}</span>
              </div>
            )}
            {!isMobile && (
              <div className="hidden md:block leading-tight">
                <p className="text-xs font-medium text-foreground">{profile?.full_name || "Admin"}</p>
                <p className="text-[10px] text-muted-foreground capitalize">
                  {role === "moderator" ? "Moderator" : "Administrator"}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => { signOut(); navigate("/auth"); }}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main content — full width, no sidebar */}
      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-[1400px] mx-auto">
          <React.Suspense fallback={<AutoSkeleton />}>
            {children}
          </React.Suspense>
        </div>
      </main>

      <AdminFooter onOpenShortcuts={() => {}} />
      <AdminCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
};

export default MasterPanelLayout;
