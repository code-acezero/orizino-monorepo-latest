-- ================================================================
-- ORIZINO COMPLETE SETUP SQL — Run this in Supabase SQL Editor
-- Includes: Admin assignment, Teams schema, Audit log
-- ================================================================

-- ── 1. Assign codeacezero@gmail.com as master admin ────────────
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'codeacezero@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'User codeacezero@gmail.com not found — register first, then re-run.';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Admin role granted to codeacezero@gmail.com (uid: %)', v_uid;
  END IF;
END $$;

-- ── 2. Teams table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  color       text NOT NULL DEFAULT '#6366f1',
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.teams TO authenticated;
GRANT ALL    ON public.teams TO service_role;
DROP POLICY IF EXISTS "teams_read"  ON public.teams;
DROP POLICY IF EXISTS "teams_write" ON public.teams;
CREATE POLICY "teams_read"  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_write" ON public.teams FOR ALL TO authenticated
  USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

-- ── 3. Team members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id  uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id)  ON DELETE CASCADE,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON public.team_members(user_id);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL    ON public.team_members TO service_role;
DROP POLICY IF EXISTS "tm_read"  ON public.team_members;
DROP POLICY IF EXISTS "tm_write" ON public.team_members;
CREATE POLICY "tm_read"  ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "tm_write" ON public.team_members FOR ALL TO authenticated
  USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

-- ── 4. Team section access ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_section_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  section    text NOT NULL REFERENCES public.staff_sections(key) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, section)
);
CREATE INDEX IF NOT EXISTS idx_tsa_team ON public.team_section_access(team_id);
ALTER TABLE public.team_section_access ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_section_access TO authenticated;
GRANT ALL    ON public.team_section_access TO service_role;
DROP POLICY IF EXISTS "tsa_read"  ON public.team_section_access;
DROP POLICY IF EXISTS "tsa_write" ON public.team_section_access;
CREATE POLICY "tsa_read"  ON public.team_section_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "tsa_write" ON public.team_section_access FOR ALL TO authenticated
  USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));

-- ── 5. Team audit log ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_audit_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  team_name      text,                              -- snapshot in case team is deleted
  action         text NOT NULL,                     -- see values below
  performed_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  section_key    text,
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
-- action values: team_created | team_updated | team_deleted |
--                member_added | member_removed |
--                section_granted | section_revoked

CREATE INDEX IF NOT EXISTS idx_tal_team      ON public.team_audit_log(team_id);
CREATE INDEX IF NOT EXISTS idx_tal_performer ON public.team_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_tal_created   ON public.team_audit_log(created_at DESC);

ALTER TABLE public.team_audit_log ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_audit_log TO authenticated;
GRANT INSERT ON public.team_audit_log TO authenticated;
GRANT ALL    ON public.team_audit_log TO service_role;

DROP POLICY IF EXISTS "tal_read_admin"  ON public.team_audit_log;
DROP POLICY IF EXISTS "tal_read_self"   ON public.team_audit_log;
DROP POLICY IF EXISTS "tal_insert"      ON public.team_audit_log;

-- Admins see all logs; staff see logs for their own teams
CREATE POLICY "tal_read_admin"
  ON public.team_audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "tal_read_self"
  ON public.team_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE  tm.user_id = auth.uid()
        AND  tm.team_id = team_audit_log.team_id
    )
  );

CREATE POLICY "tal_insert"
  ON public.team_audit_log FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
  );

-- ── 6. DB triggers for automatic audit logging ─────────────────

-- team_members insert → member_added
CREATE OR REPLACE FUNCTION public.trg_team_member_added()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, target_user_id)
  SELECT NEW.team_id, t.name, 'member_added', NEW.added_by, NEW.user_id
  FROM   public.teams t WHERE t.id = NEW.team_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_team_member_added ON public.team_members;
CREATE TRIGGER trg_team_member_added
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_member_added();

-- team_members delete → member_removed
CREATE OR REPLACE FUNCTION public.trg_team_member_removed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, target_user_id, metadata)
  SELECT OLD.team_id, t.name, 'member_removed', auth.uid(), OLD.user_id, '{}'::jsonb
  FROM   public.teams t WHERE t.id = OLD.team_id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_team_member_removed ON public.team_members;
CREATE TRIGGER trg_team_member_removed
  AFTER DELETE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_member_removed();

-- team_section_access insert → section_granted
CREATE OR REPLACE FUNCTION public.trg_team_section_granted()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, section_key)
  SELECT NEW.team_id, t.name, 'section_granted', NEW.granted_by, NEW.section
  FROM   public.teams t WHERE t.id = NEW.team_id;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_team_section_granted ON public.team_section_access;
CREATE TRIGGER trg_team_section_granted
  AFTER INSERT ON public.team_section_access
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_section_granted();

-- team_section_access delete → section_revoked
CREATE OR REPLACE FUNCTION public.trg_team_section_revoked()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, section_key, metadata)
  SELECT OLD.team_id, t.name, 'section_revoked', auth.uid(), OLD.section, '{}'::jsonb
  FROM   public.teams t WHERE t.id = OLD.team_id;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_team_section_revoked ON public.team_section_access;
CREATE TRIGGER trg_team_section_revoked
  AFTER DELETE ON public.team_section_access
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_section_revoked();

-- teams insert → team_created
CREATE OR REPLACE FUNCTION public.trg_team_created()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, metadata)
  VALUES (NEW.id, NEW.name, 'team_created', NEW.created_by,
    jsonb_build_object('color', NEW.color, 'description', NEW.description));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_team_created ON public.teams;
CREATE TRIGGER trg_team_created
  AFTER INSERT ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_created();

-- teams update → team_updated
CREATE OR REPLACE FUNCTION public.trg_team_updated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.name <> NEW.name OR OLD.description IS DISTINCT FROM NEW.description OR OLD.color <> NEW.color THEN
    INSERT INTO public.team_audit_log (team_id, team_name, action, performed_by, metadata)
    VALUES (NEW.id, NEW.name, 'team_updated', auth.uid(),
      jsonb_build_object('old_name', OLD.name, 'new_name', NEW.name, 'old_color', OLD.color, 'new_color', NEW.color));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_team_updated ON public.teams;
CREATE TRIGGER trg_team_updated
  AFTER UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.trg_team_updated();

-- ── 7. Helper RPC: get all sections a user can access ──────────
CREATE OR REPLACE FUNCTION public.get_user_sections(_user_id uuid)
RETURNS TABLE(section text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ssa.section FROM public.staff_section_access ssa WHERE ssa.user_id = _user_id
  UNION
  SELECT tsa.section FROM public.team_members tm
  JOIN public.team_section_access tsa ON tsa.team_id = tm.team_id
  WHERE tm.user_id = _user_id;
$$;
REVOKE EXECUTE ON FUNCTION public.get_user_sections(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_sections(uuid) TO authenticated;

-- ── Done! ───────────────────────────────────────────────────────
-- Verify with:
-- SELECT * FROM public.teams;
-- SELECT * FROM public.team_audit_log ORDER BY created_at DESC LIMIT 20;
