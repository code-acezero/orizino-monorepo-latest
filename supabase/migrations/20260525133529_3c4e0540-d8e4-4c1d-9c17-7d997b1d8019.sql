
CREATE TABLE IF NOT EXISTS public.ai_widget_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fab_floating_texts text[] NOT NULL DEFAULT ARRAY[
    'Ask Agent Flow',
    'Find your style',
    'Track an order',
    'Need a recommendation?',
    'We''re here 24/7'
  ],
  fab_animation_style text NOT NULL DEFAULT 'drift',
  fab_animation_intensity int NOT NULL DEFAULT 5,
  fab_show_avatar_inline boolean NOT NULL DEFAULT true,
  chat_greeting_logged_in text NOT NULL DEFAULT 'Hi {name}, I''m Agent Flow — your personal Orizino assistant. How can I help you today?',
  chat_greeting_guest text NOT NULL DEFAULT 'Welcome to Orizino. I''m Agent Flow, your shopping concierge. What brings you in today?',
  chat_premade_questions text[] NOT NULL DEFAULT ARRAY[
    'Track my order',
    'What''s your return policy?',
    'Recommend something for me',
    'Talk to a human'
  ],
  welcome_enabled boolean NOT NULL DEFAULT true,
  welcome_first_time text NOT NULL DEFAULT 'Welcome to {brand} — where every detail is curated for you.',
  welcome_returning_today text[] NOT NULL DEFAULT ARRAY[
    'Hey, we meet again today. Ready to discover something new?',
    'Back so soon? Let''s pick up where you left off.'
  ],
  welcome_returning_week text[] NOT NULL DEFAULT ARRAY[
    'Welcome back. Fresh arrivals are waiting for you.',
    'Good to see you again — shall I show you what''s new?'
  ],
  welcome_returning_long text[] NOT NULL DEFAULT ARRAY[
    'Long time no see. Let me give you a quick tour of what''s new.',
    'It''s been a while — let''s see if something catches your eye today.'
  ],
  welcome_returning_logged_in text[] NOT NULL DEFAULT ARRAY[
    'Welcome back, {name}. Your style picks are ready.',
    'Hello {name}, anything special you''re looking for today?'
  ],
  welcome_cinematic_duration_ms int NOT NULL DEFAULT 4500,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_widget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai widget settings"
  ON public.ai_widget_settings FOR SELECT
  TO public USING (true);

CREATE POLICY "Admins manage ai widget settings"
  ON public.ai_widget_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_ai_widget_settings_updated_at
  BEFORE UPDATE ON public.ai_widget_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

INSERT INTO public.ai_widget_settings DEFAULT VALUES;
