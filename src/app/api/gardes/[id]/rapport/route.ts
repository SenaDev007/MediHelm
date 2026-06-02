import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { pharmacieId, pharmacienId, nbVentes, chiffreAffaires, incidents } = body

    if (!pharmacieId || !pharmacienId) {
      return NextResponse.json({ error: 'pharmacieId et pharmacienId requis' }, { status: 400 })
    }

    // Vérifier que le planning de garde existe
    const planning = await db.planningGarde.findUnique({ where: { id } })
    if (!planning) {
      return NextResponse.json({ error: 'Planning de garde non trouvé' }, { status: 404 })
    }

    // Vérifier qu'un rapport n'existe pas déjà
    const existing = await db.rapportGarde.findUnique({ where: { planningGardeId: id } })
    if (existing) {
      return NextResponse.json({ error: 'Un rapport existe déjà pour cette garde' }, { status: 400 })
    }

    const data = await db.rapportGarde.create({
      data: {
        pharmacieId,
        planningGardeId: id,
        pharmacienId,
        nbVentes: nbVentes || 0,
        chiffreAffaires: chiffreAffaires || 0,
        incidents: incidents || null,
      },
      include: { planningGarde: true, pharmacien: { select: { nom: true, prenom: true } } },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST rapport garde:', error)
    return NextResponse.json({ error: 'Erreur lors de la création du rapport' }, { status: 500 })
  }
}
