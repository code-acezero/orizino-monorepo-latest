SELECT cron.unschedule('affiliate-report-weekly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='affiliate-report-weekly');
SELECT cron.unschedule('affiliate-report-monthly') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='affiliate-report-monthly');

SELECT cron.schedule(
  'affiliate-report-weekly',
  '0 2 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://project--e108d47f-9d62-4808-9e06-03ac25079d49.lovable.app/api/public/hooks/affiliate-report-weekly',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTEzNTQsImV4cCI6MjA4ODQ2NzM1NH0.fUlkpFRCD5S32AOpKavIzFoQzvqOFyME3l6190tuh3A"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'affiliate-report-monthly',
  '0 3 1 * *',
  $$
  SELECT net.http_post(
    url := 'https://project--e108d47f-9d62-4808-9e06-03ac25079d49.lovable.app/api/public/hooks/affiliate-report-monthly',
    headers := '{"Content-Type":"application/json","apikey":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9lY3RqZG5ndnJxbnh3aG53ZnJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4OTEzNTQsImV4cCI6MjA4ODQ2NzM1NH0.fUlkpFRCD5S32AOpKavIzFoQzvqOFyME3l6190tuh3A"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);