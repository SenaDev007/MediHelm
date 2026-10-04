import { DataPage } from '../../components/data-page'

export default function CompliancePage() {
  return <DataPage
    eyebrow="DPMED · M19"
    title="Conformité réglementaire"
    description="Dernier score enregistré par officine et critères disponibles dans le schéma actuel. Ces valeurs ne remplacent pas une inspection ni une certification officielle."
    endpoint="/api/institutionnel/dpmed/conformite?page=1&pageSize=100"
    columns={[
      { label: 'Officine', key: 'officine.nom' },
      { label: 'Ville', key: 'officine.ville' },
      { label: 'Score', key: 'scoreTotal' },
      { label: 'Registre stupéfiants', key: 'scoreRegistreStup' },
      { label: 'Alertes', key: 'scoreAlerteDPMED' },
      { label: 'Documents', key: 'scoreDocuments' },
      { label: 'Pharmacovigilance', key: 'scorePharmacovigilance' },
      { label: 'Certification', key: 'certificationDPMED' },
      { label: 'Calculé le', key: 'dateCalcul' },
    ]}
  />
}
