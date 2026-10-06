#!/usr/bin/env bash
# =============================================================================
# MediHelm — buildCommand Vercel (Root Directory = racine du dépôt)
# =============================================================================
# Build Next.js dans frontend/ (validé : 221/221 pages), puis shim .next à la
# racine — le runtime @vercel/next collecte la sortie depuis le Root Directory.
# Le shim est créé MÊME si le build échoue (non-fatal), mais l'exit-code du
# build est propagé pour que Vercel marque correctement l'échec.
set -uo pipefail

cd "$(dirname "$0")/.."   # racine du dépôt, quel que soit le cwd d'appel

echo "> [vercel-build] build Next.js (frontend/)..."
(
  cd frontend
  pnpm run build
) 
BUILD_EXIT=$?

echo "> [vercel-build] shim racine .next -> frontend/.next..."
cd "$(dirname "$0")/.."
rm -rf .next
ln -sfn frontend/.next .next

if [ "$BUILD_EXIT" -ne 0 ]; then
  echo "> [vercel-build] ÉCHEC du build (exit $BUILD_EXIT) — exit-code propagé." >&2
fi
exit "$BUILD_EXIT"
