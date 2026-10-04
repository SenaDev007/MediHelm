# Migration MédiHelm vers Turborepo / NestJS

**État au 4 octobre 2026 — intégration publiée sur `main` et branche de migration alignée**

Cette migration est **progressive** : elle conserve le monolithe historique pendant l’extraction des domaines, sans bascule de production ni suppression de routes existantes.

## Workspaces

| Workspace | État | Port local |
| --- | --- | ---: |
| `apps/medihelm-api` | NestJS/Fastify; authentification, liveness, CRUD médicaments pharmacie, modules DPMED/SoBAPS et gardes tenant/rôle | 3000 |
| `apps/medihelm-public` | Hub public statique, `/portails` et page `/connexion` vers les portails séparés | 3010 |
| `apps/medihelm-web` | Application historique déplacée; ses handlers métier et NextAuth restent la référence de transition | 3001 |
| `apps/medihelm-grossiste` | Workspace séparé; son flux métier n’est pas encore entièrement extrait de l’ancien portail | 3002 |
| `apps/medihelm-institutionnel` | Nouveau portail distinct DPMED/SoBAPS, connexion serveur, navigation filtrée par rôle, BFF same-origin | 3004 |
| `apps/medihelm-admin` | **Non créé** : espace administrateur séparé demandé par le prompt institutionnel, à traiter dans une étape suivante | — |
| `packages/database` | Source Prisma centrale, client partagé, provisionnement institutionnel manuel et migrations versionnées | — |
| `packages/types` | Contrats de rôles, tenants, plans, JWT et réponses API | — |
| `packages/auth` | Décodage/navigation côté client uniquement — jamais une autorisation | — |
| `packages/ui` | Composants partagés | — |
| `packages/config` | Presets TypeScript Next.js/NestJS | — |

## Parcours API migrés

### Authentification et pharmacie

- `POST /v1/auth/login` : comptes pharmacie existants; vérification bcrypt ou SHA-256 historique avec rehash bcrypt après authentification réussie. Une option explicite de tenant `INSTITUTIONNEL` permet aussi le login des comptes institutionnels.
- `GET /v1/auth/me` : Bearer signé, profil et statut tenant revérifiés côté API.
- `GET`, `POST`, `PATCH`, `DELETE /v1/medicaments[/:id]` : guards JWT/tenant/rôle, pagination bornée; l’ID d’officine vient du JWT et les suppressions sont des archivages.

### DPMED (`DPMED_ADMIN`)

Routes sous `/v1/institutionnel/dpmed` : tableau de bord, alertes (liste/détail/création/modification/annulation/publication), signalements EI, conformité, médicaments sous surveillance et fiches DCI. La surveillance et les fiches DCI ont des opérations de création, lecture (liste et détail), modification et archivage; les écrans DPMED disposent désormais de formulaires correspondants. Les alertes en brouillon sont modifiables depuis leur écran détail. Les mutations exigent le tenant DPMED actif et le rôle exact.

- Les alertes sont d’abord créées en brouillon. La publication exige une paire de clés RSA-256 cohérente (`DPMED_PRIVATE_KEY` et `DPMED_PUBLIC_KEY`), vérifie la signature puis enregistre atomiquement l’état et les officines cibles.
- Les notifications push/SMS ne sont **pas** envoyées : le worker, les fournisseurs/certificats et mTLS ne sont pas configurés. La cible documentaire de diffusion `< 2 min` n’est donc ni implémentée ni revendiquée.
- La vue de pharmacovigilance renvoie une allowlist de métadonnées et une référence d’officine pseudonymisée; elle exclut le narratif clinique libre et l’identifiant direct de l’officine.
- La conformité est une consultation des scores existants; elle ne constitue ni une inspection ni une certification officielle. Les registres réglementaires DPMED restent à extraire/relier.

### SoBAPS (`SOBAPS_VIEWER`)

