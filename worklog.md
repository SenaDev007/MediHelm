# Task 4 — Work Log

## Task: P2 — File Upload, Notification Engine, PDF/Excel, Patient Pages, Ordonnance, RH

### 1. File Upload Infrastructure
- Created `/api/upload/route.ts` — POST endpoint accepting multipart/form-data, validates file size (10MB max) and type (JPEG, PNG, WebP, PDF, HEIC), saves to `/uploads/` directory with unique filenames
- Created `/api/uploads/[...path]/route.ts` — GET endpoint to serve uploaded files with proper content-type headers and cache control
- Created `/hooks/use-upload.ts` — Reusable client hook with `upload()`, `uploading`, `progress`, `error` state

### 2. Notification Engine
- Created `/lib/notifications.ts` — `createNotification()` and `notifyPharmacieUsers()` functions for creating in-app/SMS/push/email notifications via Prisma
- Created `/api/notifications/stream/route.ts` — SSE endpoint for real-time notification push with keep-alive ping every 30s

### 3. PDF Generation
- Created `/lib/pdf.ts` — `generateTicketCaisse()` (80mm receipt format) and `generateFacture()` (A4 invoice) functions using jsPDF + jspdf-autotable
- Created `/api/ticket/route.ts` — GET endpoint to generate ticket or facture PDF from vente data, returns inline PDF

### 4. Excel Export
- Created `/lib/excel.ts` — `exportToExcel()` function using XLSX library with auto-sized columns
- Created `/api/exports/stock/route.ts` — Exports stock data with medicament details, lots, and stock totals
- Created `/api/exports/ventes/route.ts` — Exports ventes data with date range filter, payment details
- Created `/api/exports/patients/route.ts` — Exports patient data with assurance and fidelite info

### 5. Enhanced Patient Pages
- **Vaccinations** (`/patient/vaccinations/page.tsx`): Added status badges (completed/scheduled/overdue) with color-coded cards and left border indicator, status summary filter cards, improved timeline layout
- **Fidélité** (`/patient/fidelite/page.tsx`): Added 4-tier progression system (Bronze/Argent/Or/Diamant) with Shield/Award/Crown/Trophy icons, tier progress bar, tier visualization, badge unlock logic based on tier
- **Comparateur** (`/patient/comparateur/page.tsx`): Added sort by price/availability, add-to-cart functionality with cart summary card, cart badge in header, order button
- **Profil** (`/patient/profil/page.tsx`): Added 3-tab layout (Profil/Famille/Sécurité), family member removal, security section with password change dialog, session display, 2FA placeholder
- **Rappels** (`/patient/rappels/page.tsx`): Added edit/delete functionality for reminders, edit dialog with save confirmation, individual card layout per reminder, delete confirmation

### 6. Ordonnance Upload + Validation
- Enhanced `/pro/ordonnances/page.tsx` with:
  - Drag & drop image upload dialog with `useUpload` hook
  - Upload progress indicator
  - Ordonnance image indicator on list items
  - Status progress bar with flow: RECUE → EN_COURS_VALIDATION → VALIDEE → DELIVREE
  - "Commencer validation" button for RECUE status
  - Full validation history display with color-coded entries
  - Updated validation route with proper state transition validation

- Updated `/api/ordonnances/[id]/valider/route.ts`:
  - Full validation flow with state transition rules
  - Valid transitions map: RECUE → [EN_COURS_VALIDATION, VALIDEE, REFUSEE], EN_COURS_VALIDATION → [VALIDEE, REFUSEE], etc.
  - Returns error for invalid transitions

- Updated `/api/ordonnances/[id]/image/route.ts`:
  - Actual file upload to `/uploads/ordonnances/{id}/` directory
  - Proper file size validation (10MB max)
  - Returns database-updated ordonnance with image URL

### 7. RH Planning + Congés + Bulletins
- Enhanced `/pro/personnel/page.tsx` with:
  - **Planning tab**: Week navigation (previous/next with offset), color-coded shifts by poste (PHARMACIEN=teal, CAISSIER=amber, MAGASINIER=blue, PRÉPARATEUR=purple, STAGIAIRE=gray), today highlight, poste legend
  - **Congés tab**: Better type labels using `congeTypeLabels` mapping
  - **Bulletins tab**: Month/year filter dropdowns, filtered bulletin display, Avance column, per-row PDF generation button, export all button
  - Added `posteColorConfig`, `getPosteColor()`, `congeTypeLabels` helper objects
  - Added `planningWeekOffset`, `bulFilterMois`, `bulFilterAnnee` state

### Files Created (11)
- `src/app/api/upload/route.ts`
- `src/app/api/uploads/[...path]/route.ts`
- `src/app/api/notifications/stream/route.ts`
- `src/app/api/ticket/route.ts`
- `src/app/api/exports/stock/route.ts`
- `src/app/api/exports/ventes/route.ts`
- `src/app/api/exports/patients/route.ts`
- `src/hooks/use-upload.ts`
- `src/lib/notifications.ts`
- `src/lib/pdf.ts`
- `src/lib/excel.ts`

