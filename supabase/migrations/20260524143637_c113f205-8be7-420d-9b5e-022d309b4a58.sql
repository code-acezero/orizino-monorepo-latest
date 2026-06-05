DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'call_logs') THEN
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS drive_file_id text;
    ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS drive_synced_at timestamptz;
  END IF;
END $$;