"use client";
import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTabParam } from "@/hooks/use-tab-param";
import { TabsWithParam } from "@/components/admin/TabsWithParam";
import { toast } from "@/hooks/use-toast";
import {
  Loader2, RefreshCw, Truck, Package, Key, Eye, EyeOff, CheckCircle2, XCircle, Save,
} from "lucide-react";
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

type PathaoConfig = {
  environment?: "sandbox" | "live";
  sandbox_store_id?: number;
  live_store_id?: number;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "hsl(45 90% 55%)",
  in_review: "hsl(220 70% 55%)",
  pickup_requested: "hsl(220 70% 55%)",
  picked: "hsl(30 80% 55%)",
  in_transit: "hsl(260 70% 60%)",
  out_for_delivery: "hsl(var(--primary))",
  delivered: "hsl(142 70% 45%)",
  partial_delivered: "hsl(142 50% 55%)",
  returned: "hsl(var(--destructive))",
  cancelled: "hsl(var(--muted-foreground))",
  hold: "hsl(0 60% 55%)",
};

const SECRET_FIELDS: { provider: "pathao" | "steadfast"; key: string; label: string }[] = [
  { provider: "pathao", key: "PATHAO_SANDBOX_CLIENT_ID", label: "Sandbox Client ID" },
  { provider: "pathao", key: "PATHAO_SANDBOX_CLIENT_SECRET", label: "Sandbox Client Secret" },
  { provider: "pathao", key: "PATHAO_SANDBOX_USERNAME", label: "Sandbox Username" },
  { provider: "pathao", key: "PATHAO_SANDBOX_PASSWORD", label: "Sandbox Password" },
  { provider: "pathao", key: "PATHAO_LIVE_CLIENT_ID", label: "Live Client ID" },
  { provider: "pathao", key: "PATHAO_LIVE_CLIENT_SECRET", label: "Live Client Secret" },
  { provider: "pathao", key: "PATHAO_LIVE_USERNAME", label: "Live Username" },
  { provider: "pathao", key: "PATHAO_LIVE_PASSWORD", label: "Live Password" },
  { provider: "steadfast", key: "STEADFAST_API_KEY", label: "Api-Key" },
  { provider: "steadfast", key: "STEADFAST_SECRET_KEY", label: "Secret-Key" },
];

