# Revue documentaire — MédiHelm

**État au 3 octobre 2026 — dépôt `SenaDev007/MediHelm`**

## Périmètre et méthode

Le dossier accentué `MédiHelm/` contient **42 fichiers**. Le dossier homonyme sans accent `MediHelm/` est vide. Les textes DOCX, PDF, Markdown et règles Cursor ont été extraits en lecture seule; les deux archives ZIP ont été inventoriées et leurs pièces DOCX comparées au texte des documents autonomes. Aucun script, macro, contenu de document ni fichier `.env` n’a été exécuté/ouvert.

Cette reprise a également confronté le contenu au rapport d’audit existant `RAPPORT_AUDIT_MEDIHELM_DOCUMENTATION_RESTAUREE_2026-10-02.md`. L’orchestration d’analyse par agent, lancée pour contrôler les pièces individuellement, s’est arrêtée après 19 analyses structurées; elle n’est donc **pas** présentée comme une validation agent complète des 42. Les 42 pièces ont toutefois été inventoriées et extraites localement, et les dossiers DPMED et SoBAPS ainsi que les spécifications frontend institutionnelles ont été examinés directement pour cadrer leur migration.

## Inventaire des 42 fichiers

| Domaine | Fichiers présents |
|---|---|
| Référentiel général, CDC, spécifications, pricing et directives (15) | `CONTEXT.md`; `MediHelm_CDC_v2.0.docx`; `MediHelm_CDC_v2.0.pdf`; `MediHelm_Specs_v2.0.docx`; `MediHelm_Specs_v2.0.pdf`; `MédiHelm_CDC_v1.0.docx`; `MédiHelm_CDC_v2.0.docx`; `MédiHelm_Specs_v1.0.docx`; `MédiHelm_Specs_v2.0.docx`; `MédiHelm_Pricing_v2.0.docx`; `MédiHelm_Pricing_v2.1.docx`; `MédiHelm_Brand_Guidelines_v1.0.docx`; `MédiHelm_Prompts_Gemini_v1.0.docx`; `medihelm.cursorrules`; `medihelm.md` |
| Architecture monorepo et schéma Prisma (4) | `MediHelm_Monorepo_Portails_v1.0.docx`; `MediHelm_Monorepo_Portails_v1.0.pdf`; `MediHelm_Schema_Prisma_v1.0.docx`; `MediHelm_Schema_Prisma_v1.0.pdf` |
| Site public (7) | `MediHelm_SitePublic_CDC_v1.0.docx`; `MediHelm_SitePublic_CDC_v1.0.pdf`; `MediHelm_SitePublic_Cursor_v1.0.pdf`; `MediHelm_SitePublic_Gemini_v1.0.docx`; `MediHelm_SitePublic_Partenariat_v1.0.docx`; `MediHelm_SitePublic_Specs_v1.0.docx`; `MediHelm_SitePublic_Specs_v1.0.pdf` |
| Grossistes (3) | `MediHelm_Grossiste_CDC_Frontend_v1.0.pdf`; `MediHelm_Grossiste_Cursor_Frontend_v1.0.pdf`; `MédiHelm_Dossier_Grossistes_v1.0.docx` |
| Institutionnel — DPMED, SoBAPS, ABRP et administration (5) | `MediHelm_Institutionnel_CDC_Frontend_v1.0.docx`; `MediHelm_Institutionnel_CDC_Frontend_v1.0.pdf`; `MediHelm_Institutionnel_Cursor_Frontend_v1.0.pdf`; `MédiHelm_Dossier_DPMED_v1.0.docx`; `MédiHelm_Dossier_SoBAPS_v1.0.docx` |
| Scan / GS1 (6 documents et 1 archive) | `MediHelm_Scan_CDC_v1.0.docx`; `MediHelm_Scan_CDC_v1.0.pdf`; `MediHelm_Scan_Cursor_v1.0.docx`; `MediHelm_Scan_Cursor_v1.0.pdf`; `MediHelm_Scan_Specs_v1.0.docx`; `MediHelm_Scan_Specs_v1.0.pdf`; `Scan MédiHelm.zip` |
| Archive documentaire générale (1) | `MédiHelm documents.zip` |

**Total : 42 fichiers.** Les PDF et DOCX portant le même titre/version sont des représentations à comparer, pas des doublons binaires automatiques; ils sont conservés comme pièces de référence, car certaines versions/copies ont des différences de contenu ou de métadonnées.

## Doublons confirmés

- `medihelm.cursorrules` et `medihelm.md` sont **identiques octet pour octet**.
- `MédiHelm documents.zip` contient 11 DOCX dont le texte normalisé est identique à 11 documents autonomes correspondants : Brand Guidelines, CDC v1/v2, Specs v1/v2, dossiers DPMED/SoBAPS/Grossistes, Pricing v2.0/v2.1 et Prompts Gemini. Les octets diffèrent, mais le texte extrait ne diffère pas.
- `Scan MédiHelm.zip` contient 3 DOCX dont le texte est identique aux trois documents Scan autonomes : CDC, Specs et Cursor v1.0.
- Cela représente **15 relations de duplication confirmées** (1 paire de fichiers identiques + 14 copies embarquées). Les ZIP sont gardés comme sources d’origine; il n’est pas nécessaire de supprimer des documents pour nettoyer le code.

