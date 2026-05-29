// Types and utilities for the Grossistes portal

export interface CommandeGrossiste {
  id: string
  pharmacieId: string
  grossisteId: string
  commandeInterneId: string
  referenceGrossiste: string | null
  statut: string
  montantTotal: number | null
  dateEnvoi: string | Date
  dateConfirmation: string | Date | null
  dateLivraisonPrev: string | Date | null
  dateLivraisonReelle: string | Date | null
  payload: Record<string, unknown>
  reponseGrossiste: Record<string, unknown> | null
  pharmacie?: {
    id: string
    nom: string
    ville: string
    adresse: string
    telephone: string
  }
  grossiste?: {
    id: string
    nom: string
    codeGrossiste: string
  }
  commandeInterne?: {
    id: string
    reference: string
    lignes?: Array<{
      id: string
      dci: string
      quantiteCommandee: number
      quantiteLivree: number
      prixAchat: number | null
    }>
  }
}

export interface CatalogueItem {
  id: string
  grossisteId: string
  referenceGros: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixAchat: number
  disponible: boolean
  updatedAt: string | Date
}

export interface PartenaireGrossisteInfo {
  id: string
  nom: string
  codeGrossiste: string
  apiEndpoint: string
  apiKeyHash: string
  webhookSecret: string
  actif: boolean
  createdAt: string | Date
}

export const STATUT_CMD = {
  ENVOYEE: "ENVOYEE",
  CONFIRMEE: "CONFIRMEE",
  REFUSEE: "REFUSEE",
  EN_PREPARATION: "EN_PREPARATION",
  EN_LIVRAISON: "EN_LIVRAISON",
  LIVREE: "LIVREE",
  LITIGE: "LITIGE",
} as const

export function getStatusLabel(statut: string): string {
  const labels: Record<string, string> = {
    ENVOYEE: "Envoyée",
    CONFIRMEE: "Confirmée",
    REFUSEE: "Refusée",
    EN_PREPARATION: "En préparation",
    EN_LIVRAISON: "En livraison",
    LIVREE: "Livrée",
    LITIGE: "Litige",
  }
  return labels[statut] || statut
}

export function getStatusColor(statut: string): string {
  const colors: Record<string, string> = {
    ENVOYEE: "bg-blue-100 text-blue-800 hover:bg-blue-100",
    CONFIRMEE: "bg-teal-100 text-teal-800 hover:bg-teal-100",
    REFUSEE: "bg-red-100 text-red-800 hover:bg-red-100",
    EN_PREPARATION: "bg-amber-100 text-amber-800 hover:bg-amber-100",
    EN_LIVRAISON: "bg-purple-100 text-purple-800 hover:bg-purple-100",
    LIVREE: "bg-green-100 text-green-800 hover:bg-green-100",
    LITIGE: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  }
  return colors[statut] || "bg-gray-100 text-gray-800"
}

export function formatFCFA(amount: number | null | undefined): string {
  if (!amount && amount !== 0) return "—"
  return new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA"
}

export function formatDateFR(date: string | Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function formatDateTimeFR(date: string | Date | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
