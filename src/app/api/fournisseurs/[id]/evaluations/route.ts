import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/api-auth'

// GET /api/fournisseurs/[id]/evaluations — Statistiques d'évaluation d'un fournisseur
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M04_FOURNISSEURS', 'read')
    if (authResult instanceof Response) return authResult
    const user = authResult
    const { id } = await params

    const fournisseur = await db.fournisseur.findUnique({
      where: { id },
    })

    if (!fournisseur || fournisseur.pharmacieId !== user.pharmacieId) {
      return NextResponse.json(
        { error: 'Fournisseur introuvable' },
        { status: 404 }
      )
    }

    // Statistiques des commandes
    const commandes = await db.commandeFournisseur.findMany({
      where: {
        fournisseurId: id,
        pharmacieId: user.pharmacieId,
      },
      select: {
        statut: true,
        montantTotal: true,
        dateLivraisonPrevue: true,
        dateLivraisonReelle: true,
        createdAt: true,
      },
    })

    const totalCommandes = commandes.length
    const commandesLivrees = commandes.filter(c => c.statut === 'LIVREE').length
    const commandesAnnulees = commandes.filter(c => c.statut === 'ANNULEE').length
    const montantTotal = commandes.reduce((sum, c) => sum + c.montantTotal, 0)

    // Taux de livraison à temps
    const livraisonsAvecDate = commandes.filter(
      c => c.statut === 'LIVREE' && c.dateLivraisonPrevue && c.dateLivraisonReelle
    )
    const livraisonsATemps = livraisonsAvecDate.filter(
      c => c.dateLivraisonReelle! <= c.dateLivraisonPrevue!
    ).length
    const tauxLivraisonATemps = livraisonsAvecDate.length > 0
      ? Math.round((livraisonsATemps / livraisonsAvecDate.length) * 100)
      : null

    return NextResponse.json({
      fournisseurId: id,
      note: fournisseur.note,
      totalCommandes,
      commandesLivrees,
      commandesAnnulees,
      montantTotal,
      tauxLivraisonATemps,
      repartitionStatuts: {
        BROUILLON: commandes.filter(c => c.statut === 'BROUILLON').length,
        ENVOYEE: commandes.filter(c => c.statut === 'ENVOYEE').length,
        CONFIRMEE: commandes.filter(c => c.statut === 'CONFIRMEE').length,
        EN_PREPARATION: commandes.filter(c => c.statut === 'EN_PREPARATION').length,
        LIVREE_PARTIELLEMENT: commandes.filter(c => c.statut === 'LIVREE_PARTIELLEMENT').length,
        LIVREE: commandesLivrees,
        ANNULEE: commandesAnnulees,
      },
    })
  } catch (error) {
    console.error('Erreur GET evaluations fournisseur:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des évaluations' },
      { status: 500 }
    )
  }
}
