UPDATE site_settings
SET value = (value::jsonb
  || jsonb_build_object(
    'avatar_type', 'image',
    'avatar_url', '/images/agent-flow-avatar.png'
  ))
WHERE key='ai_agent_config';