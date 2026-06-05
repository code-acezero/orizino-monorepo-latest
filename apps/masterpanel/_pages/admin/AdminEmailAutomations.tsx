"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listAutomations, upsertAutomation, deleteAutomation } from "@/lib/email-automations.functions";
import { listTemplates } from "@/lib/email-campaigns.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/app-toast";
import { Plus, Pencil, Trash2, Workflow } from "lucide-react";

const EVENTS = [
  { value: "announcement_created", label: "New announcement" },
  { value: "product_published", label: "New product published" },
  { value: "promo_created", label: "New promo/coupon" },
  { value: "offer_created", label: "New delivery offer" },
  { value: "popup_created", label: "New popup" },
];

export default function AdminEmailAutomations() {
  const fetch = useServerFn(listAutomations);
  const fetchTpl = useServerFn(listTemplates);
  const save = useServerFn(upsertAutomation);
  const del = useServerFn(deleteAutomation);
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ["autos"], queryFn: () => fetch() });
  const { data: templates = [] } = useQuery({ queryKey: ["templates"], queryFn: () => fetchTpl() });
  const [editing, setEditing] = useState<any | null>(null);

  const saveMut = useMutation({
    mutationFn: () => save({ data: editing }),
    onSuccess: () => { toast.success("Saved"); setEditing(null); qc.invalidateQueries({ queryKey: ["autos"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-display font-bold flex items-center gap-2"><Workflow className="w-7 h-7" />Email Automations</h1><p className="text-sm text-muted-foreground mt-1">Auto-send campaigns when something happens in your store</p></div>
        <Button onClick={() => setEditing({ name: "New automation", event: "product_published", audience_type: "subscribers", delay_minutes: 0, is_active: true })}><Plus className="w-4 h-4 mr-1.5" />New automation</Button>
      </div>
      <div className="space-y-2">
        {items.map((a: any) => (
          <div key={a.id} className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
            <Switch checked={a.is_active} onCheckedChange={async (v) => { await save({ data: { ...a, is_active: v, template_id: a.template_id, audience_type: a.audience_type } }); qc.invalidateQueries({ queryKey: ["autos"] }); }} />
            <div className="flex-1">
              <div className="font-medium">{a.name}</div>
              <div className="text-xs text-muted-foreground">When <strong>{EVENTS.find((e) => e.value === a.event)?.label ?? a.event}</strong> → send <strong>{a.template?.name ?? "(no template)"}</strong> to {a.audience_type} {a.delay_minutes > 0 && <>after {a.delay_minutes}min</>}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setEditing(a)}><Pencil className="w-3.5 h-3.5" /></Button>
            <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete?")) { await del({ data: { id: a.id } }); qc.invalidateQueries({ queryKey: ["autos"] }); } }}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
          </div>
        ))}
        {items.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">No automations yet.</p>}
      </div>
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit automation</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <Input placeholder="Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Select value={editing.event} onValueChange={(v) => setEditing({ ...editing, event: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENTS.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editing.template_id ?? ""} onValueChange={(v) => setEditing({ ...editing, template_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pick a template" /></SelectTrigger>
                <SelectContent>{templates.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={editing.audience_type} onValueChange={(v) => setEditing({ ...editing, audience_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="subscribers">All subscribers</SelectItem>
                  <SelectItem value="customers">All customers</SelectItem>
                </SelectContent>
              </Select>
              <Input type="number" placeholder="Delay (minutes)" value={editing.delay_minutes ?? 0} onChange={(e) => setEditing({ ...editing, delay_minutes: parseInt(e.target.value) || 0 })} />
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={() => saveMut.mutate()}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
