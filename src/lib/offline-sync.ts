// ============================================================
// MediHelm — Offline Sync Service
// Mode hors-ligne: vente locale + synchronisation
// Référence: MH-SPECS-2025-v2.0 — Offline Mode
// ============================================================

import { db } from '@/lib/db'

export interface OfflineVente {
  reference: string
  pharmacieId: string
  utilisateurId: string
  patientId?: string
  ordonnanceId?: string
  lignes: Array<{
    medicamentId: string
    lotId?: string
    quantite: number
    prixUnitaire: number
    prixTotal: number
  }>
  montantTotal: number
  montantPaye: number
  modePaiement: string
  createdAt: string
  synchedAt?: string
}

/**
 * Generate a unique reference for offline vente
 * Format: OFF-YYYYMMDD-HHMMSS-RANDOM
 */
export function generateOfflineReference(): string {
  const now = new Date()
  const dateStr = now.toISOString().replace(/[-:T]/g, '').substring(0, 14)
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `OFF-${dateStr}-${random}`
}

/**
 * Synchronize offline ventes to the database
 * Uses reference field for idempotency
 */
export async function syncOfflineVentes(ventes: OfflineVente[]): Promise<{
  synced: number
  failed: number
  errors: Array<{ reference: string; error: string }>
}> {
  let synced = 0
  let failed = 0
  const errors: Array<{ reference: string; error: string }> = []

  for (const vente of ventes) {
    try {
      // Check idempotency — if reference already exists, skip
      const existing = await db.vente.findUnique({
        where: { reference: vente.reference },
      })

      if (existing) {
        // Already synced, mark as done
        synced++
        continue
      }

      // Validate lots and stock availability
      for (const ligne of vente.lignes) {
        if (ligne.lotId) {
          const lot = await db.lot.findUnique({ where: { id: ligne.lotId } })
          if (!lot) {
            throw new Error(`Lot ${ligne.lotId} introuvable`)
          }
          if (lot.quantite < ligne.quantite) {
            throw new Error(`Stock insuffisant pour le lot ${lot.numeroLot} (disponible: ${lot.quantite}, demandé: ${ligne.quantite})`)
          }
        }
      }

      // Create vente with transaction (FEFO logic for lot selection if not specified)
      await db.$transaction(async (tx) => {
        const newVente = await tx.vente.create({
          data: {
            reference: vente.reference,
            pharmacieId: vente.pharmacieId,
            utilisateurId: vente.utilisateurId,
            patientId: vente.patientId,
            ordonnanceId: vente.ordonnanceId,
            montantTotal: vente.montantTotal,
            montantPaye: vente.montantPaye,
            modePaiement: vente.modePaiement as 'ESPECES' | 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'CHEQUE' | 'CREDIT' | 'ASSURANCE' | 'TIERS_PAYANT',
            statut: 'VALIDEE',
            synchedAt: new Date(),
            lignes: {
              create: vente.lignes.map(l => ({
                medicamentId: l.medicamentId,
                lotId: l.lotId,
                quantite: l.quantite,
                prixUnitaire: l.prixUnitaire,
                prixTotal: l.prixTotal,
              })),
            },
          },
        })

        // Decrement stock (FEFO — First Expired First Out)
        for (const ligne of vente.lignes) {
          if (ligne.lotId) {
            await tx.lot.update({
              where: { id: ligne.lotId },
              data: { quantite: { decrement: ligne.quantite } },
            })
          } else {
            // FEFO: find the earliest expiring lot with sufficient stock
            const lots = await tx.lot.findMany({
              where: {
                medicamentId: ligne.medicamentId,
                pharmacieId: vente.pharmacieId,
                quantite: { gte: 1 },
                dateExpiration: { gt: new Date() },
              },
              orderBy: { dateExpiration: 'asc' },
            })

            let remaining = ligne.quantite
            for (const lot of lots) {
              if (remaining <= 0) break
              const decrement = Math.min(lot.quantite, remaining)
              await tx.lot.update({
                where: { id: lot.id },
                data: { quantite: { decrement } },
              })
              remaining -= decrement
            }

            if (remaining > 0) {
              throw new Error(`Stock insuffisant pour le médicament ${ligne.medicamentId}`)
            }
          }
        }

        return newVente
      })

      synced++
    } catch (error) {
      failed++
      errors.push({
        reference: vente.reference,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      })
    }
  }

  return { synced, failed, errors }
}

/**
 * Get CMUP (Coût Moyen Unitaire Pondéré) for a medication
 * CMUP = (Valeur stock existant + Valeur achats) / (Quantité existante + Quantité achetée)
 */
export async function calculateCMUP(medicamentId: string, pharmacieId: string): Promise<number> {
  const lots = await db.lot.findMany({
    where: {
      medicamentId,
      pharmacieId,
      quantite: { gt: 0 },
      dateExpiration: { gt: new Date() },
    },
  })

  if (lots.length === 0) return 0

  const totalValue = lots.reduce((sum, lot) => sum + (lot.prixAchat * lot.quantite), 0)
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantite, 0)

  return totalQuantity > 0 ? totalValue / totalQuantity : 0
}

/**
 * Get FEFO-ordered lots for a medication
 */
export async function getFEFOLots(medicamentId: string, pharmacieId: string) {
  return db.lot.findMany({
    where: {
      medicamentId,
      pharmacieId,
      quantite: { gt: 0 },
      dateExpiration: { gt: new Date() },
    },
    orderBy: { dateExpiration: 'asc' },
  })
}
