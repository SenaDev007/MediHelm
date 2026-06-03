import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { db } from '@/lib/db'
import { exportToExcel } from '@/lib/excel'

// GET /api/exports/stock — Export stock to Excel with lot-level detail
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request, 'M01_STOCK', 'read')
  if (authResult instanceof Response) return authResult

  try {
    const pharmacieId = request.nextUrl.searchParams.get('pharmacieId')
    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const medicaments = await db.medicament.findMany({
      where: { pharmacieId, actif: true },
      include: { lots: { orderBy: { dateExpiration: 'asc' } } },
      orderBy: { nomCommercial: 'asc' },
    })

    // Flatten to lot-level rows as per spec
    const data = medicaments.flatMap(med => {
      if (med.lots.length === 0) {
        return [{
          'Nom Commercial': med.nomCommercial,
          'DCI': med.dci,
          'Forme': med.forme,
          'Dosage': med.dosage,
          'Prix Vente': med.prixVente,
          'Stock Min': med.stockMin,
          'Lot N°': '-',
          'Qté Lot': 0,
          'Date Expiration': '-',
        }]
      }
      return med.lots.map(lot => ({
        'Nom Commercial': med.nomCommercial,
        'DCI': med.dci,
        'Forme': med.forme,
        'Dosage': med.dosage,
        'Prix Vente': med.prixVente,
        'Stock Min': med.stockMin,
        'Lot N°': lot.numeroLot,
        'Qté Lot': lot.quantite,
        'Date Expiration': new Date(lot.dateExpiration).toLocaleDateString('fr-FR'),
      }))
    })

    const buffer = exportToExcel(data, 'Stock')

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="stock-${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    })
  } catch (error) {
    console.error('Erreur export stock:', error)
    return NextResponse.json({ error: "Erreur lors de l'export" }, { status: 500 })
  }
}
