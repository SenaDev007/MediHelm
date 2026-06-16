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
    const plan = searchParams.get('plan') || ''
    const statut = searchParams.get('statut') || ''

    const where: Record<string, unknown> = {}

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { ville: { contains: search, mode: 'insensitive' } },
        { numeroAgrement: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (plan) {
      where.plan = plan
    }

    if (statut === 'actif') {
      where.actif = true
    } else if (statut === 'inactif') {
      where.actif = false
    }

    const [pharmacies, total] = await Promise.all([
      db.pharmacie.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { utilisateurs: true, medicaments: true } },
          abonnements: {
            where: { statut: 'ACTIF' },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      }),
      db.pharmacie.count({ where }),
    ])

    return NextResponse.json({
      data: pharmacies.map(p => ({
        id: p.id,
        nom: p.nom,
        slug: p.slug,
        plan: p.plan,
        actif: p.actif,
        ville: p.ville,
        numeroAgrement: p.numeroAgrement,
        nbUtilisateurs: p._count.utilisateurs,
        nbMedicaments: p._count.medicaments,
        abonnementActif: p.abonnements[0] || null,
        createdAt: p.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Erreur GET admin/officines:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des officines' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }

    const body = await request.json()
    const { id, action, plan } = body

    if (!id || !action) {
      return NextResponse.json({ error: 'ID et action requis' }, { status: 400 })
    }

    const pharmacie = await db.pharmacie.findUnique({ where: { id } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }

    switch (action) {
      case 'suspend':
        await db.pharmacie.update({ where: { id }, data: { actif: false } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'SUSPEND_PHARMACIE',
            entity: 'Pharmacie',
            entityId: id,
            details: `Pharmacie ${pharmacie.nom} suspendue`,
          },
        })
        return NextResponse.json({ success: true, message: 'Pharmacie suspendue' })

      case 'reactivate':
        await db.pharmacie.update({ where: { id }, data: { actif: true } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'REACTIVATE_PHARMACIE',
            entity: 'Pharmacie',
            entityId: id,
            details: `Pharmacie ${pharmacie.nom} réactivée`,
          },
        })
        return NextResponse.json({ success: true, message: 'Pharmacie réactivée' })

      case 'change_plan':
        if (!plan || !['SEED', 'BLOOM', 'CROWN', 'NETWORK'].includes(plan)) {
          return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
        }
        await db.pharmacie.update({ where: { id }, data: { plan: plan as string } })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'CHANGE_PLAN',
            entity: 'Pharmacie',
            entityId: id,
            details: `Plan changé de ${pharmacie.plan} vers ${plan} pour ${pharmacie.nom}`,
          },
        })
        return NextResponse.json({ success: true, message: `Plan changé vers ${plan}` })

      case 'reset_password': {
        const utilisateur = await db.utilisateur.findFirst({
          where: { pharmacieId: id, role: 'OWNER' },
        })
        if (!utilisateur) {
          return NextResponse.json({ error: 'Aucun utilisateur OWNER trouvé' }, { status: 404 })
        }
        const bcrypt = await import('bcryptjs')
        const tempPassword = `MH${Date.now().toString(36).toUpperCase()}`
        const hash = await bcrypt.hash(tempPassword, 10)
        await db.utilisateur.update({
          where: { id: utilisateur.id },
          data: { motDePasse: hash },
        })
        await db.auditLog.create({
          data: {
            userId: user.id,
            action: 'RESET_PASSWORD',
            entity: 'Utilisateur',
            entityId: utilisateur.id,
            details: `MDP réinitialisé pour OWNER de ${pharmacie.nom}`,
          },
        })
        return NextResponse.json({ success: true, message: 'Mot de passe réinitialisé', tempPassword })
      }

      default:
        return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur PATCH admin/officines:', error)
    return NextResponse.json({ error: 'Erreur lors de l\'action sur l\'officine' }, { status: 500 })
  }
}
