CREATE TABLE public.order_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('invoice','sticker')),
  provider TEXT NOT NULL DEFAULT 'google_docs',
  external_doc_id TEXT NOT NULL,
  external_url TEXT NOT NULL,
  title TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_order_documents_order_id ON public.order_documents(order_id);
CREATE INDEX idx_order_documents_type ON public.order_documents(doc_type);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_documents TO authenticated;
GRANT ALL ON public.order_documents TO service_role;

ALTER TABLE public.order_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view order documents"
ON public.order_documents FOR SELECT TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

CREATE POLICY "Staff can insert order documents"
ON public.order_documents FOR INSERT TO authenticated
WITH CHECK (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));

CREATE POLICY "Staff can delete order documents"
ON public.order_documents FOR DELETE TO authenticated
USING (public.has_any_role(auth.uid(), ARRAY['admin','moderator']::app_role[]));