# Historique des migrations MediHelm

`20261005000000_init_baseline` est la migration de référence générée depuis `prisma/schema.prisma` de la branche `main` (schéma au 5 octobre 2026, incluant les 18 champs ABMed du modèle `Pharmacie`). Elle crée le schéma complet d'une base neuve : 66 tables, 30 types énumérés.

## Base neuve

1. Configurer `DATABASE_URL` hors du dépôt (secret, `.env` local non versionné).
2. Vérifier la cible : `pnpm db:migrate:status`.
3. Appliquer les migrations : `pnpm db:migrate:deploy`.
4. Générer le client : `pnpm db:generate`.

## Base déjà en service (Neon ou autre PostgreSQL existant)

Cette migration est un **baseline de création**, pas une migration incrémentale à exécuter sans contrôle sur une base existante déjà construite via `prisma db push`. Avant tout déploiement :

1. Réaliser une sauvegarde de la base.
2. Comparer le schéma réel (tables, colonnes, index, enums, contraintes) au SQL de ce baseline.
3. En cas de parité complète, enregistrer la migration comme appliquée :
   `pnpm prisma migrate resolve --applied 20261005000000_init_baseline`.
4. Ne jamais exécuter `db:reset` contre une base de production.

## Évolutions ultérieures du schéma

Toute modification de `prisma/schema.prisma` doit désormais passer par :

```bash
pnpm db:migrate --name <description_courte>
```

en local (génère un SQL incrémental versionné dans ce dossier), puis `pnpm db:migrate:deploy` en production. Éviter `db:push` sur les environnements partagés : il ne produit pas d'historique.

## Comptes institutionnels

Aucun compte institutionnel n'est seedé en environnement de build et il n'existe pas d'inscription publique pour ces rôles. Le provisionnement se fait par commande opérateur dédiée ; les mots de passe sont hashés et jamais versionnés.
