import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "standalone",
  // Déploiement Railway (Nixpacks + pnpm) : garantir que les binaires du
  // moteur de requêtes Prisma accompagnent le serveur standalone.
  // Sans cela, `node .next/standalone/server.js` peut démarrer puis échouer
  // au premier accès base (« Query engine library not found »).
  // Deux layouts couverts : bun/npm (node_modules/.prisma) et pnpm
  // (virtual store .pnpm/@prisma+client@…).
  outputFileTracingIncludes: {
    "/**": [
      "./node_modules/.prisma/**/*",
      "./node_modules/@prisma/client/**/*",
      "./node_modules/.pnpm/@prisma+client@*/**/*",
    ],
  },
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
