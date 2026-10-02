# Audit de conformité MediHelm — corrections et état final

**Date :** 2 octobre 2026
**Dépôt :** `SenaDev007/MediHelm`, branche `main`
**Commit de base audité :** `cb635de2f7589e59d7755f9ad6efc0b867b4b349`
**Périmètre :** documentation présente dans le dépôt, revue statique du code, corrections locales et contrôles de build. Aucune base de données, aucun environnement de production et aucun fournisseur de paiement n’ont été sollicités.

## Verdict

**MediHelm n’est pas certifiable à 100 % conforme aux spécifications ni comme CRUD complet.** Des corrections importantes ont été apportées, le contrôle TypeScript complet et le build passent maintenant, mais les exigences originales ne sont pas toutes présentes dans le dépôt, le lint global relève encore 92 erreurs et 1 avertissement, et plusieurs flux fonctionnels/transactions n’ont pas été testés sur une base réelle.

Les changements sécurisent des chemins prioritaires et rétablissent plusieurs contrats patient/API. Ils ne prouvent pas que chaque opération métier est complète, que chaque écran est raccordé, ou que toutes les exigences métier sont satisfaites.

## Documentation et périmètre examinés

La documentation présente a été inventoriée et lue : les sept fichiers de `agent-ctx/`, `worklog.md`, `download/README.md`, les rapports PDF d’analyse et d’audit, ainsi que les plans de conformité v1 et v2. Les documents historiques ont été comparés au code courant, car certains constats y sont datés.

Au commit de base, l’inventaire recensait **157 handlers API** et **75 modèles Prisma**. Aucun dossier de migrations Prisma versionnées, aucune suite automatisée de tests API/UI ni aucun workflow CI GitHub exploitable n’a été trouvé. Les sources originales de certaines spécifications/cahiers des charges ne sont pas présentes : il est impossible de produire une certification exhaustive « 100 % » ligne par ligne.

## Corrections effectuées

1. **Authentification** — suppression du fallback d’authentification Bearer non signé et du décodage manuel de JWT dans le middleware; les routes concernées utilisent la validation NextAuth. Un guard `requirePatientAccess` centralise maintenant la résolution du dossier patient et vérifie l’identité ou le tenant, avec refus si le tenant manque.
2. **Claims et mots de passe** — le callback NextAuth fournit désormais `roleId` et les permissions du rôle; les erreurs de typage associées sont corrigées. Les hashes SHA-256 historiques sont comparés en temps constant et migrés en bcrypt après une connexion valide.
3. **Inscription pharmacie** — le formulaire et le schéma serveur imposent un mot de passe d’au moins 12 caractères. Le rôle et le tenant ne sont plus contrôlés par le client : pharmacie, premier directeur et abonnement d’essai de 14 jours sont créés transactionnellement; période et plan choisis sont persistés.
4. **Inscription patient** — l’inscription publique est rate-limitée, exige une pharmacie active choisie et attribue `PATIENT` côté serveur. Les GET de compte ne permettent plus une recherche arbitraire par email.
5. **Accès aux données patient** — commandes, compte, fidélité, rappels, ordonnances, vaccinations et données QR sont scoppés à l’utilisateur patient ou à sa pharmacie. Les handlers patient dérivent le dossier depuis la session plutôt que de faire confiance au seul identifiant client.
6. **Commandes patient et recherche** — le payload commande est validé sans faire confiance aux prix client; la recherche renvoie le DTO attendu, filtre les pharmacies actives et utilise des codes ATC valides. Quantité et pagination sont bornées.
7. **Ordonnances** — la création générale enregistre désormais ses lignes imbriquées, valide le tenant et redirige les patients vers leur endpoint protégé. L’upload patient accepte les images JPEG/PNG/WebP jusqu’à 2 Mo, transmises comme données persistantes plutôt que comme URL `blob:` locale.
8. **Pharmacies publiques** — les réponses de découverte sont limitées aux champs nécessaires; la création administrative vérifie les champs et types avant écriture.
9. **Webhooks** — DPMED, SoBAPS, UbiPharm et Promopharma refusent une configuration ou signature manquante/invalide; le secret brut n’est plus accepté en remplacement d’une signature. Fedapay exige également la clé/signature et compare le HMAC SHA-256 en temps constant.
10. **Webhooks grossiste** — la lecture des clés/webhooks exige un guard; les secrets ne sont plus renvoyés. Faute de relation d’appartenance grossiste fiable, ces endpoints sont temporairement limités à l’administration plateforme.
11. **Contrats et typage complémentaires** — corrections des types Prisma sur commandes fournisseur, certifications, statistiques, options d’abonnement, exports/ventes, synchronisation hors ligne, carte Mapbox, i18n et seed. Le paiement de vente utilise le vendeur issu de la session, et les lignes/références/statuts de synchronisation correspondent au schéma.
12. **Hygiène Git/dépendances** — `.env` est retiré de l’index local et reste ignoré; `.env.example` sans valeur secrète est ajouté. `package-lock.json` a été synchronisé pour permettre une installation reproductible.

