
-- =========================================
-- USER SESSIONS
-- =========================================
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token text,
  device text,
  browser text,
  os text,
  ip_address text,
  location text,
  user_agent text,
  is_current boolean DEFAULT false,
  last_active_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_user_sessions_user ON public.user_sessions(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_sessions TO authenticated;
GRANT ALL ON public.user_sessions TO service_role;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.user_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.user_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.user_sessions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all sessions" ON public.user_sessions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- USER PREFERENCES
-- =========================================
CREATE TABLE public.user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  push_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  marketing_emails boolean DEFAULT true,
  order_updates boolean DEFAULT true,
  newsletter boolean DEFAULT false,
  language text DEFAULT 'en',
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  theme text DEFAULT 'system',
  font_family text DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prefs" ON public.user_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER user_prefs_touch BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================
-- AFFILIATE SETTINGS (singleton)
-- =========================================
CREATE TABLE public.affiliate_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  status_message text DEFAULT 'Our affiliate program is coming soon!',
  program_name text DEFAULT 'Affiliate Program',
  program_description text DEFAULT 'Earn commissions by referring customers.',
  commission_rate numeric(5,2) NOT NULL DEFAULT 10.00,
  min_payout numeric(12,2) NOT NULL DEFAULT 50.00,
  cookie_days integer NOT NULL DEFAULT 30,
  auto_approve boolean NOT NULL DEFAULT false,
  approval_required boolean NOT NULL DEFAULT true,
  terms_md text DEFAULT '',
  payout_methods jsonb DEFAULT '["bank_transfer","paypal","mobile_banking"]'::jsonb,
  hero_image text,
  benefits jsonb DEFAULT '[]'::jsonb,
  faq jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.affiliate_settings TO anon, authenticated;
GRANT ALL ON public.affiliate_settings TO service_role;
ALTER TABLE public.affiliate_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view affiliate settings" ON public.affiliate_settings
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage affiliate settings" ON public.affiliate_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_settings_touch BEFORE UPDATE ON public.affiliate_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

INSERT INTO public.affiliate_settings (enabled) VALUES (false);

-- =========================================
-- AFFILIATE ACCOUNTS
-- =========================================
CREATE TABLE public.affiliate_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','suspended')),
  tier text DEFAULT 'bronze',
  custom_rate numeric(5,2),
  payout_method text,
  payout_details jsonb DEFAULT '{}'::jsonb,
  website_url text,
  promotion_method text,
  application_notes text,
  rejection_reason text,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  total_earnings numeric(14,2) NOT NULL DEFAULT 0,
  available_balance numeric(14,2) NOT NULL DEFAULT 0,
  pending_balance numeric(14,2) NOT NULL DEFAULT 0,
  lifetime_paid numeric(14,2) NOT NULL DEFAULT 0,
  applied_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_accounts_status ON public.affiliate_accounts(status);
CREATE INDEX idx_affiliate_accounts_code ON public.affiliate_accounts(code);

GRANT SELECT, INSERT, UPDATE ON public.affiliate_accounts TO authenticated;
GRANT SELECT ON public.affiliate_accounts TO anon;
GRANT ALL ON public.affiliate_accounts TO service_role;
ALTER TABLE public.affiliate_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own affiliate account" ON public.affiliate_accounts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own affiliate account" ON public.affiliate_accounts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own affiliate account" ON public.affiliate_accounts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Public lookup by code" ON public.affiliate_accounts
  FOR SELECT TO anon USING (status = 'approved');
CREATE POLICY "Admins manage all affiliates" ON public.affiliate_accounts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_accounts_touch BEFORE UPDATE ON public.affiliate_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================
-- AFFILIATE CLICKS
-- =========================================
CREATE TABLE public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  ref_code text NOT NULL,
  landing_url text,
  referrer text,
  ip_hash text,
  user_agent text,
  country text,
  device text,
  converted boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_clicks_affiliate ON public.affiliate_clicks(affiliate_id);
CREATE INDEX idx_affiliate_clicks_created ON public.affiliate_clicks(created_at DESC);

GRANT SELECT, INSERT ON public.affiliate_clicks TO anon, authenticated;
GRANT ALL ON public.affiliate_clicks TO service_role;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public insert clicks" ON public.affiliate_clicks
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Affiliates view own clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliate_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins view all clicks" ON public.affiliate_clicks
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- AFFILIATE REFERRALS
-- =========================================
CREATE TABLE public.affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  click_id uuid REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  ref_code text NOT NULL,
  signed_up_at timestamptz NOT NULL DEFAULT now(),
  first_order_id uuid,
  total_orders integer DEFAULT 0,
  status text DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referred_user_id)
);
CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);

GRANT SELECT, INSERT, UPDATE ON public.affiliate_referrals TO authenticated;
GRANT ALL ON public.affiliate_referrals TO service_role;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own referrals" ON public.affiliate_referrals
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliate_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage referrals" ON public.affiliate_referrals
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================
-- AFFILIATE COMMISSIONS
-- =========================================
CREATE TABLE public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  referral_id uuid REFERENCES public.affiliate_referrals(id) ON DELETE SET NULL,
  order_id uuid,
  order_amount numeric(14,2) NOT NULL DEFAULT 0,
  commission_rate numeric(5,2) NOT NULL,
  commission_amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','reversed','rejected')),
  available_at timestamptz,
  paid_at timestamptz,
  payout_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);

GRANT SELECT ON public.affiliate_commissions TO authenticated;
GRANT ALL ON public.affiliate_commissions TO service_role;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own commissions" ON public.affiliate_commissions
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliate_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage commissions" ON public.affiliate_commissions
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_commissions_touch BEFORE UPDATE ON public.affiliate_commissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================
-- AFFILIATE PAYOUTS
-- =========================================
CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.affiliate_accounts(id) ON DELETE CASCADE,
  amount numeric(14,2) NOT NULL,
  method text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','processing','paid','rejected','cancelled')),
  txn_reference text,
  admin_notes text,
  rejection_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_affiliate_payouts_affiliate ON public.affiliate_payouts(affiliate_id);
CREATE INDEX idx_affiliate_payouts_status ON public.affiliate_payouts(status);

GRANT SELECT, INSERT ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (
    affiliate_id IN (SELECT id FROM public.affiliate_accounts WHERE user_id = auth.uid())
  );
CREATE POLICY "Affiliates request payout" ON public.affiliate_payouts
  FOR INSERT TO authenticated WITH CHECK (
    affiliate_id IN (SELECT id FROM public.affiliate_accounts WHERE user_id = auth.uid() AND status = 'approved')
  );
CREATE POLICY "Admins manage payouts" ON public.affiliate_payouts
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER affiliate_payouts_touch BEFORE UPDATE ON public.affiliate_payouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- =========================================
-- HELPER: generate affiliate code
-- =========================================
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_code text;
  attempts integer := 0;
BEGIN
  LOOP
    new_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    IF NOT EXISTS (SELECT 1 FROM public.affiliate_accounts WHERE code = new_code) THEN
      RETURN new_code;
    END IF;
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique affiliate code';
    END IF;
  END LOOP;
END;
$$;
