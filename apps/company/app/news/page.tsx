export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import Page from "@/_pages/NewsPage";

export const metadata: Metadata = {
  title: "News & Updates — Orizino",
  description: "The latest news, updates, and stories from Orizino.",
  openGraph: {
    title: "News & Updates — Orizino",
    description: "The latest news, updates, and stories from Orizino.",
    type: "website",
  },
};

export default function Route() {
  return <Page />;
}
