import Link from 'next/link'
import { DpmedAlertForm } from '../../../components/dpmed-alert-form'

export default function NewDpmedAlertPage() {
  return <>
    <div className="page-heading"><div><p className="eyebrow">DPMED · M18</p><h1>Nouvelle alerte</h1><p className="lede">Créer un brouillon contrôlé avant signature et publication.</p></div><Link className="button secondary" href="/dpmed/alertes">Retour aux alertes</Link></div>
    <section className="card"><DpmedAlertForm /></section>
  </>
}
