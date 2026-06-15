import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

/**
 * GET /api/portail/grossiste/commandes
 * List pharmacy orders to grossistes with filters and pagination.
 * Query: ?pharmacieId=xxx&grossisteId=xxx&statut=ENVOYEE&page=1&limit=50
 * Requires: M03_COMMANDES read (GROSSISTE_PARTNER or PHARMACIEN roles)
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M03_COMMANDES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const grossisteId = searchParams.get('grossisteId')
    const statut = searchParams.get('statut')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (grossisteId) where.grossisteId = grossisteId
    if (statut) where.statut = statut

    const [commandes, total] = await Promise.all([
      db.commandeGrossiste.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          grossiste: {
            select: { id: true, nom: true, slug: true },
          },
          lignes: true,
        },
      }),
      db.commandeGrossiste.count({ where }),
    ])

    // Fetch pharmacie data separately
    const pharmacieIds = commandes
      .map(c => c.pharmacieId)
      .filter(Boolean) as string[]
    const pharmacies =
      pharmacieIds.length > 0
        ? await db.pharmacie.findMany({
            where: { id: { in: pharmacieIds } },
            select: {
              id: true,
              nom: true,
              ville: true,
              adresse: true,
              telephone: true,
            },
          })
        : []
    const pharmacieMap = new Map(pharmacies.map(p => [p.id, p]))

    const mappedCommandes = commandes.map(c => ({
      ...c,
      pharmacie: c.pharmacieId
        ? pharmacieMap.get(c.pharmacieId) || null
        : null,
    }))

    return NextResponse.json({
      commandes: mappedCommandes,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur commandes portail grossiste:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement des commandes' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/portail/grossiste/commandes
 * Create a new pharmacy order to a grossiste.
 * Body: { pharmacieId, grossisteId, lignes: [...], reference? }
 * Requires: M03_COMMANDES write
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, 'M03_COMMANDES', 'write')
  if (auth instanceof Response) return auth

  try {
    const body = await request.json()
    const { pharmacieId, grossisteId, lignes, reference } = body

    if (!pharmacieId || !grossisteId || !lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'pharmacieId, grossisteId et lignes sont requis' },
        { status: 400 }
      )
    }

    // Verify grossiste exists
    const grossiste = await db.grossiste.findUnique({
      where: { id: grossisteId },
    })
    if (!grossiste) {
      return NextResponse.json(
        { error: 'Grossiste non trouvé' },
        { status: 404 }
      )
    }

    // Verify pharmacie exists
    const pharmacie = await db.pharmacie.findUnique({
      where: { id: pharmacieId },
    })
    if (!pharmacie) {
      return NextResponse.json(
        { error: 'Pharmacie non trouvée' },
        { status: 404 }
      )
    }

    // Validate lignes
    for (const ligne of lignes) {
      if (!ligne.dci || !ligne.quantite || !ligne.prixUnitaire || !ligne.montant) {
        return NextResponse.json(
          {
            error:
              'Chaque ligne doit contenir : dci, quantite, prixUnitaire, montant',
          },
          { status: 400 }
        )
      }
    }

    const montantTotal = lignes.reduce(
      (acc: number, l: { montant: number }) => acc + l.montant,
      0
    )

    // Generate reference if not provided
    const cmdReference =
      reference ||
      `CMD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create the CommandeGrossiste with LigneCommandeGrossiste
    const commande = await db.commandeGrossiste.create({
      data: {
        pharmacieId,
        grossisteId,
        reference: cmdReference,
        statut: 'ENVOYEE',
        montantTotal,
        lignes: {
          create: lignes.map(
            (l: {
              dci: string
              nomCommercial?: string
              quantite: number
              prixUnitaire: number
              montant: number
              produitId?: string
            }) => ({
              dci: l.dci,
              nomCommercial: l.nomCommercial || null,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              montant: l.montant,
              produitId: l.produitId || null,
            })
          ),
        },
      },
      include: {
        lignes: true,
        grossiste: {
          select: { id: true, nom: true, slug: true },
        },
      },
    })

    return NextResponse.json(
      {
        ...commande,
        pharmacie: {
          id: pharmacie.id,
          nom: pharmacie.nom,
          ville: pharmacie.ville,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur création commande portail:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de la commande' },
      { status: 500 }
    )
  }
}
