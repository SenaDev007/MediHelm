import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request, 'M14_DASHBOARD', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult

    // Total pharmacies
    const totalPharmacies = await db.pharmacie.count()
    const pharmaciesActives = await db.pharmacie.count({ where: { actif: true } })

    // Pharmacies par plan
    const pharmaciesParPlan = await db.pharmacie.groupBy({
      by: ['plan'],
      _count: { plan: true },
    })

    // Grossistes
    const totalGrossistes = await db.grossiste.count()
    const grossistesActifs = await db.grossiste.count({ where: { actif: true } })

    // Utilisateurs
    const totalUtilisateurs = await db.utilisateur.count()
    const utilisateursParRole = await db.utilisateur.groupBy({
      by: ['role'],
      _count: { role: true },
    })

    // Abonnements
    const abonnementsActifs = await db.abonnement.count({ where: { statut: 'ACTIF' } })
    const abonnementsExpires = await db.abonnement.count({ where: { statut: 'EXPIRE' } })
    const abonnementsSuspendus = await db.abonnement.count({ where: { statut: 'SUSPENDU' } })

    // Revenu mensuel (somme des abonnements actifs)
    const abonnementsActifsData = await db.abonnement.findMany({
      where: { statut: 'ACTIF' },
      select: { montant: true },
    })
    const revenuMensuel = abonnementsActifsData.reduce((sum, a) => sum + a.montant, 0)

    // Alertes DPMED
    const alertesDPMED = await db.alerteDPMED.count()
    const alertesDPMEDEnDiffusion = await db.alerteDPMED.count({ where: { statut: 'EN_DIFFUSION' } })
    const alertesDPMEDRecentes = await db.alerteDPMED.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: { select: { diffusions: true } },
      },
    })

    // Audit logs récents
    const recentAudits = await db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    // Santé système
    const sante = {
      api: 'OPÉRATIONNEL' as const,
      db: 'CONNECTÉ' as const,
      storage: 'NORMAL' as const,
    }

    try {
      await db.$queryRaw`SELECT 1`
    } catch {
      sante.db = 'ERREUR' as never
    }

    return NextResponse.json({
      pharmacies: {
        total: totalPharmacies,
        actives: pharmaciesActives,
        parPlan: pharmaciesParPlan.map(p => ({ plan: p.plan, count: p._count.plan })),
      },
      grossistes: {
        total: totalGrossistes,
        actifs: grossistesActifs,
      },
      utilisateurs: {
        total: totalUtilisateurs,
        parRole: utilisateursParRole.map(u => ({ role: u.role, count: u._count.role })),
      },
      abonnements: {
        actifs: abonnementsActifs,
        expires: abonnementsExpires,
        suspendus: abonnementsSuspendus,
        revenuMensuel,
      },
      alertesDPMED: {
        total: alertesDPMED,
        enDiffusion: alertesDPMEDEnDiffusion,
        recentes: alertesDPMEDRecentes.map(a => ({
          id: a.id,
          titre: a.titre,
          typeAlerte: a.typeAlerte,
          niveauUrgence: a.niveauUrgence,
          statut: a.statut,
          nbDiffusions: a._count.diffusions,
          createdAt: a.createdAt,
        })),
      },
      recentAudits: recentAudits.map(a => ({
        id: a.id,
        userId: a.userId,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        details: a.details,
        createdAt: a.createdAt,
      })),
      sante,
    })
  } catch (error) {
    console.error('Erreur GET admin/dashboard:', error)
    return NextResponse.json({ error: 'Erreur lors de la récupération du dashboard admin' }, { status: 500 })
  }
}
