import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.employe.findUnique({
      where: { id },
      include: {
        plannings: { orderBy: { date: 'desc' }, take: 10 },
        conges: { orderBy: { createdAt: 'desc' }, take: 10 },
        bulletinsPaie: { orderBy: [{ annee: 'desc' }, { mois: 'desc' }], take: 12 },
      },
    })
    if (!data) {
      return NextResponse.json({ error: 'Employé non trouvé' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET employé:', error)
    return NextResponse.json({ error: "Erreur lors de la récupération de l'employé" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data = await db.employe.update({
      where: { id },
      data: body,
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH employé:', error)
    return NextResponse.json({ error: "Erreur lors de la mise à jour de l'employé" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Soft delete: mark as inactive instead of actual deletion
    const data = await db.employe.update({
      where: { id },
      data: { actif: false },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur DELETE employé:', error)
    return NextResponse.json({ error: "Erreur lors de la suppression de l'employé" }, { status: 500 })
  }
}
