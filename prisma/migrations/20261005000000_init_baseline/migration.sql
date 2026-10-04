-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PlanType" AS ENUM ('SEED', 'BLOOM', 'CROWN', 'NETWORK');

-- CreateEnum
CREATE TYPE "RoleType" AS ENUM ('PLATFORM_ADMIN', 'OWNER', 'DIRECTEUR', 'PHARMACIEN', 'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE', 'PROMOTEUR', 'DPMED_ADMIN', 'SOBAPS_VIEWER', 'ABRP_VIEWER', 'GROSSISTE_PARTNER', 'GROSSISTE_ADMIN', 'GROSSISTE_COMMANDES', 'GROSSISTE_PREPARATEUR', 'GROSSISTE_LIVREUR', 'GROSSISTE_COMMERCIAL', 'GROSSISTE_COMPTABLE', 'PATIENT');

-- CreateEnum
CREATE TYPE "TenantType" AS ENUM ('PHARMACIE', 'GROSSISTE', 'INSTITUTION', 'PLATFORM');

-- CreateEnum
CREATE TYPE "FormeGalenique" AS ENUM ('COMPRIME', 'GELULE', 'SIROP', 'INJECTION', 'POMMADE', 'GOUTTES', 'SUPPOSITOIRE', 'INHALATEUR', 'SOLUTION', 'POUDRE', 'AUTRE');

-- CreateEnum
CREATE TYPE "CategorieATC" AS ENUM ('A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V');

-- CreateEnum
CREATE TYPE "TypeAlerteStock" AS ENUM ('RUPTURE', 'SEUIL_MINIMUM', 'PEREMPTION_PROCHE', 'SURSTOCK');

-- CreateEnum
CREATE TYPE "TypeMouvement" AS ENUM ('ENTREE', 'SORTIE', 'TRANSFERT', 'RETOUR', 'AJUSTEMENT', 'DESTRUCTION');

-- CreateEnum
CREATE TYPE "StatutVente" AS ENUM ('BROUILLON', 'EN_COURS', 'VALIDEE', 'ANNULEE', 'REMBOURSEE', 'AVOIR', 'PARTIELLEMENT_PAYEE');

