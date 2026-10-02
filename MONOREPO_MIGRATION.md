# Migration MediHelm vers Turborepo / NestJS

## État de la branche de migration

Cette branche établit le monorepo sans supprimer le fonctionnement historique. L’application Next.js a été déplacée dans `apps/medihelm-web`, et le schéma Prisma partagé réside sous `packages/database`.

| Workspace | État | Port local |
| --- | --- | ---: |
| `apps/medihelm-api` | NestJS/Fastify; santé, login pharmacie JWT, profil `/me`, CRUD médicaments tenant-scoped | 3000 |
| `apps/medihelm-public` | Hub public statique et page `/portails` non indexable | 3010 |
| `apps/medihelm-web` | Application historique déplacée; handlers métier et NextAuth encore disponibles | 3001 |
| `apps/medihelm-grossiste` | Workspace séparé avec page de transition vers le portail historique | 3002 |
| `packages/database` | Schéma Prisma unique, client généré et seed partagés entre API et web | — |
| `packages/types` | Contrats de rôles, tenants, plans, JWT et réponses API; aliases legacy explicites | — |
| `packages/auth` | Décodage/navigation côté navigateur uniquement — jamais une autorisation | — |
| `packages/ui` | Composant partagé `PortalCard` | — |
| `packages/config` | Presets TypeScript stricts pour Next.js et NestJS | — |

### Parcours NestJS déjà migrés

- `GET /v1/health` : liveness de l’API.
- `POST /v1/auth/login` : comptes utilisateur pharmacie actifs, vérification bcrypt ou SHA-256 legacy avec rehash bcrypt après connexion réussie; JWT HS256 signé, issuer/audience vérifiés, expiration 15 minutes.
- `GET /v1/auth/me` : Bearer signé et profil/tenant revalidés en base.
- `GET /v1/medicaments` et `GET /v1/medicaments/:id` : lecture tenant pharmacie, pagination bornée, filtres et lots filtrés sur le même tenant.
- `POST /v1/medicaments`, `PATCH /v1/medicaments/:id`, `DELETE /v1/medicaments/:id` : gardes JWT, tenant, rôle et DTO strict; DELETE archive (`actif=false`) au lieu de supprimer les références historiques.

Les mutations ne prennent jamais `pharmacieId` du payload; les requêtes d’élément et d’archivage associent l’identifiant à la pharmacie du JWT. Le rate limit global est 120/minute/IP, remplacé par 5/minute sur le login. Le stockage actuel du limiteur est en mémoire, donc il doit devenir distribué (par exemple Redis) avant une exploitation multi-instance.

### Frontière et limites actuelles

L’API Nest **n’a pas encore** l’ensemble des CRUD métier, des guards RBAC/tenant partagés pour tous les modules, les comptes grossistes/institutionnels, le refresh-token révocable, la récupération de mot de passe ni les tests de parité complets. Les 157 handlers Next.js et NextAuth restent en service dans `apps/medihelm-web`; les portails ne sont pas encore basculés vers le nouveau login. Ne retirez pas NextAuth et ne changez pas les clients tant que les contrats/roles/tenants, les autres routes et les flux n’ont pas été migrés et validés.

Le schéma déplacé est centralisé, mais cette étape n’a pas ajouté de migration SQL versionnée ni changé le schéma métier. Vérifier la compatibilité et la stratégie de migrations avant une évolution de données.

**Ne pas basculer les domaines ni déployer ces workspaces comme remplacement de production à cette étape.** Le `Caddyfile`, CI/CD, domaines et politiques de sauvegarde n’ont pas été changés. Aucun `.env` réel ni aucune base de production n’ont été lus ou modifiés.

## Installation et exécution locale

Pré-requis : Node.js 22 et pnpm 11.

```bash
pnpm install
cp apps/medihelm-api/.env.example apps/medihelm-api/.env
cp packages/database/.env.example packages/database/.env
pnpm db:generate
pnpm dev
```

Remplacer les identifiants de la base et `JWT_SECRET` par des valeurs locales sûres avant de démarrer l’API; la clé doit comporter au moins 32 octets et ne peut pas rester le placeholder `REPLACE_...`. `packages/database/prisma.config.ts` charge le `.env` du workspace database pour les commandes Prisma; les builds CI doivent fournir `DATABASE_URL` au job. `pnpm dev` lance l’API sur `3000`, le hub public sur `3010`, le web historique sur `3001` et le portail grossiste sur `3002`.

Commandes utiles :

```bash
pnpm typecheck
pnpm build
pnpm test
pnpm --filter @medihelm/database db:generate
pnpm --filter @medihelm/api test
```

`CORS_ORIGINS` contient la liste d’origines HTTPS de production; en développement les origines localhost documentées sont autorisées. Les opérations `db:push`, `db:migrate`, `db:reset` et `db:seed` sont disponibles dans `@medihelm/database`; n’exécutez pas les commandes destructives contre une base réelle sans revue préalable.

## Ordre de migration restant

1. Ajouter migrations versionnées pour le package database et contrôler la compatibilité du schéma courant.
2. Extraire les modules API par domaine vers NestJS; ajouter les guards RBAC, tenant, audit et tests de contrat avant les mutations.
3. Migrer les comptes et profils grossistes/institutionnels, le refresh/revocation, la récupération de mot de passe et les tests de sécurité.
4. Connecter progressivement les frontends au nouveau JWT et à `NEXT_PUBLIC_API_URL`; conserver NextAuth et les routes legacy comme fallback pendant la validation.
5. Extraire les pages institutionnelles et administrateur vers leurs espaces/domaines dédiés; maintenir l’isolation demandée pour chaque institution.
6. Migrer le POS/offline, les webhooks et les autres flux, et obtenir la parité CRUD sur tests d’intégration.
7. Mettre à jour proxy et environnements, effectuer une revue de sécurité, puis organiser une bascule explicite avec plan de retour arrière.

Chaque étape doit préserver le comportement du commit précédent; ne supprimer les handlers historiques qu’après preuve de parité fonctionnelle et de sécurité.

## Vérifications de cette étape

- `pnpm typecheck` : **7 tâches réussies** sur les workspaces typés.
- `pnpm test` : **5 tests API réussis**, aucun échec; le workspace web historique découvre actuellement **0 test**.
- `pnpm --filter @medihelm/api lint` : réussite.
- `pnpm build` : **5 tâches réussies** (database, API, web, hub public, portail grossiste), avec une URL PostgreSQL locale factice pour `prisma generate`; aucune connexion ni donnée de production n’a été utilisée.
- Smoke HTTP NestJS local : `/v1/health` répond 200; médicaments sans JWT répond 401; rôle patient et tenant grossiste répondent 403; tentative d’imposer `pharmacieId` dans le POST répond 400.
- Génération Prisma testée avec un fichier d’environnement temporaire externe; aucun fichier `.env` privé n’a été lu ou modifié.
