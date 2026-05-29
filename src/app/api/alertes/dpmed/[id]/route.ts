import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const data = await db.alerteDPMED.findUnique({
      where: { id },
      include: {
        medicamentSurv: true,
        diffusions: { include: { pharmacie: true } },
      },
    })
    if (!data) return NextResponse.json({ error: 'Alerte non trouvée' }, { status: 404 })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET alerte DPMED:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération' }, { status: 500 })
  }
}
