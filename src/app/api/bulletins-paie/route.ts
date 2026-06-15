import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const where: Record<string, unknown> = { pharmacieId }

    if (mois) where.mois = parseInt(mois, 10)
    if (annee) where.annee = parseInt(annee, 10)

    const skip = (page - 1) * limit

    const [bulletins, total] = await Promise.all([
      db.bulletinPaie.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.bulletinPaie.count({ where }),
    ])

    return NextResponse.json({
      data: bulletins,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET bulletins-paie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des bulletins de paie' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { mois, annee, salaireBrut, salaireNet, retenues, primes } = body

    if (mois === undefined || annee === undefined || salaireBrut === undefined) {
      return NextResponse.json(
        { error: 'Les champs mois, annee et salaireBrut sont requis' },
        { status: 400 }
      )
    }

    if (mois < 1 || mois > 12) {
      return NextResponse.json(
        { error: 'Le mois doit être compris entre 1 et 12' },
        { status: 400 }
      )
    }

    if (annee < 2000 || annee > 2100) {
      return NextResponse.json(
        { error: 'L\'année doit être une valeur valide' },
        { status: 400 }
      )
    }

    const bulletin = await db.bulletinPaie.create({
      data: {
        pharmacieId,
        mois: parseInt(String(mois), 10),
        annee: parseInt(String(annee), 10),
        salaireBrut: parseFloat(String(salaireBrut)),
        salaireNet: parseFloat(String(salaireNet ?? salaireBrut)),
        retenues: parseFloat(String(retenues ?? 0)),
        primes: parseFloat(String(primes ?? 0)),
      },
    })

    return NextResponse.json(bulletin, { status: 201 })
  } catch (error) {
    console.error('Erreur POST bulletins-paie:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du bulletin de paie' },
      { status: 500 }
    )
  }
}
