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
  // ⚠ Ne JAMAIS remonter à un glob « .pnpm/@prisma+client@*/**/* » : il
  // englobe le symlink « node_modules/prisma » (peer dep pnpm → répertoire)
  // que Turbopack tente de lire comme un fichier → crash build
  // « Is a directory (os error 21) » (reproduit localement 2026-10-05).
  // Les patterns .pnpm ci-dessous ciblent des sous-répertoires réels
  // (paquet @prisma/client et client généré .prisma), sans feuille symlink.
  outputFileTracingIncludes: {
    "/**": [
      // Layout bun/npm (dev local) :
      "./node_modules/.prisma/**/*",
      "./node_modules/@prisma/client/**/*",
      // Layout pnpm (Railway / Nixpacks) — bases = répertoires réels :
      "./node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "./node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/**/*",
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
