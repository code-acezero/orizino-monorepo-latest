"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import {
  getEmailProviderSettings,
  updateEmailProviderSettings,
  verifyResendKey,
  sendProviderTestEmail,
  getEmailProviderStats,
} from "@/lib/email-provider.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { toast } from "@/lib/app-toast";
import {
  AtSign,
  CheckCircle2,
  XCircle,
  Copy,
  Send,
  ShieldCheck,
  Activity,
  ExternalLink,
  KeyRound,
  RefreshCw,
  Plus,
  Trash2,
  Star,
  Users,
} from "lucide-react";

type Sender = {
  id: string;
  category: string;
  label: string;
  from_name: string;
  from_email: string;
  reply_to?: string | null;
  is_default?: boolean;
};

const ORIZINO_DEFAULTS = {
  from_email: "team@orizino.com",
  from_name: "Orizino",
  reply_to: "contact.orizino@gmail.com",
  footer_address: "Orizino Co.",
  tracking_opens: true,
  tracking_clicks: true,
  senders: [
    { id: "s_team", category: "team", label: "Universal default (team)", from_name: "Orizino", from_email: "team@orizino.com", reply_to: "contact.orizino@gmail.com", is_default: true },
    { id: "s_updates", category: "updates", label: "Product updates & newsletters", from_name: "Orizino Updates", from_email: "updates@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_contact", category: "contact", label: "Contact & support replies", from_name: "Orizino Support", from_email: "contact@orizino.com", reply_to: "contact.orizino@gmail.com" },
    { id: "s_admin", category: "admin", label: "Admin / transactional", from_name: "Orizino Admin", from_email: "admin-name@orizino.com", reply_to: "contact.orizino@gmail.com" },
  ] as Sender[],
};

