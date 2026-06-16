import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/institutions/stats — Public stats for the institution landing page
export async function GET() {
  try {
    // Fetch real counts from the database
    const [
      totalPharmacies,
      totalAlertes,
      totalDiffusions,
      totalMedicaments,
    ] = await Promise.all([
      db.pharmacie.count({ where: { actif: true } }),
      db.alerteDpmed.count(),
      db.diffusionAlerte.count(),
      db.medicament.count({ where: { actif: true } }),
    ])

    // Calculate acquittal rate
    const acquittees = await db.diffusionAlerte.count({
      where: { statut: 'ACQUITTEE' },
    })

    const tauxAcquittement = totalDiffusions > 0
      ? Math.round((acquittees / totalDiffusions) * 100)
      : 0

    // Institutional partners (static config — these are official names)
    const partenaires = [
      {
        name: 'DPMED',
        full: 'Direction de la Pharmacie et du Médicament',
        desc: 'Autorité réglementaire pour la sécurité pharmaceutique',
        href: '/institutions/dpmed',
      },
      {
        name: 'SoBAPS',
        full: "Société Béninoise d'Approvisionnement Pharmaceutique",
        desc: 'Approvisionnement et logistique pharmaceutique nationale',
        href: '/institutions/sobaps',
      },
      {
        name: 'ABRP',
        full: 'Association Béninoise des Pharmaciens',
        desc: 'Représentation professionnelle des pharmaciens',
        href: '/institutions/abrp',
      },
    ]

    return NextResponse.json({
      stats: {
        totalPharmacies: totalPharmacies || 0,
        totalAlertes: totalAlertes || 0,
        tauxAcquittement,
        totalMedicaments: totalMedicaments || 0,
      },
      partenaires,
    })
  } catch (error) {
    console.error('Erreur GET institutions stats:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des statistiques' },
      { status: 500 }
    )
  }
}
