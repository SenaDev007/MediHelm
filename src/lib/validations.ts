// ============================================================
// MediHelm — Zod Validation Schemas for Critical Endpoints
// Centralized validation for mutation endpoints
// Référence: MH-VALIDATIONS-v1.0
// ============================================================

import { z } from 'zod/v4'

// ─── Auth ──────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.email(),
  motDePasse: z.string().min(6),
})

export const registerSchema = z.object({
  email: z.email().transform(value => value.trim().toLowerCase()),
  nom: z.string().trim().min(2),
  prenom: z.string().trim().min(2),
  motDePasse: z.string().min(12),
  pharmacieNom: z.string().trim().min(2),
  adresse: z.string().trim().min(3),
  ville: z.string().trim().min(2),
  departement: z.string().trim().min(2),
  telephone: z.string().trim().min(8),
  emailPharmacie: z.email().nullable().optional(),
  numeroAgrement: z.string().min(3),
  plan: z.enum(['SEED', 'BLOOM', 'CROWN', 'NETWORK']),
  periodeFacturation: z.enum(['MENSUEL', 'ANNUEL']),
})

export const registerPatientSchema = z.object({
  email: z.email().transform(value => value.trim().toLowerCase()),
  nom: z.string().trim().min(2),
  prenom: z.string().trim().min(2),
  motDePasse: z.string().min(12),
  telephone: z.string().trim().min(8),
  pharmacieId: z.uuid(),
})

// ─── Ventes ────────────────────────────────────────────────────

export const venteSchema = z.object({
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    lotId: z.uuid().optional(),
    quantite: z.int().positive(),
    prixUnitaire: z.number().positive().optional(),
    remise: z.number().min(0).optional(),
  })).min(1),
  modePaiement: z.enum(['ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'CHEQUE', 'CREDIT', 'ASSURANCE', 'TIERS_PAYANT']),
  patientId: z.uuid().optional(),
  ordonnanceId: z.uuid().optional(),
})

// Mise à jour d'un médicament (champs éditables)
export const medicamentUpdateSchema = z.object({
  dci: z.string().min(2).optional(),
  nomCommercial: z.string().min(2).optional(),
  dosage: z.string().min(1).optional(),
  prixPublic: z.number().positive().optional(),
  prixAvantRemise: z.number().positive().nullable().optional(),
  surOrdonnance: z.boolean().optional(),
  estStupefiant: z.boolean().optional(),
  stockMinimum: z.int().min(0).optional(),
  stockSecurite: z.int().min(0).optional(),
  codeBarres: z.string().trim().max(60).nullable().optional(),
  remboursable: z.boolean().optional(),
  generique: z.boolean().optional(),
  actif: z.boolean().optional(),
}).refine(v => Object.keys(v).length > 0, { message: 'Au moins un champ à mettre à jour' })

// ─── Patients ──────────────────────────────────────────────────

export const patientSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  telephone: z.string().min(8),
  email: z.email().optional(),
  dateNaissance: z.string().optional(),
  sexe: z.enum(['M', 'F']).optional(),
})

// ─── Médicaments ───────────────────────────────────────────────

export const medicamentSchema = z.object({
  dci: z.string().min(2),
  nomCommercial: z.string().min(2),
  forme: z.enum(['COMPRIME', 'GELULE', 'SIROP', 'INJECTION', 'POMMADE', 'GOUTTES', 'SUPPOSITOIRE', 'INHALATEUR', 'SOLUTION', 'POUDRE', 'AUTRE']),
  dosage: z.string().min(1),
  prixPublic: z.number().positive(),
  surOrdonnance: z.boolean().optional(),
  estStupefiant: z.boolean().optional(),
  stockMinimum: z.int().optional(),
  stockSecurite: z.int().optional(),
  categorieAtc: z.enum(['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V']).optional(),
  remboursable: z.boolean().optional(),
  generique: z.boolean().optional(),
})

// ─── Ordonnances ───────────────────────────────────────────────

