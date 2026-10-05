import { NextResponse } from 'next/server'
import { db } from '@backend/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@backend/lib/api-auth'

/**
 * GET /api/grossistes/clients — Module G06 · Clients & Officines
 * Fiches clients avec encours de crédit CALCULÉ en temps réel :
 *   encours = Σ (commandes LIVREE/LIVREE_PARTIELLEMENT/EN_LIVRAISON) — montants payés
 * Alerte dépassement de plafond. Rapport par officine (historique, retards).
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_COMMERCIAL · GROSSISTE_COMPTABLE
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_COMMERCIAL',
    'GROSSISTE_COMPTABLE',
  ])
  if (moduleGuard) return moduleGuard

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = auth.grossisteId ?? searchParams.get('grossisteId')
    const guard = checkGrossisteAccess(auth, grossisteId)
    if (guard) return guard
    if (!grossisteId) {
      return NextResponse.json({ error: 'Paramètre grossisteId requis' }, { status: 400 })
    }

    // Fiches clients enrichies
    const fiches = await db.clientGrossiste.findMany({
      where: { grossisteId },
      include: { pharmacie: { select: { id: true, nom: true, ville: true, adresse: true, telephone: true } } },
      orderBy: { createdAt: 'desc' },
    })

    // Commandes non soldées du grossiste (pour encours + retards)
    const commandes = await db.commandeGrossiste.findMany({
      where: {
        grossisteId,
        pharmacieId: { not: null },
        statut: { in: ['LIVREE', 'LIVREE_PARTIELLEMENT', 'EN_LIVRAISON', 'LITIGE'] },
      },
      select: {
        pharmacieId: true,
        montantTotal: true,
        montantPaye: true,
        createdAt: true,
        statut: true,
      },
    })

    // Toutes les pharmacies clientes (avec ou sans fiche) — toute officine
    // ayant déjà commandé apparaît (fiche implicite)
    const pharmaAvecCommande = new Set(
      commandes.map((c) => c.pharmacieId).filter((id): id is string => id !== null)
    )
    const fichesIds = new Set(fiches.map((f) => f.pharmacieId))
    const implicites = [...pharmaAvecCommande].filter((id) => !fichesIds.has(id))

    const pharmaciesManquantes = implicites.length
      ? await db.pharmacie.findMany({
          where: { id: { in: implicites } },
          select: { id: true, nom: true, ville: true, adresse: true, telephone: true },
        })
      : []

    // Agrégat par pharmacie
    const statsParPharma = new Map<string, { ca: number; encours: number; nbCommandes: number; derniere: Date | null; enRetard: number }>()
    for (const c of commandes) {
      if (!c.pharmacieId) continue
      const s = statsParPharma.get(c.pharmacieId) ?? { ca: 0, encours: 0, nbCommandes: 0, derniere: null, enRetard: 0 }
      s.ca += c.montantTotal
      s.encours += Math.max(0, c.montantTotal - c.montantPaye)
      s.nbCommandes += 1
      if (!s.derniere || c.createdAt > s.derniere) s.derniere = c.createdAt
      // Retard : impayat > 30 jours
      if (c.montantTotal - c.montantPaye > 0 && Date.now() - c.createdAt.getTime() > 30 * 24 * 3600 * 1000) {
        s.enRetard += 1
      }
      statsParPharma.set(c.pharmacieId, s)
    }

    const clients = [
      ...fiches.map((f) => {
        const s = statsParPharma.get(f.pharmacieId) ?? { ca: 0, encours: 0, nbCommandes: 0, derniere: null, enRetard: 0 }
        return {
          id: f.id,
          pharmacie: f.pharmacie,
          conditionsPaiement: f.conditionsPaiement,
          creditPlafond: f.creditPlafond,
          remiseDefaut: f.remiseDefaut,
          actif: f.actif,
          notes: f.notes,
          implicite: false,
          ...s,
          depassementPlafond: f.creditPlafond > 0 && s.encours > f.creditPlafond,
        }
      }),
      ...pharmaciesManquantes.map((p) => {
        const s = statsParPharma.get(p.id) ?? { ca: 0, encours: 0, nbCommandes: 0, derniere: null, enRetard: 0 }
        return {
          id: null,
          pharmacie: p,
          conditionsPaiement: 'COMPTANT',
          creditPlafond: 0,
          remiseDefaut: 0,
          actif: true,
          notes: null,
          implicite: true,
          ...s,
          depassementPlafond: false,
        }
      }),
    ].sort((a, b) => b.ca - a.ca)

    const totalEncours = clients.reduce((s, c) => s + c.encours, 0)
    const totalCA = clients.reduce((s, c) => s + c.ca, 0)
    const totalPaye = commandes.reduce((s, c) => s + c.montantPaye, 0)

    return NextResponse.json({
      clients,
      stats: {
        nbClients: clients.length,
        totalCA: Math.round(totalCA),
        totalEncours: Math.round(totalEncours),
        tauxRecouvrement: totalCA > 0 ? Math.round((totalPaye / totalCA) * 1000) / 10 : 100,
        depassementsPlafond: clients.filter((c) => c.depassementPlafond).length,
        clientsEnRetard: clients.filter((c) => c.enRetard > 0).length,
      },
    })
  } catch (error) {
    console.error('Erreur GET clients grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des clients' }, { status: 500 })
  }
}

/**
 * POST /api/grossistes/clients — Créer / mettre à jour une fiche client (G06)
 * Body : { pharmacieId, conditionsPaiement?, creditPlafond?, remiseDefaut?, notes? }
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_COMMERCIAL · GROSSISTE_COMPTABLE
 */
