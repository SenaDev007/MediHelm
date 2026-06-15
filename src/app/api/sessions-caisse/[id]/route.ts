import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult

    const { id } = await params
    const session = await db.sessionCaisse.findUnique({
      where: { id },
      include: {
        caisse: { select: { id: true, nom: true } },
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ventes: {
          select: {
            id: true,
            reference: true,
            montantTotal: true,
            montantPaye: true,
            statut: true,
            modePaiement: true,
            createdAt: true,
            patient: { select: { id: true, nom: true, prenom: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    return NextResponse.json(session)
  } catch (error) {
    console.error('Erreur GET session-caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération de la session' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult

    const { id } = await params
    const body = await request.json()

    const existingSession = await db.sessionCaisse.findUnique({ where: { id } })
    if (!existingSession) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    // Close session
    if (body.action === 'cloturer' || body.soldeCloture !== undefined) {
      const soldeCloture = body.soldeCloture ?? 0

      // Calculate expected balance: soldeOuverture + sum of all sales in session
      const ventesSession = await db.vente.findMany({
        where: {
          sessionId: id,
          statut: { in: ['VALIDEE', 'EN_COURS'] },
        },
        select: { montantTotal: true, modePaiement: true },
      })

      const totalVentes = ventesSession.reduce((sum, v) => sum + v.montantTotal, 0)
      const expectedBalance = existingSession.soldeOuverture + totalVentes
      const ecart = soldeCloture - expectedBalance

      const session = await db.sessionCaisse.update({
        where: { id },
        data: {
          statut: 'FERMEE',
          soldeCloture,
          ecart,
          fermeLe: new Date(),
        },
        include: {
          caisse: { select: { id: true, nom: true } },
          utilisateur: { select: { id: true, nom: true, prenom: true } },
          ventes: {
            select: {
              id: true,
              reference: true,
              montantTotal: true,
              statut: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      })

      return NextResponse.json(session)
    }

    // Update other fields
    const session = await db.sessionCaisse.update({
      where: { id },
      data: body,
    })

    return NextResponse.json(session)
  } catch (error) {
    console.error('Erreur PATCH session-caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la session' }, { status: 500 })
  }
}
