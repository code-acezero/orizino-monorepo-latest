
CREATE INDEX IF NOT EXISTS idx_products_active_created ON public.products (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_active_featured ON public.products (is_active, is_featured) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_products_category_active ON public.products (category_id, is_active);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products (slug);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants (product_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON public.orders (user_id, created_at DESC);