- Portail SoBAPS en lecture seule : tableau agrégé, livraisons et confirmations/litiges sous `/v1/institutionnel/sobaps`.
- L’officine possède un CRUD dédié sous `/v1/sobaps/receptions[/:id]` : créer une réception depuis les lignes reçues, consulter par tenant, corriger tant qu’elle est en attente, confirmer (l’état devient `CONFIRME` ou `LITIGE` selon les écarts), ou annuler.
- Les données de réception exposées à SoBAPS sont limitées aux éléments logistiques (officine, référence BL, DCI/lot/quantités reçues et écarts). Les données patient, ventes, prix et finances ne sont pas incluses.
- Aucun webhook sortant n’est présenté comme envoyé. L’intégration automatique des bons de livraison SoBAPS reste une étape ultérieure.

## Frontière de sécurité institutionnelle

Les comptes DPMED/SoBAPS sont dans des tables distinctes `InstitutionTenant`/`InstitutionUser`; ils sont créés uniquement par commande opérateur (aucune inscription publique ni seed de production). Le guard NestJS relie à chaque requête le JWT à l’utilisateur, au tenant institutionnel et au couple institution/rôle actifs en base. Le portail Next.js met un cookie `HttpOnly`, puis introspecte `/v1/auth/me` côté serveur/Proxy et via son BFF; il ne reçoit ni ne partage `JWT_SECRET`, qui reste au serveur API. L’API reste l’autorité finale des droits.

Le rate limit global est de 120/minute/IP et celui du login de 5/minute/IP; son stockage actuel est en mémoire et doit devenir distribué avant une exploitation multi-instance. Les contrôles CORS s’appliquent aux appels navigateurs; le BFF institutionnel communique serveur-à-serveur.

## Documentation analysée

Voir [MONOREPO_DOCUMENTATION_AUDIT.md](./MONOREPO_DOCUMENTATION_AUDIT.md) : inventaire des **42 fichiers** dans `MédiHelm/`, méthodes d’extraction en lecture seule, **15 relations de duplication confirmées**, exigences et limites DPMED/SoBAPS. Les documents et archives n’ont pas été exécutés. L’orchestration par agent a produit 19 analyses structurées avant arrêt; le rapport ne prétend donc pas à une validation agent individuelle des 42 pièces. Les dossiers DPMED, SoBAPS et spécifications institutionnelles ont été consultés directement.

Les documents de partenariat restent des propositions : ils ne prouvent pas l’existence d’un accord, d’une certification ou d’une API partenaire. Les décisions non déterminées (seuils/pondérations, exports réglementaires, conservation, mTLS, API réelles) ne doivent pas être inventées.

## Historique Prisma et provisionnement

Une migration de référence est versionnée dans `packages/database/prisma/migrations/20261003180000_initial_baseline/migration.sql`; elle a été générée depuis le schéma central et contient la création complète d’une base neuve. Aucune base réelle n’a été interrogée ni migrée.

- Base neuve : `pnpm db:migrate:status`, puis `pnpm db:migrate:deploy`, puis `pnpm db:generate`.
- Base existante : **ne pas appliquer directement** cette baseline. Faire une sauvegarde, comparer tables/colonnes/index/enums/contraintes et n’enregistrer `migrate resolve --applied 20261003180000_initial_baseline` qu’après preuve de parité complète. Voir `packages/database/prisma/migrations/README.md`.
- Provisionnement : `pnpm db:institution:create-user` avec les variables `INSTITUTION_CODE`, `INSTITUTION_EMAIL`, `INSTITUTION_FIRST_NAME`, `INSTITUTION_LAST_NAME`, `INSTITUTION_PASSWORD` (et optionnellement `INSTITUTION_NAME`). Le mot de passe est hashé bcrypt; il n’est jamais inclus dans un commit.
- Ne jamais exécuter `db:reset` contre une base de production.

## Installation locale

Pré-requis : Node.js 22 et pnpm 11.

