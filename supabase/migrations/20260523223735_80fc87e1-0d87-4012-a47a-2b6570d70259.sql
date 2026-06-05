
CREATE OR REPLACE FUNCTION public.increment_campaign_counter(_campaign_id uuid, _field text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _field NOT IN ('sent_count','delivered_count','opened_count','clicked_count','bounced_count','unsubscribed_count','failed_count') THEN
    RAISE EXCEPTION 'invalid field';
  END IF;
  EXECUTE format('UPDATE public.email_campaigns SET %I = %I + 1, updated_at = now() WHERE id = $1', _field, _field) USING _campaign_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_campaign_counter(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_campaign_counter(uuid, text) TO service_role;