-- CreateEnum
CREATE TYPE "ModePaiement" AS ENUM ('ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'CHEQUE', 'CREDIT', 'ASSURANCE', 'TIERS_PAYANT');

-- CreateEnum
CREATE TYPE "StatutCaisse" AS ENUM ('OUVERTE', 'FERMEE', 'EN_CLOTURE');

-- CreateEnum
CREATE TYPE "StatutOrdonnance" AS ENUM ('RECUE', 'EN_VERIFICATION', 'VALIDEE', 'PARTIELLEMENT_DELIVREE', 'DELIVREE', 'REFUSEE');

-- CreateEnum
CREATE TYPE "StatutCommande" AS ENUM ('BROUILLON', 'ENVOYEE', 'CONFIRMEE', 'EN_PREPARATION', 'EN_LIVRAISON', 'LIVREE_PARTIELLEMENT', 'LIVREE', 'REFUSEE', 'LITIGE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutCommandePatient" AS ENUM ('RECUE', 'EN_PREPARATION', 'PRETE', 'RECUPEREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "TypeContrat" AS ENUM ('CDI', 'CDD', 'STAGE', 'CONSULTATION', 'INTERIM');

-- CreateEnum
CREATE TYPE "TypeConge" AS ENUM ('ANNUEL', 'MALADIE', 'MATERNITE', 'PATERNITE', 'SANS_SOLDE', 'EXCEPTIONNEL');

-- CreateEnum
CREATE TYPE "NiveauUrgence" AS ENUM ('INFO', 'ATTENTION', 'URGENT', 'URGENCE_IMMEDIATE');

-- CreateEnum
CREATE TYPE "TypeAlerteDPMED" AS ENUM ('RAPPEL_LOT', 'CONTREFACON', 'AMM_SUSPENDUE', 'INTERDICTION', 'INFORMATION', 'PHARMACOVIGILANCE');

-- CreateEnum
CREATE TYPE "StatutAlerte" AS ENUM ('EN_DIFFUSION', 'DIFFUSEE', 'ACQUITTEE', 'EXPIREE', 'ANNULEE');

-- CreateEnum
CREATE TYPE "StatutDiffusion" AS ENUM ('EN_ATTENTE', 'RECUE', 'ACQUITTEE', 'NON_CONCERNEE');

-- CreateEnum
CREATE TYPE "TypeSurveillance" AS ENUM ('SOUS_SURVEILLANCE', 'RAPPEL_LOT', 'CONTREFACON', 'AMM_SUSPENDUE', 'INTERDICTION');

-- CreateEnum
CREATE TYPE "NiveauRisque" AS ENUM ('FAIBLE', 'MODERE', 'ELEVE', 'CRITIQUE');

-- CreateEnum
CREATE TYPE "DomaineIA" AS ENUM ('STOCK', 'VENTES', 'PATIENTELE', 'PERSONNEL', 'FINANCE', 'PEREMPTIONS', 'RESEAU', 'CONFORMITE', 'INTEGRATION_GROSSISTE');

-- CreateEnum
CREATE TYPE "ContexteScan" AS ENUM ('VENTE', 'RECEPTION', 'INVENTAIRE', 'PATIENT');

-- CreateEnum
CREATE TYPE "GraviteEI" AS ENUM ('MINEUR', 'MODERE', 'GRAVE', 'VITAL');

-- CreateEnum
CREATE TYPE "StatutSignalement" AS ENUM ('EN_ATTENTE', 'SOUMIS', 'ACQUITTE', 'CLOTURE');

-- CreateEnum
CREATE TYPE "TypeDocument" AS ENUM ('REGISTRE_STUPEFIANTS', 'ORDONNANCE', 'DECLARATION_TRIMESTRIELLE', 'RAPPORT_PHARMACOVIGILANCE', 'RAPPORT_DESTRUCTION', 'CERTIFICATION', 'LICENCE', 'AUTRE');

-- CreateEnum
CREATE TYPE "TypeGarde" AS ENUM ('NORMALE', 'VACANCES', 'FERIE', 'EXCEPTIONNELLE');

-- CreateEnum
CREATE TYPE "TypeAbonnement" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "StatutAbonnement" AS ENUM ('ACTIF', 'EXPIRE', 'SUSPENDU', 'EN_ATTENTE');

-- CreateEnum
CREATE TYPE "StatutPaiement" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHEC', 'REMBOURSE');

-- CreateTable
CREATE TABLE "Pharmacie" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "ville" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "numeroAgrement" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "plan" "PlanType" NOT NULL DEFAULT 'SEED',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "modeGardeActif" BOOLEAN NOT NULL DEFAULT false,
    "planExpireAt" TIMESTAMP(3),
    "logoUrl" TEXT,
    "siteWeb" TEXT,
    "dateAgrement" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "numeroAbmed" TEXT,
    "sourceRegistre" TEXT,
    "departement" TEXT,
    "zoneSanitaire" TEXT,
    "commune" TEXT,
    "arrondissement" TEXT,
    "localisation" TEXT,
    "pharmacienTitulaire" TEXT,
    "pharmacienResponsable" TEXT,
    "contactPharmacien" TEXT,
    "courrielPharmacien" TEXT,
    "referenceAutorisation" TEXT,
    "dateValiditeAbmed" TEXT,
    "referenceQuitus" TEXT,
    "numeroOnpb" TEXT,
    "statutAbmed" TEXT,
    "suspensionAbmed" TEXT,
    "pageRegistre" INTEGER,
    "sourceUrlAbmed" TEXT,

    CONSTRAINT "Pharmacie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Utilisateur" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "grossisteId" TEXT,
    "email" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "role" "RoleType" NOT NULL DEFAULT 'PHARMACIEN',
    "motDePasse" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "telephone" TEXT,
    "avatarUrl" TEXT,
    "supabaseUid" TEXT,
    "dernierLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Utilisateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UtilisateurTenant" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "role" "RoleType" NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UtilisateurTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promoteur" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promoteur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoPharmacieLink" (
    "id" TEXT NOT NULL,
    "promoteurId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoPharmacieLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medicament" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT NOT NULL,
    "forme" "FormeGalenique" NOT NULL DEFAULT 'COMPRIME',
    "dosage" TEXT NOT NULL,
    "prixPublic" DOUBLE PRECISION NOT NULL,
    "prixAvantRemise" DOUBLE PRECISION,
    "surOrdonnance" BOOLEAN NOT NULL DEFAULT false,
    "estStupefiant" BOOLEAN NOT NULL DEFAULT false,
    "stockMinimum" INTEGER NOT NULL DEFAULT 5,
    "stockSecurite" INTEGER NOT NULL DEFAULT 10,
    "cmup" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "codeBarres" TEXT,
    "categorieAtc" "CategorieATC",
    "remboursable" BOOLEAN NOT NULL DEFAULT false,
    "generique" BOOLEAN NOT NULL DEFAULT false,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lot" (
    "id" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "numeroLot" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "quantiteInitiale" INTEGER NOT NULL,
    "prixAchat" DOUBLE PRECISION NOT NULL,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteStock" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lotId" TEXT,
    "type" "TypeAlerteStock" NOT NULL DEFAULT 'RUPTURE',
    "message" TEXT NOT NULL,
    "traitee" BOOLEAN NOT NULL DEFAULT false,
    "traiteePar" TEXT,
    "traiteeLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlerteStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MouvementStock" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lotId" TEXT,
    "type" "TypeMouvement" NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION,
    "motif" TEXT,
    "reference" TEXT,
    "utilisateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MouvementStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caisse" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Caisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionCaisse" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "caisseId" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "statut" "StatutCaisse" NOT NULL DEFAULT 'OUVERTE',
    "soldeOuverture" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "soldeCloture" DOUBLE PRECISION,
    "ecart" DOUBLE PRECISION,
    "ouvertLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fermeLe" TIMESTAMP(3),

    CONSTRAINT "SessionCaisse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vente" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "patientId" TEXT,
    "ordonnanceId" TEXT,
    "commandePatId" TEXT,
    "sessionId" TEXT,
    "montantTotal" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL,
    "montantAssur" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" "StatutVente" NOT NULL DEFAULT 'VALIDEE',
    "reference" TEXT NOT NULL,
    "modePaiement" "ModePaiement" NOT NULL DEFAULT 'ESPECES',
    "synchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneVente" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lotId" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "prixTotal" DOUBLE PRECISION NOT NULL,
    "remise" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneVente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL,
    "venteId" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "mode" "ModePaiement" NOT NULL,
    "reference" TEXT,
    "statut" "StatutPaiement" NOT NULL DEFAULT 'REUSSI',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "dateNaissance" TIMESTAMP(3),
    "sexe" TEXT,
    "numeroAssurance" TEXT,
    "assurance" TEXT,
    "adresse" TEXT,
    "notes" TEXT,
    "creditAutorise" BOOLEAN NOT NULL DEFAULT false,
    "creditLimite" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsFidelite" INTEGER NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ordonnance" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "patientId" TEXT,
    "prescripteur" TEXT NOT NULL,
    "dateOrdonnance" TIMESTAMP(3) NOT NULL,
    "statut" "StatutOrdonnance" NOT NULL DEFAULT 'RECUE',
    "imageUrl" TEXT,
    "notes" TEXT,
    "verifiePar" TEXT,
    "verifieLe" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ordonnance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneOrdonnance" (
    "id" TEXT NOT NULL,
    "ordonnanceId" TEXT NOT NULL,
    "medicamentId" TEXT,
    "dci" TEXT NOT NULL,
    "posologie" TEXT,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "delivree" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneOrdonnance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vaccination" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "vaccin" TEXT NOT NULL,
    "dateVaccin" TIMESTAMP(3) NOT NULL,
    "lot" TEXT,
    "prochaineDose" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Vaccination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rappel" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "medicamentNom" TEXT NOT NULL,
    "dosage" TEXT,
    "frequence" TEXT,
    "heureRappel" TEXT,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3),
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rappel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "adresse" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "note" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeFournisseur" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "fournisseurId" TEXT,
    "nomFournisseur" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'BROUILLON',
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateLivraisonPrevue" TIMESTAMP(3),
    "dateLivraisonReelle" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommande" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "medicamentId" TEXT,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT,
    "quantite" INTEGER NOT NULL,
    "quantiteLivre" INTEGER NOT NULL DEFAULT 0,
    "prixAchat" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneCommande_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employe" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "typeContrat" "TypeContrat" NOT NULL DEFAULT 'CDI',
    "salaireBrut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateEmbauche" TIMESTAMP(3) NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conge" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "employeId" TEXT,
    "type" "TypeConge" NOT NULL DEFAULT 'ANNUEL',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "motif" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "approuvePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "heureArrivee" TIMESTAMP(3),
    "heureDepart" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'PRESENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulletinPaie" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "mois" INTEGER NOT NULL,
    "annee" INTEGER NOT NULL,
    "salaireBrut" DOUBLE PRECISION NOT NULL,
    "salaireNet" DOUBLE PRECISION NOT NULL,
    "retenues" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "primes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BulletinPaie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Abonnement" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "plan" "PlanType" NOT NULL,
    "type" "TypeAbonnement" NOT NULL DEFAULT 'MENSUEL',
    "statut" "StatutAbonnement" NOT NULL DEFAULT 'ACTIF',
    "montant" DOUBLE PRECISION NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "methodePaiement" "ModePaiement",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Abonnement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credit" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "patientId" TEXT,
    "montant" DOUBLE PRECISION NOT NULL,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "echeance" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EcritureComptable" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "libelle" TEXT NOT NULL,
    "reference" TEXT,
    "dateEcriture" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EcritureComptable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PharmacieTierPayant" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "organismeId" TEXT NOT NULL,
    "tauxRemboursement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PharmacieTierPayant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organisme" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organisme_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningGarde" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "type" "TypeGarde" NOT NULL DEFAULT 'NORMALE',
    "rapport" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanningGarde_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampagneSms" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "destinataires" INTEGER NOT NULL DEFAULT 0,
    "envoyes" INTEGER NOT NULL DEFAULT 0,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateEnvoi" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampagneSms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteOperationnelle" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlerteOperationnelle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "type" "TypeDocument" NOT NULL,
    "titre" TEXT NOT NULL,
    "fichierUrl" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateValidite" TIMESTAMP(3),
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScoreConformite" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "scoreTotal" INTEGER NOT NULL DEFAULT 0,
    "scoreRegistreStup" INTEGER NOT NULL DEFAULT 0,
    "scoreAlerteDPMED" INTEGER NOT NULL DEFAULT 0,
    "scoreDocuments" INTEGER NOT NULL DEFAULT 0,
    "scorePharmacovigilance" INTEGER NOT NULL DEFAULT 0,
    "scoreDestructions" INTEGER NOT NULL DEFAULT 0,
    "certificationDPMED" BOOLEAN NOT NULL DEFAULT false,
    "dateCalcul" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreConformite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandePatient" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "statut" "StatutCommandePatient" NOT NULL DEFAULT 'RECUE',
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandePatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommandePatient" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "medicamentId" TEXT,
    "dci" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "prixTotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneCommandePatient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdonnanceGrossiste" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "grossisteId" TEXT,
    "reference" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'ENVOYEE',
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dateLivraison" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrdonnanceGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneOrdonnanceGrossiste" (
    "id" TEXT NOT NULL,
    "ordonnanceId" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT,
    "quantite" INTEGER NOT NULL,
    "prixAchat" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "quantiteLivre" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneOrdonnanceGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionGrossiste" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "ordonnanceGrossisteId" TEXT NOT NULL,
    "dateReception" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" TEXT NOT NULL DEFAULT 'PARTIELLE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceptionGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReceptionFournisseur" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "commandeId" TEXT,
    "fournisseurId" TEXT,
    "numeroBL" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'COMPLETE',
    "notes" TEXT,
    "utilisateurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReceptionFournisseur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneReception" (
    "id" TEXT NOT NULL,
    "receptionId" TEXT NOT NULL,
    "medicamentId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "prixAchat" DOUBLE PRECISION NOT NULL,
    "numeroLot" TEXT NOT NULL,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneReception_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Grossiste" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contact" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Grossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrossisteApiKey" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrossisteApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProduitGrossiste" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT NOT NULL,
    "forme" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "quantiteDispo" INTEGER,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProduitGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommandeGrossiste" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "pharmacieId" TEXT,
    "reference" TEXT NOT NULL,
    "statut" "StatutCommande" NOT NULL DEFAULT 'BROUILLON',
    "source" TEXT NOT NULL DEFAULT 'MEDIHELM_PRO',
    "montantTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "montantPaye" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommandeGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LigneCommandeGrossiste" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "produitId" TEXT,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT,
    "quantite" INTEGER NOT NULL,
    "quantiteConfirmee" INTEGER,
    "quantiteLivre" INTEGER NOT NULL DEFAULT 0,
    "prixUnitaire" DOUBLE PRECISION NOT NULL,
    "montant" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LigneCommandeGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookConfig" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PredictionIA" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT,
    "domaine" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "donnees" TEXT NOT NULL DEFAULT '{}',
    "prediction" TEXT NOT NULL DEFAULT '{}',
    "confiance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "genereeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expireLe" TIMESTAMP(3),

    CONSTRAINT "PredictionIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RapportAnalytique" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "domaine" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "donnees" TEXT NOT NULL DEFAULT '{}',
    "genereeLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RapportAnalytique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlerteDPMED" (
    "id" TEXT NOT NULL,
    "referenceOfficielle" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "typeAlerte" "TypeAlerteDPMED" NOT NULL DEFAULT 'RAPPEL_LOT',
    "niveauUrgence" "NiveauUrgence" NOT NULL DEFAULT 'URGENT',
    "dciConcernee" TEXT,
    "description" TEXT,
    "signatureNumerique" TEXT NOT NULL DEFAULT '',
    "dateEmissionDPMED" TIMESTAMP(3) NOT NULL,
    "statut" "StatutAlerte" NOT NULL DEFAULT 'EN_DIFFUSION',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlerteDPMED_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiffusionAlerte" (
    "id" TEXT NOT NULL,
    "alerteId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "statut" "StatutDiffusion" NOT NULL DEFAULT 'EN_ATTENTE',
    "dateAcquittement" TIMESTAMP(3),
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiffusionAlerte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicamentSurveillance" (
    "id" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "nomCommercial" TEXT,
    "typeSurveillance" "TypeSurveillance" NOT NULL DEFAULT 'SOUS_SURVEILLANCE',
    "description" TEXT NOT NULL,
    "sourceAlerte" TEXT NOT NULL DEFAULT 'DPMED',
    "dateEmission" TIMESTAMP(3) NOT NULL,
    "niveauRisque" "NiveauRisque" NOT NULL DEFAULT 'MODERE',
    "statut" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "medicamentId" TEXT,

    CONSTRAINT "MedicamentSurveillance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalementEI" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "dciConcernee" TEXT NOT NULL,
    "descriptionEI" TEXT NOT NULL,
    "gravite" "GraviteEI" NOT NULL DEFAULT 'MODERE',
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "statutEnvoi" "StatutSignalement" NOT NULL DEFAULT 'EN_ATTENTE',
    "refDPMED" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignalementEI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "pharmacieId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "lue" BOOLEAN NOT NULL DEFAULT false,
    "lien" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categorie" TEXT NOT NULL DEFAULT 'AUTRE',
    "priorite" TEXT NOT NULL DEFAULT 'NORMALE',
    "statut" TEXT NOT NULL DEFAULT 'OUVERT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanLog" (
    "id" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "rawCode" TEXT NOT NULL,
    "contexte" "ContexteScan" NOT NULL DEFAULT 'VENTE',
    "resultat" TEXT NOT NULL DEFAULT 'EN_COURS',
    "medicamentId" TEXT,
    "lotId" TEXT,
    "tempsReponse" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScanCache" (
    "id" TEXT NOT NULL,
    "codeBarres" TEXT NOT NULL,
    "gtin" TEXT,
    "medicamentId" TEXT,
    "pharmacieId" TEXT NOT NULL,
    "donnees" TEXT NOT NULL DEFAULT '{}',
    "expireAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScanCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrossisteTenant" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "adresse" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'STARTER',
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrossisteTenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotGrossiste" (
    "id" TEXT NOT NULL,
    "produitId" TEXT NOT NULL,
    "numeroLot" TEXT NOT NULL,
    "quantite" INTEGER NOT NULL,
    "dateExpiration" TIMESTAMP(3) NOT NULL,
    "emplacement" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'DISPONIBLE',
    "motifStatut" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LotGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientGrossiste" (
    "id" TEXT NOT NULL,
    "grossisteId" TEXT NOT NULL,
    "pharmacieId" TEXT NOT NULL,
    "conditionsPaiement" TEXT NOT NULL DEFAULT 'COMPTANT',
    "creditPlafond" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remiseDefaut" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheDCI" (
    "id" TEXT NOT NULL,
    "dci" TEXT NOT NULL,
    "classeTherapeutique" TEXT NOT NULL,
    "mecanisme" TEXT,
    "indications" TEXT,
    "posologie" TEXT,
    "contreIndications" TEXT,
    "interactions" TEXT NOT NULL DEFAULT '[]',
    "effetsIndesirables" TEXT NOT NULL DEFAULT '[]',
    "conservation" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DPMED Bénin',
    "auteurId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FicheDCI_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BonPicking" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "preparateurId" TEXT,
    "lignes" TEXT NOT NULL DEFAULT '[]',
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "scanConfirme" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonPicking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivraisonGrossiste" (
    "id" TEXT NOT NULL,
    "commandeId" TEXT NOT NULL,
    "livreurId" TEXT,
    "planning" TIMESTAMP(3),
    "statut" TEXT NOT NULL DEFAULT 'PLANIFIEE',
    "signatureElectronique" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LivraisonGrossiste_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacie_slug_key" ON "Pharmacie"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacie_numeroAgrement_key" ON "Pharmacie"("numeroAgrement");

-- CreateIndex
CREATE UNIQUE INDEX "Pharmacie_numeroAbmed_key" ON "Pharmacie"("numeroAbmed");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_email_key" ON "Utilisateur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Utilisateur_supabaseUid_key" ON "Utilisateur"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "UtilisateurTenant_utilisateurId_pharmacieId_key" ON "UtilisateurTenant"("utilisateurId", "pharmacieId");

-- CreateIndex
CREATE UNIQUE INDEX "Promoteur_email_key" ON "Promoteur"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PromoPharmacieLink_promoteurId_pharmacieId_key" ON "PromoPharmacieLink"("promoteurId", "pharmacieId");

-- CreateIndex
CREATE UNIQUE INDEX "Lot_medicamentId_numeroLot_key" ON "Lot"("medicamentId", "numeroLot");

-- CreateIndex
CREATE UNIQUE INDEX "Vente_reference_key" ON "Vente"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_utilisateurId_key" ON "Patient"("utilisateurId");

-- CreateIndex
CREATE INDEX "Conge_pharmacieId_idx" ON "Conge"("pharmacieId");

-- CreateIndex
CREATE INDEX "Conge_employeId_idx" ON "Conge"("employeId");

-- CreateIndex
CREATE UNIQUE INDEX "PharmacieTierPayant_pharmacieId_organismeId_key" ON "PharmacieTierPayant"("pharmacieId", "organismeId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdonnanceGrossiste_reference_key" ON "OrdonnanceGrossiste"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ReceptionGrossiste_ordonnanceGrossisteId_key" ON "ReceptionGrossiste"("ordonnanceGrossisteId");

-- CreateIndex
CREATE INDEX "ReceptionFournisseur_pharmacieId_idx" ON "ReceptionFournisseur"("pharmacieId");

-- CreateIndex
CREATE INDEX "ReceptionFournisseur_commandeId_idx" ON "ReceptionFournisseur"("commandeId");

-- CreateIndex
CREATE INDEX "LigneReception_receptionId_idx" ON "LigneReception"("receptionId");

-- CreateIndex
CREATE INDEX "LigneReception_lotId_idx" ON "LigneReception"("lotId");

-- CreateIndex
CREATE UNIQUE INDEX "Grossiste_slug_key" ON "Grossiste"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "CommandeGrossiste_reference_key" ON "CommandeGrossiste"("reference");

-- CreateIndex
CREATE INDEX "PredictionIA_pharmacieId_domaine_idx" ON "PredictionIA"("pharmacieId", "domaine");

-- CreateIndex
CREATE UNIQUE INDEX "AlerteDPMED_referenceOfficielle_key" ON "AlerteDPMED"("referenceOfficielle");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_pharmacieId_idx" ON "AuditLog"("pharmacieId");

-- CreateIndex
CREATE INDEX "Notification_userId_lue_idx" ON "Notification"("userId", "lue");

-- CreateIndex
CREATE INDEX "ScanLog_pharmacieId_idx" ON "ScanLog"("pharmacieId");

-- CreateIndex
CREATE INDEX "ScanLog_medicamentId_idx" ON "ScanLog"("medicamentId");

-- CreateIndex
CREATE UNIQUE INDEX "ScanCache_codeBarres_key" ON "ScanCache"("codeBarres");

-- CreateIndex
CREATE INDEX "ScanCache_codeBarres_idx" ON "ScanCache"("codeBarres");

-- CreateIndex
CREATE INDEX "ScanCache_expireAt_idx" ON "ScanCache"("expireAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrossisteTenant_slug_key" ON "GrossisteTenant"("slug");

-- CreateIndex
CREATE INDEX "LotGrossiste_statut_idx" ON "LotGrossiste"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "LotGrossiste_produitId_numeroLot_key" ON "LotGrossiste"("produitId", "numeroLot");

-- CreateIndex
CREATE UNIQUE INDEX "ClientGrossiste_grossisteId_pharmacieId_key" ON "ClientGrossiste"("grossisteId", "pharmacieId");

-- CreateIndex
CREATE UNIQUE INDEX "FicheDCI_dci_key" ON "FicheDCI"("dci");

-- CreateIndex
CREATE INDEX "FicheDCI_classeTherapeutique_idx" ON "FicheDCI"("classeTherapeutique");

-- CreateIndex
CREATE INDEX "BonPicking_commandeId_idx" ON "BonPicking"("commandeId");

-- CreateIndex
CREATE INDEX "LivraisonGrossiste_commandeId_idx" ON "LivraisonGrossiste"("commandeId");

-- CreateIndex
CREATE INDEX "LivraisonGrossiste_statut_idx" ON "LivraisonGrossiste"("statut");

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Utilisateur" ADD CONSTRAINT "Utilisateur_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilisateurTenant" ADD CONSTRAINT "UtilisateurTenant_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UtilisateurTenant" ADD CONSTRAINT "UtilisateurTenant_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoPharmacieLink" ADD CONSTRAINT "PromoPharmacieLink_promoteurId_fkey" FOREIGN KEY ("promoteurId") REFERENCES "Promoteur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoPharmacieLink" ADD CONSTRAINT "PromoPharmacieLink_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicament" ADD CONSTRAINT "Medicament_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteStock" ADD CONSTRAINT "AlerteStock_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteStock" ADD CONSTRAINT "AlerteStock_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MouvementStock" ADD CONSTRAINT "MouvementStock_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caisse" ADD CONSTRAINT "Caisse_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_caisseId_fkey" FOREIGN KEY ("caisseId") REFERENCES "Caisse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionCaisse" ADD CONSTRAINT "SessionCaisse_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_ordonnanceId_fkey" FOREIGN KEY ("ordonnanceId") REFERENCES "Ordonnance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vente" ADD CONSTRAINT "Vente_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SessionCaisse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneVente" ADD CONSTRAINT "LigneVente_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_venteId_fkey" FOREIGN KEY ("venteId") REFERENCES "Vente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "Utilisateur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ordonnance" ADD CONSTRAINT "Ordonnance_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneOrdonnance" ADD CONSTRAINT "LigneOrdonnance_ordonnanceId_fkey" FOREIGN KEY ("ordonnanceId") REFERENCES "Ordonnance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vaccination" ADD CONSTRAINT "Vaccination_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rappel" ADD CONSTRAINT "Rappel_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fournisseur" ADD CONSTRAINT "Fournisseur_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeFournisseur" ADD CONSTRAINT "CommandeFournisseur_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeFournisseur" ADD CONSTRAINT "CommandeFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommande" ADD CONSTRAINT "LigneCommande_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeFournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employe" ADD CONSTRAINT "Employe_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conge" ADD CONSTRAINT "Conge_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conge" ADD CONSTRAINT "Conge_employeId_fkey" FOREIGN KEY ("employeId") REFERENCES "Employe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulletinPaie" ADD CONSTRAINT "BulletinPaie_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Abonnement" ADD CONSTRAINT "Abonnement_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Credit" ADD CONSTRAINT "Credit_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EcritureComptable" ADD CONSTRAINT "EcritureComptable_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacieTierPayant" ADD CONSTRAINT "PharmacieTierPayant_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PharmacieTierPayant" ADD CONSTRAINT "PharmacieTierPayant_organismeId_fkey" FOREIGN KEY ("organismeId") REFERENCES "Organisme"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanningGarde" ADD CONSTRAINT "PlanningGarde_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampagneSms" ADD CONSTRAINT "CampagneSms_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlerteOperationnelle" ADD CONSTRAINT "AlerteOperationnelle_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreConformite" ADD CONSTRAINT "ScoreConformite_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandePatient" ADD CONSTRAINT "CommandePatient_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandePatient" ADD CONSTRAINT "CommandePatient_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommandePatient" ADD CONSTRAINT "LigneCommandePatient_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandePatient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommandePatient" ADD CONSTRAINT "LigneCommandePatient_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdonnanceGrossiste" ADD CONSTRAINT "OrdonnanceGrossiste_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneOrdonnanceGrossiste" ADD CONSTRAINT "LigneOrdonnanceGrossiste_ordonnanceId_fkey" FOREIGN KEY ("ordonnanceId") REFERENCES "OrdonnanceGrossiste"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionGrossiste" ADD CONSTRAINT "ReceptionGrossiste_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionGrossiste" ADD CONSTRAINT "ReceptionGrossiste_ordonnanceGrossisteId_fkey" FOREIGN KEY ("ordonnanceGrossisteId") REFERENCES "OrdonnanceGrossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionFournisseur" ADD CONSTRAINT "ReceptionFournisseur_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionFournisseur" ADD CONSTRAINT "ReceptionFournisseur_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeFournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReceptionFournisseur" ADD CONSTRAINT "ReceptionFournisseur_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "ReceptionFournisseur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneReception" ADD CONSTRAINT "LigneReception_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "Lot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrossisteApiKey" ADD CONSTRAINT "GrossisteApiKey_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProduitGrossiste" ADD CONSTRAINT "ProduitGrossiste_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeGrossiste" ADD CONSTRAINT "CommandeGrossiste_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommandeGrossiste" ADD CONSTRAINT "CommandeGrossiste_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LigneCommandeGrossiste" ADD CONSTRAINT "LigneCommandeGrossiste_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeGrossiste"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookConfig" ADD CONSTRAINT "WebhookConfig_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RapportAnalytique" ADD CONSTRAINT "RapportAnalytique_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiffusionAlerte" ADD CONSTRAINT "DiffusionAlerte_alerteId_fkey" FOREIGN KEY ("alerteId") REFERENCES "AlerteDPMED"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiffusionAlerte" ADD CONSTRAINT "DiffusionAlerte_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicamentSurveillance" ADD CONSTRAINT "MedicamentSurveillance_medicamentId_fkey" FOREIGN KEY ("medicamentId") REFERENCES "Medicament"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalementEI" ADD CONSTRAINT "SignalementEI_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Utilisateur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotGrossiste" ADD CONSTRAINT "LotGrossiste_produitId_fkey" FOREIGN KEY ("produitId") REFERENCES "ProduitGrossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGrossiste" ADD CONSTRAINT "ClientGrossiste_grossisteId_fkey" FOREIGN KEY ("grossisteId") REFERENCES "Grossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientGrossiste" ADD CONSTRAINT "ClientGrossiste_pharmacieId_fkey" FOREIGN KEY ("pharmacieId") REFERENCES "Pharmacie"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonPicking" ADD CONSTRAINT "BonPicking_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeGrossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivraisonGrossiste" ADD CONSTRAINT "LivraisonGrossiste_commandeId_fkey" FOREIGN KEY ("commandeId") REFERENCES "CommandeGrossiste"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

