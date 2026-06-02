import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const employeId = searchParams.get('employeId')
    const mois = searchParams.get('mois')
    const annee = searchParams.get('annee')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (employeId) where.employeId = employeId
    if (mois) where.mois = parseInt(mois)
    if (annee) where.annee = parseInt(annee)

    const data = await db.bulletinPaie.findMany({
      where,
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET bulletins-paie:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, employeId, mois, annee, salaireBrut, cotisations, prime, avance } = body

    if (!pharmacieId || !employeId || !mois || !annee || !salaireBrut) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    // CNSS Bénin: 18% du salaire brut
    const calculatedCotisations = cotisations !== undefined ? cotisations : salaireBrut * 0.18
    const salaireNet = salaireBrut - calculatedCotisations + (prime || 0) - (avance || 0)

    const data = await db.bulletinPaie.create({
      data: {
        pharmacieId,
        employeId,
        mois,
        annee,
        salaireBrut,
        cotisations: calculatedCotisations,
        salaireNet,
        prime: prime || null,
        avance: avance || null,
      },
      include: { employe: { select: { id: true, nom: true, prenom: true, poste: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST bulletin-paie:', error)
    return NextResponse.json({ error: 'Erreur lors de la génération du bulletin' }, { status: 500 })
  }
}
