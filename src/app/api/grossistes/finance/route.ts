import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * GET /api/grossistes/finance — Module G09 · Finance & Facturation
 * Tableau de bord : CA mensuel, créances en cours, taux de recouvrement,
 * commandes du mois + rapport mensuel par officine (historique, montants, retards).
 * Query : ?grossisteId= · ?mois=YYYY-MM (défaut : mois courant)
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_COMPTABLE (CDC §3 — G09)
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_COMPTABLE'])
  if (moduleGuard) return moduleGuard

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = auth.grossisteId ?? searchParams.get('grossisteId')
    const guard = checkGrossisteAccess(auth, grossisteId)
    if (guard) return guard
    if (!grossisteId) {
      return NextResponse.json({ error: 'Paramètre grossisteId requis' }, { status: 400 })
    }

    // Période : mois demandé ou mois courant
    const moisParam = searchParams.get('mois') // YYYY-MM
    const base = moisParam ? new Date(moisParam + '-01T00:00:00') : new Date()
    if (isNaN(base.getTime())) {
      return NextResponse.json({ error: 'Paramètre mois invalide (YYYY-MM)' }, { status: 400 })
    }
    const debutMois = new Date(base.getFullYear(), base.getMonth(), 1)
    const finMois = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)

    // ── KPI du mois ──
    const commandesMois = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        createdAt: { gte: debutMois, lte: finMois },
        statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT', 'EN_LIVRAISON', 'CONFIRMEE', 'EN_PREPARATION'] },
      },
      select: { montantTotal: true, montantPaye: true, pharmacieId: true, createdAt: true },
    })

    const caMois = commandesMois.reduce((s, c) => s + c.montantTotal, 0)
    const payeMois = commandesMois.reduce((s, c) => s + c.montantPaye, 0)

    // ── Créances globales (toutes périodes, non soldées) ──
    const nonSoldees = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT', 'EN_LIVRAISON', 'LITIGE'] },
      },
      select: {
        id: true,
        reference: true,
        pharmacieId: true,
        montantTotal: true,
        montantPaye: true,
        createdAt: true,
        statut: true,
      },
    })

    const totalFacture = nonSoldees.reduce((s, c) => s + c.montantTotal, 0)
    const totalPaye = nonSoldees.reduce((s, c) => s + c.montantPaye, 0)
    const creances = Math.max(0, totalFacture - totalPaye)

    // ── Rapport mensuel par officine ──
    const pharmaIds = [...new Set(nonSoldees.map((c) => c.pharmacieId).filter(Boolean))] as string[]
    const pharmacies = pharmaIds.length
      ? await db.pharmacie.findMany({
          where: { id: { in: pharmaIds } },
          select: { id: true, nom: true, ville: true },
        })
      : []
    const pharmaMap = new Map(pharmacies.map((p) => [p.id, p]))

    const parOfficine = new Map<
      string,
      { pharmacie: { id: string; nom: string; ville: string | null }; commandes: number; impayes: number; enRetard: number; montantDu: number; derniereCommande: Date | null }
    >()

    for (const c of nonSoldees) {
      if (!c.pharmacieId) continue
      const ph = pharmaMap.get(c.pharmacieId)
      const entry =
        parOfficine.get(c.pharmacieId) ??
        {
          pharmacie: { id: c.pharmacieId, nom: ph?.nom ?? 'Officine', ville: ph?.ville ?? null },
          commandes: 0,
          impayes: 0,
          enRetard: 0,
          montantDu: 0,
          derniereCommande: null as Date | null,
        }
      entry.commandes += 1
      const du = Math.max(0, c.montantTotal - c.montantPaye)
      if (du > 0) {
        entry.impayes += 1
        entry.montantDu += du
        if (Date.now() - c.createdAt.getTime() > 30 * 24 * 3600 * 1000) entry.enRetard += 1
      }
      if (!entry.derniereCommande || c.createdAt > entry.derniereCommande) entry.derniereCommande = c.createdAt
      parOfficine.set(c.pharmacieId, entry)
    }

    // ── Tendance 6 derniers mois ──
    const debut6 = new Date(debutMois)
    debut6.setMonth(debut6.getMonth() - 5)
    const commandes6 = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        createdAt: { gte: debut6 },
        statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT', 'EN_LIVRAISON', 'CONFIRMEE', 'EN_PREPARATION'] },
      },
      select: { montantTotal: true, createdAt: true },
    })
    const tendance: Array<{ mois: string; ca: number }> = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(debutMois)
      d.setMonth(d.getMonth() - i)
      const debut = new Date(d.getFullYear(), d.getMonth(), 1)
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const ca = commandes6
        .filter((c) => c.createdAt >= debut && c.createdAt <= fin)
        .reduce((s, c) => s + c.montantTotal, 0)
      tendance.push({
        mois: `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`,
        ca: Math.round(ca),
      })
    }

    return NextResponse.json({
      periode: { debut: debutMois.toISOString(), fin: finMois.toISOString() },
      kpi: {
        caMois: Math.round(caMois),
        creances: Math.round(creances),
        tauxRecouvrement: totalFacture > 0 ? Math.round((totalPaye / totalFacture) * 1000) / 10 : 100,
        commandesMois: commandesMois.length,
        encaisseMois: Math.round(payeMois),
      },
      rapportOfficines: Array.from(parOfficine.values()).sort((a, b) => b.montantDu - a.montantDu),
      tendance,
    })
  } catch (error) {
    console.error('Erreur GET finance grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors du calcul des indicateurs financiers' }, { status: 500 })
  }
}