## Exigences de portails — DPMED et SoBAPS sont distincts

Les spécifications institutionnelles prescrivent un **workspace institutionnel dédié**, `apps/medihelm-institutionnel`, avec des espaces et autorisations distincts selon le rôle; elles ne demandent pas deux applications indépendantes DPMED/SoBAPS. Le prompt institutionnel prévoit aussi une application admin séparée `apps/medihelm-admin`. La page publique `/portails` doit présenter les destinations, mais l’authentification et les contrôles doivent être faits côté serveur/API, pas seulement par masquage d’éléments d’interface.

### DPMED (`DPMED_ADMIN`)

- Vue nationale des officines, conformité, carte et statistiques agrégées; alertes officielles et rappels de lots; suivi de diffusion et d’acquittement; pharmacovigilance; registres réglementaires; médicaments sous surveillance; fiches DCI.
- Une alerte comporte au minimum un type, un niveau d’urgence, une DCI, un ou plusieurs lots, une description, une signature et un état. Publication et diffusion sont deux étapes distinctes; les notifications doivent être traçables.
- Les signalements d’effets indésirables ne doivent exposer aucune identité nominative de patient. Les exports sont institutionnels et doivent rester anonymisés.
- Le dossier de partenariat demande une signature RSA-256, un accès sur invitation, mTLS, conservation/traçabilité et une cible de diffusion de moins de deux minutes. Ces exigences supposent clés/certificats, intégration et infrastructure dédiés; tant qu’ils ne sont pas configurés et testés, aucun code ne doit annoncer que les messages sont réellement transmis dans ce délai.
- Les registres de stupéfiants et conformité sont des vues en lecture seule côté DPMED; surveillance médicament et fiches DCI sont modifiables par le rôle autorisé.

### SoBAPS (`SOBAPS_VIEWER`)

- Tableau des livraisons et confirmations par officine et période; états attente/confirmé/litige; écarts de quantité/lot, taux de confirmation et couverture géographique; exports de traçabilité.
- Le rôle SoBAPS est **lecture seule**. La confirmation de réception est créée par l’officine; l’intégration automatique de bons de livraison SoBAPS est une phase ultérieure optionnelle.
- Aucune donnée nominative patient, vente, commerciale ou financière d’officine ne doit être rendue à SoBAPS. Les vues doivent limiter les données à la livraison, aux lots/quantités reçues, à l’officine et aux écarts requis pour la traçabilité.

### Écarts qui déterminent la migration

Au début de cette reprise, les pages et routes institutionnelles restaient sous le workspace historique; l’API NestJS n’avait que le module médicaments et son login ne créait que des claims pharmacie. Le schéma centralisé comportait des modèles DPMED mais pas encore de confirmation SoBAPS ni de fiche DCI. Ces constats initiaux ont été partiellement corrigés dans la suite de migration consignée à la fin de ce rapport; ils ne décrivent plus entièrement l’état du code.

Les décisions de conformité à ne pas inventer incluent notamment les pondérations/seuils de score, le format exact d’export réglementaire, l’API DPMED/SoBAPS réelle, la configuration mTLS/RSA, et la politique de conservation applicable. Les documents de partenariat sont des **propositions**; ils ne prouvent pas qu’un accord, une certification ou une intégration institutionnelle existe déjà.


## Suite de migration — état du code au 3 octobre 2026

Le manque d’espace portail/API relevé ci-dessus a été partiellement traité sur la branche de migration : nouveau workspace `apps/medihelm-institutionnel`, identité persistante avec provisionnement opérateur, guards JWT/tenant/rôle dans NestJS, routes DPMED et SoBAPS, et routes pharmacie pour les réceptions SoBAPS. La vue EI renvoie une allowlist pseudonymisée sans narratif clinique; les alertes restent en brouillon tant que la paire RSA-256 n’est pas configurée, et aucune notification externe n’est simulée comme envoyée. Le détail des endpoints, tests ciblés et travaux restants figure dans [MONOREPO_MIGRATION.md](./MONOREPO_MIGRATION.md).

Cette tranche ne couvre toujours pas `apps/medihelm-admin`, ABRP, la totalité des pages institutionnelles, mTLS, le worker de notifications, l’intégration partenaire réelle, les registres réglementaires complets, ni la migration globale des CRUD patients/ordonnances et du POS offline. Les 42 documents ont été inventoriés et extraits en lecture seule; l’analyse assistée par agents n’a pas validé individuellement les 42 pièces et cette limite reste explicite.
