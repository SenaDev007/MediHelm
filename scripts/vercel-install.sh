#!/usr/bin/env bash
# =============================================================================
# MediHelm — installCommand Vercel (Root Directory = racine du dépôt)
# =============================================================================
# Pourquoi ce script existe : la limite de schéma Vercel impose
# installCommand <= 256 caracteres — la logique vit donc ici.
#
# Pourquoi la logique : le build cache Vercel peut réinjecter dans le sandbox
# des fichiers périmés de l'ère turborepo (lockfiles à importers fantômes
# apps/* + packages/* -> ERR_PNPM_LOCKFILE_MISSING_DEPENDENCY, builds 16:12 /
# 16:40). On restaure donc les fichiers suivis depuis git avant tout install.
#
# Enchaînement :
#   1. git checkout -- .  -> neutralise TOUTE pollution du cache (fichiers suivis)
#      + rm des pnpm-workspace.yaml parasites (pnpm 11 auto-crée un template ;
#        un workspace à la racine changerait complètement le comportement pnpm)
#   2. pnpm install --frozen-lockfile dans frontend/ (dépendances de l'app)
#   3. shim de compat racine -> le runtime @vercel/next résout next/public/
#      next.config.ts depuis le Root Directory (la racine du dépôt)
set -euo pipefail

cd "$(dirname "$0")/.."   # racine du dépôt, quel que soit le cwd d'appel

echo "> [vercel-install] restauration de l'état git (anti-pollution cache)..."
git checkout -- . 2>/dev/null || true
rm -f pnpm-workspace.yaml frontend/pnpm-workspace.yaml

echo "> [vercel-install] pnpm install --frozen-lockfile (frontend/)..."
(
  cd frontend
  pnpm install --frozen-lockfile
)

echo "> [vercel-install] shim racine -> frontend/* (runtime @vercel/next)..."
cd "$(dirname "$0")/.."
rm -rf node_modules public .next
ln -sfn frontend/node_modules node_modules
ln -sfn frontend/public public
if [ -f frontend/next.config.ts ]; then
  ln -sfn frontend/next.config.ts next.config.ts
fi

echo "> [vercel-install] terminé."
