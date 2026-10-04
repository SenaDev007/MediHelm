# ============================================================
#  MEDIHELM — CURSOR MASTER PROMPT
#  YEHI OR Tech © 2025 — Dawes, Fondateur & Lead Developer
#  Référence : MH-CDC-2025-v2.0 + MH-SPECS-2025-v2.0
# ============================================================
# Ce fichier est le .cursorrules du projet MédiHelm.
# Il constitue le contexte global permanent pour toutes les
# interactions Cursor dans ce projet. Ne jamais le supprimer.
# ============================================================


# ── IDENTITÉ DU PROJET ──────────────────────────────────────

Tu travailles sur MédiHelm, une plateforme SaaS multitenant
développée par YEHI OR Tech (Cotonou, Bénin).

MédiHelm est l'infrastructure pharmaceutique numérique du
Bénin. Elle connecte les pharmacies d'officine, leurs patients,
les grossistes répartisseurs (UbiPharm, Promopharma), et les
institutions de tutelle (DPMED, SoBAPS, ABRP) sur une seule
plateforme.

MédiHelm n'est PAS un simple logiciel de gestion de pharmacie.
C'est une infrastructure sanitaire nationale avec des modules
de pharmacovigilance, de diffusion d'alertes DPMED, et de
traçabilité de la chaîne pharmaceutique.


# ── STACK TECHNIQUE ─────────────────────────────────────────

Frontend   : Next.js 14 (App Router) — TypeScript strict
Backend    : NestJS + Fastify — TypeScript strict
ORM        : Prisma 5+
DB primary : PostgreSQL 15 via Supabase (RLS activé)
DB offline : SQLite via Prisma (POS et stock hors connexion)
Auth       : Supabase Auth + JWT custom (15 min access / 7j refresh)
Cache      : Redis via Upstash (sessions, BullMQ queues)
Queue      : BullMQ (alertes DPMED priorité 1, SMS, Analytics IA)
Storage    : Supabase Storage (ordonnances, documents, photos)
Email      : Resend
SMS        : AfricasTalking
Paiements  : Fedapay (Wave, MTN Money, Moov Money, carte)
Cartes     : OpenStreetMap + Leaflet.js
Monitoring : Sentry + Vercel Analytics
Déploiement: Vercel (frontend) + Railway (backend)
PWA        : next-pwa (offline-first pour POS et stock)


# ── CONVENTIONS DE CODE ──────────────────────────────────────

LANGAGE
- TypeScript strict partout. Zéro `any`. Zéro `as unknown`.
- Interfaces pour les types de données, types pour les unions.
- Toujours typer les retours de fonctions async.

NOMMAGE
- Variables / fonctions  : camelCase
- Classes / interfaces   : PascalCase
- Constantes globales    : UPPER_SNAKE_CASE
- Tables Prisma          : PascalCase (Medicament, Vente...)
- Colonnes Prisma        : camelCase (pharmacieId, createdAt...)
- Endpoints API          : kebab-case (/commandes-fournisseurs)
- Fichiers               : kebab-case (commande.service.ts)
- Variables d'env        : UPPER_SNAKE_CASE (DATABASE_URL)

STRUCTURE NESTJS (backend /apps/api/src/)
  /modules/
    /auth/
    /stock/
    /pos/
    /commandes/
    /fournisseurs/
    /patients/
    /ordonnances/
    /rh/
    /finance/
    /garde/
    /remboursables/
    /destructions/
    /communication/
    /documents/
    /analytics/
    /m16-qualite/          ← Module pharmacovigilance
    /m17-grossistes/       ← Intégrations SoBAPS + grossistes
    /m18-alertes-dpmed/    ← Canal alertes DPMED
    /m19-conformite/       ← Conformité réglementaire
    /portail-institutionnel/
    /websocket/
    /webhooks/
  /common/
    /guards/               ← AuthGuard, RolesGuard, WebhookGuard
    /decorators/           ← @CurrentUser, @Roles, @Tenant
    /interceptors/
    /filters/
    /pipes/
    /middleware/           ← TenantMiddleware
  /prisma/

