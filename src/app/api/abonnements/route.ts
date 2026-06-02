import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')

    const where = pharmacieId ? { pharmacieId } : {}
    const data = await db.abonnement.findMany({
      where,
      include: { factures: true, options: true },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET abonnements:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.abonnement.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST abonnement:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, plan, periode, prix, debut, fin, statut, modePaiement, essaiActif } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (plan !== undefined) updateData.plan = plan
    if (periode !== undefined) updateData.periode = periode
    if (prix !== undefined) updateData.prix = prix
    if (debut !== undefined) updateData.debut = debut ? new Date(debut) : undefined
    if (fin !== undefined) updateData.fin = fin ? new Date(fin) : null
    if (statut !== undefined) updateData.statut = statut
    if (modePaiement !== undefined) updateData.modePaiement = modePaiement
    if (essaiActif !== undefined) updateData.essaiActif = essaiActif

    const updated = await db.abonnement.update({
      where: { id },
      data: updateData,
      include: { factures: true, options: true },
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH abonnement:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
