
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule existing jobs with same name (idempotent)
DO $$
BEGIN
  PERFORM cron.unschedule('dispatch-email-campaigns');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('process-email-automations');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'dispatch-email-campaigns',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--5f6e4f1b-fef3-4515-994e-c3cb9b45f3f0.lovable.app/api/public/hooks/dispatch-email-campaigns',
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
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--5f6e4f1b-fef3-4515-994e-c3cb9b45f3f0.lovable.app/api/public/hooks/process-email-automations',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTEzNTQsImV4cCI6MjA4ODQ2NzM1NH0.fUlkpFRCD5S32AOpKavIzFoQzvqOFyME3l6190tuh3A'
    ),
    body := jsonb_build_object('time', now())
  );
  $$
);
