CREATE TABLE public.affiliate_report_config (
  id smallint PRIMARY KEY DEFAULT 1,
  spreadsheet_id text,
  spreadsheet_url text,
  last_weekly_at timestamptz,
  last_monthly_at timestamptz,
  last_instant_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT affiliate_report_config_singleton CHECK (id = 1)
);

GRANT SELECT ON public.affiliate_report_config TO authenticated;
GRANT ALL ON public.affiliate_report_config TO service_role;

ALTER TABLE public.affiliate_report_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read affiliate report config"
  ON public.affiliate_report_config
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_affiliate_report_config_updated_at
  BEFORE UPDATE ON public.affiliate_report_config
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

INSERT INTO public.affiliate_report_config (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;