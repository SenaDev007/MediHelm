import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/api-auth'

// GET /api/qualite/dci/[dci] — Détails d'une DCI spécifique
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dci: string }> }
) {
  try {
    const authResult = await requireAuth(request, 'M16_PHARMACOVIGILANCE', 'read')
    if (authResult instanceof Response) return authResult

    const user = authResult
    const { dci } = await params
    const dciDecoded = decodeURIComponent(dci)

    // Trouver tous les médicaments avec cette DCI
    const medicaments = await db.medicament.findMany({
      where: {
        pharmacieId: user.pharmacieId,
        dci: { equals: dciDecoded, mode: 'insensitive' },
        actif: true,
      },
      include: {
        surveillances: {
          where: { statut: 'ACTIVE' },
        },
        lots: {
          where: { quantite: { gt: 0 } },
          orderBy: { dateExpiration: 'asc' },
          take: 5,
        },
      },
      orderBy: { nomCommercial: 'asc' },
    })

    if (medicaments.length === 0) {
      return NextResponse.json(
        { error: `Aucun médicament trouvé avec la DCI "${dciDecoded}".` },
        { status: 404 }
      )
    }

    // Vérifier le statut de surveillance
    const surveillances = await db.medicamentSurveillance.findMany({
      where: {
        dci: { equals: dciDecoded, mode: 'insensitive' },
        statut: 'ACTIVE',
      },
    })

    // Vérifier les alertes DPMED pour cette DCI
    const alertesDPMED = await db.alerteDPMED.findMany({
      where: {
        dciConcernee: { equals: dciDecoded, mode: 'insensitive' },
        statut: 'EN_DIFFUSION',
      },
      orderBy: { dateEmissionDPMED: 'desc' },
      take: 5,
    })

    // Informations de posologie simplifiées
    const posologies = medicaments.map((med) => ({
      nomCommercial: med.nomCommercial,
      forme: med.forme,
      dosage: med.dosage,
      surOrdonnance: med.surOrdonnance,
      estStupefiant: med.estStupefiant,
      prixPublic: med.prixPublic,
      remboursable: med.remboursable,
      generique: med.generique,
    }))

    // Contre-indications simplifiées (données statiques pour les DCI courantes)
    const contreIndications = getContreIndications(dciDecoded)

    // Interactions médicamenteuses connues (simplifié)
    const interactions = getInteractions(dciDecoded)

    return NextResponse.json({
      dci: dciDecoded,
      medicaments: posologies,
      surveillance: surveillances.length > 0
        ? surveillances.map((s) => ({
            id: s.id,
            typeSurveillance: s.typeSurveillance,
            niveauRisque: s.niveauRisque,
            description: s.description,
            dateEmission: s.dateEmission,
            sourceAlerte: s.sourceAlerte,
          }))
        : null,
      alertesDPMED: alertesDPMED.map((a) => ({
        id: a.id,
        reference: a.referenceOfficielle,
        titre: a.titre,
        typeAlerte: a.typeAlerte,
        niveauUrgence: a.niveauUrgence,
        dateEmission: a.dateEmissionDPMED,
      })),
      contreIndications,
      interactions,
      lotsDisponibles: medicaments.flatMap((med) =>
        med.lots.map((lot) => ({
          medicamentNom: med.nomCommercial,
          numeroLot: lot.numeroLot,
          quantite: lot.quantite,
          dateExpiration: lot.dateExpiration,
        }))
      ),
    })
  } catch (error) {
    console.error('Erreur lors de la récupération des détails DCI:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des détails de la DCI.' },
      { status: 500 }
    )
  }
}

// Données statiques simplifiées pour les contre-indications courantes
function getContreIndications(dci: string): string[] {
  const ciMap: Record<string, string[]> = {
    'paracetamol': ['Insuffisance hépatique sévère', 'Alcoolisme chronique'],
    'ibuprofene': ['Ulcère gastro-duodénal en évolution', 'Insuffisance rénale sévère', 'Grossesse 3e trimestre'],
    'amoxicilline': ['Allergie aux pénicillines', 'Mononucléose infectieuse'],
    'metformine': ['Insuffisance rénale sévère', 'Acidose métabolique', 'Alcoolisme aigu'],
    'omeprazole': ['Hypersensibilité aux inhibiteurs de pompe à protons'],
    'aspirine': ['Ulcère gastro-duodénal en évolution', 'Enfant < 16 ans (syndrome de Reye)', 'Grossesse 3e trimestre'],
    'ciprofloxacine': ['Enfant et adolescent en croissance', 'Épilepsie', 'Tendinite'],
    'diclofenac': ['Ulcère gastro-duodénal', 'Insuffisance hépatique sévère', 'Insuffisance cardiaque'],
    'azithromycine': ['Allergie aux macrolides', 'Allongement de l\'intervalle QT'],
    'prednisone': ['Infection non contrôlée', 'Psychose', 'Vaccination vivante'],
  }
  const dciLower = dci.toLowerCase()
  for (const [key, values] of Object.entries(ciMap)) {
    if (dciLower.includes(key)) return values
  }
  return ['Consultez la notice officielle du médicament']
}

// Données statiques simplifiées pour les interactions médicamenteuses
function getInteractions(dci: string): { dci: string; niveau: string; description: string }[] {
  const intMap: Record<string, { dci: string; niveau: string; description: string }[]> = {
    'paracetamol': [
      { dci: 'warfarine', niveau: 'MODERE', description: 'Risque hémorragique augmenté à doses élevées de paracétamol' },
      { dci: 'carbamazepine', niveau: 'FAIBLE', description: 'Diminution de l\'efficacité du paracétamol' },
    ],
    'ibuprofene': [
      { dci: 'aspirine', niveau: 'ELEVE', description: 'Risque ulcérogène majoré, diminution de l\'effet antiagrégant de l\'aspirine' },
      { dci: 'methotrexate', niveau: 'CRITIQUE', description: 'Augmentation de la toxicité du méthotrexate' },
      { dci: 'lithium', niveau: 'ELEVE', description: 'Augmentation de la lithémie' },
    ],
    'metformine': [
      { dci: 'produits de contraste iodes', niveau: 'CRITIQUE', description: 'Risque d\'acidose lactique — arrêter la metformine 48h avant' },
    ],
    'omeprazole': [
      { dci: 'clopidogrel', niveau: 'ELEVE', description: 'Diminution de l\'efficacité du clopidogrel' },
      { dci: 'methotrexate', niveau: 'ELEVE', description: 'Augmentation de la toxicité du méthotrexate' },
    ],
    'aspirine': [
      { dci: 'ibuprofene', niveau: 'ELEVE', description: 'Risque ulcérogène majoré' },
      { dci: 'methotrexate', niveau: 'CRITIQUE', description: 'Augmentation de la toxicité du méthotrexate' },
      { dci: 'warfarine', niveau: 'CRITIQUE', description: 'Risque hémorragique majoré' },
    ],
  }
  const dciLower = dci.toLowerCase()
  for (const [key, values] of Object.entries(intMap)) {
    if (dciLower.includes(key)) return values
  }
  return []
}
