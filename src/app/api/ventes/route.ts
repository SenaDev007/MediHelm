import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const pharmacieId = searchParams.get('pharmacieId')
    const statut = searchParams.get('statut')
    const modePaiement = searchParams.get('modePaiement')
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }

    const where: Record<string, unknown> = { pharmacieId }

    if (statut) {
      where.statut = statut
    }
    if (modePaiement) {
      where.modePaiement = modePaiement
    }
    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { patient: { nom: { contains: search, mode: 'insensitive' } } },
        { patient: { prenom: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit
    const orderBy: Record<string, string> = {}
    if (sortBy === 'montantTotal') {
      orderBy.montantTotal = sortOrder
    } else {
      orderBy.createdAt = sortOrder
    }

    const [ventes, total] = await Promise.all([
      db.vente.findMany({
        where,
        include: {
          patient: { select: { id: true, nom: true, prenom: true, telephone: true } },
          lignes: { include: { medicament: { select: { id: true, nomCommercial: true, dci: true } } } },
          paiements: true,
          utilisateur: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.vente.count({ where }),
    ])

    // Stats du jour
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const ventesJour = await db.vente.findMany({
      where: {
        pharmacieId,
        statut: { in: ['VALIDEE', 'EN_COURS'] },
        createdAt: { gte: todayStart },
      },
      select: { montantTotal: true, statut: true },
    })

    const caDuJour = ventesJour.reduce((sum, v) => sum + v.montantTotal, 0)
    const nbVentesJour = ventesJour.length
    const panierMoyen = nbVentesJour > 0 ? caDuJour / nbVentesJour : 0

    const ventesEnAttente = await db.vente.count({
      where: { pharmacieId, statut: 'BROUILLON' },
    })

    return NextResponse.json({
      ventes,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        caDuJour,
        nbVentesJour,
        panierMoyen,
        ventesEnAttente,
      },
    })
  } catch (error) {
    console.error('Erreur GET ventes:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des ventes' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pharmacieId, patientId, lignes, modePaiement, utilisateurId, remise, sessionId, paiements } = body

    if (!pharmacieId || !lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'pharmacieId et lignes sont requis' }, { status: 400 })
    }

    // Generate reference
    const now = new Date()
    const count = await db.vente.count({
      where: {
        pharmacieId,
        createdAt: {
          gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        },
      },
    })
    const reference = `VTE-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`

    // Calculate totals
    let montantTotal = 0
    const ligneData: Array<{ medicamentId: string; lotId: string | null; quantite: number; prixUnitaire: number; prixTotal: number; remise: number }> = []

    for (const ligne of lignes) {
      const medicament = await db.medicament.findUnique({
        where: { id: ligne.medicamentId },
      })
      if (!medicament) {
        return NextResponse.json({ error: `Médicament ${ligne.medicamentId} non trouvé` }, { status: 400 })
      }

      const prixUnitaire = ligne.prixUnitaire || medicament.prixPublic
      const ligneRemise = ligne.remise || 0
      const prixTotal = prixUnitaire * ligne.quantite - ligneRemise
      montantTotal += prixTotal

      ligneData.push({
        medicamentId: ligne.medicamentId,
        lotId: ligne.lotId || null,
        quantite: ligne.quantite,
        prixUnitaire,
        prixTotal,
        remise: ligneRemise,
      })
    }

    const totalRemise = remise || 0
    montantTotal -= totalRemise
    if (montantTotal < 0) montantTotal = 0

    // Build payment records — support split payments
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paiementRecords: any[] = []
    if (paiements && Array.isArray(paiements) && paiements.length > 0) {
      for (const p of paiements) {
        paiementRecords.push({
          montant: p.montant,
          mode: p.mode || 'ESPECES',
          reference: p.reference || null,
          statut: 'REUSSI',
        })
      }
    } else {
      paiementRecords.push({
        montant: montantTotal,
        mode: modePaiement || 'ESPECES',
        statut: 'REUSSI',
      })
    }

    const vente = await db.vente.create({
      data: {
        pharmacieId,
        utilisateurId: utilisateurId || null,
        patientId: patientId || null,
        sessionId: sessionId || null,
        reference,
        modePaiement: modePaiement || (paiements?.[0]?.mode as string) || 'ESPECES',
        montantTotal,
        montantPaye: paiementRecords.reduce((s, p) => s + p.montant, 0),
        remise: totalRemise,
        statut: 'VALIDEE',
        lignes: {
          create: ligneData,
        },
        paiements: {
          create: paiementRecords,
        },
      },
      include: {
        patient: true,
        lignes: { include: { medicament: true } },
        paiements: true,
      },
    })

    // Update stock for each medication line
    for (const ligne of ligneData) {
      // Find best lot (earliest expiration with stock)
      if (ligne.lotId) {
        await db.lot.update({
          where: { id: ligne.lotId },
          data: { quantite: { decrement: ligne.quantite } },
        })
      } else {
        // Auto-pick earliest expiring lot
        const lot = await db.lot.findFirst({
          where: {
            medicamentId: ligne.medicamentId,
            pharmacieId,
            quantite: { gte: ligne.quantite },
          },
          orderBy: { dateExpiration: 'asc' },
        })
        if (lot) {
          await db.lot.update({
            where: { id: lot.id },
            data: { quantite: { decrement: ligne.quantite } },
          })
        }
      }
    }

    return NextResponse.json(vente, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ventes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la vente' }, { status: 500 })
  }
}
