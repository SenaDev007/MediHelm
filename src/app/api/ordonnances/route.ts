import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, ordonnanceSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const pharmacieId = user.pharmacieId
    const { searchParams } = new URL(request.url)
    const statut = searchParams.get('statut')
    const patientId = searchParams.get('patientId')

    const where: Record<string, unknown> = { pharmacieId }
    if (statut) where.statut = statut
    if (patientId) where.patientId = patientId

    const data = await db.ordonnance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        patient: { select: { id: true, nom: true, prenom: true } },
        lignes: {
          select: {
            id: true,
            dci: true,
            posologie: true,
            quantite: true,
            delivree: true,
            medicamentId: true,
          },
        },
      },
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('Erreur GET ordonnances:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des ordonnances' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M06_ORDONNANCES', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult
    if (user.roleName === 'PATIENT') {
      return NextResponse.json({ error: 'Utilisez le portail patient pour téléverser une ordonnance' }, { status: 403 })
    }
    if (!user.pharmacieId) return NextResponse.json({ error: 'Tenant utilisateur manquant' }, { status: 403 })

    const body = await request.json()

    // Zod validation
    const validation = validate(ordonnanceSchema, body)
    if (!validation.success) {
      return NextResponse.json({ error: 'Données invalides', details: validation.errors.flatten() }, { status: 400 })
    }
    const validatedData = validation.data

    if (validatedData.patientId) {
      const patient = await db.patient.findFirst({
        where: { id: validatedData.patientId, pharmacieId: user.pharmacieId },
        select: { id: true },
      })
      if (!patient) return NextResponse.json({ error: 'Patient non trouvé dans votre pharmacie' }, { status: 404 })
    }

    // Enforce pharmacieId from authenticated user
    const { lignes, ...ordonnanceData } = validatedData
    const data = await db.ordonnance.create({
      data: {
        ...ordonnanceData,
        pharmacieId: user.pharmacieId,
        lignes: {
          create: lignes.map(ligne => ({
            dci: ligne.dci,
            posologie: ligne.posologie || null,
            quantite: ligne.quantite ?? 1,
            delivree: false,
          })),
        },
      },
      include: { lignes: true },
    })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST ordonnances:', error)
    return NextResponse.json(
      { error: "Erreur lors de la création de l'ordonnance" },
      { status: 500 }
    )
  }
}
