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

  // Mark @opentelemetry/api as external so the Netlify edge-function bundler
  // doesn't try to inline it (it's provided by the runtime environment).
  serverExternalPackages: ["@opentelemetry/api"],

  turbopack: {
    rules: {
      "*.otf": { loaders: ["file-loader"], as: "*.url" },
      "*.ttf": { loaders: ["file-loader"], as: "*.url" },
    },
  },
};

export default nextConfig;
