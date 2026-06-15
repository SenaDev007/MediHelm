'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface PatientSession {
  /** ID de l'utilisateur (table Utilisateur) */
  userId: string | null
  /** ID du patient (table Patient) */
  patientId: string | null
  /** Email */
  email: string | null
  /** Nom */
  nom: string | null
  /** Prénom */
  prenom: string | null
  /** ID de la pharmacie associée */
  pharmacieId: string | null
  /** Nom de la pharmacie */
  pharmacieNom: string | null
  /** Si la session est en cours de chargement */
  isLoading: boolean
  /** Si l'utilisateur est connecté */
  isAuthenticated: boolean
}

/**
 * Hook pour récupérer les données de session du patient connecté.
 * Récupère le patientId depuis l'API car NextAuth ne stocke que l'userId.
 */
export function usePatientSession(): PatientSession {
  const { data: session, status } = useSession()
  const [patientId, setPatientId] = useState<string | null>(null)

  const isLoading = status === 'loading'
  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    if (isAuthenticated && session?.user?.id) {
      // Fetch patient record linked to this user
      fetch(`/api/patient/comptes?email=${encodeURIComponent(session.user.email!)}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.patient?.id) {
            setPatientId(data.patient.id)
          }
        })
        .catch(() => {
          // Silently fail — patientId will remain null
        })
    }
  }, [isAuthenticated, session?.user?.id, session?.user?.email])

  return {
    userId: session?.user?.id ?? null,
    patientId,
    email: session?.user?.email ?? null,
    nom: (session?.user as Record<string, unknown>)?.nom as string ?? null,
    prenom: (session?.user as Record<string, unknown>)?.prenom as string ?? null,
    pharmacieId: (session?.user as Record<string, unknown>)?.pharmacieId as string ?? null,
    pharmacieNom: (session?.user as Record<string, unknown>)?.pharmacieNom as string ?? null,
    isLoading,
    isAuthenticated,
  }
}
