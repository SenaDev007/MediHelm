# Rapport d’audit MediHelm — documentation restaurée

**Date :** 2 octobre 2026
**Dépôt / branche :** `SenaDev007/MediHelm`, `main`
**Commit de base examiné :** `12695e4debdb1250aefaf7c5e479b73adfe65aae`
**Périmètre :** documents du dossier racine `MédiHelm/`, archives documentaires, code courant et corrections ciblées locales décrites ci-dessous.

## Conclusion exécutive

> **La conformité globale n’est pas démontrée. Le dépôt ne peut pas être déclaré aligné à 100 % ni présenté comme un ensemble de CRUD et de workflows tous fonctionnels.**

Les documents restaurés permettent de constater des fondations réelles — Next.js, API routes, schéma Prisma syntaxiquement valide, authentification/permissions partielles, validations, interfaces et quelques flux métier — mais ils révèlent des écarts importants d’architecture, de contrats, de frontières tenant, de fonctions métier et d’intégrations institutionnelles. Une route, un modèle, un rôle RBAC ou un écran ne prouve pas à lui seul un CRUD complet, une interface raccordée, une isolation de données ou un échange externe fonctionnel.

Les résultats structurés de la revue comptent **98 exigences** : 1 « implemented », 46 « partial », 27 « missing », 22 « conflict » et 2 « not verifiable ». Ce décompte descriptif n’est ni pondéré ni assimilable à un pourcentage de conformité. La seule exigence classée « implemented » porte sur l’arbitrage documentaire du pricing comme baseline, pas sur l’exécution du parcours de souscription.

### Réponse directe aux questions de conformité

- **Toutes les spécifications sont-elles implémentées à 100 % ?** Non. Plusieurs sont absentes, partielles ou en conflit avec le code et entre elles.
- **Tout le CRUD fonctionne-t-il ?** Ce n’est pas démontré. Les vérifications sont principalement statiques; plusieurs domaines n’ont que quelques verbes/routes, et les tests d’intégration/E2E ne sont pas observés.
- **Tout est-il connecté ?** Non démontré. Certaines interfaces appellent des routes, mais des contrats sont désalignés; des webhooks entrants ne prouvent pas une intégration sortante ou partenaire active, et plusieurs CTA/flux sont des placeholders.
- **Les fonctions critiques sont-elles validées en production ?** Non. Aucune base réelle, API partenaire, paiement, certificat ou service externe n’a été testé.

## Sources documentaires examinées

Les textes extraits des documents restaurés ont été répartis en domaines indépendants et comparés au dépôt. Les formats compagnons DOCX/PDF ont été comparés lorsqu’ils étaient présents. Les archives ZIP ont été listées; les documents textuels correspondants ont été examinés sans extraction vers le code.

- **Référentiel général :** `CONTEXT.md`, `medihelm.cursorrules`, `medihelm.md`, CDC MediHelm v1.0/v2.0 (DOCX/PDF), Specs MediHelm v1.0/v2.0 (DOCX/PDF).
- **Architecture et données :** `MediHelm_Schema_Prisma_v1.0` (DOCX/PDF), `MediHelm_Monorepo_Portails_v1.0` (DOCX/PDF).
- **Site public :** CDC, Specs, Cursor, Gemini, dossier Partenariat et Brand Guidelines MediHelm/SitePublic.
- **Scan :** CDC, Specs et Cursor MediHelm Scan (DOCX/PDF quand disponible).
- **Grossistes :** CDC Frontend, Cursor Frontend et Dossier Grossistes.
- **Institutionnel :** CDC Frontend, Cursor Frontend, Dossier DPMED et Dossier SoBAPS.
- **Tarifs :** Pricing v2.0 et v2.1.
- **Archives :** `MédiHelm documents.zip` et `Scan MédiHelm.zip` (inventaire/listing).
- **Code :** routes API, pages et composants, `src/lib`, RBAC/auth, `prisma/schema.prisma`, scripts et configuration concernés.

## Résultats par domaine

