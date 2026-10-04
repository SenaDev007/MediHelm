import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth, checkGrossisteAccess, requireGrossisteModule } from '@/lib/api-auth'

/**
 * GET /api/grossistes/picking — Module G04 · Bons de picking en attente / prêts
 * Rôles : GROSSISTE_ADMIN · GROSSISTE_PREPARATEUR
 */
export async function GET(request: Request) {
  const auth = await requireAuth(request, 'M17_GROSSISTES', 'read')
  if (auth instanceof Response) return auth

  const moduleGuard = requireGrossisteModule(auth, ['GROSSISTE_ADMIN', 'GROSSISTE_PREPARATEUR'])
  if (moduleGuard) return moduleGuard

  try {
    const { searchParams } = new URL(request.url)
    const grossisteId = auth.grossisteId ?? searchParams.get('grossisteId')
    const guard = checkGrossisteAccess(auth, grossisteId)
    if (guard) return guard
    if (!grossisteId) {
      return NextResponse.json({ error: 'Paramètre grossisteId requis' }, { status: 400 })
    }

    const statut = searchParams.get('statut') ?? undefined

    const bons = await db.bonPicking.findMany({
      where: {
        commande: { grossisteId },
        ...(statut ? { statut } : {}),
      },
      include: {
        commande: {
          select: {
            id: true,
            reference: true,
            statut: true,
            montantTotal: true,
            pharmacieId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Enrichit avec les infos officine (le préparateur doit savoir pour qui il prépare)
    const pharmaIds = [...new Set(bons.map((b) => b.commande.pharmacieId).filter(Boolean))] as string[]
    const pharmacies = await db.pharmacie.findMany({
      where: { id: { in: pharmaIds } },
      select: { id: true, nom: true, ville: true, adresse: true },
    })
    const pharmaMap = new Map(pharmacies.map((p) => [p.id, p]))

    const enriched = bons.map((b) => {
      const ph = b.commande.pharmacieId ? pharmaMap.get(b.commande.pharmacieId) : null
      const lignes = JSON.parse(b.lignes) as Array<Record<string, unknown>>
      return {
        ...b,
        lignes,
        pharmacie: ph ? { nom: ph.nom, ville: ph.ville, adresse: ph.adresse } : null,
        nbLignes: lignes.length,
      }
    })

    return NextResponse.json({
      bons: enriched,
      stats: {
        enAttente: bons.filter((b) => b.statut === 'EN_ATTENTE').length,
        prets: bons.filter((b) => b.statut === 'PRET').length,
      },
    })
  } catch (error) {
    console.error('Erreur GET picking:', error)
    return NextResponse.json({ error: 'Erreur lors du chargement des bons de picking' }, { status: 500 })
  }
}
