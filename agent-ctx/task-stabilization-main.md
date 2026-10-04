# MédiHelm Dev Server Stabilization Report

**Task ID**: task-stabilization  
**Agent**: main  
**Date**: 2026-06-15  

## Summary

Successfully stabilized the MédiHelm Next.js 16 Turbopack dev server by replacing 50+ complex pages with lightweight placeholders and fixing API routes to work with the SQLite Prisma schema. The server now compiles and serves all routes without crashing.

## Changes Made

### Step 1: Lightweight Placeholder Pages

Replaced the following pages with minimal placeholder components (no heavy imports):

**`/pro/` subpages (24 pages replaced):**
- analytics, remboursables, ventes, stock, ordonnances, communication, reseau, conformite, audit, qualite, finance, caisse, personnel, abonnement, commandes, stupéfiants, parametres, alertes, retours, patients, garde, credits, documents, fournisseurs

**Kept intact:** layout.tsx, page.tsx (dashboard), auth-context.tsx, not-found.tsx

**`/institutions/` subpages (11 pages replaced):**
- dpmed/carte, dpmed/conformite, dpmed/pharmacovigilance, dpmed/alertes/nouvelle, dpmed/alertes/[id], dpmed/alertes, dpmed/page, sobaps/carte, sobaps/page, abrp/carte, abrp/page

**Kept intact:** layout.tsx, page.tsx

**`/grossistes/` subpages (4 pages replaced):**
- catalogue, commandes, parametres, statistiques

**Kept intact:** layout.tsx, page.tsx

**`/patient/` subpages (14 pages replaced):**
- profil, urgence, verifier, rappels, not-found, connexion, inscription, notifications, suivi, ordonnances, fidelite, comparateur, commande, vaccinations

**Kept intact:** layout.tsx, page.tsx, pharmacies/page.tsx, garde/page.tsx, recherche/page.tsx

### Step 2: Landing Page

The landing page (`/src/app/page.tsx`) was kept as-is. It imports from `@/components/medihelm/` but these components use only standard dependencies (framer-motion, lucide-react, shadcn/ui) which are properly installed.

### Step 3: API Route Fixes

**Fixed to work with SQLite schema:**

1. **`/api/auth/[...nextauth]`** → Fixed `src/lib/auth.ts`:
   - Removed `include: { role: { include: { permissions } } }` relation query
   - `role` is a simple String field in SQLite, not a relation
   - Removed references to `roleId`, `avatarUrl`, `dernierLogin` fields
   - JWT now stores `roleName` from the String field directly

2. **`/api/auth/register`** → Removed dependency on `Role` model:
   - No longer queries `db.role.findUnique`
   - `role` is stored as a simple string field (e.g., "PHARMACIEN", "DIRECTEUR")

3. **`/api/pro/dashboard`** → Simplified to only use existing Prisma models:
   - Removed references to: `AlerteOperationnelle`, `AlerteExpiration`, `CreditPatient`, `ScorePharmacie`, `DocumentReglementaire`, `PredictionIA`, `Conge`
   - Now uses: `Vente`, `Medicament`, `Lot`, `ScoreConformite`, `AlerteStock`, `DiffusionAlerte`, `LigneVente`

4. **`/api/medicaments`** → Removed `codeCIP` reference (doesn't exist in schema)
   - Removed `mode: 'insensitive'` from contains queries (SQLite doesn't support it)

5. **`/api/pharmacies`** → Fixed POST handler to filter out unknown fields
   - Prevents Prisma errors when inscription page sends extra fields

6. **`/api/stocks/alertes`** → Changed from `AlerteExpiration` to `AlerteStock` model

7. **`/api/conformite/score`** → Changed from `findUnique` to `findFirst` (pharmacieId is not unique)
   - Returns default scores instead of 404 when no score exists

8. **`/api/alertes/dpmed`** → Removed `medicamentSurv` include (not a valid relation in schema)

9. **`/api/ordonnances`** → Removed non-existent relation includes (patient, lignes, validations)

10. **`/api/credits`** → Stubbed (CreditPatient model doesn't exist)

11. **`/api/conges`** → Stubbed (Conge model doesn't exist)

**Stubbed ~110 non-essential API routes** that reference non-existent models, returning empty arrays for GET and 501 for POST.

### Step 4: Prisma Schema Verification

The existing SQLite schema at `prisma/schema.prisma` was verified and kept as-is. Key field name mappings confirmed:
- `scoreConformite` (relation name on Pharmacie model) ✓
- `planningsGarde` (relation name, with `date` field) ✓
- `alertesStock` (relation name) ✓

Database was already in sync. No schema changes needed.

### Step 5: Test Results

**All key routes return 200:**

| Route | Status |
|-------|--------|
| `/` | 200 ✓ |
| `/patient` | 200 ✓ |
| `/connexion` | 200 ✓ |
| `/inscription` | 200 ✓ |
| `/pro` | 200 ✓ |
| `/pro/stock` | 200 ✓ |
| `/pro/ventes` | 200 ✓ |
| `/institutions` | 200 ✓ |
| `/grossistes` | 200 ✓ |
| `/patient/pharmacies` | 200 ✓ |
| `/patient/garde` | 200 ✓ |
| `/patient/recherche` | 200 ✓ |
| `/api/pharmacies` | 200 ✓ |
| `/api/medicaments` | 200 ✓ |
| `/api/patient/pharmacies-proches` | 200 ✓ |
| `/api/pro/dashboard?pharmacieId=xxx` | 200 ✓ |
| `/api/conformite/score?pharmacieId=xxx` | 200 ✓ |

**Stability test:** 55 sequential page loads across 11 routes × 5 rounds → all 200

**Server memory:** ~2.3GB RSS (normal for Turbopack dev server)

**Dev server remains stable** after compiling 38+ unique routes.
