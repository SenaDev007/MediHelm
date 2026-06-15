import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'
import bcrypt from 'bcryptjs'

// GET /api/utilisateurs — Liste des utilisateurs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const actif = searchParams.get('actif')
    const search = searchParams.get('search') || ''

    const where: Record<string, unknown> = {
      pharmacieId: user.pharmacieId,
    }

    if (role) where.role = role
    if (actif !== null && actif !== undefined && actif !== '') {
      where.actif = actif === 'true'
    }

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await Promise.all([
      db.utilisateur.findMany({
        where,
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          telephone: true,
          actif: true,
          avatarUrl: true,
          dernierLogin: true,
          createdAt: true,
          updatedAt: true,
          pharmacieId: true,
          // Exclure motDePasse
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.utilisateur.count({ where }),
    ])

    return NextResponse.json({
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    })
  } catch (error) {
    console.error('Erreur GET utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des utilisateurs' },
      { status: 500 }
    )
  }
}

// POST /api/utilisateurs — Créer un utilisateur
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'write')
    if (authResult instanceof Response) return authResult
    const user = authResult

    const body = await request.json()

    if (!body.email || !body.nom || !body.prenom || !body.motDePasse) {
      return NextResponse.json(
        { error: 'L\'email, le nom, le prénom et le mot de passe sont requis' },
        { status: 400 }
      )
    }

    // Vérifier si l'email existe déjà
    const existing = await db.utilisateur.findUnique({
      where: { email: body.email },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Un utilisateur avec cet email existe déjà' },
        { status: 409 }
      )
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(body.motDePasse, 10)

    const data = await db.utilisateur.create({
      data: {
        pharmacieId: user.pharmacieId,
        email: body.email,
        nom: body.nom,
        prenom: body.prenom,
        role: body.role || 'PHARMACIEN',
        motDePasse: hashedPassword,
        telephone: body.telephone || null,
        actif: body.actif !== undefined ? body.actif : true,
        avatarUrl: body.avatarUrl || null,
      },
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        role: true,
        telephone: true,
        actif: true,
        avatarUrl: true,
        createdAt: true,
        pharmacieId: true,
      },
    })

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Erreur POST utilisateurs:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'utilisateur' },
      { status: 500 }
    )
  }
}
