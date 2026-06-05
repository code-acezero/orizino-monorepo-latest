"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Moon, Sun, Palette, Bell, Globe, Shield, ChevronRight, Eye, EyeOff,
  Lock, Smartphone, Mail, Volume2, VolumeX, Languages, Monitor, TrendingUp,
  Trash2, Download, HelpCircle, MessageSquare, FileText, Info,
  BellRing, ShoppingBag, Tag, Package, Megaphone, AlertTriangle,
  Coins, Sparkles, Type, Zap, Contrast, Maximize2, Vibrate, PlayCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useLanguage, ALL_LANGUAGES } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/app-toast";
import { useProfileAppearance } from "@/hooks/use-profile-appearance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { pushSupported, subscribeToPush, unsubscribeFromPush, getPushStatus } from "@/lib/push";
import MobileSettingsShell from "@/components/profile/MobileSettingsShell";
import { useIsTabletOrBelow } from "@/hooks/use-breakpoint";
import TwoFactorDialog from "@/components/settings/TwoFactorDialog";
import SessionsDialog from "@/components/settings/SessionsDialog";
import { useNavigate } from "@/lib/router-compat";
import { useServerFn } from "@/lib/server-fn-compat";
import { exportOwnData, deleteOwnAccount } from "@/lib/account.functions";

import {
  setNotificationSoundEnabled,
  setNotificationSoundStyle,
  setNotificationSoundVolume,
  getNotificationSoundStyle,
  getNotificationSoundVolume,
  previewNotificationSound,
  type NotificationSoundStyle,
} from "@/lib/sounds";

interface NotifPrefs {
  orders: boolean;
  promotions: boolean;
  announcements: boolean;
  priceDrops: boolean;
  restockAlerts: boolean;
  email: boolean;
  push: boolean;
  sound: boolean;
}

const defaultNotifPrefs: NotifPrefs = {
  orders: true, promotions: true, announcements: true, priceDrops: true,
  restockAlerts: true, email: true, push: true, sound: true,
};

interface DisplayPrefs {
  compact: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  largerText: boolean;
  haptics: boolean;
  autoplay: boolean;
}

const defaultDisplayPrefs: DisplayPrefs = {
  compact: false, reduceMotion: false, highContrast: false,
  largerText: false, haptics: true, autoplay: true,
};

function applyDisplayPrefs(prefs: DisplayPrefs) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.classList.toggle("pref-compact", prefs.compact);
  html.classList.toggle("pref-reduce-motion", prefs.reduceMotion);
  html.classList.toggle("pref-high-contrast", prefs.highContrast);
  html.classList.toggle("pref-larger-text", prefs.largerText);
}

