export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Page from "@/_pages/PortfolioPage";

export const metadata: Metadata = {
  title: "Portfolio — Orizino",
  description: "A curated selection of campaigns, editorials, and visual identities that define our aesthetic.",
  openGraph: {
    title: "Portfolio — Orizino",
    description: "Creative work and campaigns by Orizino.",
    type: "website",
  },
};

export default function Route() {
  return <Page />;
}
