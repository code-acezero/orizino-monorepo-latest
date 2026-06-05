"use client";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@/lib/server-fn-compat";
import { listAuditLog } from "@/lib/staff.functions";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ClipboardList } from "lucide-react";

export default function AdminAuditLog() {
  const fetchLog = useServerFn(listAuditLog);
  const { data } = useQuery({ queryKey: ["audit-log"], queryFn: () => fetchLog({ data: { limit: 200, offset: 0 } }) });
  const items = data?.items ?? [];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold flex items-center gap-2"><ClipboardList className="w-7 h-7" />Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Every privileged staff action is recorded here.</p>
      </div>
      <div className="rounded-lg border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
            <tr><th className="px-3 py-2 text-left">When</th><th className="px-3 py-2 text-left">Actor</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Entity</th><th className="px-3 py-2 text-left">Meta</th></tr>
          </thead>
          <tbody>
            {items.map((i: any) => (
              <tr key={i.id} className="border-t border-border/50">
                <td className="px-3 py-2 text-xs text-muted-foreground">{formatDistanceToNow(new Date(i.created_at), { addSuffix: true })}</td>
                <td className="px-3 py-2">{i.actor_name}</td>
                <td className="px-3 py-2"><Badge variant="outline">{i.action}</Badge></td>
                <td className="px-3 py-2 text-xs">{i.entity || "—"}{i.entity_id ? <span className="font-mono text-muted-foreground"> · {i.entity_id.slice(0, 8)}</span> : null}</td>
                <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{JSON.stringify(i.meta)}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No entries yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