STRUCTURE NEXT.JS (frontend /apps/web/src/)
  /app/
    /(pro)/                ← MédiHelm Pro (pharmacie)
      /dashboard/
      /stock/
      /pos/
      /commandes/
      /patients/
      /ordonnances/
      /rh/
      /finance/
      /garde/
      /conformite/
      /alertes/
      /analytics/
    /(patient)/            ← MédiHelm Patient (grand public)
      /recherche/
      /pharmacies/
      /garde/
      /commande/
      /compte/
    /(network)/            ← MédiHelm Network (promoteur)
      /dashboard/
      /officines/
      /stock-reseau/
      /rh-reseau/
    /(institutionnel)/     ← Portail DPMED, SoBAPS, ABRP
      /dpmed/
      /sobaps/
      /abrp/
      /grossiste/
  /components/
  /hooks/
  /lib/
  /types/


# ── MULTITENANCY — RÈGLES ABSOLUES ──────────────────────────

1. CHAQUE table métier a un champ `pharmacieId String` (UUID).
2. Row Level Security PostgreSQL activé sur TOUTES les tables métier.
3. Le TenantMiddleware NestJS injecte `SET app.current_tenant`
   avant CHAQUE requête Prisma.
4. JAMAIS de requête Prisma sans le filtre `pharmacieId` en
   where — sauf pour les tables institutionnelles (schéma séparé).
5. Les promoteurs accèdent à plusieurs tenants via JWT contenant
   `{ pharmacies: ['uuid1', 'uuid2', ...] }`.

EXEMPLE OBLIGATOIRE pour toute query Prisma côté backend :
```typescript
// ✅ CORRECT
await this.prisma.medicament.findMany({
  where: { pharmacieId: user.pharmacieId }
});

// ❌ INTERDIT — manque le filtre tenant
await this.prisma.medicament.findMany();
```


# ── RBAC — RÔLES ET GUARDS ───────────────────────────────────

Rôles disponibles (enum RoleType) :
  PLATFORM_ADMIN | PROMOTEUR | DIRECTEUR | PHARMACIEN
  CAISSIER | MAGASINIER | COMPTABLE | STAGIAIRE
  DPMED_ADMIN | SOBAPS_VIEWER | ABRP_VIEWER | GROSSISTE_PARTNER

Décorateur à utiliser sur TOUS les endpoints protégés :
```typescript
@Get('employes')
@Roles(RoleType.DIRECTEUR, RoleType.PROMOTEUR)
async getEmployes(@CurrentUser() user: JwtPayload) { ... }
```

Règles métier RBAC critiques :
- CAISSIER  → POS uniquement. Aucun accès stock en écriture.
- MAGASINIER → Stock + réception commandes. Pas de vente.
- COMPTABLE → Finance + caisse. Pas de stock ni de vente.
- STAGIAIRE → Lecture seule sur modules autorisés par DIRECTEUR.
- DPMED_ADMIN → Portail institutionnel uniquement. Zéro accès données officines.
- SOBAPS_VIEWER → Confirmations livraisons uniquement. Lecture seule.


# ── SCHÉMA PRISMA — ENTITÉS PRINCIPALES ─────────────────────

Voici les modèles Prisma à respecter IMPÉRATIVEMENT.
Ne jamais renommer les champs sans mettre à jour ce prompt.

