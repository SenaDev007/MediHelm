# Task: Implement ALL Grossiste pages and API routes

## Agent: Z.ai Code (Main)

## Summary

Replaced all 4 Grossiste placeholder pages and implemented all 8 Grossiste API routes with full functionality.

## Work Completed

### PART A: 4 Pages Replaced

1. **`/src/app/grossistes/catalogue/page.tsx`** (~500 lines)
   - Product catalog with search by DCI/nom/dosage
   - Filter by disponibilité (disponible/rupture) and forme galénique
   - Uses existing `ProductRow` component for inline editing of price/availability
   - Add new product dialog with full form (DCI, nom, forme, dosage, prix, quantité)
   - Bulk edit mode (select multiple, change price/availability in bulk)
   - Delete product confirmation dialog
   - Stats cards (total, disponibles, rupture)
   - Fetches from `/api/grossistes/[id]/catalogue` with proper `data.produits || data` handling
   - Grossiste selector dropdown

2. **`/src/app/grossistes/commandes/page.tsx`** (~540 lines)
   - Order management with status filter tabs (Toutes, Envoyées, Confirmées, En préparation, En livraison, Livrées, Refusées, Litige)
   - Uses existing `OrderCard` component for each order
   - Status actions: confirm, refuse, prepare, ship, deliver
   - Confirmation dialog for destructive actions (refuse/cancel)
   - Order detail dialog with pharmacie info, line items, status actions
   - Search by reference or pharmacie name
   - Sort by date or montant
   - Stats cards (total, en attente, confirmées/préparation, livrées)
   - Fetches from `/api/grossistes/[id]/commandes`

3. **`/src/app/grossistes/parametres/page.tsx`** (~920 lines)
   - Grossiste profile settings (contact, téléphone, email)
   - API key management (create, view, copy, revoke keys)
   - Webhook configuration (add, toggle, delete webhooks with event type selector)
   - Notification preferences (switches for nouvelle commande, statut change, livraison, stock bas)
   - Danger zone (regenerate all API keys)
   - Grossiste selector for multi-grossiste users
   - Generated key one-time display dialog

4. **`/src/app/grossistes/statistiques/page.tsx`** (~470 lines)
   - Revenue line chart (évolution du CA)
   - Order volume bar chart
   - Status distribution pie chart
   - Average basket bar chart by month
   - Top products by sales volume (ranked list)
   - Top pharmacies by order count and CA (card grid)
   - KPI cards (CA, commandes reçues, taux livraison, pharmacies clientes)
   - Grossiste selector + date period filter (3m, 6m, 1y, quarterly)
   - Fetches from `/api/grossistes/dashboard`

### PART B: 8 API Routes Implemented

1. **`/api/grossistes/route.ts`** — GET: list grossistes with ?actif filter + _count. POST: create with slug uniqueness check. Auth: M17_GROSSISTES read/write.

2. **`/api/grossistes/dashboard/route.ts`** — GET: aggregate KPIs (commandes par statut, CA mois, pharmacies clientes, catalogue count/disponible), monthly trend (6 months), top pharmacies, top products by volume, recent orders. Auth: M17_GROSSISTES read.

3. **`/api/grossistes/catalogue/[id]/route.ts`** — GET: single ProduitGrossiste with grossiste info. PATCH: update price/stock/availability with validation. DELETE: remove product. Auth: M17_GROSSISTES read/write.

4. **`/api/grossistes/commandes/[id]/route.ts`** — GET: single CommandeGrossiste with lignes + pharmacie. PATCH: update status with transition validation (STATUS_TRANSITIONS map). Auth: M17_GROSSISTES read/write.

5. **`/api/grossistes/[id]/catalogue/route.ts`** — GET: list ProduitGrossiste with search/filter/pagination. POST: add product to catalogue with grossiste existence check + prix validation. Auth: M17_GROSSISTES read/write.

6. **`/api/grossistes/[id]/commandes/route.ts`** — GET: list CommandeGrossiste with ?statut filter + pagination, maps pharmacie data separately. Auth: M17_GROSSISTES read.

7. **`/api/grossistes/compare/route.ts`** — GET: compare prices across grossistes by DCI or medicamentNom, returns comparison data + best price + matching products. Auth: M17_GROSSISTES read.

8. **`/api/portail/grossiste/commandes/route.ts`** — GET: list pharmacy orders with filters. POST: create new order with lignes validation, reference generation, grossiste+pharmacie existence checks. Auth: M03_COMMANDES read/write.

Also updated `/api/grossistes/catalogue/route.ts` to add `requireAuth` (was missing).

## Key Design Decisions

- All API routes use `requireAuth` from `@/lib/api-auth` with M17_GROSSISTES (or M03_COMMANDES for portail) role checks
- All pages use "use client" directive with French labels and FCFA currency
- ProductRow component properly integrated with CatalogueItem mapping (prixAchat ↔ prixUnitaire, disponible ↔ actif+quantiteDispo)
- OrderCard component receives proper CommandeGrossiste data shape
- Paginated API responses handled with `data.produits || data` and `data.commandes || data` patterns
- Status transitions validated server-side in commandes/[id] PATCH route

## Lint Results
- All pages: clean (no errors)
- All API routes: clean (no errors)
- Dev server: running successfully on port 3000
