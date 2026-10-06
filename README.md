# MediHelm — L'écosystème Santé de Confiance

Plateforme pharmaceutique du Bénin (Next.js 16 App Router + Prisma + PostgreSQL).

## Structure du dépôt

```
medihelm/
├── backend/                  # Racine du BACKEND
│   ├── prisma/               # schéma, migrations, seed, données ABMed
│   ├── src/api/              # implémentations des 174 routes API
│   ├── src/lib/              # logique métier (31 modules : db, auth, rbac…)
│   ├── src/types/            # types partagés (next-auth.d.ts)
│   ├── scripts/              # scripts serveur et tests
│   └── examples/             # exemples (websocket)
├── frontend/                 # Racine du FRONTEND
│   ├── src/app/              # pages Next.js + passerelles route.ts vers backend
│   ├── src/components/       # composants UI
│   ├── src/hooks/            # hooks React
│   ├── src/i18n/             # internationalisation
│   ├── public/               # assets statiques, PWA
│   └── messages/             # traductions fr/en
├── package.json              # orchestrateur Railway/Nixpacks (cd frontend)
└── railway.json              # build + start commands
```

## Pourquoi des passerelles route.ts dans frontend/ ?

Next.js (App Router) impose que les fichiers `route.ts` résident dans
l'arborescence `app/` de l'application compilée. Les passerelles
`frontend/src/app/api/**/route.ts` ne contiennent donc QUE des
ré-exports (`export { GET, POST } from "@backend/api/…"`) ; toute la
logique serveur (auth, RBAC, Prisma, validations) vit dans
`backend/src/api/**` et `backend/src/lib/**`.

## Développement local

```bash
cd frontend
pnpm install         # génère aussi le client Prisma (postinstall)
pnpm dev             # http://localhost:3000
```

## Déploiement Railway

Le service Railway reste configuré avec le **Root Directory = racine du dépôt**.
`railway.json` orchestre : build dans `frontend/`, migrations Prisma au
démarrage (`backend/prisma`), puis `node .next/standalone/frontend/server.js`.
Le serveur standalone imbriqué sert `public/` et `.next/static/` depuis son
propre dossier (`process.chdir(__dirname)`) : le post-build
`frontend/scripts/copy-standalone-assets.js` (chaîné dans `pnpm build`) les y
copie — sans lui, tous les JS/CSS/images clients renverraient 404 en production.

Variables requises : `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`.
