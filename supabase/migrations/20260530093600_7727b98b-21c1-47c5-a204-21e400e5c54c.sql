
-- 1. Add columns to delivery_offers for silent shipping accounting
ALTER TABLE public.delivery_offers
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'self',
  ADD COLUMN IF NOT EXISTS applicable_couriers text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS absorb_from_product boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.delivery_offers.source IS 'self = our own Orizino delivery; courier = absorbed when a partner courier (Pathao/Steadfast) is used';
COMMENT ON COLUMN public.delivery_offers.applicable_couriers IS 'Empty array = all couriers; otherwise restrict (orizino, pathao, steadfast)';
COMMENT ON COLUMN public.delivery_offers.absorb_from_product IS 'When true, customer sees full product price + Free Delivery; shop absorbs shipping cost from margin internally';

-- 2. Add courier-assignment columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_courier text,
  ADD COLUMN IF NOT EXISTS courier_assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS courier_assigned_by uuid,
  ADD COLUMN IF NOT EXISTS delivery_cost_actual numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_offer_id uuid,
  ADD COLUMN IF NOT EXISTS margin_absorbed numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.orders.assigned_courier IS 'orizino | pathao | steadfast | null. Decided by admin in approval panel.';
COMMENT ON COLUMN public.orders.delivery_cost_actual IS 'Internal: actual cost shop pays courier. Filled when admin assigns courier.';
COMMENT ON COLUMN public.orders.margin_absorbed IS 'Internal: shipping cost absorbed from product margin when a courier-source offer applied.';

-- 3. Seed Orizino self-delivery pricing rules (skip if already present)
INSERT INTO public.courier_pricing_rules (provider, zone_type, weight_max, base_fee, per_kg_fee, hub_pickup_discount, is_active, sort_order)
SELECT 'orizino', 'inside_city',  1.0, 50,  20, 20, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.courier_pricing_rules WHERE provider='orizino' AND zone_type='inside_city');

INSERT INTO public.courier_pricing_rules (provider, zone_type, weight_max, base_fee, per_kg_fee, hub_pickup_discount, is_active, sort_order)
SELECT 'orizino', 'sub_city',     1.0, 80,  25, 30, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.courier_pricing_rules WHERE provider='orizino' AND zone_type='sub_city');

INSERT INTO public.courier_pricing_rules (provider, zone_type, weight_max, base_fee, per_kg_fee, hub_pickup_discount, is_active, sort_order)
SELECT 'orizino', 'outside_city', 1.0, 130, 30, 50, true, 0
WHERE NOT EXISTS (SELECT 1 FROM public.courier_pricing_rules WHERE provider='orizino' AND zone_type='outside_city');

-- 4. site_settings row for AI assistant config (single source of truth)
INSERT INTO public.site_settings (key, value)
SELECT 'ai_assistant_config', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key='ai_assistant_config');

-- 5. site_settings row for mobile performance toggles
INSERT INTO public.site_settings (key, value)
SELECT 'mobile_perf_settings', jsonb_build_object(
  'reduce_motion_mobile', true,
  'disable_3d_mobile', true,
  'lightweight_mode_mobile', true,
  'reduce_motion_tablet', true,
  'disable_3d_tablet', true,
  'lightweight_mode_tablet', false
)
WHERE NOT EXISTS (SELECT 1 FROM public.site_settings WHERE key='mobile_perf_settings');
