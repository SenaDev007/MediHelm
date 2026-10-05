'use client'

import { BottomNav } from '@/components/patient/bottom-nav'
import { SessionUserMenu } from '@/components/auth/session-user-menu'
import { UserAvatar } from '@/components/auth/user-avatar'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Bell, LogOut, Menu, X } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { signOut } from 'next-auth/react'

// Pages d'authentification de l'espace patient — rendues HORS chrome
// dashboard (pas de topbar/menu : le formulaire occupe tout l'écran).
const PATIENT_AUTH_PAGES = ['/patient/connexion', '/patient/inscription']

const menuItems = [
  { href: '/patient', label: 'Accueil' },
  { href: '/patient/recherche', label: 'Recherche médicaments' },
  { href: '/patient/pharmacies', label: 'Pharmacies' },
  { href: '/patient/garde', label: 'Pharmacie de garde' },
  { href: '/patient/commande', label: 'Mes commandes' },
  { href: '/patient/suivi', label: 'Suivi commandes' },
  { href: '/patient/profil', label: 'Mon profil' },
  { href: '/patient/ordonnances', label: 'Ordonnances' },
  { href: '/patient/notifications', label: 'Notifications' },
  { href: '/patient/fidelite', label: 'Fidélité' },
  { href: '/patient/comparateur', label: 'Comparateur' },
  { href: '/patient/rappels', label: 'Alertes rappels' },
  { href: '/patient/verifier', label: 'Vérifier médicament' },
  { href: '/patient/vaccinations', label: 'Vaccinations' },
]

export default function PatientLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const { prenom, nom, email, isLoading, isAuthenticated } = usePatientSession()
  const isAuthPage = PATIENT_AUTH_PAGES.includes(pathname)

  // Garde de session : une session révoquée/expirée en base (déconnexion
  // depuis un autre onglet, révocation administrateur…) renvoie le patient
  // vers la page de connexion — jamais de menus visibles hors connexion.
  // Les pages d'auth sont exclues (sinon boucle de redirection).
  useEffect(() => {
    if (!isAuthPage && !isLoading && !isAuthenticated) {
      router.replace('/patient/connexion')
    }
  }, [isAuthPage, isLoading, isAuthenticated, router])

  // Pages d'auth : rendu direct plein écran (pas de coquille dashboard)
  if (isAuthPage) {
    return <>{children}</>
  }

  const fullName = `${prenom ?? ''} ${nom ?? ''}`.trim()

  const handleLogout = async () => {
    setLoggingOut(true)
    // Déconnexion → retour au landing public patient
    await signOut({ callbackUrl: '/' })
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar — logo + cloche + avatar avec menu (profil / déconnexion) */}
      <header className="sticky top-0 z-40 bg-white border-b border-teal-200 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg hover:bg-teal-50 transition-colors"
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5 text-gray-900" /> : <Menu className="h-5 w-5 text-gray-900" />}
            </button>
            <Link href="/patient" className="flex items-center gap-2">
              <Image src="/logo-MediHelm-01.png" alt="MediHelm" width={32} height={32} className="shrink-0" />
              <div className="flex flex-col">
                <span className="text-sm font-bold text-teal-800 leading-tight">MediHelm</span>
                <span className="text-[10px] text-primary font-medium leading-tight">Espace patient</span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-1.5">
            <Link
              href="/patient/notifications"
              className="relative p-2 rounded-lg hover:bg-teal-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5 text-gray-900" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
            </Link>
            {/* Avatar du patient — menu : identité, profil, déconnexion */}
            <SessionUserMenu
              profileHref="/patient/profil"
              size="md"
            />
          </div>
        </div>
      </header>

      {/* Side Menu Overlay — navigation des modules + compte */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-30"
              onClick={() => setMenuOpen(false)}
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-40 shadow-xl overflow-y-auto flex flex-col"
            >
              {/* Bloc compte du patient */}
              <div className="p-4 border-b border-teal-200 bg-gradient-to-br from-teal-50 to-emerald-50/50">
                <div className="flex items-center gap-3">
                  <UserAvatar prenom={prenom} nom={nom} size="lg" />
                  <div className="min-w-0">
                    <p className="font-bold text-teal-900 truncate leading-tight">
                      {fullName || 'Mon compte'}
                    </p>
                    {email && (
                      <p className="text-[11px] text-teal-700/80 truncate mt-0.5">{email}</p>
                    )}
                    <p className="text-[10px] font-semibold text-primary uppercase tracking-wide mt-0.5">
                      Patient
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation — les 14 modules de l'espace patient */}
              <nav className="p-2 flex-1">
                {menuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="block px-4 py-3 rounded-lg text-sm text-gray-900 hover:bg-teal-50 hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>

              {/* Déconnexion — toujours accessible en bas du menu */}
              <div className="p-3 border-t border-teal-100">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors disabled:opacity-60"
                >
                  <LogOut className="h-4 w-4" />
                  Se déconnecter
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 pb-20 md:pb-4">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />
    </div>
  )
}
