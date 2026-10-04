import { DataPage } from '../../components/data-page'

export default function SoBapsConfirmationsPage() {
  return <DataPage
    eyebrow="SoBAPS · lecture seule"
    title="Confirmations et litiges"
    description="Historique des confirmations de réception et des écarts soumis par les officines."
    endpoint="/api/institutionnel/sobaps/confirmations?page=1&pageSize=100"
    columns={[
      { label: 'Référence BL', key: 'referenceBL' },
      { label: 'Officine', key: 'pharmacie.nom' },
      { label: 'Ville', key: 'pharmacie.ville' },
      { label: 'Statut', key: 'statut' },
      { label: 'Confirmé le', key: 'confirmeLe' },
      { label: 'Écarts déclarés', key: 'ecarts' },
    ]}
  />
}
