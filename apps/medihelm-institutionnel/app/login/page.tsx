'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError('')
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const payload = await response.json() as { error?: string; user?: { role?: string } }
      if (!response.ok) throw new Error(payload.error ?? 'Connexion impossible')
      const target = payload.user?.role === 'DPMED_ADMIN' ? '/dpmed'
        : payload.user?.role === 'SOBAPS_VIEWER' ? '/sobaps'
          : '/unauthorized'
      router.replace(target)
      router.refresh()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Connexion impossible')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="login-shell">
      <section className="login-card">
        <p className="eyebrow">Espace partenaire · accès sur invitation</p>
        <h1>Connexion institutionnelle</h1>
        <p className="lede">Les accès DPMED et SoBAPS sont nominatifs et accordés par l’administrateur de la plateforme.</p>
        <form className="form" onSubmit={submit}>
          <label>Adresse e-mail<input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Mot de passe<input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <button className="button" type="submit" disabled={pending}>{pending ? 'Connexion…' : 'Se connecter'}</button>
        </form>
        {error && <p className="status error" role="alert">{error}</p>}
      </section>
    </div>
  )
}
