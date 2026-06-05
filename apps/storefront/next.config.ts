import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "@orizino/ui",
    "@orizino/shared",
    "@orizino/supabase",
  ],

  turbopack: {
    rules: {
      "*.otf": { loaders: ["file-loader"], as: "*.url" },
      "*.ttf": { loaders: ["file-loader"], as: "*.url" },
    },
  },
};

export default nextConfig;
