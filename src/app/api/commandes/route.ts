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

    const data = await db.commandeFournisseur.findMany({
      where,
      include: {
        fournisseur: true,
        lignes: { include: { medicament: true } },
        receptions: { include: { lignes: { include: { medicament: { select: { id: true, nomCommercial: true, dci: true } } } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET commandes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des commandes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { lignes, ...commandeData } = body

    const data = await db.commandeFournisseur.create({
      data: {
        ...commandeData,
        lignes: lignes ? { create: lignes } : undefined,
      },
      include: { lignes: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST commandes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la commande' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, statut, dateLivraisonPrev, dateLivraisonReelle, montantTotal, observations } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (statut !== undefined) updateData.statut = statut
    if (dateLivraisonPrev !== undefined) updateData.dateLivraisonPrev = dateLivraisonPrev ? new Date(dateLivraisonPrev) : null
    if (dateLivraisonReelle !== undefined) updateData.dateLivraisonReelle = dateLivraisonReelle ? new Date(dateLivraisonReelle) : null
    if (montantTotal !== undefined) updateData.montantTotal = montantTotal
    if (observations !== undefined) updateData.observations = observations

    const data = await db.commandeFournisseur.update({
      where: { id },
      data: updateData,
      include: { fournisseur: true, lignes: { include: { medicament: true } } },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH commandes:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour de la commande' }, { status: 500 })
  }
}