export async function POST(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'write')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, [
    'GROSSISTE_ADMIN',
    'GROSSISTE_COMMERCIAL',
    'GROSSISTE_COMPTABLE',
  ])
  if (moduleGuard) return moduleGuard

  try {
    const body = await request.json()
    const { pharmacieId, conditionsPaiement, creditPlafond, remiseDefaut, notes } = body ?? {}

    if (!pharmacieId) {
      return NextResponse.json({ error: 'pharmacieId requis' }, { status: 400 })
    }
    if (conditionsPaiement && !['COMPTANT', '30_JOURS', '60_JOURS'].includes(conditionsPaiement)) {
      return NextResponse.json({ error: 'conditionsPaiement invalide' }, { status: 400 })
    }
    if (Number(creditPlafond) < 0 || Number(remiseDefaut) < 0 || Number(remiseDefaut) > 100) {
      return NextResponse.json({ error: 'Plafond ou remise invalide' }, { status: 400 })
    }

    const grossisteId = auth.grossisteId
    if (!grossisteId) {
      return NextResponse.json({ error: 'Compte non rattaché à un grossiste' }, { status: 403 })
    }

    const pharmacie = await db.pharmacie.findUnique({ where: { id: pharmacieId } })
    if (!pharmacie) {
      return NextResponse.json({ error: 'Pharmacie introuvable' }, { status: 404 })
    }

    const fiche = await db.clientGrossiste.upsert({
      where: { grossisteId_pharmacieId: { grossisteId, pharmacieId } },
      create: {
        grossisteId,
        pharmacieId,
        conditionsPaiement: conditionsPaiement ?? 'COMPTANT',
        creditPlafond: Number(creditPlafond) || 0,
        remiseDefaut: Number(remiseDefaut) || 0,
        notes: notes ?? null,
      },
      update: {
        conditionsPaiement: conditionsPaiement ?? undefined,
        creditPlafond: creditPlafond !== undefined ? Number(creditPlafond) : undefined,
        remiseDefaut: remiseDefaut !== undefined ? Number(remiseDefaut) : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { pharmacie: { select: { nom: true, ville: true } } },
    })

    return NextResponse.json(fiche, { status: 201 })
  } catch (error) {
    console.error('Erreur POST client grossiste:', error)
    return NextResponse.json({ error: 'Erreur lors de l’enregistrement de la fiche client' }, { status: 500 })
  }
}
