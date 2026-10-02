import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/exports/stock — Export des données de stock pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M01_STOCK', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json ou csv
    const categorie = searchParams.get('categorie')
    const search = searchParams.get('search')
    const alerteOnly = searchParams.get('alerteOnly') === 'true'

    const where: Record<string, unknown> = { pharmacieId, actif: true }

    if (categorie) {
      where.categorieAtc = categorie
    }

    if (search) {
      where.OR = [
        { nomCommercial: { contains: search, mode: 'insensitive' } },
        { dci: { contains: search, mode: 'insensitive' } },
        { codeBarres: { contains: search } },
      ]
    }

    const medicaments = await db.medicament.findMany({
      where,
      include: {
        lots: {
          where: { pharmacieId },
          orderBy: { dateExpiration: 'asc' },
        },
        alertesStock: {
          where: alerteOnly ? { pharmacieId } : undefined,
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { nomCommercial: 'asc' },
    })

    // Calculer les données d'export avec stock total et CMUP
    const exportData = medicaments.map((med) => {
      const stockTotal = med.lots.reduce((sum, lot) => sum + lot.quantite, 0)
      const stockValeur = med.lots.reduce((sum, lot) => sum + lot.quantite * lot.prixAchat, 0)
      const quantiteInitialeTotale = med.lots.reduce((sum, lot) => sum + lot.quantiteInitiale, 0)

      // CMUP = Valeur totale stock / Quantité totale stock
      const cmup = stockTotal > 0 ? stockValeur / stockTotal : 0

      const lotsProchesExpiration = med.lots.filter((lot) => {
        const daysUntilExpiry = Math.ceil(
          (new Date(lot.dateExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
        return daysUntilExpiry <= 90 && daysUntilExpiry > 0
      })

      return {
        id: med.id,
        dci: med.dci,
        nomCommercial: med.nomCommercial,
        forme: med.forme,
        dosage: med.dosage,
        categorieAtc: med.categorieAtc,
        prixPublic: med.prixPublic,
        prixAvantRemise: med.prixAvantRemise,
        estStupefiant: med.estStupefiant,
        surOrdonnance: med.surOrdonnance,
        remboursable: med.remboursable,
        generique: med.generique,
        codeBarres: med.codeBarres,
        stock: {
          total: stockTotal,
          valeur: stockValeur,
          cmup,
          quantiteInitialeTotale,
          stockMinimum: med.stockMinimum,
          stockSecurite: med.stockSecurite,
          enAlerte: stockTotal <= med.stockMinimum,
        },
        lots: med.lots.map((lot) => ({
          id: lot.id,
          numeroLot: lot.numeroLot,
          quantite: lot.quantite,
          quantiteInitiale: lot.quantiteInitiale,
          prixAchat: lot.prixAchat,
          dateExpiration: lot.dateExpiration,
          dateReception: lot.dateReception,
          joursAvantExpiration: Math.ceil(
            (new Date(lot.dateExpiration).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        })),
        lotsProchesExpiration: lotsProchesExpiration.length,
        alertes: med.alertesStock,
      }
    })

    if (format === 'csv') {
      const headers = [
        'ID',
        'DCI',
        'Nom Commercial',
        'Forme',
        'Dosage',
        'Catégorie ATC',
        'Prix Public',
        'Stock Total',
        'Valeur Stock',
        'CMUP',
        'Stock Minimum',
        'En Alerte',
        'Stupéfiant',
        'Sur Ordonnance',
        'Remboursable',
        'Code Barres',
      ]

      const rows = exportData.map((m) => [
        m.id,
        `"${m.dci}"`,
        `"${m.nomCommercial}"`,
        m.forme,
        `"${m.dosage}"`,
        m.categorieAtc || '',
        m.prixPublic.toString(),
        m.stock.total.toString(),
        m.stock.valeur.toFixed(2),
        m.stock.cmup.toFixed(2),
        m.stock.stockMinimum.toString(),
        m.stock.enAlerte ? 'OUI' : 'NON',
        m.estStupefiant ? 'OUI' : 'NON',
        m.surOrdonnance ? 'OUI' : 'NON',
        m.remboursable ? 'OUI' : 'NON',
        m.codeBarres || '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.join(',')),
      ].join('\n')

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="stock_${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Résumé
    const resume = {
      totalMedicaments: exportData.length,
      totalStockUnites: exportData.reduce((sum, m) => sum + m.stock.total, 0),
      valeurTotaleStock: exportData.reduce((sum, m) => sum + m.stock.valeur, 0),
      medicamentsEnAlerte: exportData.filter((m) => m.stock.enAlerte).length,
      lotsProchesExpiration: exportData.reduce((sum, m) => sum + m.lotsProchesExpiration, 0),
      stupéfiants: exportData.filter((m) => m.estStupefiant).length,
    }

    return NextResponse.json({
      data: exportData,
      resume,
      exportedAt: new Date().toISOString(),
      pharmacieId,
    })
  } catch (error) {
    console.error('Erreur GET exports/stock:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export des données de stock' },
      { status: 500 }
    )
  }
}
