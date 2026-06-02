import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { exportToExcel } from '@/lib/excel'

// GET /api/exports/ventes — Export ventes to Excel with date range filter
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'M02_POS', 'read')
  if (authResult instanceof Response) return authResult

  try {
    const pharmacieId = request.nextUrl.searchParams.get('pharmacieId')
    const dateDebut = request.nextUrl.searchParams.get('dateDebut')
    const dateFin = request.nextUrl.searchParams.get('dateFin')

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const where: Record<string, unknown> = { pharmacieId }
    if (dateDebut || dateFin) {
      const dateFilter: Record<string, Date> = {}
      if (dateDebut) dateFilter.gte = new Date(dateDebut)
      if (dateFin) dateFilter.lte = new Date(dateFin)
      where.createdAt = dateFilter
    }

    const ventes = await db.vente.findMany({
      where,
      include: {
        paiements: true,
        patient: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    })

    const data = ventes.map(v => ({
      'Date': new Date(v.createdAt).toLocaleDateString('fr-FR'),
      'Type': v.typeVente,
      'Statut': v.statut,
      'Montant Total (FCFA)': v.montantTotal,
      'Mode Paiement': v.paiements.map(p => p.modePaiement).join(', '),
      'Patient': v.patient ? `${v.patient.prenom} ${v.patient.nom}` : 'Comptoir',
    }))

    const buffer = exportToExcel(data, 'Ventes')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="ventes-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Erreur export ventes:', error)
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 })
  }
}
