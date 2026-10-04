import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, bulletinPaieSchema } from '@/lib/validations'

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
    const validation = validate(bulletinPaieSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      )
    }
    const data = validation.data

    const bulletin = await db.bulletinPaie.create({
      data: {
        pharmacieId,
        mois: parseInt(data.periode.slice(0, 2), 10) || 1,
        annee: parseInt(data.periode.slice(-4), 10) || new Date().getFullYear(),
        salaireBrut: data.salaireBrut ?? 0,
        salaireNet: data.salaireBrut ?? 0,
        retenues: data.deductions ?? 0,
        primes: data.primes ?? 0,
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
