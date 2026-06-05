DROP POLICY IF EXISTS "Public can view non-sensitive settings" ON public.site_settings;

CREATE POLICY "Public can view non-sensitive settings"
ON public.site_settings
FOR SELECT
TO public
USING (key = ANY (ARRAY[
  'site_name','site_description','logo_url','site_icon_url','favicon_url','theme',
  'primary_color','accent_color','font_family','announcement_bar','social_links',
  'contact_info','ai_agent_config','currency_config','homepage_layout','seo_title',
  'seo_description','seo_keywords','og_image_url','site_theme','site_mode',
  'site_customizer','mobile_ui_config','logo_display_style','logo_effect',
  'title_letter_colors','showcase_config','home_category_sections','home_sales_config',
  'home_new_arrivals','home_layout_config','home_section_order','product_page_layout',
  'notification_order','popup_order','voice_call_config','seo_pages','seo_global',
  'footer_config','title_font','shipping_fee','free_shipping_threshold','tax_rate',
  'contact_email','contact_phone','support_url','address','announcement_bar_text',
  'announcement_bar_enabled','order_prefix','items_per_page','allow_guest_checkout',
  'show_stock_count','low_stock_threshold','social_facebook','social_instagram',
  'social_twitter','social_youtube','social_tiktok','terms_url','privacy_url',
  'refund_policy_url','maintenance_mode','landing_config','payment_bkash_personal',
  'payment_nagad_personal','payment_upay_personal','payment_rocket_personal',
  'payment_stripe_config','payment_bkash_merchant','payment_nagad_merchant',
  'payment_sslcommerz_config','payment_gateways_enabled','payment_gateways_config',
  'branding_config','facebook_pixel_config','google_ads_config','search_console_config',
  'ad_setup_config','pathao_public_config','steadfast_public_config',
  'brand_prefix','brand_suffix'
]));