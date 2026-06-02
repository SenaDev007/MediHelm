import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

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
