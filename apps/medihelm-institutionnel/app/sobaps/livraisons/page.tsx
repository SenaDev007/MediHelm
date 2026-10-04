import { DataPage } from '../../components/data-page'

export default function SoBapsDeliveriesPage() {
  return <DataPage
    eyebrow="SoBAPS · lecture seule"
    title="Livraisons"
    description="Réceptions et lignes logistiques transmises par les officines, sans données commerciales ou patients."
    endpoint="/api/institutionnel/sobaps/livraisons?page=1&pageSize=100"
    columns={[
      { label: 'Bon de livraison', key: 'referenceBL' },
      { label: 'Officine', key: 'pharmacie.nom' },
      { label: 'Ville', key: 'pharmacie.ville' },
      { label: 'Date de livraison', key: 'dateLivraison' },
      { label: 'État', key: 'statut' },
      { label: 'Lignes reçues', key: 'lignes' },
      { label: 'Écarts', key: 'ecarts' },
    ]}
  />
}