```prisma
// ── Plateforme ──
model Pharmacie {
  id              String     @id @default(uuid())
  nom             String
  slug            String     @unique
  adresse         String
  telephone       String
  latitude        Float
  longitude       Float
  plan            PlanType   @default(STEM)
  planExpireAt    DateTime?
  actif           Boolean    @default(true)
  modeGardeActif  Boolean    @default(false)
}

enum PlanType { STEM GROW LEAD NETWORK }

model Utilisateur {
  id          String   @id @default(uuid())
  pharmacieId String
  supabaseUid String   @unique
  role        RoleType
  actif       Boolean  @default(true)
}

enum RoleType {
  PLATFORM_ADMIN PROMOTEUR DIRECTEUR PHARMACIEN
  CAISSIER MAGASINIER COMPTABLE STAGIAIRE
  DPMED_ADMIN SOBAPS_VIEWER ABRP_VIEWER GROSSISTE_PARTNER
}

// ── Stock ──
model Medicament {
  id            String  @id @default(uuid())
  pharmacieId   String
  dci           String
  nomCommercial String
  forme         String
  dosage        String
  prixPublic    Float
  surOrdonnance Boolean @default(false)
  estStupefiant Boolean @default(false)
  stockMinimum  Int     @default(5)
  stockSecurite Int     @default(10)
  codeBarres    String?
  actif         Boolean @default(true)
  lots          Lot[]
}

model Lot {
  id             String   @id @default(uuid())
  medicamentId   String
  numeroLot      String
  quantite       Int
  prixAchat      Float
  dateExpiration DateTime
  fournisseurId  String?
}

// ── Ventes ──
model Vente {
  id            String       @id @default(uuid())
  pharmacieId   String
  utilisateurId String
  patientId     String?
  ordonnanceId  String?
  commandePatId String?
  montantTotal  Float
  montantPaye   Float
  montantAssur  Float        @default(0)
  statut        StatutVente  @default(VALIDEE)
  reference     String       @unique
  synchedAt     DateTime?
  lignes        LigneVente[]
}

enum StatutVente { VALIDEE ANNULEE AVOIR PARTIELLEMENT_PAYEE }
enum ModePaiement { ESPECES WAVE MTN_MONEY MOOV_MONEY CARTE ASSURANCE CREDIT }

// ── Analytics ──
model AnalyticsReport {
  id              String    @id @default(uuid())
  pharmacieId     String
  domaine         DomaineIA
  scoreGlobal     Float
  alertes         Json
  recommandations Json
  predictions     Json
  kpis            Json
  generatedAt     DateTime  @default(now())
  expireAt        DateTime
}

enum DomaineIA {
  STOCK VENTES PATIENTELE PERSONNEL FINANCE
  PEREMPTIONS RESEAU CONFORMITE INTEGRATION_GROSSISTE
}

// ── Alertes DPMED ──
model AlerteDPMED {
  id                  String         @id @default(uuid())
  referenceOfficielle String         @unique
  titre               String
  typeAlerte          TypeAlerteDPMED
  niveauUrgence       NiveauUrgence
  dciConcernee        String?
  numerosLotConcernes String[]
  signatureNumerique  String
  dateEmissionDPMED   DateTime
  statut              StatutAlerteMH @default(EN_DIFFUSION)
  diffusions          DiffusionAlerte[]
}

enum TypeAlerteDPMED  { RAPPEL_LOT CONTREFACON AMM_SUSPENDUE PHARMACOVIGILANCE INFO_REGLEMENTAIRE }
enum NiveauUrgence    { URGENCE_IMMEDIATE URGENT NORMAL INFORMATIF }
enum StatutAlerteMH   { EN_DIFFUSION DIFFUSEE ARCHIVEE }

// ── Commandes Patient ──
model CommandePatient {
  id            String       @id @default(uuid())
  pharmacieId   String
  nomClient     String
  telephone     String
  statut        StatutCmdPat @default(RECUE)
  numeroPassage Int?
  montantTotal  Float
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
}

enum StatutCmdPat { RECUE EN_PREPARATION PRETE RECUPEREE ANNULEE }
```


# ── API REST — CONVENTIONS ───────────────────────────────────

Base URL       : https://api.medihelm.com/v1
Auth           : Authorization: Bearer <jwt> sur toutes les routes
Tenant         : Extrait du JWT automatiquement — JAMAIS en query param
Format réponse : { data, meta: { page, total, limit }, error }
Codes erreurs  : HTTP standard + { error: { code: "MH-XXXX", message } }
Pagination     : ?page=1&limit=20 (max 100)

CODES D'ERREUR INTERNES :
  MH-4001 : Limite de crédit patient dépassée
  MH-4002 : Stock insuffisant pour la vente
  MH-4003 : Lot expiré ou sous surveillance DPMED
  MH-4004 : Caisse non ouverte
  MH-4005 : Commande pharmacie non trouvée
  MH-SEC-001 : Signature alerte DPMED invalide
  MH-SEC-002 : Webhook non autorisé
  MH-QUAL-001 : Lot sous surveillance DPMED — réception bloquée
  MH-CONF-001 : Certificat mTLS manquant ou invalide

ENDPOINTS CRITIQUES (ne jamais les renommer) :
  POST   /auth/login
  POST   /auth/refresh
  GET    /medicaments
  POST   /ventes
  POST   /ventes/sync           ← Sync offline batch
  GET    /stock/alertes
  POST   /grossistes/:id/commandes
  POST   /sobaps/receptions
  POST   /webhooks/dpmed         ← Signature numérique obligatoire
  POST   /webhooks/ubipharm
  POST   /webhooks/promopharma
  POST   /alertes/dpmed/:id/acquitter
  POST   /analytics/relancer     ← Cooldown 30 min
  GET    /public/medicaments/search
  GET    /public/gardes
  POST   /public/commandes


# ── WEBSOCKET — EVENTS ───────────────────────────────────────

Gateway NestJS : @WebSocketGateway()
Rooms          : chaque socket rejoint `pharmacie:${pharmacieId}`
Auth           : JWT dans le handshake

