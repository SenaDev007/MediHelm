'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'

type DciSheet = {
  id: string
  dci: string
  classeTherapeutique?: string | null
  mecanisme?: string | null
  indications?: string | null
  posologie?: string | null
  contreIndications?: string | null
  interactions?: string[]
  effetsIndesirables?: string[]
  conservation?: string | null
  source?: string | null
  actif: boolean
}

async function fetchItems(signal?: AbortSignal): Promise<DciSheet[]> {
  const response = await fetch('/api/institutionnel/dpmed/fiches-dci?page=1&pageSize=100', { cache: 'no-store', signal })
  const payload = await response.json() as { data?: DciSheet[]; error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Chargement impossible')
  return payload.data ?? []
}

export function DciManager() {
  const [items, setItems] = useState<DciSheet[]>([])
  const [editing, setEditing] = useState<DciSheet | null>(null)
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
    const lines = (name: string) => String(form.get(name) ?? '').split('\n').map((item) => item.trim()).filter(Boolean)
    const payload = {
      dci: String(form.get('dci') ?? '').trim(),
      classeTherapeutique: String(form.get('classeTherapeutique') ?? '').trim() || undefined,
      mecanisme: String(form.get('mecanisme') ?? '').trim() || undefined,
      indications: String(form.get('indications') ?? '').trim() || undefined,
      posologie: String(form.get('posologie') ?? '').trim() || undefined,
      contreIndications: String(form.get('contreIndications') ?? '').trim() || undefined,
      interactions: lines('interactions'),
      effetsIndesirables: lines('effetsIndesirables'),
      conservation: String(form.get('conservation') ?? '').trim() || undefined,
      source: String(form.get('source') ?? '').trim() || undefined,
    }
    setError(''); setMessage('')
    const response = await fetch(`/api/institutionnel/dpmed/fiches-dci${editing ? `/${editing.id}` : ''}`, {
      method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = await response.json() as { error?: string }
    if (!response.ok) { setError(result.error ?? 'Enregistrement impossible'); return }
    setMessage(editing ? 'Fiche DCI mise à jour.' : 'Fiche DCI créée.')
    setEditing(null); formRef.current?.reset(); await load()
  }

  async function archive(id: string) {
    setError(''); setMessage('')
    const response = await fetch(`/api/institutionnel/dpmed/fiches-dci/${id}`, { method: 'DELETE' })
    const result = await response.json() as { error?: string }
    if (!response.ok) { setError(result.error ?? 'Archivage impossible'); return }
    setMessage('Fiche DCI archivée.'); await load()
  }

  const text = (value: string | null | undefined) => value ?? ''
  return <>
    <div className="page-heading"><div><p className="eyebrow">DPMED · M16</p><h1>Fiches DCI</h1><p className="lede">Référentiel modifiable et sourcé par le rôle DPMED. Toute indication ou posologie saisie doit être vérifiée par un pharmacien compétent avant une réutilisation clinique.</p></div><button className="button secondary" onClick={() => void load()} disabled={loading}>Actualiser</button></div>
    <section className="card"><h2>{editing ? 'Modifier la fiche' : 'Créer une fiche DCI'}</h2>
      <form className="form" key={editing?.id ?? 'create'} ref={formRef} onSubmit={submit}>
        <label>DCI<input name="dci" required minLength={2} maxLength={160} defaultValue={editing?.dci ?? ''} /></label>
        <label>Classe thérapeutique<input name="classeTherapeutique" maxLength={180} defaultValue={text(editing?.classeTherapeutique)} /></label>
        <label>Mécanisme<textarea name="mecanisme" maxLength={3000} defaultValue={text(editing?.mecanisme)} /></label>
        <label>Indications<textarea name="indications" maxLength={4000} defaultValue={text(editing?.indications)} /></label>
        <label>Posologie<textarea name="posologie" maxLength={3000} defaultValue={text(editing?.posologie)} /></label>
        <label>Contre-indications<textarea name="contreIndications" maxLength={4000} defaultValue={text(editing?.contreIndications)} /></label>
        <label>Interactions (une par ligne)<textarea name="interactions" maxLength={8000} defaultValue={(editing?.interactions ?? []).join('\n')} /></label>
        <label>Effets indésirables (un par ligne)<textarea name="effetsIndesirables" maxLength={8000} defaultValue={(editing?.effetsIndesirables ?? []).join('\n')} /></label>
        <label>Conservation<textarea name="conservation" maxLength={1000} defaultValue={text(editing?.conservation)} /></label>
        <label>Source documentaire<input name="source" maxLength={1000} defaultValue={text(editing?.source)} /></label>
        <div className="actions"><button className="button" type="submit">{editing ? 'Enregistrer les modifications' : 'Créer la fiche'}</button>{editing && <button className="button secondary" type="button" onClick={() => setEditing(null)}>Annuler</button>}</div>
      </form>
      {error && <p className="status error" role="alert">{error}</p>}{message && <p className="status" role="status">{message}</p>}
    </section>
    <div className="table-wrap"><table><thead><tr><th>DCI</th><th>Classe</th><th>Source</th><th>État</th><th>Actions</th></tr></thead><tbody>
      {loading && <tr><td colSpan={5}>Chargement…</td></tr>}{!loading && !items.length && <tr><td colSpan={5}>Aucune fiche active.</td></tr>}
      {!loading && items.map((item) => <tr key={item.id}><td>{item.dci}</td><td>{item.classeTherapeutique || '—'}</td><td>{item.source || '—'}</td><td>{item.actif ? 'Active' : 'Archivée'}</td><td><div className="actions"><button className="button secondary" onClick={() => setEditing(item)}>Modifier</button><button className="button danger" onClick={() => void archive(item.id)}>Archiver</button></div></td></tr>)}
    </tbody></table></div>
  </>
}
