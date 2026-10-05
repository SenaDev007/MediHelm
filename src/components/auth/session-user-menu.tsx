'use client'

// ============================================================
// MediHelm — Menu utilisateur de session (avatar + menu).
//
// Affiché UNIQUEMENT quand une session est active. Fournit :
//   • l'avatar (photo ou initiales) du compte connecté,
//   • un menu déroulant : identité, lien profil, déconnexion.
// Utilisé par l'en-tête du dashboard patient et la Navbar du
// landing — les boutons « Se connecter / Créer un compte »
// disparaissent dès que ce composant prend le relais.
// ============================================================

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, LayoutDashboard, Loader2, LogOut, Mail, User as UserIcon } from 'lucide-react'
import { UserAvatar } from './user-avatar'

interface SessionUserMenuProps {
  /** Lien vers la page profil de l'utilisateur dans SON espace (optionnel) */
  profileHref?: string
  /** Lien vers l'accueil de l'espace (optionnel — « Mon dashboard ») */
  dashboardHref?: string
  dashboardLabel?: string
  /** Afficher le nom complet à côté de l'avatar (desktop) */
  showName?: boolean
  size?: 'xs' | 'sm' | 'md'
}

export function SessionUserMenu({
  profileHref,
  dashboardHref,
  dashboardLabel = 'Mon dashboard',
  showName = false,
  size = 'md',
}: SessionUserMenuProps) {
  const { data: session, status } = useSession()
  const [open, setOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fermeture du menu au clic extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (status !== 'authenticated' || !session?.user) return null

  const { prenom, nom, email } = session.user
  const fullName = `${prenom ?? ''} ${nom ?? ''}`.trim()

  const handleLogout = async () => {
    setLoggingOut(true)
    // Déconnexion → retour au landing public de l'espace patient
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div ref={menuRef} className="relative">
      {/* Déclencheur : nom (optionnel) + avatar */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 rounded-full pl-1.5 pr-2 py-1 hover:bg-teal-50 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Menu du compte"
      >
        {showName && fullName && (
          <span className="hidden sm:block text-sm font-semibold text-teal-900 max-w-28 truncate">
            {fullName}
          </span>
        )}
        <span className="relative">
          <UserAvatar prenom={prenom} nom={nom} avatarUrl={session.user.avatarUrl} size={size} />
          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" title="Connecté" />
        </span>
        <ChevronDown
          className={`hidden sm:block h-3.5 w-3.5 text-teal-700 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Menu déroulant */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-teal-200 bg-white shadow-xl shadow-teal-900/10 overflow-hidden z-50"
          >
            {/* Identité */}
            <div className="px-4 py-3.5 bg-gradient-to-br from-teal-50 to-emerald-50/60 border-b border-teal-100 flex items-center gap-3">
              <UserAvatar prenom={prenom} nom={nom} avatarUrl={session.user.avatarUrl} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-teal-950 truncate">
                  {fullName || 'Mon compte'}
                </p>
                {email && (
                  <p className="text-[11px] text-teal-700/80 truncate flex items-center gap-1 mt-0.5">
                    <Mail className="h-3 w-3 shrink-0" />
                    {email}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="p-1.5">
              {dashboardHref && (
                <Link
                  href={dashboardHref}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-teal-900 hover:bg-teal-50 transition-colors"
                >
                  <LayoutDashboard className="h-4 w-4 text-teal-600" />
                  {dashboardLabel}
                </Link>
              )}
              {profileHref && (
                <Link
                  href={profileHref}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-teal-900 hover:bg-teal-50 transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-teal-600" />
                  Mon profil
                </Link>
              )}
              <div className="my-1 h-px bg-teal-100" />
              <button
                type="button"
                onClick={handleLogout}
                role="menuitem"
                disabled={loggingOut}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Se déconnecter
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
