
-- Product interactions: lightweight event log for recommendations
CREATE TABLE IF NOT EXISTS public.product_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NULL,
  session_id text NULL,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('view','click','cart','wishlist','purchase','dwell')),
  dwell_ms integer NULL,
  source text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pi_user_created ON public.product_interactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pi_session_created ON public.product_interactions (session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pi_product_created ON public.product_interactions (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pi_kind_created ON public.product_interactions (kind, created_at DESC);

ALTER TABLE public.product_interactions ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anon + auth). user_id must match auth.uid() when authenticated.
CREATE POLICY "Anyone can log interactions"
  ON public.product_interactions
  FOR INSERT
  TO public
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can read own interactions"
  ON public.product_interactions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all interactions"
  ON public.product_interactions
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
