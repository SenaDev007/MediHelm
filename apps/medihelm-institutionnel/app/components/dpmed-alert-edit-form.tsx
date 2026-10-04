'use client'

import Link from 'next/link'
import { FormEvent, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type Alert = {
  id: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee?: string | null
  lotsCibles: string[]
  description?: string | null
  statut: string
}

export function DpmedAlertEditForm({ alertId }: { alertId: string }) {
  const router = useRouter()
  const [alert, setAlert] = useState<Alert | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetch(`/api/institutionnel/dpmed/alertes/${encodeURIComponent(alertId)}`, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json() as { data?: Alert; error?: string }
        if (!response.ok) throw new Error(payload.error ?? 'Alerte introuvable')
        if (active) setAlert(payload.data ?? null)
      }).catch((reason: unknown) => {
        if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'Chargement impossible')
      }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [alertId])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!alert || alert.statut !== 'BROUILLON') return
    setPending(true); setError('')
    const form = new FormData(event.currentTarget)
    const payload = {
      titre: String(form.get('titre') ?? ''),
      typeAlerte: String(form.get('typeAlerte') ?? ''),
      niveauUrgence: String(form.get('niveauUrgence') ?? ''),
      dciConcernee: String(form.get('dciConcernee') ?? '') || undefined,
      lotsCibles: String(form.get('lotsCibles') ?? '').split('\n').map((lot) => lot.trim()).filter(Boolean),
      description: String(form.get('description') ?? ''),
    }
    try {
      const response = await fetch(`/api/institutionnel/dpmed/alertes/${encodeURIComponent(alertId)}`, {
        method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json() as { error?: string }
      if (!response.ok) throw new Error(result.error ?? 'Modification impossible')
      router.replace('/dpmed/alertes'); router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Modification impossible')
    } finally { setPending(false) }
  }

  if (loading) return <p className="status">Chargement de l’alerte…</p>
  if (!alert) return <p className="status error" role="alert">{error || 'Alerte introuvable.'}</p>
  if (alert.statut !== 'BROUILLON') return <section className="card"><h1>Alerte non modifiable</h1><p className="lede">Seules les alertes en brouillon peuvent être modifiées. État actuel : {alert.statut}.</p><Link className="button" href="/dpmed/alertes">Retour aux alertes</Link></section>

  return <>
    <div className="page-heading"><div><p className="eyebrow">DPMED · Brouillon</p><h1>Modifier l’alerte</h1></div><Link className="button secondary" href="/dpmed/alertes">Annuler</Link></div>
    <section className="card"><form className="form" onSubmit={submit}>
      <label>Titre<input name="titre" required minLength={3} maxLength={180} defaultValue={alert.titre} /></label>
      <label>Type<select name="typeAlerte" defaultValue={alert.typeAlerte}><option value="RAPPEL_LOT">Rappel de lot</option><option value="CONTREFACON">Contrefaçon</option><option value="AMM_SUSPENDUE">AMM suspendue</option><option value="INTERDICTION">Interdiction</option><option value="INFORMATION">Information réglementaire</option><option value="PHARMACOVIGILANCE">Pharmacovigilance</option></select></label>
      <label>Niveau d’urgence<select name="niveauUrgence" defaultValue={alert.niveauUrgence}><option value="INFO">Information</option><option value="ATTENTION">Attention</option><option value="URGENT">Urgent</option><option value="URGENCE_IMMEDIATE">Urgence immédiate</option></select></label>
      <label>DCI concernée<input name="dciConcernee" maxLength={160} defaultValue={alert.dciConcernee ?? ''} /></label>
      <label>Lots concernés (un numéro par ligne)<textarea name="lotsCibles" maxLength={8000} defaultValue={(alert.lotsCibles ?? []).join('\n')} /></label>
      <label>Description officielle<textarea name="description" required minLength={10} maxLength={4000} defaultValue={alert.description ?? ''} /></label>
      <button className="button" type="submit" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
      {error && <p className="status error" role="alert">{error}</p>}
    </form></section>
  </>
}