export const ordonnanceSchema = z.object({
  prescripteur: z.string().min(2),
  dateOrdonnance: z.string(),
  patientId: z.uuid().optional(),
  lignes: z.array(z.object({
    dci: z.string().min(2),
    posologie: z.string().optional(),
    quantite: z.int().positive().optional(),
  })).min(1),
})

export const ordonnancePatientUploadSchema = z.object({
  patientId: z.uuid().optional(),
  pharmacieId: z.uuid().optional(),
  prescripteur: z.string().trim().min(2).max(160),
  dateOrdonnance: z.string().min(10),
  imageUrl: z.string().max(2_800_000).optional().refine(
    value => !value || /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value),
    'Image invalide ou format non pris en charge'
  ),
  notes: z.string().trim().max(1000).optional(),
  lignes: z.array(z.object({
    dci: z.string().trim().min(2).max(160),
    posologie: z.string().trim().max(500).optional(),
    quantite: z.int().positive().max(100).optional(),
  })).max(100).optional(),
})

// ─── Alerte DPMED ──────────────────────────────────────────────

export const alerteDPMEDSchema = z.object({
  referenceOfficielle: z.string().min(3),
  titre: z.string().min(3),
  typeAlerte: z.enum(['RAPPEL_LOT', 'CONTREFACON', 'AMM_SUSPENDUE', 'INTERDICTION', 'INFORMATION', 'PHARMACOVIGILANCE']),
  niveauUrgence: z.enum(['INFO', 'ATTENTION', 'URGENT', 'URGENCE_IMMEDIATE']),
  dciConcernee: z.string().optional(),
  description: z.string().optional(),
  dateEmissionDPMED: z.string(),
})

// ─── Commande fournisseur ─────────────────────────────────────

export const commandeSchema = z.object({
  fournisseurId: z.uuid().optional(),
  nomFournisseur: z.string().min(2),
  lignes: z.array(z.object({
    dci: z.string().min(2),
    nomCommercial: z.string().optional(),
    quantite: z.int().positive(),
    prixAchat: z.number().positive(),
  })).min(1),
})

export const commandePatientSchema = z.object({
  patientId: z.uuid().optional(),
  pharmacieId: z.uuid(),
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    quantite: z.int().positive().max(100),
  })).min(1).max(50),
  notes: z.string().trim().max(500).optional(),
})

// ─── Employé ───────────────────────────────────────────────────

export const employeSchema = z.object({
  nom: z.string().min(2),
  prenom: z.string().min(2),
  poste: z.string().min(2),
  telephone: z.string().optional(),
  email: z.email().optional(),
  typeContrat: z.enum(['CDI', 'CDD', 'STAGE', 'CONSULTATION', 'INTERIM']).optional(),
  salaireBrut: z.number().optional(),
  dateEmbauche: z.string(),
})

// ─── Signalement EI ────────────────────────────────────────────

export const signalementEISchema = z.object({
  dciConcernee: z.string().min(2),
  descriptionEI: z.string().min(10),
  gravite: z.enum(['MINEUR', 'MODERE', 'GRAVE', 'VITAL']),
  dateDebut: z.string(),
})

// ─── Garde ─────────────────────────────────────────────
export const gardeSchema = z.object({
  pharmacieId: z.uuid(),
  dateDebut: z.string(),
  dateFin: z.string(),
  type: z.enum(['JOUR', 'NUIT', 'WE']),
  pharmacienId: z.uuid().optional(),
  note: z.string().optional(),
})

// ─── Congé ─────────────────────────────────────────────
export const congeSchema = z.object({
  employeId: z.uuid(),
  type: z.enum(['ANNUEL', 'MALADIE', 'MATERNITE', 'PATERNITE', 'SANS_SOLDE', 'EXCEPTIONNEL']),
  dateDebut: z.string(),
  dateFin: z.string(),
  motif: z.string().optional(),
})

// Décision sur une demande de congé (approbation / refus)
export const congeDecisionSchema = z.object({
  id: z.uuid(),
  statut: z.enum(['APPROUVE', 'REFUSE']),
})

