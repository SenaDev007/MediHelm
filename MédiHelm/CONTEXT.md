# MédiHelm — Contexte Projet Complet
> YEHI OR Tech © 2025 — Dawes, Fondateur & Lead Developer  
> Cotonou, République du Bénin  
> Référence : MH-CDC-2025-v2.0 + MH-SPECS-2025-v2.0

---

## Vision

MédiHelm est l'**infrastructure pharmaceutique numérique du Bénin**. Elle connecte les pharmacies d'officine, leurs patients, les grossistes répartisseurs (UbiPharm, Promopharma), et les institutions de tutelle (DPMED, SoBAPS, ABRP) sur une plateforme SaaS multitenant unique.

> MédiHelm n'est pas un simple logiciel de gestion. C'est une infrastructure sanitaire nationale avec des modules de pharmacovigilance, de diffusion d'alertes DPMED, et de traçabilité de la chaîne du médicament.

---

## Stack Technique

| Couche | Technologie |
|---|---|
| Frontend | Next.js 14 App Router — TypeScript strict |
| Backend | NestJS + Fastify — TypeScript strict |
| ORM | Prisma 5+ |
| Base de données | PostgreSQL 15 via Supabase (RLS) |
| Cache offline | SQLite via Prisma (POS + stock offline) |
| Auth | Supabase Auth + JWT (15 min / 7 j) |
| Cache | Redis via Upstash |
| Queue | BullMQ (alertes DPMED priorité 1) |
| Storage | Supabase Storage |
| Email | Resend |
| SMS | AfricasTalking |
| Paiements | Fedapay (Wave, MTN, Moov, carte) |
| Cartes | OpenStreetMap + Leaflet.js |
| Monitoring | Sentry + Vercel Analytics |
| Déploiement | Vercel (frontend) + Railway (backend) |
| PWA | next-pwa (offline-first POS et stock) |

---

## Architecture Monorepo

```
medihelm/
├── apps/
│   ├── api/              ← NestJS backend
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   ├── stock/
│   │       │   ├── pos/
│   │       │   ├── commandes/
│   │       │   ├── fournisseurs/
│   │       │   ├── patients/
│   │       │   ├── ordonnances/
│   │       │   ├── rh/
│   │       │   ├── finance/
│   │       │   ├── garde/
│   │       │   ├── remboursables/
│   │       │   ├── destructions/
│   │       │   ├── communication/
│   │       │   ├── documents/
│   │       │   ├── analytics/
│   │       │   ├── m16-qualite/
│   │       │   ├── m17-grossistes/
│   │       │   ├── m18-alertes-dpmed/
│   │       │   ├── m19-conformite/
│   │       │   ├── portail-institutionnel/
│   │       │   ├── websocket/
│   │       │   └── webhooks/
│   │       ├── common/
│   │       │   ├── guards/
│   │       │   ├── decorators/
│   │       │   ├── interceptors/
│   │       │   ├── filters/
│   │       │   └── middleware/
│   │       └── prisma/
│   └── web/              ← Next.js frontend
│       └── src/
│           └── app/
│               ├── (pro)/          ← MédiHelm Pro
│               ├── (patient)/      ← MédiHelm Patient
│               ├── (network)/      ← MédiHelm Network
│               └── (institutionnel)/
├── packages/
│   ├── shared-types/     ← Types TypeScript partagés
│   ├── ui/               ← Composants React partagés
│   └── utils/            ← Utilitaires partagés
├── .cursorrules          ← Ce fichier est lu par Cursor
├── CONTEXT.md            ← Ce fichier
└── prisma/
    └── schema.prisma
```

---

## Les 19 Modules

| # | Module | Domaine |
|---|---|---|
| M01 | Gestion du stock | Inventaire, lots, péremptions, alertes, CMUP |
| M02 | Point de Vente (POS) | Caisse, ordonnances, reçus, multi-caissier, offline |
| M03 | Commandes fournisseurs | Bons de commande, réception, retours, API grossiste |
| M04 | Gestion des fournisseurs | Référentiel, conditions, score fiabilité |
| M05 | Gestion des patients | Dossier, historique, fidélité, crédit |
| M06 | Gestion des ordonnances | Numérisation, validation, stupéfiants, interactions |
| M07 | Gestion du personnel | RH, planning, congés, pointage, paie CNSS/IRPP |
| M08 | Gestion financière | Caisse journalière, résultat, TVA, export SYSCOHADA |
| M09 | Pharmacie de garde | Planning, diffusion, rapport, alertes patients |
| M10 | Médicaments remboursables | CNSS, RAMU, tiers payant, facturation |
| M11 | Retours et destructions | SAV, PV destruction, déclaration DPMED |
| M12 | Communication | Push, SMS, campagnes, rappels, alertes DPMED relayées |
| M13 | Gestion documentaire | Licences, diplômes, coffre-fort, alertes expiration |
| M14 | Tableau de bord opérationnel | KPIs temps réel, alertes, raccourcis |
| M15 | Analytics IA | Prédictions, scores santé, rapports automatiques |
| **M16** | **Contrôle Qualité et Pharmacovigilance** | **Veille qualité, alertes LNCQ, signalement EI** |
| **M17** | **Intégration SoBAPS et grossistes** | **API SoBAPS, UbiPharm, Promopharma** |
| **M18** | **Alertes DPMED et rappels de lot** | **Canal officiel diffusion nationale < 2 min** |
| **M19** | **Conformité réglementaire** | **Score conformité, exports légaux, certification DPMED** |

> Les modules M16 à M19 (en gras) sont les modules institutionnels — différenciateurs absolus face à la concurrence.

---

## RBAC — Rôles

