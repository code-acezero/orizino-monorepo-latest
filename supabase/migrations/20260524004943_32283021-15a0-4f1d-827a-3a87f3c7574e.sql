
-- 1. Extend app_role enum
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'manager';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'maintainer';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'support';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. has_any_role helper
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles app_role[])
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  )
$$;

-- 3. Triggers to enqueue automation events on marketing entities
-- Announcements (broadcast notifications: user_id IS NULL and type IN announcement/offer/update)
CREATE OR REPLACE FUNCTION public.enqueue_announcement_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.user_id IS NULL AND NEW.type IN ('announcement','offer','update') THEN
    INSERT INTO public.email_automation_events(event, entity_id, payload)
    VALUES ('announcement_created', NEW.id,
      jsonb_build_object('title', NEW.title, 'message', COALESCE(NEW.message,''),
                         'link_url', COALESCE(NEW.link_url,''), 'type', NEW.type));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_announcement_event ON public.notifications;
CREATE TRIGGER trg_announcement_event AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.enqueue_announcement_event();

-- Popups
CREATE OR REPLACE FUNCTION public.enqueue_popup_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS TRUE AND (TG_OP='INSERT' OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO public.email_automation_events(event, entity_id, payload)
    VALUES ('popup_created', NEW.id,
      jsonb_build_object('title', NEW.title, 'message', COALESCE(NEW.message,''),
                         'image_url', COALESCE(NEW.image_url,''), 'link_url', COALESCE(NEW.link_url,'')));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_popup_event ON public.popups;
CREATE TRIGGER trg_popup_event AFTER INSERT OR UPDATE OF is_active ON public.popups
FOR EACH ROW EXECUTE FUNCTION public.enqueue_popup_event();

-- Coupons → promo_created
CREATE OR REPLACE FUNCTION public.enqueue_coupon_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS TRUE AND (TG_OP='INSERT' OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO public.email_automation_events(event, entity_id, payload)
    VALUES ('promo_created', NEW.id,
      jsonb_build_object('code', NEW.code, 'description', COALESCE(NEW.description,''),
                         'discount_type', NEW.discount_type, 'discount_value', NEW.discount_value));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_coupon_event ON public.coupons;
CREATE TRIGGER trg_coupon_event AFTER INSERT OR UPDATE OF is_active ON public.coupons
FOR EACH ROW EXECUTE FUNCTION public.enqueue_coupon_event();

-- Delivery offers
CREATE OR REPLACE FUNCTION public.enqueue_delivery_offer_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS TRUE AND (TG_OP='INSERT' OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO public.email_automation_events(event, entity_id, payload)
    VALUES ('offer_created', NEW.id,
      jsonb_build_object('title', NEW.title, 'description', COALESCE(NEW.description,''),
                         'offer_type', NEW.offer_type, 'discount_value', NEW.discount_value));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_delivery_offer_event ON public.delivery_offers;
CREATE TRIGGER trg_delivery_offer_event AFTER INSERT OR UPDATE OF is_active ON public.delivery_offers
FOR EACH ROW EXECUTE FUNCTION public.enqueue_delivery_offer_event();

-- Categories
CREATE OR REPLACE FUNCTION public.enqueue_category_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_active IS TRUE AND (TG_OP='INSERT' OR OLD.is_active IS DISTINCT FROM NEW.is_active) THEN
    INSERT INTO public.email_automation_events(event, entity_id, payload)
    VALUES ('category_published', NEW.id,
      jsonb_build_object('name', NEW.name, 'slug', NEW.slug,
                         'description', COALESCE(NEW.description,''),
                         'image_url', COALESCE(NEW.image_url, NEW.banner_url, '')));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_category_event ON public.categories;
CREATE TRIGGER trg_category_event AFTER INSERT OR UPDATE OF is_active ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.enqueue_category_event();

-- Support requests → email the support team
CREATE OR REPLACE FUNCTION public.enqueue_support_request_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.email_automation_events(event, entity_id, payload)
  VALUES ('support_request_created', NEW.id,
    jsonb_build_object('conversation_id', NEW.id, 'user_id', NEW.user_id,
                       'subject', COALESCE(NEW.subject,'New support request'),
                       'type', COALESCE(NEW.type,'chat')));
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_support_request_event ON public.support_conversations;
CREATE TRIGGER trg_support_request_event AFTER INSERT ON public.support_conversations
FOR EACH ROW EXECUTE FUNCTION public.enqueue_support_request_event();
