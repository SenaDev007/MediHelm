import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}
    if (pharmacieId) where.pharmacieId = pharmacieId
    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ]
    }

    const data = await db.patient.findMany({
      where,
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET patients:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des patients' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = await db.patient.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patients:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du patient' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const body = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'id requis (query param)' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    const allowedFields = [
      'nom', 'prenom', 'dateNaissance', 'sexe', 'telephone', 'email',
      'adresse', 'numeroCNSS', 'organismeAssurance', 'numeroAssurance',
      'compteMedihelmId', 'allergies', 'antecedents', 'notes', 'estFidele',
      'pointsFidelite', 'pharmacieId',
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    const updated = await db.patient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH patients:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour du patient' }, { status: 500 })
  }
}
