
ALTER TABLE public.support_conversations
  ADD COLUMN IF NOT EXISTS needs_human boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_support_conv_needs_human
  ON public.support_conversations (needs_human, status)
  WHERE needs_human = true;

CREATE TABLE IF NOT EXISTS public.ai_user_memory (
  user_id uuid PRIMARY KEY,
  tone text,
  interests text[] DEFAULT ARRAY[]::text[],
  recent_intents text[] DEFAULT ARRAY[]::text[],
  last_viewed_products uuid[] DEFAULT ARRAY[]::uuid[],
  preferred_categories uuid[] DEFAULT ARRAY[]::uuid[],
  notes jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_user_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own ai memory" ON public.ai_user_memory;
CREATE POLICY "users read own ai memory" ON public.ai_user_memory
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users upsert own ai memory" ON public.ai_user_memory;
CREATE POLICY "users upsert own ai memory" ON public.ai_user_memory
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users update own ai memory" ON public.ai_user_memory;
CREATE POLICY "users update own ai memory" ON public.ai_user_memory
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "admins read all ai memory" ON public.ai_user_memory;
CREATE POLICY "admins read all ai memory" ON public.ai_user_memory
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_ai_user_memory_updated_at
  BEFORE UPDATE ON public.ai_user_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();
