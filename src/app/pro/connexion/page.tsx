'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Store, BarChart3, CalendarClock, ShieldCheck, PackageSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpaceLogin } from '@/components/auth/use-space-login'

// ─── Formulaire (composant interne — Suspense pour useSearchParams) ─────────
function ProLoginForm() {
  const login = useSpaceLogin()

  return (
    <form onSubmit={login.submit} className="space-y-5">
      {login.error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-red-950/60 border border-red-500/40 p-3.5 flex items-start gap-2.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] leading-snug text-red-200">{login.error}</p>
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-semibold text-emerald-100">
          Email professionnel
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-emerald-400/70" />
          <Input
            id="email"
            type="email"
            placeholder="contact@votre-pharmacie.bj"
            value={login.email}
            onChange={e => login.setEmail(e.target.value)}
            className="h-[52px] pl-12 pr-4 rounded-xl border-emerald-800/60 bg-emerald-950/60 text-[15px] text-emerald-50 placeholder:text-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-500/30"
            autoComplete="email"
            disabled={login.loading}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-[13px] font-semibold text-emerald-100">
            Mot de passe
          </Label>
          <Link href="/mot-de-passe-oublie" className="text-[12px] font-medium text-emerald-400 hover:text-emerald-300 hover:underline">
            Oublié ?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-emerald-400/70" />
          <Input
            id="password"
            type={login.showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={login.password}
            onChange={e => login.setPassword(e.target.value)}
            className="h-[52px] pl-12 pr-12 rounded-xl border-emerald-800/60 bg-emerald-950/60 text-[15px] text-emerald-50 placeholder:text-emerald-500/50 focus:border-emerald-400 focus:ring-emerald-500/30"
            autoComplete="current-password"
            disabled={login.loading}
            required
          />
          <button
            type="button"
            onClick={login.togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-400/70 hover:text-emerald-300"
            aria-label={login.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {login.showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={login.loading}
        className="w-full h-[52px] rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 text-[15px] font-bold text-emerald-950 shadow-xl shadow-emerald-500/20 transition-all"
      >
        {login.loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connexion en cours…
          </>
        ) : (
          'Ouvrir mon espace pharmacie'
        )}
      </Button>

      <p className="text-center text-[13px] text-emerald-300/70">
        Votre officine n&apos;est pas encore sur MediHelm ?{' '}
        <Link href="/inscription" className="font-bold text-emerald-300 hover:text-emerald-200 hover:underline">
          Inscrire mon officine
        </Link>
      </p>
    </form>
  )
}

function ProConnexionPageInner() {
  return (
    <div className="min-h-screen bg-[#06231c]">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* ─── COLONNE GAUCHE : formulaire sur fond sombre ──────────────────── */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 xl:px-28">
          {/* Trame décorative discrète */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'radial-gradient(ellipse 60% 45% at 18% 12%, rgba(52, 211, 153, 0.14), transparent), radial-gradient(ellipse 45% 35% at 85% 90%, rgba(45, 212, 191, 0.10), transparent)',
            }}
          />

          <div className="relative mx-auto w-full max-w-md">

            {/* En-tête de marque */}
            <div className="mb-10">
              <Link href="/espace-pro" className="inline-flex items-center gap-3 group">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-emerald-700/50 shadow-lg shadow-emerald-950/40">
                  <Image src="/logo-MediHelm-01.png" alt="MediHelm" fill className="object-cover" sizes="48px" />
                </div>
                <div>
                  <p className="text-[17px] font-black tracking-tight text-emerald-50 leading-none">MediHelm <span className="text-emerald-400">Pro</span></p>
                  <p className="text-[10.5px] font-semibold tracking-[0.14em] text-emerald-500 uppercase mt-1">
                    Pilotage d&apos;officine
                  </p>
                </div>
              </Link>
            </div>

            {/* Titre */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 mb-4">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-emerald-300 tracking-wide">Accès réservé aux professionnels</span>
              </div>
              <h1 className="text-[30px] sm:text-[34px] font-black tracking-tight text-emerald-50 leading-[1.12]">
                Votre officine,<br />
                <span className="text-emerald-400">pilotée avec précision</span>
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-emerald-200/60">
                Caisse, stocks, gardes, comptabilité et conformité — tout votre
                quotidien pharmaceutique réuni dans un seul espace sécurisé.
              </p>
            </div>

            {/* Formulaire */}
            <ProLoginForm />

            {/* Réassurance */}
            <div className="mt-8 pt-6 border-t border-emerald-800/50 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-400/70">
                <Store className="h-3.5 w-3.5" />
                345+ officines référencées
              </span>
              <Link href="/espace-pro" className="text-[11px] font-semibold text-emerald-400/70 hover:text-emerald-300">
                Découvrir MediHelm Pro →
              </Link>
            </div>
          </div>
        </div>

        {/* ─── COLONNE DROITE : univers pharmacie ───────────────────────────── */}
        <div className="relative hidden lg:block overflow-hidden border-l border-emerald-800/40">
          <Image
            src="/images/login/pharmacie-bg.jpg"
            alt="Pharmacienne organisant les médicaments dans une officine moderne"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 48vw, 0px"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-emerald-950/30 via-emerald-950/45 to-[#06231c]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04160f]/85 via-transparent to-emerald-950/25" />

          {/* Carte fonctionnalités */}
          <div className="absolute bottom-10 right-10 w-[330px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="rounded-2xl border border-emerald-700/50 bg-[#06231c]/85 backdrop-blur-xl p-6 shadow-2xl shadow-black/40"
            >
              <p className="text-[11px] font-bold tracking-[0.12em] text-emerald-400 uppercase">
                Dans votre espace Pro
              </p>
              <div className="mt-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2">
                    <BarChart3 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-emerald-100">Tableau de bord temps réel</p>
                    <p className="text-[12px] text-emerald-300/60 leading-snug mt-0.5">Ventes, marges, alertes stock</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2">
                    <PackageSearch className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-emerald-100">Stocks & péremptions</p>
                    <p className="text-[12px] text-emerald-300/60 leading-snug mt-0.5">Suivi par lot, DCI, rayon</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-500/15 border border-emerald-500/30 p-2">
                    <CalendarClock className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-emerald-100">Planning des gardes</p>
                    <p className="text-[12px] text-emerald-300/60 leading-snug mt-0.5">Vacations confirmées SoBAPS</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#06231c]">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
        </div>
      }
    >
      <ProConnexionPageInner />
    </Suspense>
  )
}
