"use client";
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Slim, dismissible top offer banner. Replaces the chunky DeliveryOfferBanner
 * for top-of-page placement. Uses localStorage to remember dismissal per offer id.
 */
const DISMISS_KEY = "topOfferBanner.dismissedId";

const TopOfferBanner: React.FC = () => {
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      setDismissedId(localStorage.getItem(DISMISS_KEY));
    } catch { /* ignore */ }
  }, []);

  const { data: offers = [] } = useQuery({
    queryKey: ["top-offer-banner"],
    queryFn: async () => {
      const { data } = await supabase
        .from("delivery_offers")
        .select("id, title, description, min_order_amount")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

  const offer = offers.find((o) => o.id !== dismissedId);
  if (!offer) return null;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, offer.id); } catch { /* ignore */ }
    setDismissedId(offer.id);
  };

  const subtitle =
    offer.description ||
    (offer.min_order_amount && offer.min_order_amount > 0
      ? `Min order ৳${offer.min_order_amount}`
      : "");

  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={offer.id}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-b border-border/40"
      >
        <div className="max-w-[1440px] mx-auto px-3 sm:px-4 lg:px-6 h-7 md:h-8 flex items-center gap-2">
          <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
          <p className="flex-1 min-w-0 truncate text-[11px] md:text-[12px] leading-none">
            <span className="font-semibold text-foreground">{offer.title}</span>
            {subtitle && (
              <span className="text-muted-foreground"> · {subtitle}</span>
            )}
          </p>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 -mr-1 p-1 rounded-full text-muted-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TopOfferBanner;