| Domaine | Implémenté | Partiel | Absent | Conflit | Non vérifiable |
|---|---:|---:|---:|---:|---:|
| Core / modules métier | 0 | 12 | 1 | 1 | 0 |
| Architecture / schéma / portails | 0 | 2 | 3 | 6 | 0 |
| Site public / parcours patient | 0 | 8 | 4 | 4 | 0 |
| Scan / GS1 | 0 | 4 | 7 | 0 | 1 |
| Grossistes | 0 | 3 | 6 | 3 | 1 |
| Institutionnel / DPMED / SoBAPS / ABRP | 0 | 10 | 2 | 1 | 0 |
| Pricing / abonnement | 1 | 2 | 3 | 3 | 0 |
| Guidelines / IA / qualité | 0 | 5 | 1 | 4 | 0 |
| **Total descriptif** | **1** | **46** | **27** | **22** | **2** |

Les statuts décrivent les observations documentées dans l’audit; les exigences ne sont pas pondérées par gravité et une ligne « partial » peut porter un gap critique.

### 1. Core et modules métier

- Le RBAC déclare M01–M19 (`src/lib/rbac.ts`), mais cela ne démontre pas que les 19 parcours, écrans et opérations sont réalisés.
- **Stock/POS :** les routes et transactions existent, mais les garde-fous observés ne démontrent pas le contrôle de stock concurrent, le refus systématique du stock négatif, le FEFO persistant, le rapprochement des paiements, les sessions de caisse complètes ni l’idempotence des replays offline.
- **Patients/ordonnances :** des routes GET/POST et des pages existent, mais le dossier patient complet, le cycle de validation/délivrance, les renouvellements et l’ensemble du CRUD spécifié ne sont pas établis.
- **RH/finance :** certaines listes/calculs sont présents; planning, paie réglementaire, journal comptable et exports légaux complets ne sont pas démontrés. Des hypothèses de marge et de TVA sont codées comme valeurs de secours dans les rapports financiers.
- **Qualité/conformité :** un signalement peut être créé/soumis, mais la soumission observée ne démontre pas le transport réglementaire externe, le retour d’accusé, le suivi complet ou les exports prescrits.

### 2. Architecture, données et isolation tenant

- La cible Monorepo décrit Turborepo/pnpm, des apps séparées, des packages partagés et une API NestJS `/v1`; le dépôt observé est une application Next.js monolithique avec API routes sous `src/app/api`.
- Le schéma Prisma réel valide sa propre syntaxe, mais ne correspond pas aux entités, enums, relations, indices et frontières tenant du schéma de référence. La documentation Schéma comporte elle-même une incohérence de comptage entre modèles annoncés et index de modèles.
- Aucun mécanisme PostgreSQL RLS, politique de migration versionnée ou injection centralisée du tenant SQL n’a été démontré. Une partie de la protection dépend donc de filtres appliqués route par route; plusieurs handlers historiques interrogent ou modifient par identifiant.
- Les modèles/rôles grossiste sont incomplets : le token observé transporte `pharmacieId`, pas de `grossisteId`/`tenantType` permettant d’isoler un compte grossiste.

### 3. Site public et patient

- Le contrat demande des parcours publics, notamment une recherche sans compte, des pages de garde/vérification, une fiche pharmacie par slug, une acquisition `/rejoindre`, une commande anonyme et un suivi public. Les équivalents observés sont principalement sous `/patient` et certains nécessitent NextAuth.
- La vérification patient appelle des routes protégées; le bouton caméra du code indique lui-même qu’il s’agit d’une implémentation future.
- La page de garde est cliente; SSR/revalidate, fonctionnement sans JavaScript, disponibilité hors ligne et abonnement réel aux notifications ne sont pas prouvés.
- La carte observée utilise Mapbox; la documentation demande Leaflet/OpenStreetMap. Le SEO public (metadata par page, JSON-LD, sitemap, canonical et robots conformes) reste incomplet ou non démontré.

### 4. Scan et GS1

- Un parser GS1 et un resolver existent dans `src/lib/scan-gs1.ts`, ainsi qu’une route protégée `/api/scan` et une interface de vérification.
- Le lecteur caméra n’est pas implémenté; aucun branchement scanner USB POS, réception ou inventaire n’est établi. Le parser, les champs persistés et les statuts retournés diffèrent des contrats documentaires.
- La chaîne POS/réception/inventaire n’applique pas encore de façon démontrée les blocages FEFO, lot expiré/rupture, l’idempotence et le protocole d’alertes attendu.
- Les documents divergent aussi entre `/v1/scan` et `/api/scan`, et entre les contextes/statuts prescrits et ceux exposés par le code.

