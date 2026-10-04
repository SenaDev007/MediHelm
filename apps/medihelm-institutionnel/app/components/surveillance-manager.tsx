'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

type Surveillance = {
  id: string
  dci: string
  nomCommercial?: string | null
  typeSurveillance: string
  description: string
  dateEmission: string
  niveauRisque: string
  statut: string
  sourceAlerte: string
}

async function fetchItems(signal?: AbortSignal): Promise<Surveillance[]> {
  const response = await fetch('/api/institutionnel/dpmed/medicaments-surveillance?page=1&pageSize=100', { cache: 'no-store', signal })
  const payload = await response.json() as { data?: Surveillance[]; error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Chargement impossible')
  return payload.data ?? []
}

export function SurveillanceManager() {
  const [items, setItems] = useState<Surveillance[]>([])
  const [editing, setEditing] = useState<Surveillance | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const formRef = useRef<HTMLFormElement>(null)

  async function load() {
    setLoading(true)
    try { setItems(await fetchItems()) }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chargement impossible') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchItems(controller.signal).then((rows) => { if (active) setItems(rows) })
      .catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Chargement impossible')
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const payload = {
      dci: String(form.get('dci') ?? '').trim(),
      nomCommercial: String(form.get('nomCommercial') ?? '').trim() || undefined,
      typeSurveillance: String(form.get('typeSurveillance') ?? 'SOUS_SURVEILLANCE'),
      description: String(form.get('description') ?? '').trim(),
      dateEmission: String(form.get('dateEmission') ?? '') || undefined,
      niveauRisque: String(form.get('niveauRisque') ?? 'MODERE'),
      statut: 'ACTIVE',
    }
    setError(''); setMessage('')
    const response = await fetch(`/api/institutionnel/dpmed/medicaments-surveillance${editing ? `/${editing.id}` : ''}`, {
      method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) { setError(result.error ?? 'Enregistrement impossible'); return }
    setMessage(editing ? 'Fiche mise à jour.' : 'Fiche créée.')
    setEditing(null); formRef.current?.reset(); await load()
  }

  async function archive(id: string) {
    setError(''); setMessage('')
    const response = await fetch(`/api/institutionnel/dpmed/medicaments-surveillance/${id}`, { method: 'DELETE' })
    const result = await response.json() as { error?: string }
    if (!response.ok) { setError(result.error ?? 'Archivage impossible'); return }
    setMessage('Fiche archivée.'); await load()
  }

  return <>
    <div className="page-heading"><div><p className="eyebrow">DPMED · M16</p><h1>Médicaments sous surveillance</h1><p className="lede">Référentiel modifiable par le rôle DPMED. Les fiches archivées restent conservées dans l’historique.</p></div><button className="button secondary" onClick={() => void load()} disabled={loading}>Actualiser</button></div>
    <section className="card"><h2>{editing ? 'Modifier la fiche' : 'Ajouter une fiche'}</h2>
      <form className="form" key={editing?.id ?? 'create'} ref={formRef} onSubmit={submit}>
        <label>DCI<input name="dci" required minLength={2} maxLength={160} defaultValue={editing?.dci ?? ''} /></label>
        <label>Nom commercial<input name="nomCommercial" maxLength={160} defaultValue={editing?.nomCommercial ?? ''} /></label>
        <label>Type<select name="typeSurveillance" defaultValue={editing?.typeSurveillance ?? 'SOUS_SURVEILLANCE'}><option value="SOUS_SURVEILLANCE">Sous surveillance</option><option value="RAPPEL_LOT">Rappel de lot</option><option value="CONTREFACON">Contrefaçon</option><option value="AMM_SUSPENDUE">AMM suspendue</option><option value="INTERDICTION">Interdiction</option></select></label>
        <label>Niveau de risque<select name="niveauRisque" defaultValue={editing?.niveauRisque ?? 'MODERE'}><option value="FAIBLE">Faible</option><option value="MODERE">Modéré</option><option value="ELEVE">Élevé</option><option value="CRITIQUE">Critique</option></select></label>
        <label>Date d’émission<input name="dateEmission" type="date" defaultValue={editing?.dateEmission?.slice(0, 10) ?? ''} /></label>
        <label>Description<textarea name="description" required minLength={5} maxLength={3000} defaultValue={editing?.description ?? ''} /></label>
        <div className="actions"><button className="button" type="submit">{editing ? 'Enregistrer les modifications' : 'Créer la fiche'}</button>{editing && <button className="button secondary" type="button" onClick={() => setEditing(null)}>Annuler</button>}</div>
      </form>
      {error && <p className="status error" role="alert">{error}</p>}{message && <p className="status" role="status">{message}</p>}
    </section>
    <div className="table-wrap"><table><thead><tr><th>DCI</th><th>Nom commercial</th><th>Type</th><th>Risque</th><th>État</th><th>Source</th><th>Actions</th></tr></thead><tbody>
      {loading && <tr><td colSpan={7}>Chargement…</td></tr>}{!loading && !items.length && <tr><td colSpan={7}>Aucune fiche active.</td></tr>}
      {!loading && items.map((item) => <tr key={item.id}><td>{item.dci}</td><td>{item.nomCommercial || '—'}</td><td>{item.typeSurveillance}</td><td>{item.niveauRisque}</td><td>{item.statut}</td><td>{item.sourceAlerte}</td><td><div className="actions"><button className="button secondary" onClick={() => setEditing(item)}>Modifier</button><button className="button danger" onClick={() => void archive(item.id)}>Archiver</button></div></td></tr>)}
    </tbody></table></div>
  </>
}
