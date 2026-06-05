UPDATE public.site_settings
SET value = jsonb_set(
  jsonb_set(value, '{value,avatar_type}', '"image"'),
  '{value,avatar_url}', '"https://oectjdngvrqnxwhnwfrt.supabase.co/storage/v1/object/public/site-assets/ai-agent/agent-flow-avatar.png"'
)
WHERE key = 'ai_agent_config';