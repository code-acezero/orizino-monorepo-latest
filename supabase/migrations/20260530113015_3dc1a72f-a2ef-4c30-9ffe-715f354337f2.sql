
-- Catalog of admin sections (referenced by name as text, not enum, for flexibility)
CREATE TABLE public.staff_sections (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_sections TO authenticated;
GRANT ALL ON public.staff_sections TO service_role;
ALTER TABLE public.staff_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_sections readable by authenticated"
ON public.staff_sections FOR SELECT TO authenticated USING (true);

CREATE POLICY "staff_sections admin write"
ON public.staff_sections FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed sections
INSERT INTO public.staff_sections (key, label, description, sort_order) VALUES
  ('products', 'Products', 'Catalog, inventory, categories', 10),
  ('orders', 'Orders', 'Online order management and fulfillment', 20),
  ('offline_orders', 'Offline Orders', 'In-store sales, invoices, combined stock', 25),
  ('customers', 'Customers', 'Customer accounts and analytics', 30),
  ('affiliate', 'Affiliate', 'Affiliate accounts and payouts', 40),
  ('seo', 'SEO', 'Search engine optimization controls', 50),
  ('storefront_ui', 'Storefront UI', 'Site appearance, branding, banners, mobile UI', 60),
  ('portfolio', 'Portfolio', 'Landing pages and product highlights', 70),
  ('ai', 'AI', 'AI assistant configuration', 80),
  ('analytics', 'Analytics', 'Reports and insights', 90),
  ('employees', 'Employees', 'Staff and role management', 95),
  ('settings', 'Settings', 'System configuration', 100);

-- Preset role bundles
CREATE TABLE public.staff_role_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  sections text[] NOT NULL DEFAULT '{}',
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_role_presets TO authenticated;
GRANT ALL ON public.staff_role_presets TO service_role;
ALTER TABLE public.staff_role_presets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "presets readable by authenticated"
ON public.staff_role_presets FOR SELECT TO authenticated USING (true);

CREATE POLICY "presets admin write"
ON public.staff_role_presets FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER staff_role_presets_updated_at
BEFORE UPDATE ON public.staff_role_presets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Seed system presets
INSERT INTO public.staff_role_presets (name, description, sections, is_system) VALUES
  ('Inventory', 'Manage products, categories, stock', ARRAY['products','offline_orders'], true),
  ('Fulfillment', 'Process and ship orders', ARRAY['orders','offline_orders','customers'], true),
  ('Marketing', 'Campaigns, coupons, banners, popups', ARRAY['storefront_ui','customers','analytics'], true),
  ('SEO', 'Search optimization', ARRAY['seo','analytics'], true),
  ('Designer', 'Storefront UI and branding', ARRAY['storefront_ui','portfolio'], true),
  ('Portfolio', 'Portfolio and landing pages', ARRAY['portfolio'], true);

-- Per-user section grants (overrides / additions on top of preset)
CREATE TABLE public.staff_section_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  section text NOT NULL REFERENCES public.staff_sections(key) ON DELETE CASCADE,
  preset_id uuid REFERENCES public.staff_role_presets(id) ON DELETE SET NULL,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, section)
);

CREATE INDEX idx_staff_section_access_user ON public.staff_section_access(user_id);

GRANT SELECT ON public.staff_section_access TO authenticated;
GRANT ALL ON public.staff_section_access TO service_role;
ALTER TABLE public.staff_section_access ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own section grants"
ON public.staff_section_access FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin manages section grants"
ON public.staff_section_access FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Security-definer helper: admin OR explicit grant
CREATE OR REPLACE FUNCTION public.has_section_access(_user_id uuid, _section text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR EXISTS (
      SELECT 1 FROM public.staff_section_access
      WHERE user_id = _user_id AND section = _section
    )
$$;
