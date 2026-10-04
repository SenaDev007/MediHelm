'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export function DpmedAlertForm() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setPending(true)
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
      const response = await fetch('/api/institutionnel/dpmed/alertes', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload),
      })
      const result = await response.json() as { data?: { id?: string }; error?: string }
      if (!response.ok || !result.data?.id) throw new Error(result.error ?? 'Création impossible')
      router.replace('/dpmed/alertes')
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création impossible')
    } finally { setPending(false) }
  }
  return <form className="form" onSubmit={submit}>
    <label>Titre de l’alerte<input name="titre" required minLength={3} maxLength={180} /></label>
    <label>Type<select name="typeAlerte" defaultValue="RAPPEL_LOT"><option value="RAPPEL_LOT">Rappel de lot</option><option value="CONTREFACON">Contrefaçon</option><option value="AMM_SUSPENDUE">AMM suspendue</option><option value="INTERDICTION">Interdiction</option><option value="INFORMATION">Information réglementaire</option><option value="PHARMACOVIGILANCE">Pharmacovigilance</option></select></label>
    <label>Niveau d’urgence<select name="niveauUrgence" defaultValue="URGENT"><option value="INFO">Information</option><option value="ATTENTION">Attention</option><option value="URGENT">Urgent</option><option value="URGENCE_IMMEDIATE">Urgence immédiate</option></select></label>
    <label>DCI concernée<input name="dciConcernee" maxLength={160} /></label>
    <label>Lots concernés (un numéro par ligne)<textarea name="lotsCibles" maxLength={8000} /></label>
    <label>Description officielle<textarea name="description" required minLength={10} maxLength={4000} /></label>
    <aside className="note">L’enregistrement crée uniquement un brouillon. La signature RSA-256 est requise pour publier; cette action n’enverra aucun SMS/push tant que l’intégration de diffusion n’est pas configurée.</aside>
    <button className="button" type="submit" disabled={pending}>{pending ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>
    {error && <p className="status error" role="alert">{error}</p>}
  </form>
}