```bash
pnpm install
cp apps/medihelm-api/.env.example apps/medihelm-api/.env
cp packages/database/.env.example packages/database/.env
cp apps/medihelm-institutionnel/.env.example apps/medihelm-institutionnel/.env
pnpm db:generate
pnpm dev
```

Configurer `DATABASE_URL` et `JWT_SECRET` uniquement dans l’environnement de l’API. Le portail institutionnel a besoin de `MEDIHELM_API_URL`, mais pas du secret JWT. Les clés RSA DPMED doivent venir d’un gestionnaire de secrets et ne sont pas requises pour créer des brouillons. `pnpm dev` lance les workspaces déclarant `dev`.

Commandes utiles :

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm db:migrate:status
pnpm db:migrate:deploy
```

## Vérifications ciblées de cette étape

- `pnpm --filter @medihelm/api typecheck` : réussite.
- `pnpm --filter @medihelm/api lint` : réussite.
- `pnpm --filter @medihelm/api test` : **11 tests réussis**, dont login institutionnel/roles, guard tenant, signature RSA, absence du narratif EI et isolation des confirmations pharmacie.
- `pnpm --filter @medihelm/institutionnel lint` : réussite.
- `pnpm --filter @medihelm/institutionnel build` : réussite; les routes DPMED/SoBAPS et le BFF sont compilés.
- `pnpm --filter @medihelm/public typecheck` : réussite.
- `prisma validate` : réussite; migration baseline générée (66 tables, 32 enums/types SQL).
- `pnpm typecheck` : **8 tâches réussies** sur les workspaces qui déclarent ce script.
- `pnpm test` : **11 tests API réussis**; le workspace web historique découvre encore 0 test.
- `DATABASE_URL=<URL locale factice> pnpm build` : **6 tâches réussies** (database, API, institutionnel, public, grossiste et web); la première tentative sans `DATABASE_URL` a échoué à la génération Prisma, puis le build a réussi avec une URL factice et sans connexion à une base.
- Smoke HTTP local du build institutionnel : `/login` répond 200, `/api/auth/me` sans cookie répond 401 et `/dpmed` sans session redirige en 307 vers le login.
- `pnpm lint` : échec exclusivement dans `@medihelm/web` historique (**92 erreurs et 4 avertissements**, principalement `react-hooks/set-state-in-effect`); les lints ciblés `@medihelm/api` et `@medihelm/institutionnel` réussissent.
- Ces vérifications ne remplacent pas encore une suite complète d’intégration avec PostgreSQL, des tests e2e de déploiement, ni une validation de la politique d’officine en production.

## Limites et étapes restantes

1. Ajouter des tests d’intégration réels sur PostgreSQL pour les routes DPMED, SoBAPS et pharmacie; valider les transitions concurrentes et les migrations contre un schéma de staging représentatif.
2. Extraire patients, ordonnances, fournisseurs et autres domaines API depuis `apps/medihelm-web`; vérifier chaque CRUD, RBAC, audit log et tenant.
3. Extraire les fonctionnalités métier des frontends grossiste et DPMED/SoBAPS; terminer les vues/exports et registres prévus par les spécifications, et connecter l’interface pharmacie existante aux routes SoBAPS reçues.
4. Créer et migrer le portail `apps/medihelm-admin` et l’espace ABRP séparé; fournir une voie explicite et testée pour leurs comptes.
5. Reprendre et tester le POS/offline, les webhooks, l’outbox et les flux de reprise; l’ancien monolithe reste source active de ces fonctionnalités.
6. Remplacer le rate limit mémoire, configurer mTLS et les fournisseurs de notification, puis mesurer les objectifs documentés en environnement adapté.
7. Mettre à jour CI/CD, proxy/domaines, sauvegardes et plan de retour arrière après revue de sécurité et preuve de parité; aucune bascule de production n’a été faite dans cette étape.

**La migration ne prétend pas à 100 % de conformité de la plateforme entière.** Le portail institutionnel et ses premières routes sont maintenant présents; les modules historiques, l’offline POS et plusieurs intégrations restent à migrer et à vérifier avant toute bascule.