### 5. Grossistes

- Un catalogue interne, des pages de commandes/statistiques et certains handlers de webhook entrant existent.
- Les pages et workflows grossiste G01–G10 ne sont pas complets : gestion des lots, picking, livraisons mobile/offline, finance/crédit, catalogue public et diffusion temps réel ne sont pas établis.
- Les webhooks entrants ne prouvent pas une émission vers UbiPharm/Promopharma, un EDI, une synchronisation récurrente ou un pilote partenaire opérationnel.
- Le rôle `GROSSISTE_PARTNER` ne peut pas être correctement isolé par tenant avec les claims actuels; l’accès a été fermé sur l’endpoint portail jusqu’à ce que cette relation soit modélisée.
- Les statuts frontend/API/Prisma présentent des incompatibilités, ce qui peut casser les transitions à l’exécution.

### 6. Institutionnel, DPMED, SoBAPS et ABRP

- Des dashboards et endpoints d’alertes, pharmacovigilance, cartes et analytics existent; registres, référentiels et exports réglementaires détaillés manquent dans les routes/pages institutionnelles recensées.
- Les exigences mTLS, signature RSA-256 obligatoire, file durable, push/SMS patient, acquittement et SLA inférieur à deux minutes ne sont pas toutes démontrées par le code observé. La vérification RSA est conditionnelle à une configuration dans le pipeline inspecté; HMAC/IP seul ne prouve pas le protocole complet.
- Des données financières sont présentes dans des réponses SoBAPS/ABRP et l’anonymisation institutionnelle n’est pas démontrée de bout en bout.
- Les documents divergent sur les seuils/pondérations de conformité et les états d’alerte. Le code affiche encore un troisième référentiel.

### 7. Pricing, abonnement et paiement

- Pricing v2.1 indique remplacer v2.0, mais le code utilise `SEED/BLOOM/CROWN/NETWORK` alors que v2.1 emploie `SEED/GROW/LEAD/NETWORK`.
- L’inscription observée crée un abonnement actif d’essai de 14 jours sans paiement/onboarding; v2.1 décrit 30 jours sur GROW et une activation après paiement de l’onboarding et du premier mois.
- L’API options expose des tarifs/limites historiques, autorise TRIMESTRIEL alors que v2.1 décrit mensuel/annuel, et les actions abonnement créent des montants nuls ou ne prennent pas en compte les champs de paiement.
- Un flux FedaPay pour les ventes ne prouve pas le cycle d’abonnement, le renouvellement, le prorata, les impayés, la résiliation ni l’application des quotas.
- Le calcul annuel SEED de v2.1 semble lui-même arithmétiquement incohérent; ce point doit être arbitré avec la source commerciale.

### 8. IA et qualité de livraison

- La route prédictions documente un placeholder `simplified_v1` et une confiance fixe; les heuristiques existantes ne démontrent pas ORION, une génération IA réelle, une planification, un cooldown ou une fraîcheur des données.
- Les consignes d’implémentation, CDC et pricing conservent des versions d’enums/architecture différentes; il faut une baseline explicite pour éviter des migrations contradictoires.
- Aucun jeu de tests unitaires/intégration/E2E, test de tenant, pipeline CI ou validation réelle d’intégration n’a été observé. Le dernier lint global disponible rapportait 92 erreurs et 1 avertissement; le lint des fichiers retouchés dans ce tour est propre.

## Corrections de sécurité réalisées dans cette reprise

Les changements ciblés suivants ont été appliqués localement au-dessus du commit de base :

1. **SoBAPS en lecture seule :** `src/app/api/portail/sobaps/confirmations/route.ts` réserve GET aux rôles `SOBAPS_VIEWER` et `PLATFORM_ADMIN`; POST exige `write` et est réservé à `PLATFORM_ADMIN`. Le POST vérifie que la pharmacie correspond bien à la commande avant création/mise à jour. GET n’expose plus téléphone, prix d’achat ou montants financiers et borne la pagination.
2. **Commandes grossiste :** `src/app/api/portail/grossiste/commandes/route.ts` scoper GET/POST à la pharmacie issue du token, refuse un `pharmacieId` client différent, borne la pagination et refuse provisoirement `GROSSISTE_PARTNER`, faute de tenant grossiste lié à la session.
3. **Sessions de caisse :** `src/app/api/sessions-caisse/[id]/route.ts` filtre GET/PATCH par tenant pharmacie (sauf administrateur plateforme), refuse une session si le tenant manque, empêche une seconde clôture et n’accepte plus un PATCH générique; la seule mutation conservée est la clôture utilisée par l’écran actuel.

