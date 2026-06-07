import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  transpilePackages: ["@orizino/ui", "@orizino/shared", "@orizino/supabase"],
};

export default nextConfig;
