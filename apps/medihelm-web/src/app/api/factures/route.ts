import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/factures — Liste des factures (ventes VALIDEE) pour la pharmacie
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const modePaiement = searchParams.get('modePaiement')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {
      pharmacieId,
      statut: 'VALIDEE',
    }

    if (dateDebut || dateFin) {
      where.createdAt = {
        ...(dateDebut ? { gte: new Date(dateDebut) } : {}),
        ...(dateFin ? { lte: new Date(dateFin + 'T23:59:59.999Z') } : {}),
      }
    }

    if (modePaiement) {
      where.modePaiement = modePaiement
    }

    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { patient: { nom: { contains: search, mode: 'insensitive' } } },
        { patient: { prenom: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.vente.findMany({
        where,
        include: {
          patient: { select: { id: true, nom: true, prenom: true, telephone: true } },
          lignes: {
            include: {
              medicament: { select: { id: true, nomCommercial: true, dci: true } },
            },
          },
          paiements: true,
          utilisateur: { select: { id: true, nom: true, prenom: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.vente.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Erreur GET factures:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des factures' },
      { status: 500 }
    )
  }
}

// POST /api/factures — Générer une facture à partir d'une vente
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M08_FINANCE', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()
    const { venteId } = body

    if (!venteId) {
      return NextResponse.json(
        { error: 'L\'identifiant de la vente est requis' },
        { status: 400 }
      )
    }

    const vente = await db.vente.findUnique({
      where: { id: venteId },
      include: {
        patient: true,
        lignes: {
          include: {
            medicament: { select: { id: true, nomCommercial: true, dci: true, prixPublic: true } },
          },
        },
        paiements: true,
        utilisateur: { select: { id: true, nom: true, prenom: true } },
        pharmacie: { select: { id: true, nom: true, adresse: true, ville: true, telephone: true, email: true } },
      },
    })

    if (!vente) {
      return NextResponse.json(
        { error: 'Vente introuvable' },
        { status: 404 }
      )
    }

    if (vente.pharmacieId !== pharmacieId) {
      return NextResponse.json(
        { error: 'Accès refusé. Cette vente n\'appartient pas à votre pharmacie.' },
        { status: 403 }
      )
    }

    if (vente.statut !== 'VALIDEE') {
      return NextResponse.json(
        { error: 'Seule une vente validée peut être facturée' },
        { status: 400 }
      )
    }

    // Générer les données de facture
    const facture = {
      id: vente.id,
      reference: `FAC-${vente.reference}`,
      dateFacture: new Date().toISOString(),
      pharmacie: vente.pharmacie,
      patient: vente.patient
        ? {
            nom: vente.patient.nom,
            prenom: vente.patient.prenom,
            telephone: vente.patient.telephone,
          }
        : null,
      lignes: vente.lignes.map((l) => ({
        medicament: l.medicament.nomCommercial,
        dci: l.medicament.dci,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        prixTotal: l.prixTotal,
        remise: l.remise,
      })),
      montantTotal: vente.montantTotal,
      montantPaye: vente.montantPaye,
      montantAssur: vente.montantAssur,
      remise: vente.remise,
      modePaiement: vente.modePaiement,
      paiements: vente.paiements,
      vendeur: vente.utilisateur
        ? `${vente.utilisateur.prenom} ${vente.utilisateur.nom}`
        : null,
    }

    return NextResponse.json(facture, { status: 201 })
  } catch (error) {
    console.error('Erreur POST factures:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la génération de la facture' },
      { status: 500 }
    )
  }
}
