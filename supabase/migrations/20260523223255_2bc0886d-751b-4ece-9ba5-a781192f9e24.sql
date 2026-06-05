
-- Customer notes
CREATE TABLE public.customer_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  author_id uuid NOT NULL,
  body text NOT NULL,
  pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customer_notes_customer ON public.customer_notes(customer_id);
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage customer notes" ON public.customer_notes
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));
CREATE TRIGGER trg_customer_notes_updated BEFORE UPDATE ON public.customer_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Customer tags
CREATE TABLE public.customer_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage tags" ON public.customer_tags
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

CREATE TABLE public.customer_tag_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  tag_id uuid NOT NULL REFERENCES public.customer_tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(customer_id, tag_id)
);
ALTER TABLE public.customer_tag_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff manage tag assignments" ON public.customer_tag_assignments
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator'));

-- Staff audit log
CREATE TABLE public.staff_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL,
  action text NOT NULL,
  entity text,
  entity_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_staff_audit_actor ON public.staff_audit_log(actor_id, created_at DESC);
ALTER TABLE public.staff_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read audit" ON public.staff_audit_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "Staff insert audit" ON public.staff_audit_log
  FOR INSERT TO authenticated
  WITH CHECK ((has_role(auth.uid(),'admin') OR has_role(auth.uid(),'moderator')) AND actor_id = auth.uid());

-- Extend email_subscriptions
ALTER TABLE public.email_subscriptions
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS last_emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribe_token uuid UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS name text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_subscriptions_email ON public.email_subscriptions(lower(email));

-- Email templates
CREATE TABLE public.email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  subject text NOT NULL DEFAULT '',
  html text NOT NULL DEFAULT '',
  design jsonb DEFAULT '{}'::jsonb,
  thumbnail text,
  is_system boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage templates" ON public.email_templates
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_email_templates_updated BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Email campaigns
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  from_name text,
  from_email text,
  reply_to text,
  html text NOT NULL DEFAULT '',
  design jsonb DEFAULT '{}'::jsonb,
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  audience_type text NOT NULL DEFAULT 'subscribers', -- subscribers | customers | custom | segment
  audience_filter jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft', -- draft | scheduled | sending | sent | failed | paused
  schedule_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  total_recipients integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_campaigns_status_schedule ON public.email_campaigns(status, schedule_at);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage campaigns" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Email campaign recipients
CREATE TABLE public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  user_id uuid,
  status text NOT NULL DEFAULT 'pending', -- pending | sent | delivered | opened | clicked | bounced | failed | unsubscribed | suppressed
  provider_message_id text,
  error text,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  bounced_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ecr_campaign ON public.email_campaign_recipients(campaign_id, status);
CREATE INDEX idx_ecr_msgid ON public.email_campaign_recipients(provider_message_id);
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage recipients" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Email automations
CREATE TABLE public.email_automations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  event text NOT NULL, -- announcement_created | product_published | promo_created | offer_created | popup_created | order_status
  template_id uuid REFERENCES public.email_templates(id) ON DELETE SET NULL,
  subject_override text,
  audience_type text NOT NULL DEFAULT 'subscribers',
  audience_filter jsonb DEFAULT '{}'::jsonb,
  delay_minutes integer NOT NULL DEFAULT 0,
  quiet_hours_start integer, -- 0-23
  quiet_hours_end integer,
  is_active boolean NOT NULL DEFAULT true,
  last_run_at timestamptz,
  run_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage automations" ON public.email_automations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_email_automations_updated BEFORE UPDATE ON public.email_automations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Email suppressions
CREATE TABLE public.email_suppressions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  reason text NOT NULL, -- bounce | complaint | unsubscribe | manual
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_suppressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin manage suppressions" ON public.email_suppressions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Automation event queue: rows inserted by triggers, drained by the cron hook
CREATE TABLE public.email_automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event text NOT NULL,
  entity_id uuid,
  payload jsonb DEFAULT '{}'::jsonb,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_auto_events_unprocessed ON public.email_automation_events(processed_at) WHERE processed_at IS NULL;
ALTER TABLE public.email_automation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin read events" ON public.email_automation_events
  FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));

-- Trigger helper to enqueue automation events
CREATE OR REPLACE FUNCTION public.enqueue_automation_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  evt text := TG_ARGV[0];
BEGIN
  -- For products/popups: only fire when becoming active/published
  IF TG_TABLE_NAME = 'products' THEN
    IF NEW.is_active IS TRUE AND (TG_OP = 'INSERT' OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
      INSERT INTO public.email_automation_events(event, entity_id, payload)
      VALUES (evt, NEW.id, jsonb_build_object('name', NEW.name, 'slug', NEW.slug, 'thumbnail', NEW.thumbnail));
    END IF;
    RETURN NEW;
  END IF;
  INSERT INTO public.email_automation_events(event, entity_id, payload)
  VALUES (evt, NEW.id, to_jsonb(NEW));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_announcement ON public.notifications;
CREATE TRIGGER trg_auto_announcement AFTER INSERT ON public.notifications
  FOR EACH ROW WHEN (NEW.user_id IS NULL)
  EXECUTE FUNCTION public.enqueue_automation_event('announcement_created');

DROP TRIGGER IF EXISTS trg_auto_product ON public.products;
CREATE TRIGGER trg_auto_product AFTER INSERT OR UPDATE OF is_active ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_automation_event('product_published');

DROP TRIGGER IF EXISTS trg_auto_coupon ON public.coupons;
CREATE TRIGGER trg_auto_coupon AFTER INSERT ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_automation_event('promo_created');

DROP TRIGGER IF EXISTS trg_auto_offer ON public.delivery_offers;
CREATE TRIGGER trg_auto_offer AFTER INSERT ON public.delivery_offers
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_automation_event('offer_created');

DROP TRIGGER IF EXISTS trg_auto_popup ON public.popups;
CREATE TRIGGER trg_auto_popup AFTER INSERT ON public.popups
  FOR EACH ROW EXECUTE FUNCTION public.enqueue_automation_event('popup_created');
