'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const [pending, setPending] = useState(false)
  const router = useRouter()
  async function logout() {
    if (pending) return
    setPending(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }
  return <button className="logout" onClick={logout} disabled={pending}>{pending ? 'Déconnexion…' : 'Déconnexion'}</button>
}