export default function AdminEmailProvider() {
  const getSettings = useServerFn(getEmailProviderSettings);
  const saveSettings = useServerFn(updateEmailProviderSettings);
  const verify = useServerFn(verifyResendKey);
  const sendTest = useServerFn(sendProviderTestEmail);
  const getStats = useServerFn(getEmailProviderStats);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["email-provider"], queryFn: () => getSettings() });
  const { data: stats } = useQuery({ queryKey: ["email-provider-stats"], queryFn: () => getStats() });

  const [form, setForm] = useState<{
    from_email: string;
    from_name: string;
    reply_to: string;
    footer_address: string;
    tracking_opens: boolean;
    tracking_clicks: boolean;
    senders: Sender[];
  } | null>(null);
  const [testTo, setTestTo] = useState("");
  const [domains, setDomains] = useState<any[] | null>(null);
  const [epTab, setEpTab] = useTabParam("sender", "/origin/email-provider");

  // hydrate form once settings load
  if (data && !form) {
    const s: any = data.settings ?? {};
    const hasAny = s && Object.keys(s).length > 0;
    setForm({
      from_email: s.from_email ?? (hasAny ? "" : ORIZINO_DEFAULTS.from_email),
      from_name: s.from_name ?? (hasAny ? "" : ORIZINO_DEFAULTS.from_name),
      reply_to: s.reply_to ?? (hasAny ? "" : ORIZINO_DEFAULTS.reply_to),
      footer_address: s.footer_address ?? (hasAny ? "" : ORIZINO_DEFAULTS.footer_address),
      tracking_opens: s.tracking_opens ?? true,
      tracking_clicks: s.tracking_clicks ?? true,
      senders: Array.isArray(s.senders) && s.senders.length ? s.senders : ORIZINO_DEFAULTS.senders,
    });
  }

  const saveMut = useMutation({
    mutationFn: () => saveSettings({ data: form! }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["email-provider"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const verifyMut = useMutation({
    mutationFn: () => verify(),
    onSuccess: (r: any) => {
      if (r.ok) {
        setDomains(r.domains);
        toast.success(r.domains?.length ? `Verified — ${r.domains.length} domain(s)` : "Key works, no domains yet");
      } else {
        toast.error(r.error || "Verification failed");
      }
    },
  });

  const testMut = useMutation({
    mutationFn: () => sendTest({ data: { to: testTo, subject: "Test from Resend integration" } }),
    onSuccess: (r: any) => (r.ok ? toast.success("Test sent — check the inbox") : toast.error(r.error || "Send failed")),
    onError: (e: any) => toast.error(e?.message ?? "Send failed"),
  });

  const copy = (s: string) => {
    navigator.clipboard.writeText(s);
    toast.success("Copied");
  };

  if (isLoading || !form || !data) {
    return <div className="p-8 text-muted-foreground">Loading…</div>;
  }

  const { env, urls } = data;

  return (
    <div className="container max-w-5xl mx-auto py-6 px-4 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <AtSign className="size-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Email Provider — Resend</h1>
            <p className="text-sm text-muted-foreground">
              API keys, sender identity, webhooks and live deliverability stats.
            </p>
          </div>
        </div>
      </header>

      {/* Status strip */}
      <div className="grid sm:grid-cols-3 gap-3">
        <StatusPill
          label="Resend API key"
          ok={env.resendKeyConfigured}
          okText="Configured"
          badText="Missing"
        />
        <StatusPill
          label="Webhook secret"
          ok={env.webhookSecretConfigured}
          okText="Configured"
          badText="Not set"
        />
        <StatusPill
          label="Service role"
          ok={env.serviceRoleConfigured}
          okText="Configured"
          badText="Missing"
        />
      </div>

      <Tabs value={epTab} onValueChange={setEpTab}>
        <TabsList className="hidden">
          <TabsTrigger value="sender">Sender</TabsTrigger>
          <TabsTrigger value="senders">Senders</TabsTrigger>
          <TabsTrigger value="keys">API & Webhooks</TabsTrigger>
          <TabsTrigger value="test">Send test</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* Sender identity */}
        <TabsContent value="sender" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default sender identity</CardTitle>
              <CardDescription>Used by campaigns and automations unless overridden.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="From name">
                  <Input value={form.from_name} onChange={(e) => setForm({ ...form, from_name: e.target.value })} placeholder="Acme" />
                </Field>
                <Field label="From email">
                  <Input value={form.from_email} onChange={(e) => setForm({ ...form, from_email: e.target.value })} placeholder="hello@yourdomain.com" type="email" />
                </Field>
                <Field label="Reply-to (optional)">
                  <Input value={form.reply_to} onChange={(e) => setForm({ ...form, reply_to: e.target.value })} placeholder="support@yourdomain.com" type="email" />
                </Field>
                <Field label="Physical address (CAN-SPAM)">
                  <Input value={form.footer_address} onChange={(e) => setForm({ ...form, footer_address: e.target.value })} placeholder="123 Main St, City, Country" />
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Track opens</p>
                  <p className="text-xs text-muted-foreground">Inserts a 1x1 pixel into outgoing campaigns.</p>
                </div>
                <Switch checked={form.tracking_opens} onCheckedChange={(v) => setForm({ ...form, tracking_opens: v })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Track clicks</p>
                  <p className="text-xs text-muted-foreground">Wraps links so Resend records click events.</p>
                </div>
                <Switch checked={form.tracking_clicks} onCheckedChange={(v) => setForm({ ...form, tracking_clicks: v })} />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Senders management */}
        <TabsContent value="senders" className="space-y-4 pt-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="size-4" /> Sender identities
                </CardTitle>
                <CardDescription>
                  Map a category (e.g. <code className="text-xs px-1 bg-muted rounded">updates</code>,{" "}
                  <code className="text-xs px-1 bg-muted rounded">contact</code>,{" "}
                  <code className="text-xs px-1 bg-muted rounded">admin</code>) to a From address.
                  Email-sending code picks the sender by category; the marked default is used as a fallback.
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setForm({
                    ...form,
                    senders: [
                      ...form.senders,
                      {
                        id: `s_${Math.random().toString(36).slice(2, 8)}`,
                        category: "",
                        label: "",
                        from_name: "",
                        from_email: "",
                        reply_to: form.reply_to || "",
                      },
                    ],
                  })
                }
              >
                <Plus className="size-4 mr-1" /> Add sender
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.senders.length === 0 && (
                <p className="text-sm text-muted-foreground p-4 text-center border rounded-lg">
                  No senders configured. Click <strong>Add sender</strong> to create one.
                </p>
              )}
              {form.senders.map((s, idx) => (
                <div key={s.id} className="rounded-xl border p-4 space-y-3 bg-card/50">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={s.is_default ? "default" : "outline"}>
                        {s.is_default ? (
                          <>
                            <Star className="size-3 mr-1 fill-current" /> Default
                          </>
                        ) : (
                          "Sender"
                        )}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">{s.category || "—"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {!s.is_default && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const senders = form.senders.map((x, i) => ({ ...x, is_default: i === idx }));
                            setForm({ ...form, senders });
                          }}
                        >
                          <Star className="size-3 mr-1" /> Make default
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          const senders = form.senders.filter((_, i) => i !== idx);
                          setForm({ ...form, senders });
                        }}
                        aria-label="Remove sender"
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Category (slug)">
                      <Input
                        value={s.category}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, category: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, "") };
                          setForm({ ...form, senders });
                        }}
                        placeholder="updates"
                      />
                    </Field>
                    <Field label="Label">
                      <Input
                        value={s.label}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, label: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="Product updates"
                      />
                    </Field>
                    <Field label="From name">
                      <Input
                        value={s.from_name}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, from_name: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="Orizino Updates"
                      />
                    </Field>
                    <Field label="From email">
                      <Input
                        type="email"
                        value={s.from_email}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, from_email: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="team@orizino.com"
                      />
                    </Field>
                    <Field label="Reply-to (optional)">
                      <Input
                        type="email"
                        value={s.reply_to ?? ""}
                        onChange={(e) => {
                          const senders = [...form.senders];
                          senders[idx] = { ...s, reply_to: e.target.value };
                          setForm({ ...form, senders });
                        }}
                        placeholder="contact.orizino@gmail.com"
                      />
                    </Field>
                  </div>
                </div>
              ))}
              <div className="flex justify-end">
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                  {saveMut.isPending ? "Saving…" : "Save senders"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* API keys & webhooks */}
        <TabsContent value="keys" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <KeyRound className="size-4" /> API key
              </CardTitle>
              <CardDescription>
                Stored as the project secret <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_API_KEY</code>. Never exposed to the browser.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  {env.resendKeyConfigured ? (
                    <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                      <CheckCircle2 className="size-3 mr-1" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="size-3 mr-1" /> Not configured
                    </Badge>
                  )}
                  <span className="text-sm text-muted-foreground">RESEND_API_KEY</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => verifyMut.mutate()} disabled={!env.resendKeyConfigured || verifyMut.isPending}>
                  <RefreshCw className="size-3 mr-1" />
                  {verifyMut.isPending ? "Verifying…" : "Verify key"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add or rotate the key in Cloud → Settings → Secrets. After updating, click <strong>Verify key</strong>.
              </p>
              {domains && (
                <div className="rounded-lg border divide-y">
                  {domains.length === 0 && (
                    <p className="text-sm p-3 text-muted-foreground">
                      No domains in your Resend account yet. Add one at{" "}
                      <a href="https://resend.com/domains" target="_blank" rel="noopener noreferrer" className="text-primary underline">
                        resend.com/domains
                      </a>
                      .
                    </p>
                  )}
                  {domains.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 text-sm">
                      <div>
                        <p className="font-medium">{d.name}</p>
                        <p className="text-xs text-muted-foreground">{d.region}</p>
                      </div>
                      <Badge variant={d.status === "verified" ? "default" : "outline"}>{d.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="size-4" /> Webhook
              </CardTitle>
              <CardDescription>Add this endpoint in Resend → Webhooks to ingest delivery, open, click, bounce events.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <UrlRow label="Webhook URL" value={urls.webhook} onCopy={copy} />
              <UrlRow label="Unsubscribe URL" value={urls.unsubscribe} onCopy={copy} />
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Signing secret</p>
                  <p className="text-xs text-muted-foreground">
                    Stored as <code className="text-xs px-1 py-0.5 bg-muted rounded">RESEND_WEBHOOK_SECRET</code>. Used to verify incoming events.
                  </p>
                </div>
                {env.webhookSecretConfigured ? (
                  <Badge variant="default" className="bg-emerald-500/15 text-emerald-600 border-emerald-500/20">
                    <CheckCircle2 className="size-3 mr-1" /> Set
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-600">
                    Optional but recommended
                  </Badge>
                )}
              </div>
              <a
                href="https://resend.com/webhooks"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Open Resend webhooks <ExternalLink className="size-3" />
              </a>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Test send */}
        <TabsContent value="test" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Send className="size-4" /> Send a test email
              </CardTitle>
              <CardDescription>Uses your saved sender identity and the live Resend key.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Field label="Recipient email">
                <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
              </Field>
              <Button onClick={() => testMut.mutate()} disabled={!testTo || !env.resendKeyConfigured || testMut.isPending}>
                {testMut.isPending ? "Sending…" : "Send test"}
              </Button>
              {!env.resendKeyConfigured && (
                <p className="text-xs text-destructive">Set RESEND_API_KEY before sending tests.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stats */}
        <TabsContent value="stats" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="size-4" /> Last 30 days
              </CardTitle>
              <CardDescription>Aggregated from local delivery log (powered by Resend webhook events).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <Stat label="Sent" value={stats?.sent ?? 0} />
                <Stat label="Delivered" value={stats?.delivered ?? 0} />
                <Stat label="Opened" value={stats?.opened ?? 0} />
                <Stat label="Clicked" value={stats?.clicked ?? 0} />
                <Stat label="Bounced" value={stats?.bounced ?? 0} tone="warn" />
                <Stat label="Suppressed" value={stats?.suppressed ?? 0} tone="warn" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function StatusPill({ label, ok, okText, badText }: { label: string; ok: boolean; okText: string; badText: string }) {
  return (
    <div className="rounded-xl border p-3 flex items-center justify-between bg-card">
      <div>
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-medium mt-0.5">{ok ? okText : badText}</p>
      </div>
      {ok ? (
        <CheckCircle2 className="size-5 text-emerald-500" />
      ) : (
        <XCircle className="size-5 text-destructive" />
      )}
    </div>
  );
}

function UrlRow({ label, value, onCopy }: { label: string; value: string; onCopy: (s: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button variant="outline" size="icon" onClick={() => onCopy(value)} aria-label={`Copy ${label}`}>
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warn" }) {
  return (
    <div className={`rounded-xl border p-4 ${tone === "warn" ? "bg-amber-500/5" : "bg-card"}`}>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value.toLocaleString()}</p>
    </div>
  );
}
