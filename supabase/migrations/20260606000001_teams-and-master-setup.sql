-- ============================================================
-- ORIZINO MASTER SETUP & TEAM-BASED ACCESS CONTROL
-- Run this entire script in Supabase SQL Editor
-- ============================================================

-- ── 1. Assign codeacezero@gmail.com as master admin ──────────
DO $$
DECLARE
  v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'codeacezero@gmail.com' LIMIT 1;
  IF v_uid IS NULL THEN
    RAISE NOTICE 'User codeacezero@gmail.com not found — make sure they sign up first, then re-run this block.';
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_uid, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    RAISE NOTICE 'Admin role granted to codeacezero@gmail.com (uid: %)', v_uid;
  END IF;
END $$;

-- ── 2. Create teams table ─────────────────────────────────────
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
DROP POLICY IF EXISTS "teams_admin" ON public.teams;

CREATE POLICY "teams_read"
  ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_admin"
  ON public.teams FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 3. Create team_members table ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team    ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user    ON public.team_members(user_id);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_members TO authenticated;
GRANT ALL    ON public.team_members TO service_role;

DROP POLICY IF EXISTS "team_members_read"  ON public.team_members;
DROP POLICY IF EXISTS "team_members_admin" ON public.team_members;

CREATE POLICY "team_members_read"
  ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_admin"
  ON public.team_members FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 4. Create team_section_access table ───────────────────────
CREATE TABLE IF NOT EXISTS public.team_section_access (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  section    text NOT NULL REFERENCES public.staff_sections(key) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, section)
);

CREATE INDEX IF NOT EXISTS idx_team_section_access_team ON public.team_section_access(team_id);

ALTER TABLE public.team_section_access ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.team_section_access TO authenticated;
GRANT ALL    ON public.team_section_access TO service_role;

DROP POLICY IF EXISTS "team_section_access_read"  ON public.team_section_access;
DROP POLICY IF EXISTS "team_section_access_admin" ON public.team_section_access;

CREATE POLICY "team_section_access_read"
  ON public.team_section_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_section_access_admin"
  ON public.team_section_access FOR ALL TO authenticated
  USING  (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ── 5. RPC: get all section keys the user can access ──────────
--    Merges direct (staff_section_access) + team-based (team_section_access)
CREATE OR REPLACE FUNCTION public.get_user_sections(_user_id uuid)
RETURNS TABLE(section text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  -- Direct grants
  SELECT ssa.section
  FROM   public.staff_section_access ssa
  WHERE  ssa.user_id = _user_id
  UNION
  -- Via teams
  SELECT tsa.section
  FROM   public.team_members tm
  JOIN   public.team_section_access tsa ON tsa.team_id = tm.team_id
  WHERE  tm.user_id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_sections(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_sections(uuid) TO authenticated;

-- ── Done ──────────────────────────────────────────────────────
-- Verify: run these SELECTs to confirm tables exist
-- SELECT * FROM public.teams;
-- SELECT * FROM public.team_members;
-- SELECT * FROM public.team_section_access;