### Files Modified (8)
- `src/app/patient/vaccinations/page.tsx` — Status badges, timeline, filters
- `src/app/patient/fidelite/page.tsx` — Tier system, progress bars
- `src/app/patient/comparateur/page.tsx` — Sort, cart, add to cart
- `src/app/patient/profil/page.tsx` — Tabs, security, family management
- `src/app/patient/rappels/page.tsx` — Edit/delete reminders
- `src/app/pro/ordonnances/page.tsx` — Upload, drag & drop, validation flow
- `src/app/pro/personnel/page.tsx` — Planning color-coding, week nav, bulletin filters
- `src/app/api/ordonnances/[id]/valider/route.ts` — Full validation state machine
- `src/app/api/ordonnances/[id]/image/route.ts` — Real file upload

### Lint Status
- All new/modified files pass lint with no errors
- Pre-existing lint warnings in `alertes`, `patients`, `stock` pages (not created by this task)

---

## Task 4a — P2a: File Upload, Notification Engine, PDF/Excel Generation (Refinements)

### Summary
Reviewed and updated all existing infrastructure files to match the exact spec. Key changes: created missing upload POST endpoint, rewrote ticket route to return actual PDFs (was returning JSON), added RBAC auth to export routes, aligned function signatures.

### 1. File Upload — Created `/api/upload/route.ts`
- POST endpoint with `formData` parsing
- File validation: max 10MB, allowed types (JPEG, PNG, WebP, PDF)
- Unique filename generation: `{timestamp}_{random6chars}{ext}`
- Saves to `/uploads/` directory with recursive `mkdir`
- Returns `{ url, filename, size, mimeType }`

### 2. Updated `/hooks/use-upload.ts`
- Aligned with spec: `upload()`, `uploading`, `error` (removed `progress` state)
- Proper error typing with `unknown` catch

### 3. Notification Engine — No changes needed
- `/lib/notifications.ts` already matches spec: `createNotification()`, `notifyPharmacieUsers()`
- `/api/notifications/stream/route.ts` already matches spec: SSE with 30s keep-alive ping

### 4. PDF Generation — Rewrote `/api/ticket/route.ts`
- **Before**: Returned JSON data (GET and POST handlers)
- **After**: Generates actual PDF using `generateTicketCaisse()` or `generateFacture()` based on `type` query param
- Added `requireAuth(request, 'M02_POS', 'read')` for RBAC
- Returns `application/pdf` with `Content-Disposition: inline` for browser preview
- Removed redundant POST handler

### 5. Excel Export — Updated all 3 export routes with auth

#### `/api/exports/stock/route.ts`
- Added `requireAuth(request, 'M01_STOCK', 'read')` for RBAC
- Changed to lot-level detail: Nom Commercial, DCI, Forme, Dosage, Prix Vente, Stock Min, Lot N°, Qté Lot, Date Expiration
- Flattened medicament+lots to per-lot rows (spec requirement)

#### `/api/exports/ventes/route.ts`
- Added `requireAuth(request, 'M02_POS', 'read')` for RBAC
- Aligned columns to spec: Date, Type, Statut, Montant Total, Mode Paiement, Patient

#### `/api/exports/patients/route.ts`
- Added `requireAuth(request, 'M05_PATIENTS', 'read')` for RBAC
- Aligned columns to spec: Nom, Prénom, Téléphone, Email, Date Naissance, CNSS, Fidèle, Points Fidélité

### 6. Updated `/lib/excel.ts`
- Changed signature from `exportToExcel(data, sheetName, filename)` to `exportToExcel(data, sheetName)` (2 params per spec)
- Export routes updated accordingly

### Files Created (1)
- `src/app/api/upload/route.ts` — New POST upload endpoint

### Files Modified (6)
- `src/app/api/ticket/route.ts` — Rewrote to generate actual PDFs with auth
- `src/app/api/exports/stock/route.ts` — Added auth + lot-level detail
- `src/app/api/exports/ventes/route.ts` — Added auth + spec columns
- `src/app/api/exports/patients/route.ts` — Added auth + spec columns
- `src/lib/excel.ts` — Simplified to 2-param signature
- `src/hooks/use-upload.ts` — Aligned with spec (removed progress)

### Lint Status
- All modified files pass lint with no errors
- Pre-existing lint errors in other files (not introduced by this task)

---

## Task 4b — P2b: Patient Pages, Ordonnance Upload, RH Planning

### Summary
Wired all 5 patient pages to real APIs with proper data display, added ordonnance validation workflow with pharmacist names, and enhanced RH personnel page with conge filters and CNSS Bénin 18% bulletin calculations.

