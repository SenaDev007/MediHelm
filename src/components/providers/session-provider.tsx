'use client'

import { SessionProvider } from 'next-auth/react'

/**
 * Provider de session NextAuth — racine de l'application.
 * `refetchInterval` : les sessions étant persistées et VALIDÉES en base,
 * un rafraîchissement régulier propage une éventuelle révocation
 * (déconnexion à distance, désactivation) côté client en moins de 2 min.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={90} refetchOnWindowFocus={true} refetchWhenOffline={false}>
      {children}
    </SessionProvider>
  )
}
