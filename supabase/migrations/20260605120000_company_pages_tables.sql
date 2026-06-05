-- Company app: Portfolio items table
CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  category text NOT NULL DEFAULT 'Campaign',
  description text,
  image_url text,
  year text,
  tags text[] DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT ALL ON public.portfolio_items TO service_role;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_items public read"
  ON public.portfolio_items FOR SELECT USING (is_active = true);

CREATE POLICY "portfolio_items admin write"
  ON public.portfolio_items FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER portfolio_items_updated_at
  BEFORE UPDATE ON public.portfolio_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Company app: News / updates articles table
CREATE TABLE IF NOT EXISTS public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  body text,
  cover_image_url text,
  category text,
  tags text[] DEFAULT '{}',
  featured boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_news_articles_published_at ON public.news_articles (published_at DESC);
CREATE INDEX idx_news_articles_slug ON public.news_articles (slug);

GRANT SELECT ON public.news_articles TO anon, authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "news_articles public read"
  ON public.news_articles FOR SELECT USING (is_published = true AND published_at <= now());

CREATE POLICY "news_articles admin write"
  ON public.news_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER news_articles_updated_at
  BEFORE UPDATE ON public.news_articles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Seed one sample portfolio item and one news article (optional, remove if unwanted)
INSERT INTO public.portfolio_items (title, category, description, year, sort_order)
VALUES
  ('Summer Campaign 2025', 'Campaign', 'Our bold summer editorial shoot across Dhaka rooftops.', '2025', 10),
  ('Signature Lookbook', 'Lookbook', 'Full-line lookbook for the Signature collection.', '2025', 20)
ON CONFLICT DO NOTHING;
