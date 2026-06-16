import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, patientSchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const actif = searchParams.get('actif')
    const assurance = searchParams.get('assurance')
    const creditStatus = searchParams.get('creditStatus')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'nom'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    const where: Record<string, unknown> = { pharmacieId }

    if (actif !== null && actif !== undefined && actif !== '') {
      where.actif = actif === 'true'
    }

    if (assurance) {
      where.assurance = assurance
    }

    if (creditStatus === 'autorise') {
      where.creditAutorise = true
    } else if (creditStatus === 'non_autorise') {
      where.creditAutorise = false
    } else if (creditStatus === 'limite_atteinte') {
      where.creditAutorise = true
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { numeroAssurance: { contains: search } },
      ]
    }

    const skip = (page - 1) * limit
    const orderBy: Record<string, string> = {}
    if (sortBy === 'nom') {
      orderBy.nom = sortOrder
    } else if (sortBy === 'prenom') {
      orderBy.prenom = sortOrder
    } else if (sortBy === 'createdAt') {
      orderBy.createdAt = sortOrder
    } else {
      orderBy.nom = 'asc'
    }

    const [patients, total] = await Promise.all([
      db.patient.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          _count: {
            select: { ventes: true, ordonnances: true, vaccinations: true },
          },
        },
      }),
      db.patient.count({ where }),
    ])

    // Calculate credit used for each patient
    const patientsWithCredit = await Promise.all(
      patients.map(async (patient) => {
        const unpaidVentes = await db.vente.findMany({
          where: {
            patientId: patient.id,
            pharmacieId,
            modePaiement: 'CREDIT',
            statut: { in: ['VALIDEE', 'EN_COURS'] },
          },
          select: { montantTotal: true, montantPaye: true },
        })
        const creditUtilise = unpaidVentes.reduce(
          (sum, v) => sum + (v.montantTotal - v.montantPaye),
          0
        )
        return { ...patient, creditUtilise }
      })
    )

    // Stats
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const [totalActifs, patientsAvecAssurance, creditsEnCours, nouveauxMois] =
      await Promise.all([
        db.patient.count({ where: { pharmacieId, actif: true } }),
        db.patient.count({
          where: { pharmacieId, assurance: { not: null } },
        }),
        (async () => {
          const creditPatients = await db.patient.findMany({
            where: { pharmacieId, creditAutorise: true },
            select: { id: true },
          })
          let totalCredit = 0
          for (const p of creditPatients) {
            const ventes = await db.vente.findMany({
              where: {
                patientId: p.id,
                pharmacieId,
                modePaiement: 'CREDIT',
                statut: { in: ['VALIDEE', 'EN_COURS'] },
              },
              select: { montantTotal: true, montantPaye: true },
            })
            totalCredit += ventes.reduce(
              (sum, v) => sum + (v.montantTotal - v.montantPaye),
              0
            )
          }
          return totalCredit
        })(),
        db.patient.count({
          where: { pharmacieId, createdAt: { gte: monthStart } },
        }),
      ])

    return NextResponse.json({
      patients: patientsWithCredit,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalActifs,
        patientsAvecAssurance,
        creditsEnCours,
        nouveauxMois,
      },
    })
  } catch (error) {
    console.error('Erreur GET patients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des patients' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M05_PATIENTS', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const body = await request.json()

    // Zod validation
    const validation = validate(patientSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.flatten() },
        { status: 400 }
      )
    }
    const validatedData = validation.data

    const { nom, prenom, telephone } = validatedData

    if (!nom || !prenom) {
      return NextResponse.json(
        { error: 'nom et prenom sont requis' },
        { status: 400 }
      )
    }

    const patient = await db.patient.create({
      data: {
        pharmacieId,
        nom,
        prenom,
        telephone: telephone || '',
        email: body.email || null,
        dateNaissance: body.dateNaissance ? new Date(body.dateNaissance) : null,
        sexe: body.sexe || null,
        numeroAssurance: body.numeroAssurance || null,
        assurance: body.assurance || null,
        adresse: body.adresse || null,
        notes: body.notes || null,
        creditAutorise: body.creditAutorise ?? false,
        creditLimite: body.creditLimite ?? 0,
      },
    })

    return NextResponse.json(patient, { status: 201 })
  } catch (error) {
    console.error('Erreur POST patients:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création du patient' },
      { status: 500 }
    )
  }
}
