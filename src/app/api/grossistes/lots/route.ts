import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * GET /api/grossistes/lots — Module G02 · Gestion des Lots Entrepôt
 * Liste des lots du grossiste (tenant isolé) avec alertes expiration.
 * Query : ?grossisteId= · ?statut=DISPONIBLE|QUARANTAINE|DETRUIT · ?expirants=true
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_PREPARATEUR (CDC §3)
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_PREPARATEUR',
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

    const statut = searchParams.get('statut') ?? undefined
    const expirants = searchParams.get('expirants') === 'true'

    const now = new Date()
    const dans90j = new Date(now.getTime() + 90 * 24 * 3600 * 1000)

    const lots = await db.lotGrossiste.findMany({
      where: {
        produit: { grossisteId },
        ...(statut ? { statut } : {}),
        ...(expirants ? { dateExpiration: { lte: dans90j } } : {}),
      },
      include: {
        produit: {
          select: {
            id: true,
            dci: true,
            nomCommercial: true,
            forme: true,
            dosage: true,
            grossisteId: true,
          },
        },
      },
      orderBy: [{ dateExpiration: 'asc' }, { createdAt: 'desc' }],
    })

    // Enrichissement : stats entrepôt
    const totalUnites = lots.filter((l) => l.statut === 'DISPONIBLE').reduce((s, l) => s + l.quantite, 0)
    const expires = lots.filter((l) => l.dateExpiration <= now && l.statut === 'DISPONIBLE')
    const bientot = lots.filter(
      (l) => l.dateExpiration > now && l.dateExpiration <= dans90j && l.statut === 'DISPONIBLE'
    )

    return NextResponse.json({
      lots,
      stats: {
        totalLots: lots.length,
        totalUnitesDisponibles: totalUnites,
        lotsExpirés: expires.length,
        lotsExpirant90j: bientot.length,
        enQuarantaine: lots.filter((l) => l.statut === 'QUARANTAINE').length,
      },
    })
  } catch (error) {
    console.error('Erreur GET lots grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des lots' }, { status: 500 })
  }
}

/**
 * POST /api/grossistes/lots — Réception d'un nouveau lot en entrepôt (G02)
 * Incrémente le stock disponible du produit (quantiteDispo).
 * Body : { produitId, numeroLot, quantite, dateExpiration, emplacement? }
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_PREPARATEUR
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_PREPARATEUR'])
  if (moduleGuard) return moduleGuard

  try {
    const body = await request.json()
    const { produitId, numeroLot, quantite, dateExpiration, emplacement } = body ?? {}

    if (!produitId || !numeroLot || !quantite || !dateExpiration) {
      return NextResponse.json(
        { error: 'Champs requis : produitId, numeroLot, quantite, dateExpiration' },
        { status: 400 }
      )
    }
    if (!Number.isInteger(Number(quantite)) || Number(quantite) <= 0) {
      return NextResponse.json({ error: 'Quantité invalide' }, { status: 400 })
    }

    // Le produit doit appartenir au grossiste du tenant
    const produit = await db.produitGrossiste.findUnique({ where: { id: produitId } })
    const guard = checkGrossisteAccess(auth, produit?.grossisteId ?? null)
    if (guard) return guard
    if (!produit) {
      return NextResponse.json({ error: 'Produit introuvable' }, { status: 404 })
    }

    const expDate = new Date(dateExpiration)
    if (isNaN(expDate.getTime())) {
      return NextResponse.json({ error: 'Date d’expiration invalide' }, { status: 400 })
    }
    if (expDate <= new Date()) {
      return NextResponse.json(
        { error: 'Impossible de réceptionner un lot déjà expiré — destruction directe requise' },
        { status: 400 }
      )
    }

    // Upsert : le lot (produit, numeroLot) existe → incrément
    const lot = await db.lotGrossiste.upsert({
      where: { produitId_numeroLot: { produitId, numeroLot } },
      create: {
        produitId,
        numeroLot,
        quantite: Number(quantite),
        dateExpiration: expDate,
        emplacement: emplacement ?? null,
        statut: 'DISPONIBLE',
      },
      update: {
        quantite: { increment: Number(quantite) },
        dateExpiration: expDate,
        emplacement: emplacement ?? undefined,
      },
      include: { produit: { select: { dci: true, nomCommercial: true } } },
    })

    // Le stock global du produit suit les lots disponibles
    await db.produitGrossiste.update({
      where: { id: produitId },
      data: { quantiteDispo: { increment: Number(quantite) }, actif: true },
    })

    return NextResponse.json(lot, { status: 201 })
  } catch (error) {
    console.error('Erreur POST lot grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de la réception du lot' }, { status: 500 })
  }
}