// ─── Stock / Réception ─────────────────────────────────
export const receptionSchema = z.object({
  commandeId: z.uuid().optional(),
  fournisseurId: z.uuid(),
  numeroBL: z.string().trim().min(1).max(60).optional(),
  notes: z.string().trim().max(500).optional(),
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    quantite: z.int().positive(),
    prixAchat: z.number().positive(),
    numeroLot: z.string().min(1),
    dateExpiration: z.string(),
  })).min(1),
})

// ─── Transfert ─────────────────────────────────────────
export const transfertSchema = z.object({
  pharmacieDestId: z.uuid(),
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    quantite: z.int().positive(),
  })).min(1),
  motif: z.string().optional(),
})

// ─── Retour ────────────────────────────────────────────
export const retourSchema = z.object({
  venteId: z.uuid().optional(),
  fournisseurId: z.uuid().optional(),
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    lotId: z.uuid().optional(),
    quantite: z.int().positive(),
    motif: z.enum(['DEFAUT', 'PERIME', 'SURSTOCK', 'RAPPEL', 'AUTRE']),
  })).min(1),
})

// ─── Crédit patient ────────────────────────────────────
export const creditSchema = z.object({
  patientId: z.uuid(),
  montant: z.number().positive(),
  venteId: z.uuid().optional(),
  echeance: z.string().optional(),
  note: z.string().optional(),
})

// ─── Notification ──────────────────────────────────────
export const notificationSchema = z.object({
  titre: z.string().min(2),
  message: z.string().min(5),
  type: z.enum(['INFO', 'ALERTE', 'URGENT', 'RAPPEL', 'SYSTEME']).optional(),
  lien: z.string().optional(),
})

// Marquage de notifications comme lues (par id, ids en masse, ou toutes)
export const notificationMarkReadSchema = z.object({
  id: z.uuid().optional(),
  ids: z.array(z.uuid()).min(1).optional(),
  toutes: z.boolean().optional(),
  lue: z.boolean().default(true),
}).refine(v => v.id || v.ids || v.toutes, {
  message: 'Fournir id, ids ou toutes',
})

// Diffusion d'une notification aux utilisateurs d'une pharmacie
export const notificationBroadcastSchema = z.object({
  pharmacieId: z.uuid(),
  titre: z.string().trim().min(2).max(120),
  message: z.string().trim().min(5).max(1000),
  type: z.enum(['INFO', 'ALERTE', 'URGENT', 'RAPPEL', 'SYSTEME']).optional(),
  lien: z.string().optional(),
  userIds: z.array(z.uuid()).optional(),
})

// ─── Commande patient (côté pharmacie: transitions de statut) ──
export const commandePatientTransitionSchema = z.object({
  statut: z.enum(['EN_PREPARATION', 'PRETE', 'RECUPEREE', 'ANNULEE']),
  notes: z.string().trim().max(500).optional(),
})

// ─── Destruction ───────────────────────────────────────
export const destructionSchema = z.object({
  motif: z.enum(['PERIME', 'DEGRADE', 'RAPPEL', 'CONFISQUE', 'AUTRE']),
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    lotId: z.uuid().optional(),
    quantite: z.int().positive(),
  })).min(1),
  note: z.string().optional(),
})

// ─── Document ──────────────────────────────────────────
export const documentSchema = z.object({
  type: z.enum(['FACTURE', 'BON_COMMANDE', 'BON_LIVRAISON', 'ORDONNANCE', 'CERTIFICAT', 'AUTRE']),
  reference: z.string().optional(),
  description: z.string().optional(),
  fichierUrl: z.string().optional(),
})

// ─── Planification ────────────────────────────────────
export const planningSchema = z.object({
  employeId: z.uuid(),
  date: z.string(),
  heureDebut: z.string(),
  heureFin: z.string(),
  type: z.enum(['TRAVAIL', 'GARDE', 'REPOS', 'CONGE']).optional(),
})

