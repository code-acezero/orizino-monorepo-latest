
-- Extend settings
ALTER TABLE public.affiliate_settings
  ADD COLUMN IF NOT EXISTS featured_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_category_rate numeric(5,2),
  ADD COLUMN IF NOT EXISTS tier_thresholds jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attribution_model text NOT NULL DEFAULT 'last_click',
  ADD COLUMN IF NOT EXISTS referral_bonus numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS holding_period_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allow_self_referral boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS branding jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Category rates
CREATE TABLE IF NOT EXISTS public.affiliate_category_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  rate numeric(5,2) NOT NULL CHECK (rate >= 0 AND rate <= 100),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);
GRANT SELECT ON public.affiliate_category_rates TO anon, authenticated;
GRANT ALL ON public.affiliate_category_rates TO service_role;
ALTER TABLE public.affiliate_category_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active category rates" ON public.affiliate_category_rates FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage category rates" ON public.affiliate_category_rates FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_acr_updated BEFORE UPDATE ON public.affiliate_category_rates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Affiliate products (opted-in products)
CREATE TABLE IF NOT EXISTS public.affiliate_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  override_rate numeric(5,2) CHECK (override_rate IS NULL OR (override_rate >= 0 AND override_rate <= 100)),
  is_featured boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  bonus_amount numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);
GRANT SELECT ON public.affiliate_products TO anon, authenticated;
GRANT ALL ON public.affiliate_products TO service_role;
ALTER TABLE public.affiliate_products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active affiliate products" ON public.affiliate_products FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage affiliate products" ON public.affiliate_products FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_ap_updated BEFORE UPDATE ON public.affiliate_products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Per-affiliate product links
CREATE TABLE IF NOT EXISTS public.affiliate_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  product_id uuid,
  slug text NOT NULL,
  target_url text NOT NULL,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  label text,
  clicks integer NOT NULL DEFAULT 0,
  conversions integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(slug)
);
CREATE INDEX IF NOT EXISTS idx_apl_affiliate ON public.affiliate_product_links(affiliate_id);
GRANT SELECT ON public.affiliate_product_links TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.affiliate_product_links TO authenticated;
GRANT ALL ON public.affiliate_product_links TO service_role;
ALTER TABLE public.affiliate_product_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read product links" ON public.affiliate_product_links FOR SELECT USING (true);
CREATE POLICY "Affiliates manage own links" ON public.affiliate_product_links FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.affiliate_accounts a WHERE a.id = affiliate_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.affiliate_accounts a WHERE a.id = affiliate_id AND a.user_id = auth.uid()));
CREATE POLICY "Admins manage all links" ON public.affiliate_product_links FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_apl_updated BEFORE UPDATE ON public.affiliate_product_links FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Creatives
CREATE TABLE IF NOT EXISTS public.affiliate_creatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  type text NOT NULL DEFAULT 'banner',
  content text,
  image_url text,
  target_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_creatives TO anon, authenticated;
GRANT ALL ON public.affiliate_creatives TO service_role;
ALTER TABLE public.affiliate_creatives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active creatives" ON public.affiliate_creatives FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage creatives" ON public.affiliate_creatives FOR ALL TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER set_acv_updated BEFORE UPDATE ON public.affiliate_creatives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Extend clicks
ALTER TABLE public.affiliate_clicks
  ADD COLUMN IF NOT EXISTS product_id uuid,
  ADD COLUMN IF NOT EXISTS link_id uuid;
CREATE INDEX IF NOT EXISTS idx_aclicks_link ON public.affiliate_clicks(link_id);
CREATE INDEX IF NOT EXISTS idx_aclicks_product ON public.affiliate_clicks(product_id);