Events serveur → client :
  commande:nouvelle    { commandeId, client, montant, statut }
  commande:updated     { commandeId, statut }
  stock:alerte         { medicamentId, nom, type, quantite }
  peremption:alerte    { lotId, medicament, dateExp, quantite }
  caisse:synced        { nbVentes, montant }
  analytics:ready      { domaines, scores }
  alerte:dpmed:nouvelle { alerteId, titre, urgence, lots }

Events client → serveur :
  commande:confirmer   { commandeId }
  commande:prete       { commandeId }
  commande:recuperee   { commandeId }


# ── MODE OFFLINE — RÈGLES ────────────────────────────────────

1. Le POS et le Stock fonctionnent IMPÉRATIVEMENT hors connexion.
2. SQLite local via Prisma pour les tables critiques.
3. Le champ `synchedAt: DateTime?` est NULL si créé offline.
4. La sync se déclenche automatiquement dès le retour réseau.
5. Un indicateur visuel permanent montre l'état de connexion.
6. Aucune vente ne peut être perdue — même 1 heure de coupure réseau.

Tables répliquées localement (lecture) :
  medicaments, lots, patients (base)

Tables créées localement (écriture — sync différée) :
  ventes, lignes_vente, paiements

Endpoint de synchronisation batch :
  POST /ventes/sync
  Body: { ventes: VenteOffline[] }
  → Idempotent : la référence unique empêche les doublons


# ── SÉCURITÉ — RÈGLES NON NÉGOCIABLES ───────────────────────

1. JWT : access token 15 min, refresh token 7 jours.
2. Rate limiting sur /auth/login : 5 tentatives / 15 min / IP.
3. Tous les webhooks institutionnels validés par HMAC-SHA256
   AVANT toute action. Rejeter si signature invalide.
4. Les alertes DPMED sont validées par signature RSA-256
   AVANT mise en queue. Jamais de fausse alerte possible.
5. mTLS pour les connexions serveur↔institutions (DPMED, SoBAPS).
6. IP Whitelist sur tous les webhooks institutionnels.
7. Logs d'audit sur TOUTES les actions sensibles (AuditLog).
8. Zéro donnée individuelle de pharmacie transmise aux portails
   institutionnels — uniquement des agrégats anonymisés.
9. Pseudonymisation systématique des signalements EI avant
   transmission à la DPMED (jamais de nom patient en clair).
10. Les clés API partenaires (Fedapay, AfricasTalking, grossistes)
    sont stockées chiffrées en base. JAMAIS en clair.


# ── ALERTES DPMED — ARCHITECTURE CRITIQUE ───────────────────

La diffusion d'une alerte DPMED est l'opération la plus
critique de la plateforme. Délai garanti : < 2 minutes.

Queue BullMQ dédiée : 'alertes-dpmed'
Priorité : 1 (maximum)
Concurrence : 20 workers simultanés
Retry : 5 tentatives avec backoff exponentiel

Ordre d'exécution IMPÉRATIF :
  1. Réception webhook DPMED
  2. Vérification signature RSA-256 → STOP si invalide
  3. Vérification IP whitelist → STOP si non autorisée
  4. Création AlerteDPMED en base
  5. Enqueue BullMQ priorité 1 délai 0
  6. Identification pharmacies concernées (lots en stock actif)
  7. Identification patients concernés (achats 90 derniers jours)
  8. Diffusion push (Firebase FCM batch 500 tokens max)
  9. Diffusion SMS (AfricasTalking bulk)
  10. Mise à jour compteurs AlerteDPMED
  11. Notification portail DPMED via WebSocket


# ── ANALYTICS IA — ARCHITECTURE ─────────────────────────────

Service : AnalyticsService + AnalyticsProcessor (BullMQ)
Cron    : 05h00 WAT quotidien — tous les domaines
Manuel  : POST /analytics/relancer — cooldown 30 min
Rétention : 90 jours par rapport

Domaines (9 au total) :
  STOCK | VENTES | PATIENTELE | PERSONNEL | FINANCE
  PEREMPTIONS | RESEAU | CONFORMITE | INTEGRATION_GROSSISTE

Score de santé : 0-100 points par domaine
  >= 75 → VERT
  >= 50 → AMBER (alerte moyenne)
  <  50 → ROUGE (alerte critique)

Algorithme prédiction de rupture (domaine STOCK) :
  consoMoyJour = totalVentes30j / 30
  joursAvantRupture = stockDisponible / consoMoyJour
  qteRecommandee = (consoMoyJour * delaiLivraisonFournisseur) + stockSecurite

