'use client'

import { BottomNav } from '@/components/patient/bottom-nav'
import { Bell, Menu, X, Shield } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Bar */}
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
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-teal-800 leading-tight">MédiHelm</span>
                <span className="text-[10px] text-primary font-medium leading-tight">Patient • Gratuit</span>
              </div>
            </Link>
          </div>
          <Link
            href="/patient/notifications"
            className="relative p-2 rounded-lg hover:bg-teal-50 transition-colors"
          >
            <Bell className="h-5 w-5 text-gray-900" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </Link>
        </div>
      </header>

      {/* Side Menu Overlay */}
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
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-40 shadow-xl overflow-y-auto"
            >
              <div className="p-4 border-b border-teal-200">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-teal-800">MédiHelm Patient</p>
                    <p className="text-xs text-primary">100% Gratuit</p>
                  </div>
                </div>
              </div>
              <nav className="p-2">
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
