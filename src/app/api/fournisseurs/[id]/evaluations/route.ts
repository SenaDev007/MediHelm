import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()

    const evaluation = await db.evaluationFournisseur.create({
      data: {
        fournisseurId: id,
        pharmacieId: body.pharmacieId,
        delaiRespecte: body.delaiRespecte,
        qualiteProduit: body.qualiteProduit,
        communication: body.communication,
        commentaire: body.commentaire || null,
      },
    })

    // Recalculate average note for the fournisseur
    const evaluations = await db.evaluationFournisseur.findMany({
      where: { fournisseurId: id },
    })
    const avgNote = evaluations.reduce((sum, e) => {
      return sum + (e.delaiRespecte + e.qualiteProduit + e.communication) / 3
    }, 0) / evaluations.length

    await db.fournisseur.update({
      where: { id },
      data: { noteEvaluation: Math.round(avgNote * 100) / 100 },
    })

    return NextResponse.json(evaluation, { status: 201 })
  } catch (error) {
    console.error('Erreur POST evaluation:', error)
    return NextResponse.json({ error: "Erreur lors de la création de l'évaluation" }, { status: 500 })
  }
}