// ─── Caisse / Session ──────────────────────────────────
export const sessionCaisseSchema = z.object({
  fondDeCaisse: z.number().min(0),
  note: z.string().optional(),
})

// ─── Stupéfiant ────────────────────────────────────────
export const stupefiantSchema = z.object({
  medicamentId: z.uuid(),
  type: z.enum(['ENTREE', 'SORTIE']),
  quantite: z.int().positive(),
  motif: z.string().optional(),
  patientId: z.uuid().optional(),
  ordonnanceId: z.uuid().optional(),
})

// ─── Tiers-payant ──────────────────────────────────────
export const tiersPayantSchema = z.object({
  organismeId: z.uuid(),
  patientId: z.uuid(),
  numeroAdherent: z.string().min(1),
  tauxCouverture: z.number().min(0).max(100),
})

// ─── Fournisseur ───────────────────────────────────────
export const fournisseurSchema = z.object({
  nom: z.string().min(2),
  type: z.enum(['GROSSISTE', 'LABORATOIRE', 'DISTRIBUTEUR', 'AUTRE']).optional(),
  telephone: z.string().optional(),
  email: z.email().optional(),
  adresse: z.string().optional(),
})

// ─── Vaccination ───────────────────────────────────────
export const vaccinationSchema = z.object({
  patientId: z.uuid(),
  vaccin: z.string().min(2),
  dateVaccin: z.string(),
  lot: z.string().optional(),
  prochaineDose: z.string().optional(),
})

// ─── Abonnement ────────────────────────────────────────
export const abonnementSchema = z.object({
  plan: z.enum(['SEED', 'BLOOM', 'CROWN', 'NETWORK']),
  duree: z.enum(['MENSUEL', 'TRIMESTRIEL', 'ANNUEL']),
})

// ─── Bulletin de paie ──────────────────────────────────
export const bulletinPaieSchema = z.object({
  employeId: z.uuid(),
  periode: z.string().min(4),
  salaireBrut: z.number().optional(),
  primes: z.number().optional(),
  deductions: z.number().optional(),
})

// ─── Écriture comptable ────────────────────────────────
export const ecritureSchema = z.object({
  type: z.enum(['DEBIT', 'CREDIT']),
  montant: z.number().positive(),
  libelle: z.string().min(2),
  compte: z.string().optional(),
  pieceJustificative: z.string().optional(),
})

// ─── Campagne SMS ──────────────────────────────────────
export const campagneSmsSchema = z.object({
  titre: z.string().min(2),
  message: z.string().min(5),
  destinataires: z.array(z.string()).min(1).optional(),
  type: z.enum(['PROMO', 'RAPPEL', 'INFO', 'ALERTE']).optional(),
  dateEnvoi: z.string().optional(),
})

// ─── Remboursement ─────────────────────────────────────
export const remboursementSchema = z.object({
  venteId: z.uuid(),
  organismeId: z.uuid().optional(),
  montant: z.number().positive(),
  reference: z.string().optional(),
})

// ─── Audit log query ──────────────────────────────────
export const auditLogQuerySchema = z.object({
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  utilisateurId: z.uuid().optional(),
  action: z.string().optional(),
  module: z.string().optional(),
}).optional()

// ─── Présence ─────────────────────────────────────────
export const presenceSchema = z.object({
  employeId: z.uuid(),
  type: z.enum(['ARRIVEE', 'DEPART', 'PAUSE_DEBUT', 'PAUSE_FIN']),
  note: z.string().optional(),
})

// ─── Conformité certification ──────────────────────────
export const certificationSchema = z.object({
  type: z.string().min(2),
  autorite: z.string().optional(),
  dateObtention: z.string().optional(),
  dateExpiration: z.string().optional(),
  reference: z.string().optional(),
})

// ─── Utilisateur (admin create) ────────────────────────
export const adminUserSchema = z.object({
  email: z.email(),
  nom: z.string().min(2),
  prenom: z.string().min(2),
  role: z.string().min(2),
  pharmacieId: z.uuid().optional(),
})

// ─── Validate helper ───────────────────────────────────────────

export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
