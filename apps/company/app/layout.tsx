export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Orizino — Premium & Luxurious Fashion",
  description: "orizino — premium & luxurious fashion brand",
  openGraph: {
    siteName: "Orizino",
    type: "website",
    title: "Orizino — Premium & Luxurious Fashion",
    description: "orizino — premium & luxurious fashion brand",
    images: [
      {
        url: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orizino — Premium & Luxurious Fashion",
    description: "orizino — premium & luxurious fashion brand",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
    ],
  },
  other: {
    "theme-color": "#0a0a0a",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
