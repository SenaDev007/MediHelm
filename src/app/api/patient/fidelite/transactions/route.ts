import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET: List loyalty transactions for a patient
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult

    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    if (!patientId) {
      return NextResponse.json(
        { error: 'Le paramètre patientId est requis' },
        { status: 400 }
      )
    }

    // Get points history from CommandePatient records that have been delivered
    const commandes = await db.commandePatient.findMany({
      where: {
        patientId,
        statut: { in: ['LIVREE', 'DELIVREE', 'CONFIRMEE', 'PRETE'] },
      },
      select: {
        id: true,
        createdAt: true,
        montantTotal: true,
        statut: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build transactions from real order data
    const transactions = commandes.map((cmd) => ({
      id: cmd.id,
      type: 'GAGNE' as const,
      points: Math.floor(cmd.montantTotal / 100), // 1 point per 100 FCFA
      description: `Commande #${cmd.id.slice(-6).toUpperCase()}`,
      date: cmd.createdAt.toISOString(),
      commandeId: cmd.id,
    }))

    return NextResponse.json(transactions)
  } catch (error) {
    console.error('Erreur GET patient/fidelite/transactions:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des transactions' },
      { status: 500 }
    )
  }
}
