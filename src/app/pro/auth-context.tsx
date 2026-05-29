'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  pharmacie: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [pharmacie, setPharmacie] = useState<Pharmacie | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadDemoData = useCallback(async () => {
    try {
      const res = await fetch('/api/pharmacies?numeroAgrement=AGR-2024-001')
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
          setUser({
            id: 'demo-admin',
            nom: 'Houénou',
            prenom: 'Aminou',
            email: 'admin@medihelm.bj',
            role: 'Pharmacien-Propriétaire',
          })
        }
      }
    } catch {
      // Fallback demo data
      setPharmacie({
        id: 'demo-pharmacy',
        nom: 'Pharmacie MédiHelm Demo',
        adresse: 'Cotonou, Bénin',
        ville: 'Cotonou',
        telephone: '+229 97 00 00 00',
        numeroAgrement: 'AGR-2024-001',
        plan: 'GROW',
        statutAbonnement: 'ACTIF',
      })
      setUser({
        id: 'demo-admin',
        nom: 'Houénou',
        prenom: 'Aminou',
        email: 'admin@medihelm.bj',
        role: 'Pharmacien-Propriétaire',
      })
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadDemoData()
  }, [loadDemoData])

  const login = useCallback(() => {
    loadDemoData()
  }, [loadDemoData])

  const logout = useCallback(() => {
    setUser(null)
    setPharmacie(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, pharmacie, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
