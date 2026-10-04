'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Alert = {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  dateEmissionDPMED: string
  statut: string
  officinesCiblees: number
}

export function DpmedAlerts() {
  const [items, setItems] = useState<Alert[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  async function fetchAlerts(signal?: AbortSignal) {
    const response = await fetch('/api/institutionnel/dpmed/alertes?page=1&pageSize=100', { cache: 'no-store', signal })
    const payload = await response.json() as { data?: Alert[]; error?: string }
    if (!response.ok) throw new Error(payload.error ?? 'Chargement des alertes impossible')
    return payload.data ?? []
  }

  async function load() {
    setLoading(true)
    setError('')
    try { setItems(await fetchAlerts()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'API indisponible') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchAlerts(controller.signal).then((alerts) => { if (active) setItems(alerts) })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) {
          setError(reason instanceof Error ? reason.message : 'API indisponible')
        }
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [])

  async function action(id: string, kind: 'publier' | 'annuler') {
    setError('')
    const response = await fetch(`/api/institutionnel/dpmed/alertes/${id}${kind === 'publier' ? '/publier' : ''}`, {
      method: kind === 'publier' ? 'POST' : 'DELETE',
    })
    const payload = await response.json() as { error?: string; meta?: { message?: string } }
    if (!response.ok) setError(payload.error ?? 'Action impossible')
    else if (payload.meta?.message) setError(payload.meta.message)
    await load()
  }

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">DPMED · M18</p><h1>Alertes sanitaires</h1><p className="lede">Les alertes sont enregistrées en brouillon. La publication exige la clé RSA DPMED; les notifications push/SMS nécessitent un worker et des fournisseurs configurés.</p></div>
        <div className="actions"><Link className="button" href="/dpmed/alertes/nouvelle">Nouvelle alerte</Link><button className="button secondary" onClick={() => void load()}>Actualiser</button></div>
      </div>
      {error && <p className="status" role="status">{error}</p>}
      <div className="table-wrap"><table><thead><tr><th>Référence</th><th>Titre</th><th>Type</th><th>Urgence</th><th>Créée le</th><th>État</th><th>Cibles</th><th>Actions</th></tr></thead>
        <tbody>{loading && <tr><td colSpan={8}>Chargement…</td></tr>}{!loading && items.length === 0 && <tr><td colSpan={8}>Aucune alerte.</td></tr>}
          {!loading && items.map((item) => <tr key={item.id}><td>{item.referenceOfficielle}</td><td>{item.titre}</td><td>{item.typeAlerte}</td><td>{item.niveauUrgence}</td><td>{new Date(item.dateEmissionDPMED).toLocaleDateString('fr-FR')}</td><td>{item.statut}</td><td>{item.officinesCiblees}</td><td>{item.statut === 'BROUILLON' && <div className="actions"><Link className="button secondary" href={`/dpmed/alertes/${item.id}`}>Modifier</Link><button className="button" onClick={() => void action(item.id, 'publier')}>Signer et publier</button><button className="button danger" onClick={() => void action(item.id, 'annuler')}>Annuler</button></div>}</td></tr>)}
        </tbody></table></div>
    </>
  )
}
