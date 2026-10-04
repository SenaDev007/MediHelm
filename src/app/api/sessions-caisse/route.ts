import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, sessionCaisseSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const caisseId = searchParams.get('caisseId')

    const where: Record<string, unknown> = { pharmacieId }
    if (statut) where.statut = statut
    if (caisseId) where.caisseId = caisseId

    const sessions = await db.sessionCaisse.findMany({
      where,
      include: {
        caisse: { select: { id: true, nom: true } },
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ventes: {
          select: {
            id: true,
            montantTotal: true,
            montantPaye: true,
            statut: true,
            createdAt: true,
            reference: true,
            patient: { select: { id: true, nom: true, prenom: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
      orderBy: { ouvertLe: 'desc' },
    })

    return NextResponse.json(sessions)
  } catch (error) {
    console.error('Erreur GET sessions-caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des sessions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const validation = validate(sessionCaisseSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    // Check if there's already an open session for this caisse
    const existingSession = await db.sessionCaisse.findFirst({
      where: { caisseId: user.pharmacieId, statut: 'OUVERTE' },
    })
    if (existingSession) {
      return NextResponse.json({ error: 'Une session est déjà ouverte pour cette caisse' }, { status: 409 })
    }

    const session = await db.sessionCaisse.create({
      data: {
        pharmacieId,
        caisseId: pharmacieId,
        utilisateurId: user.id,
        soldeOuverture: data.fondDeCaisse,
        statut: 'OUVERTE',
      },
      include: {
        caisse: { select: { id: true, nom: true } },
        utilisateur: { select: { id: true, nom: true, prenom: true } },
      },
    })

    return NextResponse.json(session, { status: 201 })
  } catch (error) {
    console.error('Erreur POST sessions-caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la session' }, { status: 500 })
  }
}
