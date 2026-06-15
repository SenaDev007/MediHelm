import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { INSTITUTIONAL_ROLES } from '@/lib/rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params
    const vente = await db.vente.findUnique({
      where: { id },
      include: {
        patient: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ordonnance: { select: { id: true, reference: true, prescripteur: true } },
        session: { select: { id: true, caisse: { select: { nom: true } } } },
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true, forme: true, dosage: true } },
          },
        },
        paiements: true,
      },
    })

    if (!vente) {
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    // Ownership check: verify the vente belongs to the user's pharmacy
    if (!INSTITUTIONAL_ROLES.includes(user.roleName) && vente.pharmacieId !== user.pharmacieId) {
      return NextResponse.json({ error: 'Accès refusé : cette vente n\'appartient pas à votre pharmacie' }, { status: 403 })
    }

    return NextResponse.json(vente)
  } catch (error) {
    console.error('Erreur GET vente:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la vente' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { id } = await params
    const body = await request.json()
    const { statut } = body

    const vente = await db.vente.findUnique({ where: { id } })
    if (!vente) {
      return NextResponse.json({ error: 'Vente non trouvée' }, { status: 404 })
    }

    // Ownership check: verify the vente belongs to the user's pharmacy
    if (!INSTITUTIONAL_ROLES.includes(user.roleName) && vente.pharmacieId !== user.pharmacieId) {
      return NextResponse.json({ error: 'Accès refusé : cette vente n\'appartient pas à votre pharmacie' }, { status: 403 })
    }

    const updated = await db.vente.update({
      where: { id },
      data: { statut },
      include: {
        patient: true,
        lignes: { include: { medicament: true } },
        paiements: true,
      },
    })

    // If cancelled, restore stock
    if (statut === 'ANNULEE') {
      for (const ligne of vente.lignes || []) {
        const lots = await db.lot.findMany({
          where: { medicamentId: ligne.medicamentId, pharmacieId: vente.pharmacieId },
          orderBy: { dateExpiration: 'asc' },
        })
        if (lots.length > 0) {
          await db.lot.update({
            where: { id: lots[0].id },
            data: { quantite: { increment: ligne.quantite } },
          })
        }
      }
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH vente:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la vente' }, { status: 500 })
  }
}
