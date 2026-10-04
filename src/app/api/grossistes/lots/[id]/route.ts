import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * PATCH /api/grossistes/lots/[id] — Statut lot : quarantaine / destruction (G02)
 * Un lot en quarantaine NE PEUT PAS être prélevé au picking (G04).
 * La destruction génère les données du PV (motif + quantité) — déclaration DPMED.
 * Body : { statut: 'QUARANTAINE' | 'DISPONIBLE' | 'DETRUIT', motif?, quantiteDetruite? }
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_PREPARATEUR
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_PREPARATEUR'])
  if (moduleGuard) return moduleGuard

  try {
    const { id } = await params
    const body = await request.json()
    const { statut, motif, quantiteDetruite } = body ?? {}

    if (!['QUARANTAINE', 'DISPONIBLE', 'DETRUIT'].includes(statut)) {
      return NextResponse.json(
        { error: 'Statut invalide — QUARANTAINE, DISPONIBLE ou DETRUIT' },
        { status: 400 }
      )
    }
    if ((statut === 'QUARANTAINE' || statut === 'DETRUIT') && !motif) {
      return NextResponse.json(
        { error: 'Motif obligatoire pour une mise en quarantaine ou une destruction (PV DPMED)' },
        { status: 400 }
      )
    }

    const lot = await db.lotGrossiste.findUnique({
      where: { id },
      include: { produit: { select: { grossisteId: true, dci: true, nomCommercial: true } } },
    })
    const guard = checkGrossisteAccess(auth, lot?.produit?.grossisteId ?? null)
    if (guard) return guard
    if (!lot) {
      return NextResponse.json({ error: 'Lot introuvable' }, { status: 404 })
    }
    if (lot.statut === 'DETRUIT') {
      return NextResponse.json({ error: 'Ce lot est déjà détruit — opération irréversible' }, { status: 409 })
    }
    if (statut === 'DETRUIT' && lot.statut === 'DISPONIBLE') {
      return NextResponse.json(
        { error: 'Un lot disponible doit d’abord passer en quarantaine avant destruction (procédure PV)' },
        { status: 409 }
      )
    }

    const quantiteDetruiteFinale =
      statut === 'DETRUIT'
        ? Math.min(
            Number(quantiteDetruite) > 0 ? Number(quantiteDetruite) : lot.quantite,
            lot.quantite
          )
        : undefined

    const updated = await db.lotGrossiste.update({
      where: { id },
      data: {
        statut,
        motifStatut: motif ?? lot.motifStatut,
        ...(statut === 'DETRUIT'
          ? { quantite: lot.quantite - (quantiteDetruiteFinale ?? lot.quantite) }
          : {}),
      },
      include: { produit: { select: { dci: true, nomCommercial: true, forme: true, dosage: true } } },
    })

    // Le stock global du produit suit la destruction
    if (statut === 'DETRUIT' && quantiteDetruiteFinale) {
      await db.produitGrossiste.update({
        where: { id: lot.produitId },
        data: { quantiteDispo: { decrement: quantiteDetruiteFinale } },
      })
    }

    return NextResponse.json({
      ...updated,
      pvDestruction:
        statut === 'DETRUIT'
          ? {
              date: new Date().toISOString(),
              dci: lot.produit.dci,
              nomCommercial: lot.produit.nomCommercial,
              numeroLot: lot.numeroLot,
              quantiteDetruite: quantiteDetruiteFinale,
              motif,
              aDéclarerDPMED: true,
            }
          : undefined,
    })
  } catch (error) {
    console.error('Erreur PATCH lot grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du lot' }, { status: 500 })
  }
}
