
ALTER TABLE public.order_documents
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS pdf_doc_id TEXT,
  ADD COLUMN IF NOT EXISTS folder_id TEXT,
  ADD COLUMN IF NOT EXISTS trigger_reason TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'archived',
  ADD COLUMN IF NOT EXISTS error_message TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_order_documents_auto
  ON public.order_documents(order_id, doc_type, trigger_reason)
  WHERE trigger_reason <> 'manual' AND status = 'archived';

INSERT INTO public.site_settings(key, value)
VALUES ('gdocs_settings', jsonb_build_object(
  'invoice_title_template', 'Invoice — {{order_number}} — {{brand_name}}',
  'sticker_title_template', 'Shipping Label — {{order_number}} — {{customer_name}}',
  'auto_archive', jsonb_build_object(
    'pending_invoice', false,
    'pending_sticker', false,
    'paid_invoice', false,
    'paid_sticker', false,
    'delivered_invoice', false,
    'delivered_sticker', false
  ),
  'folders', jsonb_build_object(
    'pending', '',
    'paid', '',
    'delivered', ''
  ),
  'edge_url', '',
  'service_role_jwt', ''
))
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.auto_archive_order_gdocs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings jsonb;
  auto jsonb;
  service_key text;
  project_url text;
  reasons text[] := ARRAY[]::text[];
  reason text;
  doc_type text;
  endpoint text;
BEGIN
  SELECT value INTO settings FROM public.site_settings WHERE key = 'gdocs_settings';
  IF settings IS NULL THEN RETURN NEW; END IF;
  auto := COALESCE(settings->'auto_archive', '{}'::jsonb);

  IF TG_OP = 'INSERT' THEN
    reasons := array_append(reasons, 'pending');
  ELSE
    IF NEW.status = 'paid' AND COALESCE(OLD.status,'') <> 'paid' THEN
      reasons := array_append(reasons, 'paid');
    END IF;
    IF NEW.status = 'delivered' AND COALESCE(OLD.status,'') <> 'delivered' THEN
      reasons := array_append(reasons, 'delivered');
    END IF;
  END IF;

  IF array_length(reasons, 1) IS NULL THEN RETURN NEW; END IF;

  project_url := settings->>'edge_url';
  service_key := settings->>'service_role_jwt';
  IF project_url IS NULL OR project_url = '' OR service_key IS NULL OR service_key = '' THEN
    RETURN NEW;
  END IF;

  FOREACH reason IN ARRAY reasons LOOP
    FOREACH doc_type IN ARRAY ARRAY['invoice','sticker'] LOOP
      IF COALESCE((auto->>(reason||'_'||doc_type))::boolean, false) THEN
        endpoint := rtrim(project_url, '/') || '/archive-to-gdocs';
        PERFORM net.http_post(
          url := endpoint,
          headers := jsonb_build_object(
            'Content-Type','application/json',
            'Authorization','Bearer '||service_key,
            'x-internal-trigger','1'
          ),
          body := jsonb_build_object(
            'order_id', NEW.id,
            'doc_type', doc_type,
            'trigger_reason', reason
          )
        );
      END IF;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_archive_order_gdocs ON public.orders;
CREATE TRIGGER trg_auto_archive_order_gdocs
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_archive_order_gdocs();