## Vérifications exécutées

| Contrôle | Résultat | Détail |
|---|---|---|
| `npm ci --ignore-scripts --no-audit --no-fund` | **PASS** | 1 006 paquets installés; aucun script de post-installation exécuté. |
| `prisma generate` | **PASS** | Client Prisma généré avec une URL factice; aucune connexion à une base réelle. |
| `npx tsc --noEmit` | **PASS** | 0 diagnostic TypeScript après corrections. |
| ESLint sur tous les fichiers TS/TSX modifiés | **PASS** | Aucun diagnostic sur le diff local. |
| ESLint complet (`npm run lint -- --no-cache`) | **FAIL** | **92 erreurs et 1 avertissement** dans le dépôt, principalement règles React Hooks et autres problèmes de fichiers non modifiés. |
| `git diff --check` | **PASS** | Pas d’erreur d’espacement au dernier contrôle. |
| Tests de fumée Zod | **PASS** | Inscription patient, quantité commande, image valide et rejet d’une URL `blob:`. |
| Tests de fumée HMAC Fedapay | **PASS** | Signature valide et préfixée acceptées; signature invalide ou payload modifié refusés. |
| `npm run build` | **PASS** | Build terminé et routes Next.js générées; aucun service externe n’a été contacté. |
| Tests DB/intégration, migrations et vrais webhooks | **NON EXÉCUTÉS** | Aucune base de test ni credentials fournisseur utilisés. |

## Écarts et risques encore ouverts

- **Lint global** : 92 erreurs/1 avertissement restent dans le dépôt. Le lint ciblé des fichiers modifiés passe; le reste du code n’est pas certifié propre par ESLint.
- **Ventes et offline** : l’idempotence/déduplication des replays n’est pas implémentée; les allocations FEFO exactes, la concurrence stock, les annulations répétées et les écritures comptables doivent faire l’objet d’une correction et de tests métier spécifiques. La génération aléatoire d’une référence évite une collision mais ne déduplique pas un replay.
- **CRUD global** : les lots n’ont pas toutes les opérations; plusieurs écrans documents, garde, conformité, grossistes et institutions ont encore des verbes, routes ou DTO incomplets. La présence d’un endpoint ou d’un modèle ne prouve pas que le CRUD est complet.
- **Grossistes** : l’appartenance utilisateur-grossiste doit être modélisée pour autoriser proprement les partenaires; les endpoints temporairement limités à `PLATFORM_ADMIN` ne couvrent pas tout le portail.
- **Intégrations** : le protocole officiel DPMED/SoBAPS (RSA/mTLS mentionné dans certains documents) doit être confirmé; le code actuel utilise HMAC. Anti-rejeu, idempotence et schémas d’événements restent à valider selon le protocole officiel.
- **Migrations et tests** : aucun historique de migrations versionnées, test d’intégration ou pipeline CI complet n’est livré.
- **Pièces médicales** : l’image d’ordonnance est limitée à 2 Mo et associée au dossier; un stockage objet dédié avec politique de conservation et de contrôle d’accès reste préférable avant production.

## Identifiants et sécurité Git

Le jeton GitHub transmis dans la conversation **n’a pas été utilisé**. Comme il a été exposé dans le fil, il faut le révoquer et en créer un nouveau uniquement si nécessaire. Le contenu de `.env` n’a pas été lu; son retrait du fichier courant ne purge pas l’historique Git, et les secrets historiques doivent être renouvelés. Aucune réécriture ou force-push de l’historique n’a été effectuée.

## Conclusion

Les principaux défauts d’authentification, d’inscription et d’isolation patient repérés ont été corrigés localement. Les fichiers modifiés passent le lint ciblé, le typecheck complet et le build passent, et les smoke tests effectués sont positifs. **Cela ne permet pas de conclure que tous les CRUD et toutes les spécifications fonctionnent à 100 %** : le lint global, l’idempotence des ventes offline, plusieurs modules secondaires et les scénarios DB/intégration nécessitent encore un travail et une validation dédiée.
