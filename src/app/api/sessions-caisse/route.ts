import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut === 'ouverte') {
      where.dateFermeture = null
    }

    const data = await db.sessionCaisse.findMany({
      where,
      include: {
        caisse: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ventes: { select: { id: true, montantTotal: true, statut: true } },
      },
      orderBy: { dateOuverture: 'desc' },
      take: 50,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET sessions-caisse:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, utilisateurId, caisseId, fondDeCaisse } = body

    if (!pharmacieId || !utilisateurId || !caisseId) {
      return NextResponse.json({ error: 'pharmacieId, utilisateurId et caisseId requis' }, { status: 400 })
    }

    // Vérifier qu'il n'y a pas de session ouverte sur cette caisse
    const existingOpen = await db.sessionCaisse.findFirst({
      where: { caisseId, dateFermeture: null },
    })
    if (existingOpen) {
      return NextResponse.json({ error: 'Une session est déjà ouverte sur cette caisse' }, { status: 400 })
    }

    const data = await db.sessionCaisse.create({
      data: {
        pharmacieId,
        utilisateurId,
        caisseId,
        fondDeCaisse: fondDeCaisse || 0,
        totalEntrees: 0,
        totalSorties: 0,
      },
      include: { caisse: true, utilisateur: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST sessions-caisse:', error)
    return NextResponse.json({ error: "Erreur lors de l'ouverture de session" }, { status: 500 })
  }
}
