import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (statut) where.statut = statut

    const data = await db.creditPatient.findMany({
      where,
      include: { patient: { select: { id: true, nom: true, prenom: true, telephone: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET credits:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des crédits' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { patientId, pharmacieId, montant, dateEcheance } = body

    if (!patientId || !pharmacieId || !montant || !dateEcheance) {
      return NextResponse.json({ error: 'patientId, pharmacieId, montant et dateEcheance requis' }, { status: 400 })
    }

    const data = await db.creditPatient.create({
      data: {
        patientId,
        pharmacieId,
        montant: parseFloat(String(montant)),
        montantPaye: 0,
        statut: 'EN_COURS',
        dateEcheance: new Date(dateEcheance),
      },
      include: { patient: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST credits:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du crédit' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id requis (query param)' }, { status: 400 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.montantPaye !== undefined) updateData.montantPaye = parseFloat(String(body.montantPaye))
    if (body.statut !== undefined) updateData.statut = body.statut

    const updated = await db.creditPatient.update({
      where: { id },
      data: updateData,
      include: { patient: { select: { id: true, nom: true, prenom: true } } },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH credits:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du crédit' }, { status: 500 })
  }
}
