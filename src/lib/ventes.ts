// ============================================================
// MediHelm — Moteur de vente partagé (POS en ligne + sync offline)
// Garanties: isolation par pharmacie, FEFO multi-lots sans lots
// expirés, stock jamais négatif, traçabilité lot sur chaque ligne,
// mouvements de stock tracés, alertes de rupture/seuil automatiques.
// ============================================================

import { db } from '@/lib/db'
import type { Prisma, Vente, ModePaiement } from '@prisma/client'

export interface LigneVenteInput {
  medicamentId: string
  lotId?: string
  quantite: number
  prixUnitaire?: number
  remise?: number
}

export interface PaiementInput {
  montant: number
  mode?: string
  reference?: string | null
}

export interface ExecuterVenteOptions {
  pharmacieId: string
  utilisateurId: string
  lignes: LigneVenteInput[]
  modePaiement: string
  reference: string
  patientId?: string | null
  ordonnanceId?: string | null
  sessionId?: string | null
  remise?: number
  paiements?: PaiementInput[]
}

export type ResultatVente =
  | { ok: true; vente: Vente }
  | { ok: false; status: number; error: string }

class ErreurVente extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/**
 * Exécute une vente complète: validation des lignes, allocation FEFO des lots,
 * création de la vente (avec paiements), décrément de stock garanti positif,
 * mouvements de stock et alertes de rupture/seuil.
 */
