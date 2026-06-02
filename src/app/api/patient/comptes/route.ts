import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telephone = searchParams.get('telephone')

    const where: Record<string, unknown> = {}
    if (telephone) where.telephone = telephone

    const data = await db.comptePatient.findMany({
      where,
      include: {
        patients: true,
        commandes: true,
        profilsFamille: true,
        vaccinations: { take: 5, orderBy: { dateVaccination: 'desc' } },
      },
      take: 100,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET comptes patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Handle family member addition
    if (body.type === 'ADD_FAMILY') {
      const { comptePatientId, nom, prenom, lienParente, dateNaissance } = body
      if (!comptePatientId || !nom || !prenom || !lienParente || !dateNaissance) {
        return NextResponse.json(
          { error: 'comptePatientId, nom, prenom, lienParente et dateNaissance requis' },
          { status: 400 }
        )
      }
      const profil = await db.profilFamille.create({
        data: {
          comptePatientId,
          nom,
          prenom,
          lienParente,
          dateNaissance: new Date(dateNaissance),
        },
      })
      return NextResponse.json(profil, { status: 201 })
    }

    // Default: create a new ComptePatient
    const data = await db.comptePatient.create({ data: body })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST compte patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la création' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nom, prenom, email, adresse, dateNaissance, sexe, telephone } = body

    if (!id) {
      return NextResponse.json({ error: 'id requis' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {}
    if (nom !== undefined) updateData.nom = nom
    if (prenom !== undefined) updateData.prenom = prenom
    if (email !== undefined) updateData.email = email
    if (adresse !== undefined) updateData.adresse = adresse
    if (dateNaissance !== undefined) updateData.dateNaissance = dateNaissance ? new Date(dateNaissance) : null
    if (sexe !== undefined) updateData.sexe = sexe
    if (telephone !== undefined) updateData.telephone = telephone

    const updated = await db.comptePatient.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Erreur PATCH compte patient:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}
