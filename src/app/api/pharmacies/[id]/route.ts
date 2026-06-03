import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.pharmacie.findUnique({
      where: { id },
      include: {
        scoreConformite: true,
        _count: { select: { utilisateurs: true } },
      },
    })
    if (!data) {
      return NextResponse.json({ error: 'Pharmacie non trouvée' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET pharmacie:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'nom', 'adresse', 'ville', 'departement', 'telephone', 'email',
      'numeroAgrement', 'latitude', 'longitude', 'logoUrl', 'sousDomaine',
      'plan', 'statutAbonnement', 'periodeFacturation', 'nbUtilisateursMax',
      'nbCaissiersSimut', 'nbPatientsMax', 'stockageDocuments', 'apiGrossistesMax',
    ]

    const updateData: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const updated = await db.pharmacie.update({
      where: { id },
      data: updateData,
    })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH pharmacie:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
