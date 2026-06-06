import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  transpilePackages: [
    "@orizino/ui",
    "@orizino/shared",
    "@orizino/supabase",
  ],

  async rewrites() {
    return [
      // Root → origin root (AdminLanding / control center)
      {
        source: "/",
        destination: "/origin",
      },
      // All short-form admin paths → /origin/* (skips auth, _next, affiliate-hub)
      {
        source: "/:path((?!origin|auth|affiliate-hub|_next|api|favicon|.*\\..*).*)",
        destination: "/origin/:path",
      },
    ];
  },
};

export default nextConfig;
