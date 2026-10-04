import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * GET /api/grossistes/livraisons — Module G05 · Planning des livraisons
 * Query : ?grossisteId= · ?livreurId= · ?date=YYYY-MM-DD (livraisons du jour)
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_LIVREUR · GROSSISTE_COMMANDES
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_LIVREUR',
    'GROSSISTE_COMMANDES',
  ])
  if (moduleGuard) return moduleGuard

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = auth.grossisteId ?? searchParams.get('grossisteId')
    const guard = checkGrossisteAccess(auth, grossisteId)
    if (guard) return guard
    if (!grossisteId) {
      return NextResponse.json({ error: 'Paramètre grossisteId requis' }, { status: 400 })
    }

    const livreurId = searchParams.get('livreurId') ?? undefined
    const date = searchParams.get('date')

    let plage: { gte?: Date; lte?: Date } | undefined
    if (date) {
      const d = new Date(date + 'T00:00:00')
      if (isNaN(d.getTime())) {
        return NextResponse.json({ error: 'Date invalide' }, { status: 400 })
      }
      plage = {
        gte: d,
        lte: new Date(d.getTime() + 24 * 3600 * 1000 - 1),
      }
    }

    const livraisons = await db.livraisonGrossiste.findMany({
      where: {
        commande: { grossisteId },
        ...(livreurId ? { livreurId } : {}),
        ...(plage && (plage.gte || plage.lte) ? { planning: plage } : {}),
      },
      include: {
        commande: {
          select: {
            id: true,
            reference: true,
            statut: true,
            montantTotal: true,
            pharmacieId: true,
            lignes: { select: { dci: true, quantite: true, quantiteLivre: true } },
          },
        },
      },
      orderBy: [{ planning: 'asc' }, { createdAt: 'desc' }],
    })

    const pharmaIds = [...new Set(livraisons.map((l) => l.commande.pharmacieId).filter(Boolean))] as string[]
    const pharmacies = await db.pharmacie.findMany({
      where: { id: { in: pharmaIds } },
      select: { id: true, nom: true, ville: true, adresse: true, telephone: true },
    })
    const pharmaMap = new Map(pharmacies.map((p) => [p.id, p]))

    const enriched = livraisons.map((l) => {
      const ph = l.commande.pharmacieId ? pharmaMap.get(l.commande.pharmacieId) : null
      return {
        ...l,
        pharmacie: ph ?? null,
        nbProduits: l.commande.lignes.length,
      }
    })

    return NextResponse.json({
      livraisons: enriched,
      stats: {
        planifiees: livraisons.filter((l) => l.statut === 'PLANIFIEE').length,
        enRoute: livraisons.filter((l) => l.statut === 'EN_ROUTE').length,
        livrees: livraisons.filter((l) => l.statut === 'LIVREE').length,
        litiges: livraisons.filter((l) => l.statut === 'LITIGE').length,
        echecs: livraisons.filter((l) => l.statut === 'ECHEC').length,
      },
    })
  } catch (error) {
    console.error('Erreur GET livraisons:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des livraisons' }, { status: 500 })
  }
}

/**
 * POST /api/grossistes/livraisons — Planifier une livraison (G05)
 * Body : { commandeId, livreurId?, planning? } — la commande doit être prête
 * (bon de picking PRET ou statut EN_PREPARATION/EN_LIVRAISON).
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_COMMANDES
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_COMMANDES'])
  if (moduleGuard) return moduleGuard

  try {
    const body = await request.json()
    const { commandeId, livreurId, planning } = body ?? {}

    if (!commandeId) {
      return NextResponse.json({ error: 'commandeId requis' }, { status: 400 })
    }

    const commande = await db.commandeGrossiste.findUnique({
      where: { id: commandeId },
      include: { lignes: true },
    })
    const guard = checkGrossisteAccess(auth, commande?.grossisteId ?? null)
    if (guard) return guard
    if (!commande) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
    }

    // Il faut un picking terminé pour livrer (le colis est constitué)
    const bon = await db.bonPicking.findFirst({
      where: { commandeId, statut: 'PRET' },
    })
    if (!bon) {
      return NextResponse.json(
        { error: 'Aucun bon de picking PRET pour cette commande — terminez le picking (G04) avant de planifier la livraison' },
        { status: 409 }
      )
    }

    const existante = await db.livraisonGrossiste.findFirst({
      where: { commandeId, statut: { in: ['PLANIFIEE', 'EN_ROUTE'] } },
    })
    if (existante) {
      return NextResponse.json({ error: 'Une livraison est déjà planifiée/en route pour cette commande' }, { status: 409 })
    }

    const planDate = planning ? new Date(planning) : new Date()
    if (isNaN(planDate.getTime())) {
      return NextResponse.json({ error: 'Date de planification invalide' }, { status: 400 })
    }

    const livraison = await db.livraisonGrossiste.create({
      data: {
        commandeId,
        livreurId: livreurId ?? null,
        planning: planDate,
        statut: 'PLANIFIEE',
      },
    })

    await db.commandeGrossiste.update({
      where: { id: commandeId },
      data: { statut: 'EN_LIVRAISON' },
    })

    return NextResponse.json(livraison, { status: 201 })
  } catch (error) {
    console.error('Erreur POST livraison:', error)
    return NextResponse.json({ error: 'Erreur lors de la planification de la livraison' }, { status: 500 })
  }
}
