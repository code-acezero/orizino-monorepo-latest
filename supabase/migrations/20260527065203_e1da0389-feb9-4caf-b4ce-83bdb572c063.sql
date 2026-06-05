
-- 1) Alerts table
CREATE TABLE IF NOT EXISTS public.db_health_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'warning',
  message TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.db_health_alerts TO authenticated;
GRANT ALL ON public.db_health_alerts TO service_role;

ALTER TABLE public.db_health_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read db_health_alerts"
ON public.db_health_alerts FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

CREATE INDEX IF NOT EXISTS idx_db_health_alerts_created ON public.db_health_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_db_health_alerts_kind ON public.db_health_alerts(kind, created_at DESC);

-- 2) Snapshot table for delta-based seq_scan alerts
CREATE TABLE IF NOT EXISTS public.db_health_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relname TEXT NOT NULL,
  seq_scan BIGINT NOT NULL,
  idx_scan BIGINT NOT NULL,
  n_live_tup BIGINT NOT NULL,
  captured_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.db_health_snapshots TO authenticated;
GRANT ALL ON public.db_health_snapshots TO service_role;
ALTER TABLE public.db_health_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read db_health_snapshots"
ON public.db_health_snapshots FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));
CREATE INDEX IF NOT EXISTS idx_db_health_snapshots_rel_time ON public.db_health_snapshots(relname, captured_at DESC);

-- 3) Admin-only table stats RPC
CREATE OR REPLACE FUNCTION public.admin_db_table_stats(p_tables TEXT[] DEFAULT ARRAY['notifications','support_conversations','support_messages','call_logs'])
RETURNS TABLE(relname TEXT, seq_scan BIGINT, seq_tup_read BIGINT, idx_scan BIGINT, idx_tup_fetch BIGINT, n_live_tup BIGINT, last_autoanalyze TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog
AS $$
  SELECT s.relname::text, s.seq_scan, s.seq_tup_read, s.idx_scan, s.idx_tup_fetch, s.n_live_tup, s.last_autoanalyze
  FROM pg_stat_user_tables s
  WHERE s.relname = ANY(p_tables)
    AND public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[])
  ORDER BY s.relname;
$$;
REVOKE ALL ON FUNCTION public.admin_db_table_stats(TEXT[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_db_table_stats(TEXT[]) TO authenticated;

-- 4) Admin-only cron runs RPC
CREATE OR REPLACE FUNCTION public.admin_cron_runs(p_hours INT DEFAULT 24)
RETURNS TABLE(jobid BIGINT, jobname TEXT, schedule TEXT, runid BIGINT, status TEXT, return_message TEXT, start_time TIMESTAMPTZ, end_time TIMESTAMPTZ, duration_ms NUMERIC)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, cron, pg_catalog
AS $$
  SELECT j.jobid, j.jobname::text, j.schedule::text, d.runid, d.status::text, d.return_message::text,
         d.start_time, d.end_time,
         EXTRACT(EPOCH FROM (d.end_time - d.start_time)) * 1000 AS duration_ms
  FROM cron.job j
  JOIN cron.job_run_details d ON d.jobid = j.jobid
  WHERE d.start_time > now() - make_interval(hours => p_hours)
    AND public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[])
  ORDER BY d.start_time DESC
  LIMIT 500;
$$;
REVOKE ALL ON FUNCTION public.admin_cron_runs(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_cron_runs(INT) TO authenticated;

-- 5) Admin-only health summary RPC
CREATE OR REPLACE FUNCTION public.admin_db_health_summary()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]) THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  SELECT jsonb_build_object(
    'http_response_rows', (SELECT count(*) FROM net._http_response),
    'http_response_size', pg_size_pretty(pg_total_relation_size('net._http_response')),
    'cron_jobs_active', (SELECT count(*) FROM cron.job WHERE active),
    'cron_runs_24h', (SELECT count(*) FROM cron.job_run_details WHERE start_time > now() - interval '24 hours'),
    'cron_failures_24h', (SELECT count(*) FROM cron.job_run_details WHERE status='failed' AND start_time > now() - interval '24 hours'),
    'recent_alerts_24h', (SELECT count(*) FROM public.db_health_alerts WHERE created_at > now() - interval '24 hours'),
    'captured_at', now()
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_db_health_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_db_health_summary() TO authenticated;

-- 6) Alert checker (runs via cron). Inserts into db_health_alerts when:
--    - seq_scan grew by >5000 in last 15 min for any monitored table
--    - net._http_response backlog > 5000 rows
--    - cron failures in last hour > 0
CREATE OR REPLACE FUNCTION public.admin_check_db_alerts()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron, pg_catalog
AS $$
DECLARE
  r RECORD;
  prev RECORD;
  delta BIGINT;
  http_rows BIGINT;
  failures BIGINT;
