'use client'

// ============================================================
// MediHelm — Logique de connexion partagée entre les 4 pages
// d'authentification dédiées (patient, pharmacie, grossiste,
// institution). Chaque page garde son PROPRE design ; seule la
// mécanique (signIn, routage par rôle, messages d'erreur) est
// factorisée ici.
// ============================================================

import { useState, useCallback } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'

export type SpaceId = 'patient' | 'pro' | 'grossiste' | 'institution'

/** Accueil de chaque espace selon le rôle authentifié. */
const ROLE_DESTINATIONS: Record<string, string> = {
  PLATFORM_ADMIN: '/admin',
  PATIENT: '/patient',
  GROSSISTE_PARTNER: '/grossistes',
  GROSSISTE_ADMIN: '/grossistes',
  GROSSISTE_COMMANDES: '/grossistes',
  GROSSISTE_PREPARATEUR: '/grossistes',
  GROSSISTE_LIVREUR: '/grossistes',
  GROSSISTE_COMMERCIAL: '/grossistes',
  GROSSISTE_COMPTABLE: '/grossistes',
  DPMED_ADMIN: '/institutions',
  SOBAPS_VIEWER: '/institutions',
  ABRP_VIEWER: '/institutions',
}

/** Rôles « naturels » de chaque espace — pour router l'utilisateur
 *  vers l'accueil de SON espace, quel que soit le formulaire utilisé. */
const SPACE_HOMES: Record<SpaceId, string> = {
  patient: '/patient',
  pro: '/pro',
  grossiste: '/grossistes',
  institution: '/institutions',
}

function destinationForRole(roleName: string | undefined | null): string {
  if (!roleName) return '/connexion'
  const mapped = roleName === 'OWNER' ? 'ADMIN' : roleName
  return ROLE_DESTINATIONS[mapped] ?? '/pro' // rôles pharmacie par défaut
}

/** Messages d'erreur fonctionnels (auth.ts → client). */
function humanizeError(raw: string | undefined): string {
  switch (raw) {
    case 'Identifiants invalides':
    case 'CredentialsSignin':
      return 'Email ou mot de passe incorrect.'
    case 'Compte désactivé. Contactez votre administrateur.':
      return 'Votre compte a été désactivé. Contactez le support.'
    case 'Pharmacie désactivée. Contactez le support MediHelm.':
      return 'La pharmacie associée est désactivée. Contactez le support.'
    case 'Trop de tentatives de connexion. Réessayez dans 15 minutes.':
      return 'Trop de tentatives. Réessayez dans 15 minutes.'
    case 'Email et mot de passe requis':
      return 'Veuillez saisir votre email et votre mot de passe.'
    default:
      return 'Une erreur est survenue lors de la connexion. Veuillez réessayer.'
  }
}

export function useSpaceLogin() {
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      const trimmedEmail = email.trim().toLowerCase()
      if (!trimmedEmail) {
        setError('Veuillez saisir votre adresse email.')
        return
      }
      if (!password) {
        setError('Veuillez saisir votre mot de passe.')
        return
      }

      setLoading(true)
      try {
        const result = await signIn('credentials', {
          email: trimmedEmail,
          password,
          redirect: false,
        })

        if (result?.error) {
          setError(humanizeError(result.error))
          return
        }
        if (!result?.ok) {
          setError('Une erreur est survenue lors de la connexion. Veuillez réessayer.')
          return
        }

        // Connexion réussie → routage vers l'espace du rôle. Un
        // callbackUrl explicite (provenance protégée par middleware)
        // prime sur le routage automatique.
        let destination: string | null = null
        const explicitCallback = searchParams.get('callbackUrl')
        if (explicitCallback && explicitCallback.startsWith('/') && !explicitCallback.startsWith('//')) {
          destination = explicitCallback
        } else {
          try {
            const res = await fetch('/api/auth/session')
            if (res.ok) {
              const session = await res.json()
              const roleName = (session?.user as Record<string, unknown> | undefined)?.roleName as string | undefined
              destination = destinationForRole(roleName)
            }
          } catch {
            // session illisible : /connexion reste une valeur sûre
          }
        }
        // Navigation POST-CONNEXION : navigation COMPLÈTE (window.location)
        // plutôt que router.push — le cookie de session vient d'être émis et
        // une navigation dure garantit que la requête suivante (middleware,
        // RSC, layouts serveur) part avec le cookie engagé. Avec router.push,
        // la requête RSC peut déclencher CONCURRENT la mise en place du cookie
        // et être rejetée par le middleware (connexion « invisible » observée
        // en production). C'est aussi le comportement natif de NextAuth
        // (window.location.href après signIn).
        window.location.assign(destination ?? '/connexion')
      } catch {
        setError('Erreur de connexion au serveur. Vérifiez votre réseau.')
      } finally {
        setLoading(false)
      }
    },
    [email, password, searchParams],
  )

  return {
    email,
    setEmail: (v: string) => { setEmail(v); if (error) setError(null) },
    password,
    setPassword: (v: string) => { setPassword(v); if (error) setError(null) },
    showPassword,
    togglePassword: () => setShowPassword(v => !v),
    loading,
    error,
    submit,
  }
}

export { SPACE_HOMES, destinationForRole }
