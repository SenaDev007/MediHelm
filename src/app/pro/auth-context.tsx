'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useSession, SessionProvider } from 'next-auth/react'

// === Types ===

interface User {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  avatarUrl?: string
}

interface Pharmacie {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  email?: string
  numeroAgrement: string
  plan: string
  statutAbonnement: string
  logoUrl?: string
}

interface AuthContextType {
  user: User | null
  pharmacie: Pharmacie | null
  isLoading: boolean
  login: () => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  pharmacie: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
})

// === Composant interne qui utilise useSession ===

function AuthProviderInner({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const [pharmacie, setPharmacie] = useState<Pharmacie | null>(null)
  const [isLoadingPharmacie, setIsLoadingPharmacie] = useState(true)

  const isLoading = status === 'loading' || isLoadingPharmacie

  // Charger les données de la pharmacie quand la session est disponible
  useEffect(() => {
    async function loadPharmacie() {
      if (!session?.user) {
        setIsLoadingPharmacie(false)
        return
      }

      const sessionUser = session.user as Record<string, unknown>
      const pharmacieId = sessionUser.pharmacieId as string
      const pharmacieNom = sessionUser.pharmacieNom as string

      if (pharmacieId) {
        try {
          const res = await fetch(`/api/pharmacies?numeroAgrement=${pharmacieId}`)
          if (res.ok) {
            const pharmacies = await res.json()
            if (pharmacies.length > 0) {
              const p = pharmacies[0]
              setPharmacie({
                id: p.id,
                nom: p.nom,
                adresse: p.adresse,
                ville: p.ville,
                telephone: p.telephone,
                email: p.email,
                numeroAgrement: p.numeroAgrement,
                plan: p.plan,
                statutAbonnement: p.statutAbonnement,
                logoUrl: p.logoUrl,
              })
            } else {
              // Pharmacie non trouvée via API, utiliser les données du JWT
              setPharmacie({
                id: pharmacieId,
                nom: pharmacieNom || 'Pharmacie',
                adresse: '',
                ville: '',
                telephone: '',
                numeroAgrement: '',
                plan: 'GROW',
                statutAbonnement: 'ACTIF',
              })
            }
          } else {
            // Fallback sur les données du JWT
            setPharmacie({
              id: pharmacieId,
              nom: pharmacieNom || 'Pharmacie',
              adresse: '',
              ville: '',
              telephone: '',
              numeroAgrement: '',
              plan: 'GROW',
              statutAbonnement: 'ACTIF',
            })
          }
        } catch {
          // Erreur réseau — fallback sur les données du JWT
          setPharmacie({
            id: pharmacieId,
            nom: pharmacieNom || 'Pharmacie',
            adresse: '',
            ville: '',
            telephone: '',
            numeroAgrement: '',
            plan: 'GROW',
            statutAbonnement: 'ACTIF',
          })
        }
      }
      setIsLoadingPharmacie(false)
    }

    loadPharmacie()
  }, [session])

  // Construire l'objet User depuis la session NextAuth
  const user: User | null = session?.user
    ? {
        id: (session.user as Record<string, unknown>).id as string || '',
        nom: ((session.user as Record<string, unknown>).nom as string) || '',
        prenom: ((session.user as Record<string, unknown>).prenom as string) || '',
        email: session.user.email || '',
        role: ((session.user as Record<string, unknown>).roleName as string) || 'PHARMACIEN',
        avatarUrl: (session.user as Record<string, unknown>).avatarUrl as string | undefined,
      }
    : null

  const isAuthenticated = !!session?.user

  const login = useCallback(() => {
    // Rediriger vers la page de connexion NextAuth
    window.location.href = '/connexion'
  }, [])

  const logout = useCallback(() => {
    // Déconnexion NextAuth + nettoyage
    window.location.href = '/api/auth/signout'
  }, [])

  return (
    <AuthContext.Provider value={{ user, pharmacie, isLoading, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

// === Composant Provider principal ===
// Enveloppe avec SessionProvider de next-auth, puis AuthProviderInner

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <AuthProviderInner>{children}</AuthProviderInner>
    </SessionProvider>
  )
}

export const useAuth = () => useContext(AuthContext)