Ces corrections et ce rapport sont inclus dans le commit de livraison issu de cette revue. Ils ne corrigent pas l’ensemble des écarts fonctionnels listés ci-dessus.

## Vérifications exécutées pour ces changements

| Vérification | Résultat | Portée |
|---|---|---|
| `npx tsc --noEmit` | **PASS** | TypeScript complet après les correctifs ciblés. |
| ESLint sur les fichiers TypeScript modifiés | **PASS** | Aucun diagnostic sur ces fichiers. |
| `git diff --check` | **PASS** | Aucune erreur de whitespace dans le diff au moment du contrôle. |
| `npm run build` | **PASS** | Build de production terminé, pages/routes Next.js générées. `DATABASE_URL` et `NEXTAUTH_SECRET` étaient factices; Next.js a indiqué avoir chargé `.env` automatiquement, dont le contenu n’a pas été lu ou imprimé. Aucune connexion DB ni transaction externe n’a été intentionnellement lancée. |
| Tests métier/API/DB/E2E | **NON EXÉCUTÉS** | Pas de base de test, session, service ou compte partenaire utilisé. |
| Lint complet | **ÉCHEC HISTORIQUE : 92 erreurs, 1 avertissement** | Le lint ciblé des fichiers modifiés passe; une reprise complète du lint du dépôt reste nécessaire. |

Le build réussi prouve que le bundle se construit; il ne valide pas la logique runtime des routes, les accès, les contrats JSON, la DB, les transactions, les intégrations ou le comportement des pages en navigateur.

## Décisions nécessaires avant les changements structurels

Une partie des travaux restants modifierait le produit ou l’architecture et ne peut pas être arbitrée silencieusement :

1. **Architecture cible :** maintenir le monolithe Next.js ou migrer vers le monorepo NestJS/Turborepo documenté ?
2. **Baseline normative :** peut-on traiter CDC/Specs v2 et Pricing v2.1 comme référence prioritaire, même lorsque les valeurs commerciales et certains documents partenaires se contredisent ?
3. **Plans :** remplacer définitivement BLOOM/CROWN par GROW/LEAD, ou conserver les noms historiques ? Cette décision affecte Prisma, API, UI et abonnements existants.
4. **Offline :** la cible est-elle strictement SQLite répliqué ou le produit peut-il retenir IndexedDB ? Il faut définir chiffrement, réplication et idempotence.
5. **Institutionnel :** fixer un référentiel unique de score/seuil, confirmer que SoBAPS est strictement en lecture seule, et choisir le protocole réglementaire réel (mTLS, RSA, HMAC) avant d’implémenter les échanges externes.
6. **Grossistes :** définir l’identité/tenant du grossiste et le contrat de prix/validation des lignes de commande avant d’ouvrir l’accès partenaire.

## Limites et sécurité

Aucun secret, certificat, webhook réel, base de données, paiement FedaPay, fournisseur SMS/push, service grossiste, API DPMED/SoBAPS, queue BullMQ, RLS ou environnement de production n’a été utilisé pour cet audit. Le build a chargé `.env` via le mécanisme standard de Next.js; le fichier n’a pas été ouvert manuellement et ses valeurs ne sont pas reproduites. Le jeton GitHub collé dans le fil initial ne doit pas être réutilisé; s’il est encore actif, il doit être révoqué et remplacé par une authentification gérée.

## Conclusion et suites recommandées

Le dépôt comprend une base produit importante mais **ne satisfait pas de façon démontrée l’ensemble de la documentation restaurée**. Les corrections tenant/SoBAPS appliquées réduisent des risques précis; elles ne valent pas certification générale. Priorité : arbitrer les choix normatifs ci-dessus, traiter l’isolation tenant et les contrats de sécurité, aligner les schémas/DTO, puis bâtir une suite automatisée avec tests négatifs cross-tenant, tests de CRUD/états, tests scan/offline et tests d’intégration partenaires contrôlés.
