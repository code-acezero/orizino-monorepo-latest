"use client";
import React, { useState, useEffect } from "react";
import { Navigate, useNavigate, useLocation } from "@/lib/router-compat";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/app-toast";
import { storefrontHref } from "@/lib/cross-app-urls";

type Mode = "signin" | "forgot" | "forgot_sent";

const inputBase =
  "w-full h-10 bg-muted/40 border border-border/60 rounded-lg pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/60 focus:border-primary/60 transition-all";

export default function AdminAuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from || "/";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Restore remembered admin email
  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("admin_auth_email") : null;
    if (saved) setEmail(saved);
  }, []);

  if (user) return <Navigate to={from} replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw err;
      localStorage.setItem("admin_auth_email", email);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message ?? "Sign in failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
      });
      if (err) throw err;
      setMode("forgot_sent");
    } catch (err: any) {
      setError(err.message ?? "Could not send reset email.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden px-4">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-80 h-80 rounded-full bg-primary/3 blur-[80px]" />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[420px]"
      >
        {/* Card */}
        <div className="bg-card/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-[0_40px_100px_-20px_hsl(var(--primary)/0.15)]">
          {/* Header bar */}
          <div className="flex items-center gap-3 px-8 pt-8 pb-6 border-b border-border/40">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.25em] text-primary/70 font-semibold font-mono">
                Admin Access
              </p>
              <h1 className="text-base font-display font-semibold text-foreground tracking-tight leading-tight">
                Origin Control Panel
              </h1>
            </div>
          </div>

          {/* Form body */}
          <div className="px-8 py-7">
            <AnimatePresence mode="wait">
              {/* SIGN IN */}
              {mode === "signin" && (
                <motion.form
                  key="signin"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleSignIn}
                  className="space-y-4"
                >
                  <div>
                    <p className="text-sm text-muted-foreground leading-snug">
                      Sign in with your admin credentials. Unauthorised access is logged and monitored.
                    </p>
                  </div>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {error}
                    </motion.div>
                  )}

                  <div className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <input
                        type="email"
                        placeholder="Admin email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="username"
                        className={inputBase}
                      />
                    </div>

                    <div className="relative">
                      <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className={`${inputBase} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => { setMode("forgot"); setError(null); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>Sign In <ArrowRight className="w-4 h-4" /></>
                    )}
                  </motion.button>
                </motion.form>
              )}

              {/* FORGOT */}
              {mode === "forgot" && (
                <motion.form
                  key="forgot"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleForgot}
                  className="space-y-4"
                >
                  <div>
                    <h2 className="text-base font-display font-semibold text-foreground">Reset password</h2>
                    <p className="text-sm text-muted-foreground mt-1 leading-snug">
                      Enter your admin email and we'll send a secure reset link.
                    </p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {error}
                    </div>
                  )}

                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                    <input
                      type="email"
                      placeholder="Admin email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className={inputBase}
                    />
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-11 rounded-xl bg-foreground text-background text-sm font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed transition-opacity"
                  >
                    {loading ? (
                      <span className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
                    ) : "Send Reset Link"}
                  </motion.button>

                  <button
                    type="button"
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="block mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </motion.form>
              )}

              {/* FORGOT SENT */}
              {mode === "forgot_sent" && (
                <motion.div
                  key="sent"
                  initial={{ opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 text-center py-2"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/15 mx-auto">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-base font-display font-semibold text-foreground">Check your inbox</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Reset link sent to <span className="text-foreground font-medium">{email}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => { setMode("signin"); setError(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to sign in
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-between px-1">
          <p className="text-[11px] text-muted-foreground/50 font-mono uppercase tracking-widest">
            Restricted Area
          </p>
          <a
            href={storefrontHref("/")}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            ← Visit Store
          </a>
        </div>
      </motion.div>
    </div>
  );
}
