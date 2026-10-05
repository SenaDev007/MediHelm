import { NextResponse } from 'next/server'
import { db } from '@backend/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@backend/lib/api-auth'

/**
 * PATCH /api/grossistes/picking/[id] — Scan de confirmation du picking (G04)
 * Chaque boîte scannée valide le prélèvement. Corps :
 *   { action: 'SCAN', ligneId, lotId }         → enregistre un scan
 *   { action: 'TERMINER' }                      → bon PRET + décrément stocks + quantités livrées
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
    const { action, ligneId, lotId } = body ?? {}

    const bon = await db.bonPicking.findUnique({
      where: { id },
      include: { commande: { include: { lignes: true } } },
    })
    const guard = checkGrossisteAccess(auth, bon?.commande?.grossisteId ?? null)
    if (guard) return guard
    if (!bon) {
      return NextResponse.json({ error: 'Bon de picking introuvable' }, { status: 404 })
    }
    if (bon.statut !== 'EN_ATTENTE') {
      return NextResponse.json({ error: `Bon déjà ${bon.statut}` }, { status: 409 })
    }

    const lignes = JSON.parse(bon.lignes) as Array<{
      ligneId: string
      dci: string
      aPrelever: number
      prelevements: Array<{ lotId: string; numeroLot: string; quantite: number; scanne?: boolean }>
      manquant: number
    }>

    if (action === 'SCAN') {
      // ── Validation d'un prélèvement par scan ──
      const ligne = lignes.find((l) => l.ligneId === ligneId)
      if (!ligne) {
        return NextResponse.json({ error: 'Ligne inconnue' }, { status: 400 })
      }
      const prev = ligne.prelevements.find((p) => p.lotId === lotId)
      if (!prev) {
        return NextResponse.json({ error: 'Ce lot ne fait pas part du bon de picking' }, { status: 400 })
      }
      if (prev.scanne) {
        return NextResponse.json({ error: 'Prélèvement déjà scanné' }, { status: 409 })
      }
      prev.scanne = true

      await db.bonPicking.update({
        where: { id },
        data: { lignes: JSON.stringify(lignes), scanConfirme: true },
      })

      const total = lignes.reduce((s, l) => s + l.prelevements.length, 0)
      const scannes = lignes.reduce((s, l) => s + l.prelevements.filter((p) => p.scanne).length, 0)
      return NextResponse.json({ ok: true, scannes, total, reste: total - scannes })
    }

    if (action === 'TERMINER') {
      // ── Clôture : décrément des lots + quantités livrées par ligne ──
      let manquants = 0
      for (const ligne of lignes) {
        const ligneCmd = bon.commande.lignes.find((l) => l.id === ligne.ligneId)
        if (!ligneCmd) continue
        const prevus = ligne.prelevements.filter((p) => p.scanne)
        const qtePrelevee = prevus.reduce((s, p) => s + p.quantite, 0)

        // Décrément atomique conditionnel : le stock ne descend jamais sous 0
        for (const p of prevus) {
          const res = await db.lotGrossiste.updateMany({
            where: { id: p.lotId, quantite: { gte: p.quantite } },
            data: { quantite: { decrement: p.quantite } },
          })
          if (res.count === 0) {
            // Lot épuisé entre-temps : relecture du stock réel
            const lot = await db.lotGrossiste.findUnique({ where: { id: p.lotId } })
            const dispo = lot?.quantite ?? 0
            if (dispo > 0) {
              await db.lotGrossiste.update({
                where: { id: p.lotId },
                data: { quantite: 0 },
              })
            }
          }
        }

        if (qtePrelevee > 0) {
          await db.ligneCommandeGrossiste.update({
            where: { id: ligne.ligneId },
            data: { quantiteLivre: qtePrelevee },
          })
        }
        if (qtePrelevee < ligne.aPrelever) manquants += 1
      }

      // Réagrège le stock global des produits concernés (somme des lots disponibles)
      const produitIds = [...new Set(bon.commande.lignes.map((l) => l.produitId).filter(Boolean))] as string[]
      for (const produitId of produitIds) {
        const agg = await db.lotGrossiste.aggregate({
          where: { produitId, statut: 'DISPONIBLE' },
          _sum: { quantite: true },
        })
        await db.produitGrossiste.update({
          where: { id: produitId },
          data: { quantiteDispo: agg._sum.quantite ?? 0 },
        })
      }

      await db.bonPicking.update({
        where: { id },
        data: { statut: 'PRET' },
      })

      return NextResponse.json({
        ok: true,
        statut: 'PRET',
        lignesIncompletes: manquants,
        message:
          manquants > 0
            ? 'Bon clôturé avec écarts — un reliquat sera à traiter (G03)'
            : 'Bon de picking complet — prêt pour la livraison (G05)',
      })
    }

    return NextResponse.json(
      { error: 'Action inconnue — SCAN ou TERMINER' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Erreur PATCH picking:', error)
    return NextResponse.json({ error: 'Erreur lors de la confirmation du picking' }, { status: 500 })
  }
}
