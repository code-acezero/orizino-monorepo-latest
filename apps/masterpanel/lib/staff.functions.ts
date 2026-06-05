import { createServerFn } from "@/lib/server-fn-compat";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hasSupabaseAdminCredentials, supabaseAdmin } from "@/integrations/supabase/client.server";

function adminClient() {
  if (!hasSupabaseAdminCredentials()) {
    throw new Error("Supabase admin credentials are not configured. Add SUPABASE_SERVICE_ROLE_KEY in project Secrets to manage staff by email.");
  }
  return supabaseAdmin;
}

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" as any });
  if (!data) throw new Error("Forbidden: admins only");
}

async function auditWithClient(supabase: any, actorId: string, action: string, entity: string, entityId?: string, meta?: Record<string, unknown>) {
  await supabase.from("staff_audit_log").insert({ actor_id: actorId, action, entity, entity_id: entityId ?? null, meta: (meta ?? {}) as any });
}

export const listStaff = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    const { data: roles, error: rolesError } = await sb.from("user_roles").select("user_id, role").in("role", ["admin", "moderator", "manager", "maintainer", "support", "marketing"]);
    if (rolesError) throw new Error(rolesError.message);
    const ids = [...new Set((roles ?? []).map((r) => r.user_id))];
    const profilesMap: Record<string, any> = {};
    const emailsMap: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await sb.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      profiles?.forEach((p) => (profilesMap[p.id] = p));
      if (hasSupabaseAdminCredentials()) {
        const { data: list } = await (adminClient() as any).auth.admin.listUsers({ page: 1, perPage: 1000 });
        list?.users?.forEach((u: any) => { if (ids.includes(u.id)) emailsMap[u.id] = u.email ?? ""; });
      }
    }
    // Group roles by user
    const byUser: Record<string, { user_id: string; roles: string[]; full_name?: string; avatar_url?: string; email?: string }> = {};
    (roles ?? []).forEach((r) => {
      if (!byUser[r.user_id]) byUser[r.user_id] = { user_id: r.user_id, roles: [], full_name: profilesMap[r.user_id]?.full_name, avatar_url: profilesMap[r.user_id]?.avatar_url, email: emailsMap[r.user_id] };
      byUser[r.user_id].roles.push(r.role);
    });
    return Object.values(byUser).sort((a, b) => (a.full_name || a.email || a.user_id).localeCompare(b.full_name || b.email || b.user_id));
  });

export const grantStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email(), role: z.enum(["admin", "moderator", "manager", "maintainer", "support", "marketing"]) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = adminClient();
    // Find user
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const user = list?.users?.find((u) => u.email?.toLowerCase() === data.email.toLowerCase());
    if (!user) throw new Error("User not found. They must register first.");
    const { error } = await sb.from("user_roles").upsert({ user_id: user.id, role: data.role }, { onConflict: "user_id,role" });
    if (error) throw new Error(error.message);
    await auditWithClient(context.supabase, context.userId, "grant_role", "user_roles", user.id, { role: data.role, email: data.email });
    return { ok: true };
  });

export const revokeStaffRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "moderator", "manager", "maintainer", "support", "marketing"]) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = adminClient();
    await sb.from("user_roles").delete().eq("user_id", data.userId).eq("role", data.role);
    await auditWithClient(context.supabase, context.userId, "revoke_role", "user_roles", data.userId, { role: data.role });
    return { ok: true };
  });

export const listAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
      action: z.string().max(40).optional(),
    }).parse(input)
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb: any = context.supabase;
    let q = sb.from("staff_audit_log").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(data.offset, data.offset + data.limit - 1);
    if (data.action) q = q.eq("action", data.action);
    const { data: rows, count } = await q;
    const ids = [...new Set((rows ?? []).map((r) => r.actor_id))];
    const map: Record<string, string> = {};
    if (ids.length) {
      const { data: profiles } = await sb.from("profiles").select("id, full_name").in("id", ids);
      profiles?.forEach((p) => (map[p.id] = p.full_name ?? ""));
    }
    return { items: (rows ?? []).map((r) => ({ ...r, actor_name: map[r.actor_id] ?? r.actor_id.slice(0, 8) })), total: count ?? 0 };
  });
