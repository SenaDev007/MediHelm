import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/conformite/exports/stupefiants — Export du registre des stupéfiants
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M19_CONFORMITE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { searchParams } = new URL(request.url)

    // Paramètres de période
    const dateDebut = searchParams.get('dateDebut')
      ? new Date(searchParams.get('dateDebut')!)
      : new Date(new Date().getFullYear(), 0, 1) // Début d'année par défaut
    const dateFin = searchParams.get('dateFin')
      ? new Date(searchParams.get('dateFin')!)
      : new Date() // Aujourd'hui par défaut

    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const skip = (page - 1) * limit

    // Récupérer les documents de type REGISTRE_STUPEFIANTS pour la période
    const where = {
      pharmacieId: user.pharmacieId,
      type: 'REGISTRE_STUPEFIANTS' as const,
      createdAt: { gte: dateDebut, lte: dateFin },
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.document.count({ where }),
    ])

    // Récupérer les mouvements de stock pour les stupéfiants dans la période
    const medicamentsStup = await db.medicament.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        estStupefiant: true,
        actif: true,
      },
      select: { id: true, dci: true, nomCommercial: true, forme: true, dosage: true },
    })

    const stupIds = medicamentsStup.map((m) => m.id)

    const mouvements = await db.mouvementStock.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        medicamentId: { in: stupIds },
        createdAt: { gte: dateDebut, lte: dateFin },
      },
      include: {
        medicament: {
          select: { dci: true, nomCommercial: true, forme: true, dosage: true, estStupefiant: true },
        },
        lot: {
          select: { numeroLot: true, dateExpiration: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculer les statistiques du registre
    const entrees = mouvements.filter((m) => m.type === 'ENTREE')
    const sorties = mouvements.filter((m) => m.type === 'SORTIE')
    const destructions = mouvements.filter((m) => m.type === 'DESTRUCTION')

    const totalEntrees = entrees.reduce((sum, m) => sum + m.quantite, 0)
    const totalSorties = sorties.reduce((sum, m) => sum + m.quantite, 0)
    const totalDestructions = destructions.reduce((sum, m) => sum + m.quantite, 0)

    // Stock actuel des stupéfiants
    const stockActuel = await db.lot.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        quantite: { gt: 0 },
        medicament: { estStupefiant: true, actif: true },
      },
      include: {
        medicament: {
          select: { dci: true, nomCommercial: true, forme: true, dosage: true },
        },
      },
      orderBy: { dateExpiration: 'asc' },
    })

    return NextResponse.json({
      periode: {
        dateDebut,
        dateFin,
      },
      pharmacieId: user.pharmacieId,
      registres: {
        total: documents.length,
        data: documents.map((d) => ({
          id: d.id,
          titre: d.titre,
          statut: d.statut,
          fichierUrl: d.fichierUrl,
          dateValidite: d.dateValidite,
          createdAt: d.createdAt,
        })),
      },
      mouvements: {
        total: mouvements.length,
        entrees: { count: entrees.length, quantite: totalEntrees },
        sorties: { count: sorties.length, quantite: totalSorties },
        destructions: { count: destructions.length, quantite: totalDestructions },
        data: mouvements.map((m) => ({
          id: m.id,
          date: m.createdAt,
          type: m.type,
          dci: m.medicament?.dci,
          nomCommercial: m.medicament?.nomCommercial,
          forme: m.medicament?.forme,
          dosage: m.medicament?.dosage,
          numeroLot: m.lot?.numeroLot,
          dateExpiration: m.lot?.dateExpiration,
          quantite: m.quantite,
          motif: m.motif,
          reference: m.reference,
        })),
      },
      stockActuel: {
        total: stockActuel.length,
        data: stockActuel.map((l) => ({
          dci: l.medicament.dci,
          nomCommercial: l.medicament.nomCommercial,
          forme: l.medicament.forme,
          dosage: l.medicament.dosage,
          numeroLot: l.numeroLot,
          quantite: l.quantite,
          dateExpiration: l.dateExpiration,
        })),
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      dateGeneration: new Date(),
    })
  } catch (error) {
    console.error('Erreur lors de l\'export du registre des stupéfiants:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'export du registre des stupéfiants.' },
      { status: 500 }
    )
  }
}
