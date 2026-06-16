import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const statut = searchParams.get('statut') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (role) {
      where.role = role
    }

    if (statut === 'actif') {
      where.actif = true
    } else if (statut === 'inactif') {
      where.actif = false
    }

    const [utilisateurs, total] = await Promise.all([
      db.utilisateur.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pharmacie: {
            select: { id: true, nom: true, ville: true },
          },
        },
      }),
      db.utilisateur.count({ where }),
    ])

    return NextResponse.json({
      data: utilisateurs.map(u => ({
        id: u.id,
        nom: u.nom,
        prenom: u.prenom,
        email: u.email,
        role: u.role,
        actif: u.actif,
        telephone: u.telephone,
        dernierLogin: u.dernierLogin,
        pharmacie: u.pharmacie,
        createdAt: u.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET admin/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des utilisateurs' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, role } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID et action requis' }, { status: 400 })
    }

    const utilisateur = await db.utilisateur.findUnique({ where: { id } })
    if (!utilisateur) {
      return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    }

    switch (action) {
      case 'deactivate':
        await db.utilisateur.update({ where: { id }, data: { actif: false } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'DEACTIVATE_USER',
            entity: 'Utilisateur',
            entityId: id,
            details: `Utilisateur ${utilisateur.prenom} ${utilisateur.nom} désactivé`,
          },
        })
        return NextResponse.json({ success: true, message: 'Utilisateur désactivé' })

      case 'activate':
        await db.utilisateur.update({ where: { id }, data: { actif: true } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'ACTIVATE_USER',
            entity: 'Utilisateur',
            entityId: id,
            details: `Utilisateur ${utilisateur.prenom} ${utilisateur.nom} activé`,
          },
        })
        return NextResponse.json({ success: true, message: 'Utilisateur activé' })

      case 'change_role': {
        if (!role) {
          return NextResponse.json({ error: 'Rôle requis' }, { status: 400 })
        }
        await db.utilisateur.update({ where: { id }, data: { role: role as string } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'CHANGE_USER_ROLE',
            entity: 'Utilisateur',
            entityId: id,
            details: `Rôle changé de ${utilisateur.role} vers ${role} pour ${utilisateur.prenom} ${utilisateur.nom}`,
          },
        })
        return NextResponse.json({ success: true, message: `Rôle changé vers ${role}` })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH admin/utilisateurs:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'action sur l\'utilisateur' }, { status: 500 })
  }
}
