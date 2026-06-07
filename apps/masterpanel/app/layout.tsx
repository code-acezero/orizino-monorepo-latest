export const dynamic = "force-dynamic";
import type { Metadata } from "next";
import "./globals.css";
import "../components/loaders/loaders.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Orizino",
  description: "orizino — premium & luxurious fashion brand",
  openGraph: {
    siteName: "Orizino",
    type: "website",
    title: "Orizino",
    description: "orizino — premium & luxurious fashion brand",
    images: [
      {
        url: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Orizino",
    description: "orizino — premium & luxurious fashion brand",
    images: [
      "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/707043ee-fc59-409d-b97b-46adf360ec19",
    ],
  },
  other: {
    "theme-color": "#0a0a0a",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            if (typeof window === 'undefined') return;
            var _mm = window.matchMedia;
            if (!_mm) return;
            window.matchMedia = function(q) {
              var r = _mm.call(window, q);
              if (!r) { return { matches: false, media: q, onchange: null, addListener: function(){}, removeListener: function(){}, addEventListener: function(){}, removeEventListener: function(){}, dispatchEvent: function(){ return false; } }; }
              if (typeof r.addListener !== 'function') { r.addListener = function(fn){ r.addEventListener('change', fn); }; r.removeListener = function(fn){ r.removeEventListener('change', fn); }; }
              return r;
            };
          })();
        ` }} />
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
