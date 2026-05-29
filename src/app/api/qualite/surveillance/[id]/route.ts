import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.medicamentSurveillance.findUnique({
      where: { id },
      include: { signalementsEI: true, alertesDPMED: true },
    })
    if (!data) return NextResponse.json({ error: 'Surveillance non trouvée' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET surveillance:', error)
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
    const data = await db.medicamentSurveillance.update({ where: { id }, data: body })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur PATCH surveillance:', error)
    return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.medicamentSurveillance.delete({ where: { id } })
    return NextResponse.json({ message: 'Surveillance supprimée' })
  } catch (error) {
    console.error('Erreur DELETE surveillance:', error)
    return NextResponse.json({ error: 'Erreur lors de la suppression' }, { status: 500 })
  }
}
