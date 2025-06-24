import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      { hostname: "zealous-clownfish-33.convex.cloud", protocol: "https" },
    ],
  },
};

export default nextConfig;