"use client";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/app-toast";
import { KeyRound, Plus, Trash2, Shield, CheckCircle2, XCircle, Loader2 } from "lucide-react";

type FallbackCfg = { enabled: boolean; keys: string[] };
type KeyStatus = { state: "idle" | "testing" | "ok" | "fail"; message?: string };

const DEFAULTS: FallbackCfg = { enabled: false, keys: [] };
const TEST_MODEL = "gemini-flash-latest";

async function testGeminiKey(key: string): Promise<{ ok: boolean; message: string }> {
  const trimmed = key.trim();
  if (!trimmed) return { ok: false, message: "Empty key" };
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${TEST_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-goog-api-key": trimmed },
        body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
      },
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok) {
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || "OK";
      return { ok: true, message: `OK — ${String(text).slice(0, 40)}` };
    }
    const err = json?.error?.message || `HTTP ${res.status}`;
    return { ok: false, message: err };
  } catch (e: any) {
    return { ok: false, message: e?.message || "Network error" };
  }
}

/**
 * Admin panel: configure custom Google Gemini API keys that take over when
 * the default Lovable AI Gateway returns 402/429/5xx. Keys are tried in order
 * from top to bottom until one succeeds.
 */
export default function GeminiFallbackPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState<FallbackCfg>(DEFAULTS);

  const { data } = useQuery({
    queryKey: ["gemini-fallback-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "gemini_fallback_config")
        .maybeSingle();
      const raw: any = data?.value ?? {};
      const cfg = raw && typeof raw === "object" && "value" in raw ? raw.value : raw;
      return {
        enabled: !!cfg?.enabled,
        keys: Array.isArray(cfg?.keys) ? cfg.keys.map((k: any) => String(k)) : [],
      } as FallbackCfg;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const cleaned = { enabled: form.enabled, keys: form.keys.map((k) => k.trim()).filter(Boolean) };
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: "gemini_fallback_config", value: cleaned as any, updated_at: new Date().toISOString() },
          { onConflict: "key" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["gemini-fallback-config"] });
      toast.success("Gemini fallback configuration saved");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const [statuses, setStatuses] = useState<Record<number, KeyStatus>>({});
  const setStatus = (i: number, s: KeyStatus) =>
    setStatuses((p) => ({ ...p, [i]: s }));

  const addKey = () => setForm((p) => ({ ...p, keys: [...p.keys, ""] }));
  const updateKey = (i: number, v: string) => {
    setForm((p) => ({ ...p, keys: p.keys.map((k, idx) => (idx === i ? v : k)) }));
    setStatus(i, { state: "idle" });
  };
  const removeKey = (i: number) => {
    setForm((p) => ({ ...p, keys: p.keys.filter((_, idx) => idx !== i) }));
    setStatuses((p) => {
      const n = { ...p };
      delete n[i];
      return n;
    });
  };

  const runTest = async (i: number) => {
    setStatus(i, { state: "testing" });
    const r = await testGeminiKey(form.keys[i] || "");
    setStatus(i, { state: r.ok ? "ok" : "fail", message: r.message });
    if (r.ok) toast.success(`Key #${i + 1} works`);
    else toast.error(`Key #${i + 1}: ${r.message}`);
  };

  const testAll = async () => {
    for (let i = 0; i < form.keys.length; i++) {
      // eslint-disable-next-line no-await-in-loop
      await runTest(i);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <KeyRound className="w-5 h-5" /> Custom Gemini API Fallback
        </CardTitle>
        <CardDescription>
          If the default Lovable AI Gateway is rate-limited, out of credits, or unreachable, the chat
          will silently retry against your own Google Gemini API keys in the order shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-border/60 p-3">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium">Enable fallback chain</p>
              <p className="text-xs text-muted-foreground">
                When off, only the Lovable AI Gateway is used.
              </p>
            </div>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">API keys (tried top → bottom)</p>
            <div className="flex gap-2">
              {form.keys.length > 0 && (
                <Button type="button" size="sm" variant="outline" onClick={testAll} className="gap-1.5">
                  Test all
                </Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={addKey} className="gap-1.5">
                <Plus className="w-3.5 h-3.5" /> Add key
              </Button>
            </div>
          </div>
          {form.keys.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              No keys yet. Get one from{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline"
              >
                Google AI Studio
              </a>
              .
            </p>
          )}
          {form.keys.map((k, i) => {
            const st = statuses[i] || { state: "idle" as const };
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-muted-foreground w-6 text-center">#{i + 1}</span>
                  <Input
                    type="password"
                    value={k}
                    onChange={(e) => updateKey(i, e.target.value)}
                    placeholder="AIza..."
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => runTest(i)}
                    disabled={st.state === "testing" || !k.trim()}
                    className="gap-1.5 min-w-[88px]"
                  >
                    {st.state === "testing" ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : st.state === "ok" ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : st.state === "fail" ? (
                      <XCircle className="w-3.5 h-3.5 text-destructive" />
                    ) : null}
                    Test
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => removeKey(i)}
                    aria-label="Remove key"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
                {st.state === "fail" && st.message && (
                  <p className="text-[11px] text-destructive pl-8">{st.message}</p>
                )}
                {st.state === "ok" && st.message && (
                  <p className="text-[11px] text-emerald-600 pl-8">{st.message}</p>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save fallback config"}
          </Button>
        </div>

        <p className="text-[11px] text-muted-foreground">
          Keys are stored in <code className="text-foreground">site_settings</code> and only read
          server-side by the AI chat edge function. They are never sent to the browser.
        </p>
      </CardContent>
    </Card>
  );
}
