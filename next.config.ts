import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "standalone",
  // L'agent de test navigateur proxifie via le domaine de preview space-z.ai :
  // autoriser explicitement ces origines en dev (Next.js 16 les bloque sinon).
  allowedDevOrigins: ["*.space-z.ai", "localhost", "127.0.0.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