const ToggleRow: React.FC<{
  icon: React.ReactNode; label: string; desc?: string; checked: boolean; onChange: () => void;
}> = ({ icon, label, desc, checked, onChange }) => (
  <button onClick={onChange}
    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors text-left">
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{label}</p>
        {desc && <p className="text-xs text-muted-foreground truncate">{desc}</p>}
      </div>
    </div>
    <div className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${checked ? "left-[22px]" : "left-0.5"}`} />
    </div>
  </button>
);

type SectionId = "appearance" | "notifications" | "security" | "general";

const SECTIONS: { id: SectionId; label: string; icon: any; desc: string }[] = [
  { id: "appearance", label: "Appearance", icon: Palette, desc: "Theme and display" },
  { id: "notifications", label: "Notifications", icon: Bell, desc: "Alerts and sounds" },
  { id: "security", label: "Security", icon: Shield, desc: "Password and access" },
  { id: "general", label: "General", icon: Globe, desc: "Language, data, support" },
];

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { currency, setCurrency, enabledCurrencies } = useCurrency();
  const { language, setLanguage: setLang, t } = useLanguage();
  const { rootProps } = useProfileAppearance();

  const [mode, setMode] = useState<"dark" | "light">("dark");
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [displayPrefs, setDisplayPrefs] = useState<DisplayPrefs>(defaultDisplayPrefs);
  const [section, setSection] = useState<SectionId>("appearance");

  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [twoFactorOpen, setTwoFactorOpen] = useState(false);
  const [sessionsOpen, setSessionsOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const callExport = useServerFn(exportOwnData);
  const callDelete = useServerFn(deleteOwnAccount);

  const handleExportData = async () => {
    setExporting(true);
    try {
      const data = await callExport({ data: undefined as any });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Data exported" });
    } catch (e: any) {
      toast({ title: "Export failed", description: e?.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  // Hydrate display prefs from localStorage immediately on mount for instant apply
  useEffect(() => {
    try {
      const raw = localStorage.getItem("displayPrefs");
      if (raw) {
        const parsed = { ...defaultDisplayPrefs, ...JSON.parse(raw) };
        setDisplayPrefs(parsed);
        applyDisplayPrefs(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("preferences").eq("id", user.id).single().then(({ data }) => {
      if (data?.preferences) {
        const prefs = data.preferences as Record<string, any>;
        if (prefs.mode) setMode(prefs.mode);
        if (prefs.notifPrefs) {
          const merged = { ...defaultNotifPrefs, ...prefs.notifPrefs };
          setNotifPrefs(merged);
          setNotificationSoundEnabled(merged.sound);
        }
        if (prefs.displayPrefs) {
          const merged = { ...defaultDisplayPrefs, ...prefs.displayPrefs };
          setDisplayPrefs(merged);
          applyDisplayPrefs(merged);
          try { localStorage.setItem("displayPrefs", JSON.stringify(merged)); } catch {}
        }
      }
    });
  }, [user]);

  const updateDisplayPref = (key: keyof DisplayPrefs) => {
    const updated = { ...displayPrefs, [key]: !displayPrefs[key] };
    setDisplayPrefs(updated);
    applyDisplayPrefs(updated);
    try { localStorage.setItem("displayPrefs", JSON.stringify(updated)); } catch {}
    if (key === "haptics" && updated.haptics && "vibrate" in navigator) navigator.vibrate?.(15);
    savePrefs({ displayPrefs: updated });
  };

  const savePrefs = async (prefs: Record<string, any>) => {
    if (!user) return;
    const current = (await supabase.from("profiles").select("preferences").eq("id", user.id).single())
      .data?.preferences as Record<string, any> || {};
    const updated = { ...current, ...prefs };
    await supabase.from("profiles").update({ preferences: updated }).eq("id", user.id);
    toast({ title: "Settings saved" });
  };

  const toggleMode = () => {
    const newMode = mode === "dark" ? "light" : "dark";
    setMode(newMode);
    savePrefs({ mode: newMode });
  };

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushLastUsed, setPushLastUsed] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getPushStatus(user.id).then((s) => {
      setPushSubscribed(s.subscribed);
      setPushLastUsed(s.lastUsedAt);
    });
  }, [user]);

  const togglePushSubscription = async () => {
    if (!user || pushBusy) return;
    if (!pushSupported()) {
      toast({ title: "Not supported", description: "Push isn't available in this browser.", variant: "destructive" });
      return;
    }
    setPushBusy(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush(user.id);
        setPushSubscribed(false);
        setPushLastUsed(null);
        toast({ title: "Push notifications disabled" });
      } else {
        const ok = await subscribeToPush(user.id);
        if (ok) {
          const s = await getPushStatus(user.id);
          setPushSubscribed(s.subscribed);
          setPushLastUsed(s.lastUsedAt);
          toast({ title: "Push notifications enabled" });
        } else {
          toast({ title: "Permission denied", variant: "destructive" });
        }
      }
    } finally {
      setPushBusy(false);
    }
  };

  const [soundStyle, setSoundStyle] = useState<NotificationSoundStyle>("chime");
  const [soundVolume, setSoundVolume] = useState<number>(0.5);
  useEffect(() => {
    setSoundStyle(getNotificationSoundStyle());
    setSoundVolume(getNotificationSoundVolume());
  }, []);

  const updateNotifPref = (key: keyof NotifPrefs) => {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(updated);
    savePrefs({ notifPrefs: updated });
    if (key === "sound") setNotificationSoundEnabled(updated.sound);
  };

  const changeSoundStyle = (style: NotificationSoundStyle) => {
    setSoundStyle(style);
    setNotificationSoundStyle(style);
    previewNotificationSound(style);
  };
  const changeSoundVolume = (v: number) => {
    setSoundVolume(v);
    setNotificationSoundVolume(v);
  };

  const handleChangePassword = async () => {
    if (!currentPassword) { toast({ title: "Enter your current password", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "New password must be at least 8 characters", variant: "destructive" }); return; }
    if (newPassword === currentPassword) { toast({ title: "Pick a new password different from the current one", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Passwords don't match", variant: "destructive" }); return; }
    setPasswordLoading(true);
    // Reauthenticate first
    const email = user?.email;
    if (!email) { setPasswordLoading(false); toast({ title: "Not signed in", variant: "destructive" }); return; }
    const { error: reErr } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
    if (reErr) { setPasswordLoading(false); toast({ title: "Current password is incorrect", variant: "destructive" }); return; }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Password updated", description: "Use your new password next time you sign in." });
    setChangePasswordOpen(false);
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await callDelete({ data: undefined as any });
      toast({ title: "Account deleted" });
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast({ title: "Couldn't delete account", description: e?.message || "Try again later", variant: "destructive" });
    } finally {
      setDeleting(false);
      setDeleteAccountOpen(false);
    }
  };

  const isTabletOrBelow = useIsTabletOrBelow();

  if (isTabletOrBelow) {
    return (
      <>
        <div {...rootProps}>
          <MobileSettingsShell
            user={user}
            mode={mode}
            toggleMode={toggleMode}
            notifPrefs={notifPrefs}
            updateNotifPref={updateNotifPref}
            pushSubscribed={pushSubscribed}
            pushBusy={pushBusy}
            pushLastUsed={pushLastUsed}
            togglePushSubscription={togglePushSubscription}
            soundStyle={soundStyle}
            changeSoundStyle={changeSoundStyle}
            soundVolume={soundVolume}
            changeSoundVolume={changeSoundVolume}
            previewSound={() => previewNotificationSound(soundStyle)}
            language={language}
            setLang={setLang}
            ALL_LANGUAGES={ALL_LANGUAGES}
            currency={currency}
            setCurrency={setCurrency}
            enabledCurrencies={enabledCurrencies}
            setChangePasswordOpen={setChangePasswordOpen}
            setDeleteAccountOpen={setDeleteAccountOpen}
            displayPrefs={displayPrefs}
            updateDisplayPref={updateDisplayPref}
            t={t}
            openTwoFactor={() => setTwoFactorOpen(true)}
            openSessions={() => setSessionsOpen(true)}
            exportData={handleExportData}
            exporting={exporting}
            openPrivacy={() => navigate({ to: "/page/$slug", params: { slug: "privacy" } })}
            openHelp={() => navigate({ to: "/page/$slug", params: { slug: "faq" } })}
            openSupport={() => navigate({ to: "/support" })}
          />
        </div>
        {/* Dialogs */}
        <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Change password</DialogTitle>
              <DialogDescription>Enter your new password below</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Current password</Label>
                <Input type="password" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password" className="rounded-xl" autoComplete="current-password" />
              </div>
              <div className="space-y-1.5">
                <Label>New password</Label>
                <div className="relative">
                  <Input type={showPassword ? "text" : "password"} value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 8 characters" className="rounded-xl pr-10" autoComplete="new-password" />
                  <button onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Confirm password</Label>
                <Input type="password" value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password" className="rounded-xl" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setChangePasswordOpen(false)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-xl">
                {passwordLoading ? "..." : "Update password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="w-5 h-5" /> Delete account
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. All your data, orders, and preferences will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} className="rounded-xl">Cancel</Button>
              <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="rounded-xl">
                {deleting ? "Deleting…" : "Delete my account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <TwoFactorDialog open={twoFactorOpen} onOpenChange={setTwoFactorOpen} />
        <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
      </>
    );
  }

  return (
    <div {...rootProps} className="min-h-screen pb-24 lg:pb-12 relative">
      {/* Ambient cover */}
      <div className="absolute inset-x-0 top-0 h-[360px] -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/15 via-primary/5 to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.2),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
      </div>

      <main className="container mx-auto px-3 sm:px-6 pt-10 sm:pt-16 pb-8 max-w-6xl relative">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">Control center</p>
          <h1 className="text-3xl sm:text-4xl font-bold font-display text-foreground">{t("nav.settings") || "Settings"}</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Manage preferences, security, and notifications</p>
        </motion.div>

        {/* Section tiles */}
        <motion.section
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5"
        >
          {SECTIONS.map((s) => {
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`text-left rounded-3xl p-4 sm:p-5 transition-all group relative overflow-hidden ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xl shadow-primary/20"
                    : "glass hover:border-primary/40"
                }`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-3 ${
                  active ? "bg-primary-foreground/15" : "bg-primary/10"
                }`}>
                  <s.icon className={`w-5 h-5 ${active ? "text-primary-foreground" : "text-primary"}`} />
                </div>
                <p className={`text-sm font-semibold ${active ? "text-primary-foreground" : "text-foreground"}`}>{s.label}</p>
                <p className={`text-xs mt-0.5 ${active ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{s.desc}</p>
              </button>
            );
          })}
        </motion.section>

        {/* Content bento */}
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
        >
          {section === "appearance" && (
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 md:col-span-6 glass-strong rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold font-display text-foreground">Display Mode</h2>
                  <Sparkles className="w-4 h-4 text-primary/60" />
                </div>
                <ToggleRow
                  icon={mode === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
                  label={t("settings.darkMode") || "Dark mode"}
                  desc={mode === "dark" ? "Currently dark" : "Currently light"}
                  checked={mode === "dark"} onChange={toggleMode}
                />
              </div>
              <div className="col-span-12 md:col-span-6 glass rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground">Theme</h2>
                <p className="text-sm text-muted-foreground">
                  The site-wide accent color and typography are configured by the administrator and apply to your profile automatically.
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <div className="w-8 h-8 rounded-xl bg-primary shadow-sm" />
                  <div className="w-8 h-8 rounded-xl bg-secondary border border-border" />
                  <div className="w-8 h-8 rounded-xl bg-muted border border-border" />
                  <div className="w-8 h-8 rounded-xl bg-accent border border-border" />
                </div>
              </div>
              <div className="col-span-12 glass-strong rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Display options</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <ToggleRow icon={<Maximize2 className="w-4 h-4 text-primary" />}
                    label="Compact layout" desc="Tighter spacing across the app"
                    checked={displayPrefs.compact} onChange={() => updateDisplayPref("compact")} />
                  <ToggleRow icon={<Type className="w-4 h-4 text-primary" />}
                    label="Larger text" desc="Increase base font size"
                    checked={displayPrefs.largerText} onChange={() => updateDisplayPref("largerText")} />
                  <ToggleRow icon={<Contrast className="w-4 h-4 text-primary" />}
                    label="High contrast" desc="Sharper borders and text"
                    checked={displayPrefs.highContrast} onChange={() => updateDisplayPref("highContrast")} />
                  <ToggleRow icon={<Zap className="w-4 h-4 text-primary" />}
                    label="Reduce motion" desc="Minimize animations and transitions"
                    checked={displayPrefs.reduceMotion} onChange={() => updateDisplayPref("reduceMotion")} />
                  <ToggleRow icon={<PlayCircle className="w-4 h-4 text-primary" />}
                    label="Autoplay media" desc="Auto-start videos and carousels"
                    checked={displayPrefs.autoplay} onChange={() => updateDisplayPref("autoplay")} />
                  <ToggleRow icon={<Vibrate className="w-4 h-4 text-primary" />}
                    label="Haptic feedback" desc="Vibration feedback on touch devices"
                    checked={displayPrefs.haptics} onChange={() => updateDisplayPref("haptics")} />
                </div>
              </div>
            </div>
          )}

          {section === "notifications" && (
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 lg:col-span-7 glass-strong rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Channels</h2>
                <ToggleRow icon={<BellRing className="w-4 h-4 text-primary" />}
                  label={pushBusy ? "Updating…" : "Push notifications"}
                  desc={pushSubscribed
                    ? `Enabled · last sync ${pushLastUsed ? new Date(pushLastUsed).toLocaleString() : "just now"}`
                    : "Alerts even when the app is closed"}
                  checked={pushSubscribed} onChange={togglePushSubscription} />
                <ToggleRow icon={<Bell className="w-4 h-4 text-primary" />}
                  label="In-app notifications" desc="Notifications inside the app"
                  checked={notifPrefs.push} onChange={() => updateNotifPref("push")} />
                <ToggleRow icon={<Mail className="w-4 h-4 text-primary" />}
                  label="Email notifications" desc="Get updates via email"
                  checked={notifPrefs.email} onChange={() => updateNotifPref("email")} />
                <ToggleRow icon={notifPrefs.sound ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-primary" />}
                  label="Sound" desc="Notification sounds"
                  checked={notifPrefs.sound} onChange={() => updateNotifPref("sound")} />
              </div>

              <div className="col-span-12 lg:col-span-5 glass rounded-3xl p-6 space-y-4">
                <h2 className="text-lg font-semibold font-display text-foreground">Sound style</h2>
                <div className={`grid grid-cols-2 gap-2 ${!notifPrefs.sound ? "opacity-50 pointer-events-none" : ""}`}>
                  {(["chime", "ping", "pop", "bell"] as NotificationSoundStyle[]).map((s) => (
                    <button key={s} onClick={() => changeSoundStyle(s)}
                      className={`p-3 rounded-2xl border text-sm capitalize transition-all ${soundStyle === s ? "border-primary bg-primary/10 text-foreground" : "border-border hover:border-primary/30 text-muted-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <div className={!notifPrefs.sound ? "opacity-50 pointer-events-none" : ""}>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs text-muted-foreground">Volume</Label>
                    <span className="text-xs text-muted-foreground tabular-nums">{Math.round(soundVolume * 100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.05}
                    value={soundVolume}
                    onChange={(e) => changeSoundVolume(parseFloat(e.target.value))}
                    onMouseUp={() => previewNotificationSound(soundStyle)}
                    onTouchEnd={() => previewNotificationSound(soundStyle)}
                    className="w-full accent-primary" />
                </div>
                <Button variant="outline" size="sm" className="rounded-xl" disabled={!notifPrefs.sound}
                  onClick={() => previewNotificationSound(soundStyle)}>
                  <Volume2 className="w-4 h-4 mr-1.5" /> Preview
                </Button>
              </div>

              <div className="col-span-12 glass-strong rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Categories</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <ToggleRow icon={<Package className="w-4 h-4 text-primary" />} label="Order updates" desc="Shipping, delivery status"
                    checked={notifPrefs.orders} onChange={() => updateNotifPref("orders")} />
                  <ToggleRow icon={<Tag className="w-4 h-4 text-primary" />} label="Promotions & deals" desc="Sales, coupons, flash deals"
                    checked={notifPrefs.promotions} onChange={() => updateNotifPref("promotions")} />
                  <ToggleRow icon={<Megaphone className="w-4 h-4 text-primary" />} label="Announcements" desc="Store news and updates"
                    checked={notifPrefs.announcements} onChange={() => updateNotifPref("announcements")} />
                  <ToggleRow icon={<TrendingUp className="w-4 h-4 text-primary" />} label="Price drop alerts" desc="When wishlist items go on sale"
                    checked={notifPrefs.priceDrops} onChange={() => updateNotifPref("priceDrops")} />
                  <ToggleRow icon={<ShoppingBag className="w-4 h-4 text-primary" />} label="Restock alerts" desc="When out-of-stock items return"
                    checked={notifPrefs.restockAlerts} onChange={() => updateNotifPref("restockAlerts")} />
                </div>
              </div>
            </div>
          )}

          {section === "security" && (
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 lg:col-span-8 glass-strong rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Account security</h2>
                <button onClick={() => setChangePasswordOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Lock className="w-4 h-4 text-primary" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Change password</p>
                      <p className="text-xs text-muted-foreground">Update your account password</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => setTwoFactorOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Smartphone className="w-4 h-4 text-primary" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Two-factor authentication</p>
                      <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => setSessionsOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Monitor className="w-4 h-4 text-primary" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Active sessions</p>
                      <p className="text-xs text-muted-foreground">Devices logged into your account</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="col-span-12 lg:col-span-4 rounded-3xl p-6 border border-destructive/30 bg-destructive/5 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <h2 className="text-lg font-semibold font-display text-destructive">Danger zone</h2>
                </div>
                <p className="text-xs text-muted-foreground">
                  Deleting your account is permanent and removes all data, orders, and preferences.
                </p>
                <Button variant="destructive" onClick={() => setDeleteAccountOpen(true)} className="rounded-xl w-full gap-2">
                  <Trash2 className="w-4 h-4" /> Delete account
                </Button>
              </div>
            </div>
          )}

          {section === "general" && (
            <div className="grid grid-cols-12 gap-3 sm:gap-4">
              <div className="col-span-12 glass-strong rounded-3xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Languages className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold font-display text-foreground">{t("settings.language") || "Language"}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {ALL_LANGUAGES.map((l) => (
                    <button key={l.code} onClick={() => setLang(l.code)}
                      className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${language === l.code ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{l.nativeLabel}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.label}</p>
                      </div>
                      {language === l.code && <Badge variant="secondary" className="text-[10px] flex-shrink-0">✓</Badge>}
                    </button>
                  ))}
                </div>
              </div>

              {enabledCurrencies.length > 1 && (
                <div className="col-span-12 lg:col-span-6 glass-strong rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-primary" />
                    <h2 className="text-lg font-semibold font-display text-foreground">{t("settings.currency") || "Currency"}</h2>
                  </div>
                  <p className="text-xs text-muted-foreground">Preferred currency for displaying prices</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {enabledCurrencies.map((c) => (
                      <button key={c.code} onClick={() => setCurrency(c.code)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${currency === c.code ? "border-primary bg-primary/10" : "border-border hover:border-primary/30"}`}>
                        <span className="text-xl font-display">{c.symbol}</span>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium text-foreground">{c.code}</p>
                          <p className="text-xs text-muted-foreground truncate">{c.name}</p>
                        </div>
                        {currency === c.code && <Badge variant="secondary" className="text-[10px]">✓</Badge>}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className={`col-span-12 ${enabledCurrencies.length > 1 ? "lg:col-span-6" : ""} glass rounded-3xl p-6 space-y-2`}>
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Data & privacy</h2>
                <button onClick={handleExportData} disabled={exporting}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors disabled:opacity-60">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Download className="w-4 h-4 text-primary" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">{exporting ? "Preparing…" : "Download my data"}</p>
                      <p className="text-xs text-muted-foreground">Export your personal data as JSON</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
                <button onClick={() => navigate({ to: "/page/$slug", params: { slug: "privacy" } })}
                  className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><FileText className="w-4 h-4 text-primary" /></div>
                    <div className="text-left">
                      <p className="text-sm font-medium text-foreground">Privacy policy</p>
                      <p className="text-xs text-muted-foreground">Review our terms</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="col-span-12 glass-strong rounded-3xl p-6 space-y-2">
                <h2 className="text-lg font-semibold font-display text-foreground mb-2">Support</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <button onClick={() => navigate({ to: "/page/$slug", params: { slug: "faq" } })}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><HelpCircle className="w-4 h-4 text-primary" /></div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Help center</p>
                        <p className="text-xs text-muted-foreground">FAQs and guides</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                  <button onClick={() => navigate({ to: "/support" })}
                    className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-secondary/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><MessageSquare className="w-4 h-4 text-primary" /></div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">Contact support</p>
                        <p className="text-xs text-muted-foreground">Get help from our team</p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="p-3 flex items-center gap-3 border-t border-border/40 mt-2 pt-4">
                  <Info className="w-4 h-4 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">App version 2.0.0</p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Enter your new password below</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Current password</Label>
              <Input type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password" className="rounded-xl" autoComplete="current-password" />
            </div>
            <div className="space-y-1.5">
              <Label>New password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 8 characters" className="rounded-xl pr-10" autoComplete="new-password" />
                <button onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm password</Label>
              <Input type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password" className="rounded-xl" />
            </div>
            {newPassword && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Password strength</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${newPassword.length >= i * 3 ? (newPassword.length >= 12 ? "bg-green-500" : newPassword.length >= 8 ? "bg-yellow-500" : "bg-red-500") : "bg-muted"}`} />
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChangePasswordOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleChangePassword} disabled={passwordLoading} className="rounded-xl">
              {passwordLoading
                ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                : "Update password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> Delete account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data, orders, and preferences will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteAccountOpen(false)} className="rounded-xl">Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount} disabled={deleting} className="rounded-xl">
              {deleting ? "Deleting…" : "Delete my account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TwoFactorDialog open={twoFactorOpen} onOpenChange={setTwoFactorOpen} />
      <SessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />
    </div>
  );
};

export default SettingsPage;