```typescript
enum RoleType {
  PLATFORM_ADMIN,    // YEHI OR Tech — accès total
  PROMOTEUR,         // Réseau multi-officines — accès total réseau
  DIRECTEUR,         // Accès total à son officine
  PHARMACIEN,        // Stock, ordonnances, patients, commandes
  CAISSIER,          // POS uniquement
  MAGASINIER,        // Stock + réception commandes
  COMPTABLE,         // Finance + caisse
  STAGIAIRE,         // Lecture seule sur modules autorisés
  // Rôles institutionnels
  DPMED_ADMIN,       // Portail DPMED uniquement
  SOBAPS_VIEWER,     // Confirmations livraisons uniquement
  ABRP_VIEWER,       // Agrégats anonymisés uniquement
  GROSSISTE_PARTNER, // Commandes reçues + demande agrégée
}
```

---

## Règles Absolues

### Multitenancy
- Chaque requête Prisma **doit** filtrer par `pharmacieId`.
- Le `TenantMiddleware` injecte `SET app.current_tenant` avant chaque requête.
- RLS PostgreSQL actif sur toutes les tables métier.

### Sécurité
- Tous les webhooks institutionnels validés par **HMAC-SHA256** avant action.
- Alertes DPMED validées par **RSA-256** avant mise en queue.
- **mTLS** pour les connexions serveur ↔ institutions.
- Zéro donnée individuelle d'officine vers les portails institutionnels.

### Mode Offline
- POS et Stock fonctionnent **impérativement** sans connexion.
- SQLite local pour les tables critiques.
- `synchedAt: null` = vente créée offline, non encore synchronisée.
- Aucune vente ne peut être perdue.

### Stock
- Décrément FEFO (First Expired, First Out) — lot le plus proche de l'expiration en premier.
- CMUP recalculé à chaque réception de lot.

---

## Alertes DPMED — Flux Critique

```
Webhook DPMED reçu
  → Vérification IP whitelist      (rejet si IP inconnue)
  → Vérification signature RSA-256 (rejet si invalide)
  → Création AlerteDPMED en base
  → Enqueue BullMQ priorité 1 délai 0
  → Identification pharmacies concernées (lots en stock actif)
  → Identification patients concernés (achats 90 derniers jours)
  → Diffusion push Firebase FCM (batch 500 tokens)
  → Diffusion SMS AfricasTalking (bulk)
  → Mise à jour compteurs
  → Notification portail DPMED WebSocket

DÉLAI GARANTI : < 2 minutes de bout en bout
```

---

## Pricing

| Plan | Mensuel | Annuel/mois | Cible |
|---|---|---|---|
| HELM SEED | 19 900 FCFA | 16 900 FCFA | < 150 tx/mois |
| HELM GROW | 34 900 FCFA | 29 500 FCFA | 150-500 tx/mois |
| HELM LEAD | 54 900 FCFA | 46 500 FCFA | 500-1 200 tx/mois |
| HELM NETWORK | Sur devis | Sur devis | Réseau 2+ officines |

**Tous les plans incluent les 19 modules. Aucune fonctionnalité verrouillée.**

Commission patient : 1,5% paiements en ligne Fedapay, plafond 500 FCFA/commande.

---

## Partenaires Institutionnels

| Partenaire | Rôle | Accès MédiHelm |
|---|---|---|
| DPMED | Direction Pharmacie, Médicament — Ministère Santé | Portail alertes + pharmacovigilance — Gratuit |
| SoBAPS SA | Approvisionnement MEG — remplace la CAME depuis sept. 2020 | Portail traçabilité livraisons — Gratuit |
| LNCQ | Labo Contrôle Qualité — Ministère Santé | Source base veille qualité |
| ABRP | Agence Béninoise Régulation Pharmaceutique | Tableau de bord agrégé anonymisé — Gratuit |
| UbiPharm Bénin | Grossiste répartiteur (présent depuis 2014) | API commandes + portail partenaire — Gratuit |
| Promopharma | Grossiste répartiteur (Eurapharma / CFAO) | Même intégration qu'UbiPharm — Gratuit |

> ⚠️ La CAME n'existe plus. C'est la **SoBAPS SA** depuis septembre 2020.

---

## Contexte Marché Bénin

- ~600 pharmacies d'officine agréées (DPMED / ABRP)
- Connexion internet instable — **mode offline CRITIQUE**
- Parc Android dominant — interface optimisée Android 8+ / 2 Go RAM
- Coupures électriques fréquentes — POS survit aux redémarrages
- Devise : **FCFA (XOF)** — jamais de conversion automatique
- Fuseau horaire : **WAT (UTC+1)** — tous les timestamps en WAT
- Paiements mobiles dominants : Wave, MTN Money, Moov Money
- Comptabilité : **SYSCOHADA révisé** (pas le plan comptable français)
- CNSS Bénin : part salariale **3,6%** — part patronale **15,4%**

---

## Documents de Référence

| Référence | Document |
|---|---|
| MH-CDC-2025-v2.0 | Cahier des Charges fonctionnel et technique |
| MH-SPECS-2025-v2.0 | Spécifications techniques (API, Prisma, RBAC) |
| MH-PRICING-2025-v2.0 | Politique de pricing et modèle tarifaire |
| MH-BRAND-2025-v1.0 | Guide de l'identité de marque MédiHelm |
| MH-DPMED-2025-001 | Dossier partenariat DPMED |
| MH-SOBAPS-2025-001 | Dossier partenariat SoBAPS |
| MH-GROS-2025-001 | Dossier partenariat Grossistes |

---

*YEHI OR Tech © 2025 — Dawes — Cotonou, Bénin*  
*MédiHelm — L'Infrastructure Pharmaceutique Numérique du Bénin*
