import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  output: "standalone",
  // ⚠ Monorepo backend/ + frontend/ : Next.js infère la racine du dépôt
  // (package.json + lockfile parents) comme racine de traçage. Conséquences
  // assumées et adaptées ailleurs : (1) le standalone est imbriqué en
  // .next/standalone/frontend/server.js — les commandes de démarrage
  // (railway.json, package.json racine) pointent ce chemin ; (2) les globs
  // ci-dessous sont relatifs à la racine du DÉPÔT, d'où le préfixe
  // ./frontend/node_modules/.
  // Ne PAS définir outputFileTracingRoot ici : le loader de config Next
  // réécrit __dirname / import.meta.dirname (vérifié empiriquement) et casse
  // la résolution des alias tsconfig → 228 erreurs « Module not found ».
  // Déploiement Railway (Nixpacks + pnpm hoisted) : embarquer les binaires du
  // moteur de requêtes Prisma avec le serveur standalone.
  // ⚠ Ne JAMAIS remonter à un glob « .pnpm/@prisma+client@*/**/* » : il
  // englobe le symlink « node_modules/prisma » (peer dep pnpm → répertoire)
  // que Turbopack tente de lire comme un fichier → crash build
  // « Is a directory (os error 21) » (reproduit localement 2026-10-05).
  outputFileTracingIncludes: {
    "/**": [
      // Layout bun/npm (dev local) — racine = dépôt :
      "./frontend/node_modules/.prisma/**/*",
      "./frontend/node_modules/@prisma/client/**/*",
      // Layout pnpm hoisted (Railway / Nixpacks) — répertoires réels :
      "./frontend/node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "./frontend/node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/**/*",
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
