import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, venteSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'
import { executerVente, genererReferenceVente } from '@/lib/ventes'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M02_POS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const modePaiement = searchParams.get('modePaiement')
    const search = searchParams.get('search')
    const dateDebut = searchParams.get('dateDebut')
    const dateFin = searchParams.get('dateFin')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

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
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M02_POS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()

    // Zod validation
    const validation = validate(venteSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors.flatten() }, { status: 400 })
    }
    const validatedData = validation.data

    const { patientId, lignes, modePaiement, remise, sessionId, paiements, ordonnanceId } = { ...body, ...validatedData }

    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'lignes sont requises' }, { status: 400 })
    }

    // Vérification du patient (isolation par pharmacie)
    if (patientId) {
      const patient = await db.patient.findFirst({
        where: { id: patientId, pharmacieId },
        select: { id: true },
      })
      if (!patient) {
        return NextResponse.json({ error: 'Patient non trouvé dans cette pharmacie' }, { status: 400 })
      }
    }

    const reference = await genererReferenceVente(pharmacieId)

    const resultat = await executerVente({
      pharmacieId,
      utilisateurId: user.id,
      lignes,
      modePaiement,
      reference,
      patientId,
      ordonnanceId,
      sessionId,
      remise,
      paiements,
    })

    if (!resultat.ok) {
      return NextResponse.json({ error: resultat.error }, { status: resultat.status })
    }
    return NextResponse.json(resultat.vente, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ventes:', error)
    return NextResponse.json({ error: 'Erreur lors de la création de la vente' }, { status: 500 })
  }
}
