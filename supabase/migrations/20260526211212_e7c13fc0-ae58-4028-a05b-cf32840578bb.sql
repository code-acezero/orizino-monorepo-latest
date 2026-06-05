
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_null_user_created ON public.notifications (created_at DESC) WHERE user_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications (type);
CREATE INDEX IF NOT EXISTS idx_support_conv_status_updated ON public.support_conversations (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_conv_user ON public.support_conversations (user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_conv_created ON public.support_messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON public.call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_caller ON public.call_logs (caller_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_receiver ON public.call_logs (receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_conversation ON public.call_logs (conversation_id);

SELECT cron.unschedule('dispatch-email-campaigns');
SELECT cron.unschedule('process-email-automations');

SELECT cron.schedule(
  'dispatch-email-campaigns',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--e108d47f-9d62-4808-9e06-03ac25079d49.lovable.app/api/public/hooks/dispatch-email-campaigns',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTEzNTQsImV4cCI6MjA4ODQ2NzM1NH0.fUlkpFRCD5S32AOpKavIzFoQzvqOFyME3l6190tuh3A'
    ),
    body := jsonb_build_object('time', now())
  );
  $$
);

SELECT cron.schedule(
  'process-email-automations',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--e108d47f-9d62-4808-9e06-03ac25079d49.lovable.app/api/public/hooks/process-email-automations',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTEzNTQsImV4cCI6MjA4ODQ2NzM1NH0.fUlkpFRCD5S32AOpKavIzFoQzvqOFyME3l6190tuh3A'
    ),
    body := jsonb_build_object('time', now())
  );
  $$
);

TRUNCATE TABLE net._http_response;
