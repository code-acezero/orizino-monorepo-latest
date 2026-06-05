
-- Telegram chats discovered by the bot (one row per chat where the bot is a member)
CREATE TABLE IF NOT EXISTS public.telegram_chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id bigint NOT NULL UNIQUE,
  title text,
  type text,
  username text,
  notify_orders boolean NOT NULL DEFAULT false,
  notify_support boolean NOT NULL DEFAULT false,
  notify_calls boolean NOT NULL DEFAULT false,
  last_message_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage telegram chats"
  ON public.telegram_chats
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_telegram_chats_updated_at
  BEFORE UPDATE ON public.telegram_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Store last processed Telegram update_id offset for getUpdates polling
CREATE TABLE IF NOT EXISTS public.telegram_state (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_update_id bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read telegram state"
  ON public.telegram_state FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.telegram_state (id, last_update_id) VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;
