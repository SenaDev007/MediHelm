import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    // Check if pharmacy is a promoteur of a reseau
    const reseau = await db.reseau.findFirst({
      where: { promoteurId: pharmacieId },
      include: {
        officines: { include: { pharmacie: { select: { id: true, nom: true, ville: true } } } },
        transfertsStock: {
          include: {
            pharmacieSource: { select: { id: true, nom: true } },
            pharmacieDest: { select: { id: true, nom: true } },
            medicament: { select: { id: true, nomCommercial: true, dci: true } },
          },
          orderBy: { dateDemande: 'desc' },
          take: 50,
        },
        promoteur: { select: { id: true, nom: true } },
      },
    })

    // Also check if pharmacy is an officine in a reseau
    if (!reseau) {
      const officine = await db.officineReseau.findFirst({
        where: { pharmacieId },
        include: {
          reseau: {
            include: {
              officines: { include: { pharmacie: { select: { id: true, nom: true, ville: true } } } },
              transfertsStock: {
                include: {
                  pharmacieSource: { select: { id: true, nom: true } },
                  pharmacieDest: { select: { id: true, nom: true } },
                  medicament: { select: { id: true, nomCommercial: true, dci: true } },
                },
                orderBy: { dateDemande: 'desc' },
                take: 50,
              },
              promoteur: { select: { id: true, nom: true } },
            },
          },
        },
      })
      if (officine) {
        return NextResponse.json(officine.reseau)
      }
    }

    return NextResponse.json(reseau)
  } catch (error) {
    console.error('Erreur GET reseaux:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du réseau' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { promoteurId, nom, nbOfficines, coefficient } = body

    if (!promoteurId || !nom) {
      return NextResponse.json({ error: 'promoteurId et nom requis' }, { status: 400 })
    }

    const data = await db.reseau.create({
      data: {
        promoteurId,
        nom,
        nbOfficines: nbOfficines || 2,
        coefficient: coefficient || 1.0,
      },
      include: {
        officines: true,
        promoteur: { select: { id: true, nom: true } },
      },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST reseaux:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du réseau' }, { status: 500 })
  }
}