const AdminCouriers: React.FC = () => {
  const qc = useQueryClient();
  const [pathaoCfg, setPathaoCfg] = useState<PathaoConfig>({});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  // ----- Pathao config
  useQuery({
    queryKey: ["pathao-config"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value")
        .eq("key", "pathao_public_config").maybeSingle();
      const cfg = ((data?.value as any) || {}) as PathaoConfig;
      setPathaoCfg(cfg);
      return cfg;
    },
  });

  // ----- Secret status
  const { data: secretStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["courier-secret-status"],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("courier-secrets", { body: { action: "status" } });
      return ((data as any)?.status || {}) as Record<string, boolean>;
    },
  });

  // ----- Shipments
  const { data: pathaoShipments = [] } = useQuery({
    queryKey: ["pathao-shipments-all"],
    queryFn: async () => {
      const { data } = await supabase.from("pathao_shipments")
        .select("*, orders(order_number, total)").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    refetchInterval: 60000,
  });

  const { data: steadfastShipments = [] } = useQuery({
    queryKey: ["steadfast-shipments-all"],
    queryFn: async () => {
      const { data } = await supabase.from("steadfast_shipments")
        .select("*, orders(order_number, total)").order("created_at", { ascending: false }).limit(200);
      return data || [];
    },
    refetchInterval: 60000,
  });

  // ----- Save Pathao config
  const savePathaoCfg = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("site_settings").upsert(
        { key: "pathao_public_config", value: pathaoCfg as any, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
      if (error) throw error;
    },
    onSuccess: () => toast({ title: "Pathao config saved" }),
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  // ----- Save secrets
  const saveSecrets = useMutation({
    mutationFn: async (provider: "pathao" | "steadfast") => {
      const filtered: Record<string, string> = {};
      SECRET_FIELDS.filter((f) => f.provider === provider).forEach((f) => {
        if (secrets[f.key]) filtered[f.key] = secrets[f.key];
      });
      if (Object.keys(filtered).length === 0) throw new Error("No new values to save");
      const { data, error } = await supabase.functions.invoke("courier-secrets", {
        body: { action: "save", secrets: filtered },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "Secrets saved" });
      setSecrets({});
      refetchStatus();
    },
    onError: (e: any) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  // ----- Test connections
  const testPathao = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pathao", {
        body: { action: "list-stores", environment: pathaoCfg.environment || "sandbox" },
      });
      if (error) throw new Error(error.message);
      const stores = (data as any)?.data?.data || [];
      console.log("Pathao stores:", stores);
      if (stores.length) {
        toast({ title: "Pathao connected", description: `Found ${stores.length} store(s). First Store ID: ${stores[0].store_id}` });
      } else {
        toast({ title: "Pathao connected", description: "No stores found yet." });
      }
      return data;
    },
    onError: (e: any) => toast({ title: "Pathao test failed", description: e.message, variant: "destructive" }),
  });

  const testSteadfast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("steadfast", { body: { action: "balance" } });
      if (error) throw new Error(error.message);
      const bal = (data as any)?.current_balance;
      toast({ title: "Steadfast connected", description: `Current balance: ৳${bal ?? "N/A"}` });
      return data;
    },
    onError: (e: any) => toast({ title: "Steadfast test failed", description: e.message, variant: "destructive" }),
  });

  // ----- Sync all
  const syncPathao = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pathao", { body: { action: "sync-all" } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast({ title: `Synced ${d.synced}/${d.total} Pathao shipments` });
      qc.invalidateQueries({ queryKey: ["pathao-shipments-all"] });
    },
  });

  const syncSteadfast = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("steadfast", { body: { action: "sync-all" } });
      if (error) throw error;
      return data;
    },
    onSuccess: (d: any) => {
      toast({ title: `Synced ${d.synced}/${d.total} Steadfast shipments` });
      qc.invalidateQueries({ queryKey: ["steadfast-shipments-all"] });
    },
  });

  // ---- Charts data
  const pathaoStatusData = React.useMemo(() => {
    const m: Record<string, number> = {};
    pathaoShipments.forEach((s: any) => {
      const k = (s.order_status_slug || s.order_status || "unknown").toString().toLowerCase();
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [pathaoShipments]);

  const steadfastStatusData = React.useMemo(() => {
    const m: Record<string, number> = {};
    steadfastShipments.forEach((s: any) => {
      const k = (s.status || "unknown").toString().toLowerCase();
      m[k] = (m[k] || 0) + 1;
    });
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [steadfastShipments]);

  const toggleReveal = (k: string) => {
    setRevealed((p) => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  };

  const renderSecretRow = (f: typeof SECRET_FIELDS[number]) => {
    const isSet = secretStatus?.[f.key];
    return (
      <div key={f.key} className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs">{f.label}</Label>
          {isSet ? (
            <Badge variant="outline" className="gap-1 text-[10px] border-green-500/40 text-green-500">
              <CheckCircle2 className="w-3 h-3" /> Configured
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1 text-[10px] border-yellow-500/40 text-yellow-500">
              <XCircle className="w-3 h-3" /> Not set
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Input
            type={revealed.has(f.key) ? "text" : "password"}
            placeholder={isSet ? "•••••••• (saved)" : "Enter value"}
            value={secrets[f.key] || ""}
            onChange={(e) => setSecrets({ ...secrets, [f.key]: e.target.value })}
          />
          <Button type="button" variant="outline" size="icon" onClick={() => toggleReveal(f.key)}>
            {revealed.has(f.key) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-2">
            <Truck className="w-7 h-7 text-primary" /> Courier Integrations
          </h1>
          <p className="text-sm text-muted-foreground">Pathao + Steadfast — credentials, shipments, analytics</p>
        </div>
      </div>

      <TabsWithParam defaultTab="pathao" basePath="/origin/couriers">
        <TabsList>
          <TabsTrigger value="pathao">Pathao</TabsTrigger>
          <TabsTrigger value="steadfast">Steadfast</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* ============ PATHAO ============ */}
        <TabsContent value="pathao" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> API Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {SECRET_FIELDS.filter((f) => f.provider === "pathao").map(renderSecretRow)}
              </div>
              <Button onClick={() => saveSecrets.mutate("pathao")} disabled={saveSecrets.isPending} className="gap-2">
                {saveSecrets.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Pathao Credentials
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">Live Environment</p>
                  <p className="text-xs text-muted-foreground">{pathaoCfg.environment === "live" ? "Production" : "Sandbox (test)"}</p>
                </div>
                <Switch
                  checked={pathaoCfg.environment === "live"}
                  onCheckedChange={(v) => setPathaoCfg({ ...pathaoCfg, environment: v ? "live" : "sandbox" })}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Sandbox Store ID</Label>
                  <Input type="number" value={pathaoCfg.sandbox_store_id || ""}
                    onChange={(e) => setPathaoCfg({ ...pathaoCfg, sandbox_store_id: Number(e.target.value) || undefined })} />
                </div>
                <div>
                  <Label>Live Store ID</Label>
                  <Input type="number" value={pathaoCfg.live_store_id || ""}
                    onChange={(e) => setPathaoCfg({ ...pathaoCfg, live_store_id: Number(e.target.value) || undefined })} />
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => savePathaoCfg.mutate()} disabled={savePathaoCfg.isPending} className="gap-2">
                  <Save className="w-4 h-4" /> Save Settings
                </Button>
                <Button variant="outline" onClick={() => testPathao.mutate()} disabled={testPathao.isPending} className="gap-2">
                  {testPathao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Test Connection
                </Button>
                <Button variant="outline" onClick={() => syncPathao.mutate()} disabled={syncPathao.isPending} className="gap-2">
                  {syncPathao.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync All Statuses
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Shipments ({pathaoShipments.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {pathaoShipments.slice(0, 30).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{s.orders?.order_number || s.merchant_order_id}</p>
                      <p className="text-xs text-muted-foreground font-mono">{s.consignment_id}</p>
                    </div>
                    <Badge style={{ backgroundColor: STATUS_COLORS[s.order_status_slug?.toLowerCase()] || undefined }}>
                      {(s.order_status || "unknown").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
                {pathaoShipments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No shipments yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ STEADFAST ============ */}
        <TabsContent value="steadfast" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Key className="w-4 h-4" /> API Credentials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {SECRET_FIELDS.filter((f) => f.provider === "steadfast").map(renderSecretRow)}
              </div>
              <p className="text-xs text-muted-foreground">
                Get your keys from <a href="https://steadfast.com.bd" target="_blank" className="text-primary underline">Steadfast Portal → API</a>
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => saveSecrets.mutate("steadfast")} disabled={saveSecrets.isPending} className="gap-2">
                  {saveSecrets.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Steadfast Credentials
                </Button>
                <Button variant="outline" onClick={() => testSteadfast.mutate()} disabled={testSteadfast.isPending} className="gap-2">
                  {testSteadfast.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Test Connection (Balance)
                </Button>
                <Button variant="outline" onClick={() => syncSteadfast.mutate()} disabled={syncSteadfast.isPending} className="gap-2">
                  {syncSteadfast.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Sync All Statuses
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Recent Shipments ({steadfastShipments.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {steadfastShipments.slice(0, 30).map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20">
                    <div>
                      <p className="text-sm font-medium">{s.orders?.order_number || s.invoice}</p>
                      <p className="text-xs text-muted-foreground font-mono">CID: {s.consignment_id} • TC: {s.tracking_code}</p>
                    </div>
                    <Badge style={{ backgroundColor: STATUS_COLORS[s.status?.toLowerCase()] || undefined }}>
                      {(s.status || "unknown").replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
                {steadfastShipments.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">No shipments yet</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ANALYTICS ============ */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Pathao Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={pathaoStatusData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {pathaoStatusData.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[d.name] || `hsl(${i * 47} 60% 55%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Steadfast Status Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={steadfastStatusData} dataKey="value" nameKey="name" outerRadius={90} label>
                      {steadfastStatusData.map((d, i) => (
                        <Cell key={i} fill={STATUS_COLORS[d.name] || `hsl(${i * 47} 60% 55%)`} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Courier Comparison</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: "Total Shipments", Pathao: pathaoShipments.length, Steadfast: steadfastShipments.length },
                  { name: "Delivered", Pathao: pathaoShipments.filter((s: any) => s.order_status_slug === "delivered").length, Steadfast: steadfastShipments.filter((s: any) => s.status === "delivered").length },
                  { name: "In Transit", Pathao: pathaoShipments.filter((s: any) => ["in_transit", "out_for_delivery", "picked"].includes(s.order_status_slug)).length, Steadfast: steadfastShipments.filter((s: any) => ["in_review", "pending"].includes(s.status)).length },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                  <Bar dataKey="Pathao" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Steadfast" fill="hsl(280 70% 60%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </TabsWithParam>
    </div>
  );
};

export default AdminCouriers;
