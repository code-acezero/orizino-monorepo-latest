ALTER TABLE public.affiliate_settings ADD COLUMN IF NOT EXISTS display_style text NOT NULL DEFAULT 'console';
ALTER TABLE public.affiliate_settings DROP CONSTRAINT IF EXISTS affiliate_settings_display_style_check;
ALTER TABLE public.affiliate_settings ADD CONSTRAINT affiliate_settings_display_style_check CHECK (display_style IN ('console','editorial','pulse'));