export async function executerVente(opts: ExecuterVenteOptions): Promise<ResultatVente> {
  const now = new Date()

  interface SousLigne {
    medicamentId: string
    lotId: string
    quantite: number
    prixUnitaire: number
    prixTotal: number
    remise: number
  }
  const sousLignes: SousLigne[] = []

  try {
    for (const ligne of opts.lignes) {
      // Médicament — isolation par pharmacie
      const medicament = await db.medicament.findFirst({
        where: { id: ligne.medicamentId, pharmacieId: opts.pharmacieId, actif: true },
      })
      if (!medicament) {
        throw new ErreurVente(`Médicament ${ligne.medicamentId} introuvable dans votre pharmacie`, 400)
      }

      const prixUnitaire = ligne.prixUnitaire ?? medicament.prixPublic
      const ligneRemise = ligne.remise ?? 0
      if (ligneRemise > prixUnitaire * ligne.quantite) {
        throw new ErreurVente('Remise supérieure au montant de la ligne', 400)
      }

      let allocations: Array<{ lotId: string; quantite: number }> = []
      if (ligne.lotId) {
        const lot = await db.lot.findFirst({
          where: { id: ligne.lotId, medicamentId: medicament.id, pharmacieId: opts.pharmacieId },
        })
        if (!lot) {
          throw new ErreurVente(`Lot ${ligne.lotId} introuvable pour ce médicament dans votre pharmacie`, 400)
        }
        if (lot.dateExpiration <= now) {
          throw new ErreurVente(`Lot ${lot.numeroLot} expiré depuis le ${lot.dateExpiration.toLocaleDateString('fr-FR')} — vente interdite`, 409)
        }
        if (lot.quantite < ligne.quantite) {
          throw new ErreurVente(`Stock insuffisant sur le lot ${lot.numeroLot} (disponible: ${lot.quantite})`, 409)
        }
        allocations = [{ lotId: lot.id, quantite: ligne.quantite }]
      } else {
        // FEFO — lots non expirés, répartition multi-lots
        const lots = await db.lot.findMany({
          where: {
            medicamentId: medicament.id,
            pharmacieId: opts.pharmacieId,
            quantite: { gt: 0 },
            dateExpiration: { gt: now },
          },
          orderBy: [{ dateExpiration: 'asc' }, { dateReception: 'asc' }],
        })
        let restant = ligne.quantite
        for (const lot of lots) {
          if (restant <= 0) break
          const pris = Math.min(restant, lot.quantite)
          allocations.push({ lotId: lot.id, quantite: pris })
          restant -= pris
        }
        if (restant > 0) {
          const disponible = lots.reduce((s, l) => s + l.quantite, 0)
          throw new ErreurVente(
            `Stock insuffisant pour ${medicament.nomCommercial || medicament.dci} (disponible: ${disponible}, demandé: ${ligne.quantite})`,
            409
          )
        }
      }

      let remiseRestante = ligneRemise
      for (const alloc of allocations) {
        const remisePart = Math.min(remiseRestante, prixUnitaire * alloc.quantite)
        remiseRestante -= remisePart
        sousLignes.push({
          medicamentId: medicament.id,
          lotId: alloc.lotId,
          quantite: alloc.quantite,
          prixUnitaire,
          prixTotal: Number((prixUnitaire * alloc.quantite - remisePart).toFixed(2)),
          remise: Number(remisePart.toFixed(2)),
        })
      }
    }

    // Totaux
    let montantTotal = sousLignes.reduce((sum, sl) => sum + sl.prixTotal, 0)
    const totalRemise = opts.remise ?? 0
    montantTotal -= totalRemise
    if (montantTotal < 0) montantTotal = 0

    // Paiements (split supporté)
    let paiementRecords: Prisma.PaiementCreateWithoutVenteInput[]
    if (opts.paiements && opts.paiements.length > 0) {
      for (const p of opts.paiements) {
        if (!Number.isFinite(p.montant) || p.montant <= 0) {
          throw new ErreurVente('Montant de paiement invalide', 400)
        }
      }
      paiementRecords = opts.paiements.map(p => ({
        montant: p.montant,
        mode: (p.mode ?? opts.modePaiement ?? 'ESPECES') as ModePaiement,
        reference: p.reference ?? null,
        statut: 'REUSSI',
      }))
    } else {
      paiementRecords = [{
        montant: montantTotal,
        mode: (opts.modePaiement ?? 'ESPECES') as ModePaiement,
        statut: 'REUSSI',
      }]
    }

    // Transaction atomique — timeout étendu (DB distante Neon: latence aller-retour
    // multipliée par les requêtes séquentielles de la transaction)
    const vente = await db.$transaction(
      async (tx) => {
      const v = await tx.vente.create({
        data: {
          pharmacieId: opts.pharmacieId,
          utilisateurId: opts.utilisateurId,
          patientId: opts.patientId ?? null,
          ordonnanceId: opts.ordonnanceId ?? null,
          sessionId: opts.sessionId ?? null,
          reference: opts.reference,
          modePaiement: (opts.modePaiement ?? 'ESPECES') as ModePaiement,
          montantTotal,
          montantPaye: paiementRecords.reduce((s, p) => s + p.montant, 0),
          remise: totalRemise,
          statut: 'VALIDEE',
          synchedAt: now,
          lignes: { create: sousLignes },
          paiements: { create: paiementRecords },
        },
        include: {
          patient: true,
          lignes: { include: { medicament: true, lot: true } },
          paiements: true,
        },
      })

      const medsTouches = new Set<string>()
      for (const sl of sousLignes) {
        // Garde anti-négatif (updateMany conditionnel)
        const result = await tx.lot.updateMany({
          where: { id: sl.lotId, quantite: { gte: sl.quantite } },
          data: { quantite: { decrement: sl.quantite } },
        })
        if (result.count === 0) {
          throw new ErreurVente(`Stock devenu insuffisant sur le lot (vente ${opts.reference} annulée)`, 409)
        }

        await tx.mouvementStock.create({
          data: {
            pharmacieId: opts.pharmacieId,
            medicamentId: sl.medicamentId,
            lotId: sl.lotId,
            type: 'SORTIE',
            quantite: sl.quantite,
            prixUnitaire: sl.prixUnitaire,
            motif: 'VENTE',
            reference: opts.reference,
            utilisateurId: opts.utilisateurId,
          },
        })
        medsTouches.add(sl.medicamentId)
      }

      // Alertes stock automatiques (dédupliquées tant que non traitées)
      // Le stock pertinent = stock VENDABLE (lots non expirés)
      for (const medicamentId of medsTouches) {
        const stockTotal = await tx.lot.aggregate({
          where: { medicamentId, pharmacieId: opts.pharmacieId, dateExpiration: { gt: now } },
          _sum: { quantite: true },
        })
        const total = stockTotal._sum.quantite ?? 0
        const med = await tx.medicament.findUnique({
          where: { id: medicamentId },
          select: { id: true, stockMinimum: true, nomCommercial: true, dci: true },
        })
        if (!med) continue

        if (total === 0) {
          const existante = await tx.alerteStock.findFirst({
            where: { pharmacieId: opts.pharmacieId, medicamentId: med.id, type: 'RUPTURE', traitee: false },
          })
          if (!existante) {
            await tx.alerteStock.create({
              data: {
                pharmacieId: opts.pharmacieId,
                medicamentId: med.id,
                type: 'RUPTURE',
                message: `Rupture de stock: ${med.nomCommercial || med.dci} — réapprovisionnement requis`,
              },
            })
          }
        } else if (total < med.stockMinimum) {
          const existante = await tx.alerteStock.findFirst({
            where: { pharmacieId: opts.pharmacieId, medicamentId: med.id, type: 'SEUIL_MINIMUM', traitee: false },
          })
          if (!existante) {
            await tx.alerteStock.create({
              data: {
                pharmacieId: opts.pharmacieId,
                medicamentId: med.id,
                type: 'SEUIL_MINIMUM',
                message: `Stock sous le seuil minimum (${total} < ${med.stockMinimum}): ${med.nomCommercial || med.dci}`,
              },
            })
          }
        }
      }

      return v
      },
      { timeout: 30_000, maxWait: 15_000 }
    )

    return { ok: true, vente }
  } catch (error) {
    if (error instanceof ErreurVente) {
      return { ok: false, status: error.status, error: error.message }
    }
    console.error('Erreur executerVente:', error)
    return { ok: false, status: 500, error: 'Erreur lors de la création de la vente' }
  }
}

/** Génère une référence de vente POS: VTE-YYYYMMDD-NNNN */
export async function genererReferenceVente(pharmacieId: string): Promise<string> {
  const now = new Date()
  const count = await db.vente.count({
    where: {
      pharmacieId,
      createdAt: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) },
    },
  })
  return `VTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`
}
