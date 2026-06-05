ALTER TABLE public.product_interactions DROP CONSTRAINT IF EXISTS product_interactions_kind_check;

ALTER TABLE public.product_interactions
  ADD CONSTRAINT product_interactions_kind_check
  CHECK (kind IN ('view','click','cart','wishlist','purchase','dwell','hover'));