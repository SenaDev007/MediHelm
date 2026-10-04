import { MetricDashboard } from '../components/metric-dashboard'

export default function SoBapsDashboardPage() {
  return <MetricDashboard
    eyebrow="SoBAPS · espace partenaire"
    title="Suivi des réceptions"
    description="Vue de traçabilité des livraisons confirmées ou signalées en litige par les officines. Le compte SoBAPS est en lecture seule."
    endpoint="/api/institutionnel/sobaps/dashboard"
    metrics={[
      { label: 'Livraisons du mois', key: 'livraisonsDuMois' },
      { label: 'Confirmées', key: 'confirmees' },
      { label: 'En attente', key: 'enAttente' },
      { label: 'En litige', key: 'litiges' },
      { label: 'Taux de confirmation', key: 'tauxConfirmation', suffix: '%' },
    ]}
    notes={[
      'Les écarts de quantités sont les quantités déclarées à la réception par l’officine; le portail ne valide pas encore ces valeurs contre un bon de livraison SoBAPS intégré.',
      'Les données de patients, ventes, prix et finances des officines ne sont pas exposées à ce portail.',
    ]}
  />
}
