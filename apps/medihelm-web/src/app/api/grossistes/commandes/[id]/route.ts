import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// Valid status values for grossiste orders
const VALID_STATUTS = [
  'BROUILLON',
  'ENVOYEE',
  'CONFIRMEE',
  'EN_PREPARATION',
  'EN_LIVRAISON',
  'LIVREE',
  'ANNULEE',
  'REFUSEE',
  'LITIGE',
] as const

// Allowed status transitions from each current status
const STATUS_TRANSITIONS: Record<string, string[]> = {
  BROUILLON: ['ENVOYEE', 'ANNULEE'],
  ENVOYEE: ['CONFIRMEE', 'REFUSEE', 'ANNULEE'],
  CONFIRMEE: ['EN_PREPARATION', 'ANNULEE'],
  EN_PREPARATION: ['EN_LIVRAISON', 'ANNULEE', 'LITIGE'],
  EN_LIVRAISON: ['LIVREE', 'LITIGE'],
  LIVREE: [],
  ANNULEE: [],
  REFUSEE: [],
  LITIGE: ['EN_PREPARATION', 'ANNULEE'],
}

type PharmacieInfo = {
  id: string
  nom: string
  ville: string
  adresse: string
  telephone: string
}

async function getPharmacie(
  pharmacieId: string | null
): Promise<PharmacieInfo | null> {
  if (!pharmacieId) return null
  return db.pharmacie.findUnique({
    where: { id: pharmacieId },
    select: { id: true, nom: true, ville: true, adresse: true, telephone: true },
  })
}

/**
 * GET /api/grossistes/commandes/[id]
 * Get a single CommandeGrossiste with lines and pharmacie info.
 * Requires: M17_GROSSISTES read
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const commande = await db.commandeGrossiste.findUnique({
      where: { id },
      include: {
        grossiste: {
          select: { id: true, nom: true, slug: true },
        },
        lignes: true,
      },
    })

    if (!commande) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    const pharmacie = await getPharmacie(commande.pharmacieId)

    return NextResponse.json({
      ...commande,
      pharmacie,
    })
  } catch (error) {
    console.error('Erreur commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de la commande' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/grossistes/commandes/[id]
 * Update status of a CommandeGrossiste with transition validation.
 * Requires: M17_GROSSISTES write
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  try {
    const { id } = await params
    const body = await request.json()
    const { statut, reference } = body

    const existing = await db.commandeGrossiste.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      )
    }

    // Validate status if provided
    if (statut !== undefined) {
      if (!VALID_STATUTS.includes(statut as (typeof VALID_STATUTS)[number])) {
        return NextResponse.json(
          {
            error: `Statut invalide. Statuts valides : ${VALID_STATUTS.join(', ')}`,
          },
          { status: 400 }
        )
      }

      // Check allowed transitions
      const allowedTransitions = STATUS_TRANSITIONS[existing.statut] || []
      if (!allowedTransitions.includes(statut)) {
        return NextResponse.json(
          {
            error: `Transition non autorisée : ${existing.statut} → ${statut}. Transitions autorisées depuis ${existing.statut} : ${allowedTransitions.join(', ') || 'aucune'}`,
          },
          { status: 400 }
        )
      }
    }

    const commande = await db.commandeGrossiste.update({
      where: { id },
      data: {
        ...(statut !== undefined && { statut }),
        ...(reference !== undefined && { reference }),
      },
      include: {
        grossiste: true,
        lignes: true,
      },
    })

    const pharmacie = await getPharmacie(commande.pharmacieId)

    return NextResponse.json({
      ...commande,
      pharmacie,
    })
  } catch (error) {
    console.error('Erreur mise à jour commande:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour de la commande' },
      { status: 500 }
    )
  }
}
