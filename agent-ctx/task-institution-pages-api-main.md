# Task: Implement Institution Pages and API Routes

## Agent: Main Developer
## Date: 2026-06-15

## Summary

Implemented all 11 institution pages and 12 institution API routes for the MediHelm project.

## PART A: Institution Pages (11 pages)

All pages were already well-implemented with:
- `'use client'` directives
- Existing component imports (CoverageMap, ComplianceOverview, AlertForm, DiffusionTracker, BeninSupplyMap)
- French labels throughout
- Loading states, KPI cards, tables, charts
- 300-500+ lines per page

### Fixed Issue:
- Added missing `Badge` import in `/institutions/dpmed/conformite/page.tsx`

### Pages verified:
1. `/institutions/dpmed/page.tsx` - DPMED Dashboard (KPIs, charts, recent alerts table)
2. `/institutions/dpmed/carte/page.tsx` - CoverageMap component
3. `/institutions/dpmed/conformite/page.tsx` - ComplianceOverview component
4. `/institutions/dpmed/pharmacovigilance/page.tsx` - EI signalements + drug surveillance
5. `/institutions/dpmed/alertes/page.tsx` - Alert list with filters and pagination
6. `/institutions/dpmed/alertes/nouvelle/page.tsx` - AlertForm component
7. `/institutions/dpmed/alertes/[id]/page.tsx` - Alert detail + DiffusionTracker
8. `/institutions/sobaps/page.tsx` - SoBAPS Dashboard (delivery KPIs, charts)
9. `/institutions/sobaps/carte/page.tsx` - CoverageMap (mode='sobaps')
10. `/institutions/abrp/page.tsx` - ABRP Dashboard (anonymized analytics)
11. `/institutions/abrp/carte/page.tsx` - BeninSupplyMap

## PART B: Institution API Routes (12 routes + 1 supporting route)

### All routes updated with:
- `requireAuth` from `@/lib/api-auth` with appropriate RBAC module/action
- Proper Prisma queries with includes and filters
- Data format fixes for frontend component compatibility

### Auth mapping:
- DPMED routes: `M14_DASHBOARD`, `M18_ALERTES_DPMED`, `M16_PHARMACOVIGILANCE` (read/write)
- SoBAPS routes: `M03_COMMANDES`, `M14_DASHBOARD` (read)
- ABRP routes: `M15_ANALYTICS` (read)
- Conformite scores: `M19_CONFORMITE` (read)

### Routes implemented:
1. `/api/portail/dpmed/dashboard/route.ts` - GET: Alert counts, acquittal rates, compliance stats, monthly trends
2. `/api/portail/dpmed/alertes/route.ts` - GET: List with pagination, POST: Create + auto-diffusion
3. `/api/portail/sobaps/confirmations/route.ts` - GET: Delivery confirmations, POST: Create/update reception
4. `/api/portail/abrp/dashboard/route.ts` - GET: Anonymized market analytics with `niveau` in tensionsDCI
5. `/api/institutions/conformite/scores/route.ts` - GET: ScoreConformite transformed for ComplianceOverview (returns array directly, maps `scorePharmacovigilance` → `scorePharmacovigi`, `dateCalcul` → `calculatedAt`)
6. `/api/institutions/dpmed/pharmacovigilance/route.ts` - GET: SignalementEI + MedicamentSurveillance with stats
7. `/api/institutions/dpmed/carte-couverture/route.ts` - GET: Pharmacy locations with acquittal stats, handles both alerteId filter and default latest diffusion
8. `/api/institutions/dpmed/alertes/route.ts` - GET: AlerteDPMED with filters (type, urgence, statut) + pagination
9. `/api/institutions/sobaps/carte-officines/route.ts` - GET: Officine locations with delivery status
10. `/api/institutions/sobaps/dashboard/route.ts` - GET: SoBAPS KPIs, monthly trends, top pharmacies
11. `/api/institutions/abrp/analytics/route.ts` - GET: Anonymized supply analytics per department
12. `/api/institutions/abrp/carte-approvisionnement/route.ts` - GET: Department supply scores for map

### Additional route updated:
- `/api/alertes/dpmed/[id]/route.ts` - Added requireAuth for GET (read) and PATCH (write)

## Data Format Fixes:
- Conformite scores API: Returns array directly (not wrapped object) to match ComplianceOverview component
- Maps `scorePharmacovigilance` → `scorePharmacovigi` and `dateCalcul` → `calculatedAt`
- ABRP dashboard API: Added `niveau` field to `tensionsDCI` (CRITIQUE/ELEVE/MODERE)
- Carte-couverture: Improved handling of both alerteId filter and default latest diffusion

## Lint & Type Check Results:
- ESLint: 0 errors, 0 warnings on all modified files
- TypeScript: 0 errors in all modified institution/API files
