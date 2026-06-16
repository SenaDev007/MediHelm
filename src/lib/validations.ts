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
  email: z.email(),
  nom: z.string().min(2),
  prenom: z.string().min(2),
  motDePasse: z.string().min(8),
  pharmacieNom: z.string().min(2),
  numeroAgrement: z.string().min(3),
  plan: z.enum(['SEED', 'BLOOM', 'CROWN', 'NETWORK']),
})

// ─── Ventes ────────────────────────────────────────────────────

export const venteSchema = z.object({
  lignes: z.array(z.object({
    medicamentId: z.uuid(),
    lotId: z.uuid().optional(),
    quantite: z.int().positive(),
    prixUnitaire: z.number().positive(),
  })).min(1),
  modePaiement: z.enum(['ESPECES', 'WAVE', 'MTN_MONEY', 'MOOV_MONEY', 'CARTE_BANCAIRE', 'CHEQUE', 'CREDIT', 'ASSURANCE', 'TIERS_PAYANT']),
  patientId: z.uuid().optional(),
  ordonnanceId: z.uuid().optional(),
})

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

// ─── Validate helper ───────────────────────────────────────────

export function validate<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, errors: result.error }
}