BEGIN
  -- Capture current snapshot
  INSERT INTO public.db_health_snapshots(relname, seq_scan, idx_scan, n_live_tup)
  SELECT s.relname, s.seq_scan, s.idx_scan, s.n_live_tup
  FROM pg_stat_user_tables s
  WHERE s.relname IN ('notifications','support_conversations','support_messages','call_logs');

  -- For each monitored table, compute seq_scan delta vs 15min ago
  FOR r IN SELECT DISTINCT relname FROM public.db_health_snapshots
           WHERE captured_at > now() - interval '5 minutes'
  LOOP
    SELECT * INTO prev FROM public.db_health_snapshots
    WHERE relname = r.relname AND captured_at < now() - interval '12 minutes'
    ORDER BY captured_at DESC LIMIT 1;

    IF prev.id IS NOT NULL THEN
      SELECT (s.seq_scan - prev.seq_scan) INTO delta
      FROM public.db_health_snapshots s
      WHERE s.relname = r.relname AND s.captured_at > now() - interval '5 minutes'
      ORDER BY s.captured_at DESC LIMIT 1;

      IF delta > 5000 THEN
        -- dedupe: skip if same kind already fired in last hour
        IF NOT EXISTS (
          SELECT 1 FROM public.db_health_alerts
          WHERE kind = 'seq_scan_spike:' || r.relname
            AND created_at > now() - interval '1 hour'
        ) THEN
          INSERT INTO public.db_health_alerts(kind, severity, message, details)
          VALUES ('seq_scan_spike:' || r.relname, 'warning',
                  format('Seq scan spike on %s: +%s in 15min', r.relname, delta),
                  jsonb_build_object('table', r.relname, 'delta', delta));
          INSERT INTO public.notifications(user_id, title, message, type)
          VALUES (NULL, 'DB alert: ' || r.relname,
                  format('Seq scans grew by %s in 15min — check polling/indexes.', delta), 'warning');
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- http_response backlog
  SELECT count(*) INTO http_rows FROM net._http_response;
  IF http_rows > 5000 THEN
    IF NOT EXISTS (SELECT 1 FROM public.db_health_alerts
                   WHERE kind = 'http_response_backlog' AND created_at > now() - interval '6 hours') THEN
      INSERT INTO public.db_health_alerts(kind, severity, message, details)
      VALUES ('http_response_backlog', 'warning',
              format('net._http_response has %s rows; truncate to free IO budget', http_rows),
              jsonb_build_object('rows', http_rows));
      INSERT INTO public.notifications(user_id, title, message, type)
      VALUES (NULL, 'DB alert: HTTP backlog',
              format('net._http_response has %s rows. Disk IO at risk.', http_rows), 'warning');
    END IF;
  END IF;

  -- cron failures
  SELECT count(*) INTO failures FROM cron.job_run_details
  WHERE status = 'failed' AND start_time > now() - interval '1 hour';
  IF failures > 0 THEN
    IF NOT EXISTS (SELECT 1 FROM public.db_health_alerts
                   WHERE kind = 'cron_failures' AND created_at > now() - interval '1 hour') THEN
      INSERT INTO public.db_health_alerts(kind, severity, message, details)
      VALUES ('cron_failures', 'error',
              format('%s cron failures in last hour', failures),
              jsonb_build_object('count', failures));
      INSERT INTO public.notifications(user_id, title, message, type)
      VALUES (NULL, 'DB alert: cron failures',
              format('%s cron jobs failed in last hour.', failures), 'error');
    END IF;
  END IF;

  -- Garbage-collect snapshots older than 7 days
  DELETE FROM public.db_health_snapshots WHERE captured_at < now() - interval '7 days';
END $$;
REVOKE ALL ON FUNCTION public.admin_check_db_alerts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_check_db_alerts() TO service_role;

-- 7) Schedule the alert checker every 15 minutes
SELECT cron.unschedule('db-health-check') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='db-health-check');
SELECT cron.schedule('db-health-check', '*/15 * * * *', $cron$SELECT public.admin_check_db_alerts();$cron$);
