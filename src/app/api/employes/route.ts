import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import { validate, employeSchema } from '@/lib/validations'
import { rateLimit, RATE_LIMITS } from '@/lib/rate-limit'

// GET /api/employes — Liste des employés
export async function GET(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_GENERAL)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const poste = searchParams.get('poste')
    const actif = searchParams.get('actif')
    const typeContrat = searchParams.get('typeContrat')

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (actif !== null && actif !== undefined && actif !== '') {
      where.actif = actif === 'true'
    }

    if (poste) where.poste = { contains: poste, mode: 'insensitive' }
    if (typeContrat) where.typeContrat = typeContrat

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { poste: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.employe.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.employe.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET employes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des employés' },
      { status: 500 }
    )
  }
}

// POST /api/employes — Créer un nouvel employé
export async function POST(request: NextRequest) {
  const rateLimitResult = rateLimit(request, RATE_LIMITS.API_MUTATION)
  if (rateLimitResult) return rateLimitResult

  try {
    const authResult = await requireAuth(request, 'M07_RH', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    // Zod validation
    const validation = validate(employeSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: validation.errors.flatten() },
        { status: 400 }
      )
    }
    const validatedData = validation.data

    if (!validatedData.nom || !validatedData.prenom) {
      return NextResponse.json(
        { error: 'Le nom et le prénom sont requis' },
        { status: 400 }
      )
    }

    if (!validatedData.dateEmbauche) {
      return NextResponse.json(
        { error: 'La date d\'embauche est requise' },
        { status: 400 }
      )
    }

    const data = await db.employe.create({
      data: {
        pharmacieId: user.pharmacieId,
        nom: validatedData.nom,
        prenom: validatedData.prenom,
        poste: validatedData.poste || '',
        telephone: validatedData.telephone || null,
        email: validatedData.email || null,
        typeContrat: validatedData.typeContrat || 'CDI',
        salaireBrut: validatedData.salaireBrut || 0,
        dateEmbauche: new Date(validatedData.dateEmbauche),
        actif: body.actif !== undefined ? body.actif : true,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST employes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'employé' },
      { status: 500 }
    )
  }
}
