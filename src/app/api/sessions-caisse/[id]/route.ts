import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { ecart, soldePhysique } = body

    // Récupérer la session avec ses ventes
    const session = await db.sessionCaisse.findUnique({
      where: { id },
      include: {
        ventes: { where: { statut: 'VALIDEE' }, select: { montantTotal: true } },
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Session non trouvée' }, { status: 404 })
    }

    if (session.dateFermeture) {
      return NextResponse.json({ error: 'Session déjà fermée' }, { status: 400 })
    }

    const totalVentes = session.ventes.reduce((s, v) => s + v.montantTotal, 0)
    const totalEntrees = totalVentes
    const totalSorties = 0

    // Calculate ecart: (fondDeCaisse + totalEntrees) - totalSorties - soldePhysique
    // Or use the provided ecart value
    let calculatedEcart: number
    let soldePhysiqueFinal: number | undefined

    if (soldePhysique !== undefined && soldePhysique !== null) {
      soldePhysiqueFinal = soldePhysique
      const soldeTheorique = session.fondDeCaisse + totalEntrees - totalSorties
      calculatedEcart = soldeTheorique - soldePhysique
    } else {
      calculatedEcart = ecart || 0
    }

    // Z-Report data
    const zReport = {
      sessionId: id,
      fondDeCaisse: session.fondDeCaisse,
      totalEntrees,
      totalSorties,
      totalVentes,
      ecart: calculatedEcart,
      soldePhysique: soldePhysiqueFinal,
      theorique: session.fondDeCaisse + totalEntrees - totalSorties,
      dateFermeture: new Date().toISOString(),
    }

    const data = await db.sessionCaisse.update({
      where: { id },
      data: {
        dateFermeture: new Date(),
        totalEntrees,
        totalSorties,
        ecart: calculatedEcart,
      },
      include: {
        caisse: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        ventes: { select: { id: true, montantTotal: true, statut: true } },
      },
    })

    return NextResponse.json({ ...data, zReport })
  } catch (error) {
    console.error('Erreur PATCH session-caisse:', error)
    return NextResponse.json({ error: "Erreur lors de la fermeture de session" }, { status: 500 })
  }
}
