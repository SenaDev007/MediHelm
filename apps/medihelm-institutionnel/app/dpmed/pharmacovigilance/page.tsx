import { DataPage } from '../../components/data-page'

export default function PharmacovigilancePage() {
  return <DataPage
    eyebrow="DPMED · M16"
    title="Pharmacovigilance"
    description="Métadonnées des signalements soumis par les officines; les narratifs cliniques libres et toute identité patient sont volontairement exclus de cette vue tant qu’un pipeline de pseudonymisation n’est pas validé."
    endpoint="/api/institutionnel/dpmed/signalements-ei?page=1&pageSize=100"
    columns={[
      { label: 'Réf. officine pseudonymisée', key: 'referenceOfficineAnonyme' },
      { label: 'DCI', key: 'dciConcernee' },
      { label: 'Gravité', key: 'gravite' },
      { label: 'Début', key: 'dateDebut' },
      { label: 'État', key: 'statutEnvoi' },
      { label: 'Référence DPMED', key: 'refDPMED' },
      { label: 'Créé le', key: 'createdAt' },
    ]}
  />
}