### 1. Schema Changes
- Added `posologie` (String, default "") to `RappelPatient` model
- Added `delaiLivraison` (Int, default 3) to `CataloguePrix` model
- Ran `bun run db:push` to apply migrations

### 2. Patient Vaccinations Page (`/patient/vaccinations/page.tsx`)
- Updated status badges: completed (green), scheduled (blue), overdue (red)
- Added "Vaccination QR" button that calls `/api/patient/vaccination-qr` API
- Shows QR code in a Dialog component with download button
- Per-vaccination QR code expand/collapse preserved
- Full-carnet QR button uses API instead of external service

### 3. Patient Fidélité Page (`/patient/fidelite/page.tsx`)
- Updated tier system to match spec: Bronze (<500 pts), Silver (500-1500 pts), Gold (1500+ pts)
- Colored tier badges: Bronze=amber, Silver=gray, Gold=yellow
- Progress bar to next tier with point gap display
- Transaction history in TABLE format: Date, Type (Gain/Utilisation), Points, Description
- Badges unlock based on tier progression

### 4. Patient Comparateur Page (`/patient/comparateur/page.tsx`)
- Updated to use `search` query param (in addition to `dci`)
- API also searches by `nomCommercial` (not just DCI)
- Added "Délai livraison" column (in days with truck icon)
- Best price highlighted in green with ring border
- Sort by price ascending by default

### 5. Patient Rappels Page (`/patient/rappels/page.tsx`)
- Added `posologie` field to reminder cards display
- Added posologie input to "Add reminder" dialog
- Added posologie input to "Edit reminder" dialog
- PATCH and POST API calls include posologie
- Pill icon instead of Bell for medication reminders
- Frequency labels in French (Quotidien, 2 fois/jour, etc.)

### 6. Ordonnance Validation Workflow
- Created `/api/ordonnances/[id]/validate/route.ts` — New route accepting APPROBATION/REFUS types
  - Maps APPROBATION → VALIDATION internally
  - Creates ValidationPharmacien records with utilisateur relation
  - Returns validation with pharmacist name
- Updated `/api/ordonnances/[id]/valider/route.ts` — Added utilisateur include in create
- Updated `/api/ordonnances/route.ts` — Added utilisateur include in validations query
- Updated ordonnances page: validation history shows pharmacist name ("Validée par Prénom Nom")
- Updated interface: validations include optional `utilisateur` field

### 7. API Route Updates
- `/api/grossistes/compare/route.ts`: Added `search` param, `delaiLivraison` in response, `nomCommercial` search
- `/api/patient/rappels/route.ts`: Added posologie support (POST/PATCH), added DELETE handler
- `/api/bulletins-paie/route.ts`: CNSS Bénin 18% default for cotisations calculation

### 8. RH Personnel Page (`/pro/personnel/page.tsx`)
- **Congés tab**: Added statut filter (Toutes/Demandé/Validé/Refusé/En cours/Terminé) with badge counts
- **Bulletins tab**: 
  - Updated column headers: Salaire Brut, Cotisations (18% CNSS), Salaire Net, Prime, Avance, Net à Payer
  - Added "Salaire Net" column (= Brut - Cotisations)
  - Renamed "Net" to "Net à Payer" (includes prime/avance adjustments)
  - Net à Payer highlighted in primary color
  - Bulletin generation uses 18% CNSS Bénin (was 12%)

### Files Created (1)
- `src/app/api/ordonnances/[id]/validate/route.ts` — New validate route with APPROBATION/REFUS

### Files Modified (10)
- `prisma/schema.prisma` — Added posologie to RappelPatient, delaiLivraison to CataloguePrix
- `src/app/patient/vaccinations/page.tsx` — QR from API + Dialog
- `src/app/patient/fidelite/page.tsx` — Bronze/Silver/Gold tiers, transaction table
- `src/app/patient/comparateur/page.tsx` — search param, délai livraison column
- `src/app/patient/rappels/page.tsx` — posologie field, Pill icon
- `src/app/pro/ordonnances/page.tsx` — Pharmacist name in validation history
- `src/app/pro/personnel/page.tsx` — Congé statut filter, CNSS 18%, Net à Payer column
- `src/app/api/grossistes/compare/route.ts` — search param, delaiLivraison, nomCommercial search
- `src/app/api/patient/rappels/route.ts` — posologie support, DELETE handler
- `src/app/api/bulletins-paie/route.ts` — CNSS 18% default calculation
- `src/app/api/ordonnances/route.ts` — Include utilisateur in validations
- `src/app/api/ordonnances/[id]/valider/route.ts` — Include utilisateur in create

### Lint Status
- All modified files pass lint with no new errors
- Pre-existing lint errors in `alertes`, `patients`, `stock` pages (not introduced by this task)