Algorithme score conformité (domaine CONFORMITE) :
  scoreStup      = 25 pts (registre stupéfiants sans trou)
  scoreAlertes   = 25 pts (alertes DPMED traitées < 24h)
  scoreDocs      = 20 pts (documents valides non expirés)
  scoreEI        = 15 pts (signalements EI soumis dans les délais)
  scoreDestr     = 15 pts (PV destructions à jour)


# ── DÉCRÉMENT STOCK — RÈGLE FEFO ─────────────────────────────

Lors de chaque vente, les lots sont consommés selon FEFO
(First Expired, First Out) — lot dont la date d'expiration
est la plus proche en premier.

Exception : le pharmacien peut forcer un lot spécifique
manuellement depuis l'interface POS.

```typescript
// Implémentation de référence
const lots = await prisma.lot.findMany({
  where: { medicamentId, quantite: { gt: 0 },
           dateExpiration: { gt: new Date() } },
  orderBy: { dateExpiration: 'asc' }  // FEFO
});
```


# ── CALCUL PAIE BÉNIN ────────────────────────────────────────

CNSS salariale  : 3,6% du salaire brut (vérifier plafond annuel)
CNSS patronale  : 15,4% du salaire brut (charge employeur)
IRPP tranches (approximatif — vérifier barème DGI actuel) :
  0 à 60 000 FCFA/mois      : 0%
  60 001 à 150 000           : 10%
  150 001 à 250 000          : 15%
  250 001 à 500 000          : 19%
  > 500 000                  : 28%

Net à payer = brut - CNSS salariale - IRPP


# ── PRICING — PLANS ACTIFS ───────────────────────────────────

HELM SEED    : 19 900 FCFA/mois  (16 900 FCFA annuel)
HELM GROW    : 34 900 FCFA/mois  (29 500 FCFA annuel)
HELM LEAD    : 54 900 FCFA/mois  (46 500 FCFA annuel)
HELM NETWORK : Sur devis

Tous les plans incluent les 19 modules.
Aucune fonctionnalité verrouillée par plan.
Commission patient : 1,5% paiements en ligne, plafond 500 FCFA.

Séquencement lancement :
  Phase 1 Beta (mois 1-3)     : Gratuit — 5 officines pilotes
  Phase 2 Beta payante (4-6)  : -30% (SEED 13 900 / GROW 24 500 / LEAD 38 500)
  Phase 3 Plein tarif (mois 7+): Plein tarif — dès qu'un partenariat institutionnel est actif


# ── PARTENAIRES INSTITUTIONNELS ──────────────────────────────

SoBAPS SA      : Approvisionnement médicaments essentiels — portail traçabilité livraisons
DPMED          : Direction Pharmacie Médicament — portail alertes + pharmacovigilance
LNCQ           : Labo Contrôle Qualité — source base veille qualité
ABRP           : Agence Béninoise Régulation Pharmaceutique — tableau de bord agrégé
UbiPharm Bénin : Grossiste répartiteur — API commandes + portail partenaire
Promopharma    : Grossiste répartiteur — même intégration qu'UbiPharm

Accès institutionnel : GRATUIT pour tous ces partenaires.
Sous-domaine dédié  : institutionnel.medihelm.com
Isolation données   : Schéma PostgreSQL séparé — zéro jointure avec données officines.


# ── VARIABLES D'ENVIRONNEMENT — NOMS OFFICIELS ──────────────

Ne jamais utiliser d'autres noms que ceux-ci :

DATABASE_URL              SUPABASE_URL              SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY      JWT_SECRET                JWT_REFRESH_SECRET
FEDAPAY_API_KEY           FEDAPAY_WEBHOOK_SECRET    AFRICAS_TALKING_KEY
AFRICAS_TALKING_USERNAME  RESEND_API_KEY            REDIS_URL
REDIS_ALERTES_URL         NEXT_PUBLIC_API_URL       SENTRY_DSN
DPMED_WEBHOOK_SECRET      DPMED_PUBLIC_KEY          DPMED_API_URL
DPMED_IP_WHITELIST        SOBAPS_WEBHOOK_SECRET     SOBAPS_API_URL
SOBAPS_IP_WHITELIST       UBIPHARM_API_URL          UBIPHARM_API_KEY
UBIPHARM_WEBHOOK_SECRET   UBIPHARM_IP_WHITELIST     PROMOPHARMA_API_URL
PROMOPHARMA_API_KEY       PROMOPHARMA_WEBHOOK_SECRET PROMOPHARMA_IP_WHITELIST
MTLS_CERT_PATH            MTLS_KEY_PATH             MTLS_CA_PATH
NEXT_PUBLIC_MAPBOX_TOKEN  FIREBASE_SERVER_KEY       INSTITUTIONNEL_SUBDOMAIN


