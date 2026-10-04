'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type SessionPayload = { data?: { role?: string } }

export function InstitutionNav() {
  const [role, setRole] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/auth/me', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) return
      const payload = await response.json() as SessionPayload
      if (active) setRole(payload.data?.role ?? '')
    }).catch(() => undefined)
    return () => { active = false }
  }, [])

  return <nav aria-label="Navigation institutionnelle">
    {role && <Link href="/dashboard">Tableau de bord</Link>}
    {role === 'DPMED_ADMIN' && <>
      <Link href="/dpmed">DPMED</Link>
      <Link href="/dpmed/alertes">Alertes</Link>
      <Link href="/dpmed/medicaments-surveillance">Surveillance</Link>
      <Link href="/dpmed/pharmacovigilance">Pharmacovigilance</Link>
      <Link href="/dpmed/conformite">Conformité</Link>
      <Link href="/dpmed/fiches-dci">Fiches DCI</Link>
    </>}
    {role === 'SOBAPS_VIEWER' && <>
      <Link href="/sobaps">SoBAPS</Link>
      <Link href="/sobaps/livraisons">Livraisons</Link>
      <Link href="/sobaps/confirmations">Confirmations</Link>
    </>}
    {!role && <Link href="/login">Connexion</Link>}
  </nav>
}
