export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Page from "@/_pages/ProductHighlightsPage";

export const metadata: Metadata = {
  title: "Product Highlights — Orizino",
  description: "Handpicked pieces from our latest collections. Premium quality, impeccable craft.",
  openGraph: {
    title: "Product Highlights — Orizino",
    description: "Handpicked pieces from our latest collections by Orizino.",
    type: "website",
  },
};

export default function Route() {
  return <Page />;
}