# ── CE QUE CURSOR NE DOIT JAMAIS FAIRE ──────────────────────

1. Ne jamais générer une requête Prisma sans filtre `pharmacieId`.
2. Ne jamais exposer une route sans AuthGuard ET RolesGuard.
3. Ne jamais stocker une clé API en clair dans le code.
4. Ne jamais traiter un webhook DPMED sans vérifier la signature.
5. Ne jamais diffuser une alerte DPMED sans validation RSA-256.
6. Ne jamais transmettre des données individuelles d'officine
   vers un portail institutionnel — uniquement des agrégats.
7. Ne jamais utiliser `any` en TypeScript.
8. Ne jamais créer un endpoint sans documentation JSDoc minimale.
9. Ne jamais casser le mode offline du POS — c'est non négociable.
10. Ne jamais supprimer ou modifier le champ `synchedAt` sur Vente.
11. Ne jamais appliquer une remise > 15% sans validation fondateur.
12. Ne jamais utiliser `WidthType.PERCENTAGE` dans les documents docx.


# ── PRIORITÉ DE DÉVELOPPEMENT ────────────────────────────────

Phase 0 (S1-S4)   : Architecture, auth, RBAC, onboarding pharmacie
Phase 1 (S5-S10)  : M01 Stock + M02 POS + M14 Dashboard + Offline
Phase 2 (S11-S18) : M03 à M09 + Beta fermée 5 officines
Phase 3 (S19-S24) : Espace patient F-P01 à F-P05
Phase 4 (S25-S30) : M15 Analytics IA
Phase 4b (S28-S34): M16 Pharmacovigilance + M18 Alertes DPMED  ← INSTITUTIONNEL
Phase 5 (S31-S38) : M17 API Grossistes + SoBAPS                ← INSTITUTIONNEL
Phase 5b (S35-S40): M19 Conformité DPMED                       ← INSTITUTIONNEL
Phase 6 (S37-S44) : MédiHelm Network (promoteur)
Phase 7 (S45-S50) : Patient avancé F-P06 à F-P13


# ── CONTEXTE MÉTIER IMPORTANT ────────────────────────────────

- Le Bénin compte ~600 pharmacies agréées (DPMED / ABRP).
- La connexion internet est instable — le mode offline est CRITIQUE.
- Le parc Android est dominant — interface optimisée Android 8+ / 2 Go RAM.
- Les coupures électriques sont fréquentes — POS survit aux redémarrages.
- La devise est le FCFA (XOF) — jamais de conversion automatique.
- Le fuseau horaire est WAT (UTC+1) — toujours horodater en WAT.
- Les paiements mobiles (Wave, MTN, Moov) sont dominant sur les cartes.
- Le registre des stupéfiants est un document légalement obligatoire (DPMED).
- Les ordonnances doivent être archivées 3 ans minimum (exigence légale).
- La SoBAPS a REMPLACÉ la CAME en septembre 2020 — ne jamais utiliser "CAME".
- SYSCOHADA révisé pour la comptabilité (pas le plan comptable français).
- CNSS Bénin : part salariale 3,6% — part patronale 15,4%.


# ── DOCUMENTS DE RÉFÉRENCE ───────────────────────────────────

Tous les documents suivants sont la référence officielle du projet.
En cas de doute, ils ont priorité sur ce prompt :

  MH-CDC-2025-v2.0        Cahier des Charges complet
  MH-SPECS-2025-v2.0      Spécifications techniques
  MH-PRICING-2025-v2.0    Politique de pricing
  MH-BRAND-2025-v1.0      Guide de l'identité de marque
  MH-DPMED-2025-001       Dossier partenariat DPMED
  MH-SOBAPS-2025-001      Dossier partenariat SoBAPS
  MH-GROS-2025-001        Dossier partenariat Grossistes


# ── FIN DU MASTER PROMPT ─────────────────────────────────────
# YEHI OR Tech © 2025 — Dawes — Cotonou, Bénin
# MédiHelm — L'Infrastructure Pharmaceutique Numérique du Bénin
# ─────────────────────────────────────────────────────────────
