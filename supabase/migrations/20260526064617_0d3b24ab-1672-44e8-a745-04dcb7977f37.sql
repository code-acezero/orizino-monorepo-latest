UPDATE public.ai_widget_settings
SET chat_greeting_logged_in = REPLACE(chat_greeting_logged_in, 'your personal Orizino assistant', 'your personal shopping assistant')
WHERE chat_greeting_logged_in LIKE '%your personal Orizino assistant%';

ALTER TABLE public.ai_widget_settings
  ALTER COLUMN chat_greeting_logged_in
  SET DEFAULT 'Hi {name}, I''m Agent Flow — your personal shopping assistant. How can I help you today?';