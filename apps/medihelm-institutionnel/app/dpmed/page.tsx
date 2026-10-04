import { MetricDashboard } from '../components/metric-dashboard'

export default function DpmedDashboardPage() {
  return <MetricDashboard
    eyebrow="DPMED · espace institutionnel"
    title="Surveillance pharmaceutique"
    description="Vue nationale des alertes, de la pharmacovigilance et des indicateurs de conformité accessibles au rôle DPMED."
    endpoint="/api/institutionnel/dpmed/dashboard"
    metrics={[
      { label: 'Officines actives', key: 'officinesActives' },
      { label: 'Score moyen calculé', key: 'scoreMoyen', suffix: '%' },
      { label: 'Alertes actives', key: 'alertesActives' },
      { label: 'Signalements EI du mois', key: 'signalementsEIduMois' },
    ]}
    notes={[
      'Les alertes publiées sont signées et les cibles enregistrées. Push/SMS et la cible de diffusion en moins de deux minutes restent désactivés tant que les fournisseurs, certificats et le worker ne sont pas configurés.',
      'Les données de pharmacovigilance affichées sont limitées à des métadonnées et références d’officine pseudonymisées; aucun nom de patient n’est renvoyé par cette vue.',
    ]}
  />
}
