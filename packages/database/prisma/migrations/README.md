# Historique des migrations MédiHelm

`20261003180000_initial_baseline` est la migration de référence produite à partir du schéma Prisma centralisé. Elle crée le schéma complet d’une base neuve (66 tables dans la version générée le 3 octobre 2026), y compris les modèles institutionnels DPMED/SoBAPS.

## Base neuve

1. Configurer `DATABASE_URL` hors du dépôt, par exemple dans un gestionnaire de secrets.
2. Vérifier la cible avec `pnpm db:migrate:status`.
3. Appliquer les migrations avec `pnpm db:migrate:deploy`.
4. Générer le client avec `pnpm db:generate`.

## Base déjà en service

Cette migration est un **baseline de création**, pas une migration incrémentale destinée à être exécutée sans contrôle sur une base existante. Avant tout déploiement, réaliser une sauvegarde, comparer le schéma réel (tables, colonnes, index, enums et contraintes) au SQL de cette migration, puis coordonner le baselining avec la personne responsable de la base. N’utiliser `prisma migrate resolve --applied 20261003180000_initial_baseline` qu’après preuve de parité complète; ne pas exécuter `db:reset` en production.

## Comptes institutionnels

Aucun compte n’est seedé en environnement de build et aucune inscription publique n’existe. Provisionner un compte via `pnpm db:institution:create-user` en fournissant `INSTITUTION_CODE`, `INSTITUTION_EMAIL`, `INSTITUTION_FIRST_NAME`, `INSTITUTION_LAST_NAME` et `INSTITUTION_PASSWORD` à l’exécution; ne pas stocker le mot de passe en clair dans un fichier suivi. Les rôles DPMED/SoBAPS/ABRP sont attribués exclusivement par cette commande opérateur.
