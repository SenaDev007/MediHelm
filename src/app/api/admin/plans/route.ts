import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user || user.roleName !== 'PLATFORM_ADMIN') {
      return NextResponse.json({ error: 'Accès refusé. Réservé aux administrateurs plateforme.' }, { status: 403 })
    }

    // Abonnements par plan
    const abonnementsParPlan = await db.abonnement.groupBy({
      by: ['plan'],
      _count: { plan: true },
      _sum: { montant: true },
      where: { statut: 'ACTIF' },
    })

    // Statistiques globales
    const totalActifs = await db.abonnement.count({ where: { statut: 'ACTIF' } })
    const totalExpires = await db.abonnement.count({ where: { statut: 'EXPIRE' } })
    const totalSuspendus = await db.abonnement.count({ where: { statut: 'SUSPENDU' } })

    // Revenu par mois (6 derniers mois)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const abonnementsRecent = await db.abonnement.findMany({
      where: {
        statut: 'ACTIF',
        createdAt: { gte: sixMonthsAgo },
      },
      select: { montant: true, createdAt: true },
    })

    const revenueByMonth = new Map<string, number>()
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const key = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      revenueByMonth.set(key, 0)
    }
    for (const a of abonnementsRecent) {
      const key = new Date(a.createdAt).toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      if (revenueByMonth.has(key)) {
        revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + a.montant)
      }
    }

    // Abonnements expirant bientôt (dans les 30 prochains jours)
    const now = new Date()
    const in30Days = new Date()
    in30Days.setDate(in30Days.getDate() + 30)

    const expiringSoon = await db.abonnement.findMany({
      where: {
        statut: 'ACTIF',
        dateFin: { lte: in30Days, gte: now },
      },
      include: {
        pharmacie: {
          select: { id: true, nom: true, plan: true, ville: true },
        },
      },
      orderBy: { dateFin: 'asc' },
      take: 20,
    })

    // Revenu total actuel
    const abonnementsActifs = await db.abonnement.findMany({
      where: { statut: 'ACTIF' },
      select: { montant: true },
    })
    const revenuTotal = abonnementsActifs.reduce((sum, a) => sum + a.montant, 0)

    return NextResponse.json({
      stats: {
        totalActifs,
        totalExpires,
        totalSuspendus,
        revenuTotal,
      },
      parPlan: abonnementsParPlan.map(p => ({
        plan: p.plan,
        count: p._count.plan,
        revenu: p._sum.montant || 0,
      })),
      revenueByMonth: Array.from(revenueByMonth.entries()).map(([mois, revenu]) => ({ mois, revenu })),
      expiringSoon: expiringSoon.map(a => ({
        id: a.id,
        plan: a.plan,
        montant: a.montant,
        dateFin: a.dateFin,
        type: a.type,
        pharmacie: a.pharmacie,
      })),
    })
  } catch (error) {
    console.error('Erreur GET admin/plans:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération des plans' }, { status: 500 })
  }
}
