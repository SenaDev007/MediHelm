'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Landmark, Radar, FileCheck2, LockKeyhole } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpaceLogin } from '@/components/auth/use-space-login'

// ─── Formulaire (composant interne — Suspense pour useSearchParams) ─────────
function InstitutionLoginForm() {
  const login = useSpaceLogin()

  return (
    <form onSubmit={login.submit} className="space-y-5">
      {login.error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg bg-blue-50 border border-blue-200 p-3.5 flex items-start gap-2.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] leading-snug text-blue-900">{login.error}</p>
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-semibold text-blue-950">
          Email institutionnel
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-blue-400" />
          <Input
            id="email"
            type="email"
            placeholder="agent@institution.gouv.bj"
            value={login.email}
            onChange={e => login.setEmail(e.target.value)}
            className="h-[52px] pl-12 pr-4 rounded-lg border-blue-200 bg-white text-[15px] focus:border-blue-500 focus:ring-blue-200"
            autoComplete="email"
            disabled={login.loading}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-[13px] font-semibold text-blue-950">
            Mot de passe
          </Label>
          <Link href="/mot-de-passe-oublie" className="text-[12px] font-medium text-blue-700 hover:text-blue-900 hover:underline">
            Oublié ?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-blue-400" />
          <Input
            id="password"
            type={login.showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={login.password}
            onChange={e => login.setPassword(e.target.value)}
            className="h-[52px] pl-12 pr-12 rounded-lg border-blue-200 bg-white text-[15px] focus:border-blue-500 focus:ring-blue-200"
            autoComplete="current-password"
            disabled={login.loading}
            required
          />
          <button
            type="button"
            onClick={login.togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-700"
            aria-label={login.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {login.showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={login.loading}
        className="w-full h-[52px] rounded-lg bg-gradient-to-r from-blue-800 to-blue-600 hover:from-blue-900 hover:to-blue-700 text-[15px] font-bold text-white shadow-xl shadow-blue-800/25 transition-all"
      >
        {login.loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connexion en cours…
          </>
        ) : (
          'Accéder à mon portail'
        )}
      </Button>

      <p className="text-center text-[13px] text-blue-900/60">
        Institution partenaire sans accès ?{' '}
        <a href="mailto:partenariat@medihelm.bj" className="font-bold text-blue-800 hover:text-blue-950 hover:underline">
          Demander une convention
        </a>
      </p>
    </form>
  )
}

function InstitutionConnexionPageInner() {
  return (
    <div className="min-h-screen bg-[#0a1e3d]">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* ─── COLONNE GAUCHE : formulaire officiel ─────────────────────────── */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 xl:px-28 bg-gradient-to-br from-[#0a1e3d] via-[#0d2750] to-[#0a1e3d]">
          {/* Filet doré institutionnel */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />

          <div className="relative mx-auto w-full max-w-md">

            {/* En-tête de marque — traitement officiel */}
            <div className="mb-10">
              <Link href="/espace-institution" className="inline-flex items-center gap-3.5 group">
                <div className="relative h-[54px] w-[54px] overflow-hidden rounded-full border-2 border-blue-300/40 shadow-lg shadow-blue-950/50 p-[3px]">
                  <Image src="/logo-MediHelm-01.png" alt="MediHelm" fill className="object-cover rounded-full" sizes="54px" />
                </div>
                <div>
                  <p className="text-[17px] font-black tracking-tight text-blue-50 leading-none">
                    MediHelm <span className="text-blue-300">Institution</span>
                  </p>
                  <p className="text-[10.5px] font-bold tracking-[0.16em] text-blue-400 uppercase mt-1">
                    Observation du circuit du médicament
                  </p>
                </div>
              </Link>
            </div>

            {/* Titre */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 border border-blue-400/30 px-3 py-1 mb-4">
                <LockKeyhole className="h-3.5 w-3.5 text-blue-300" />
                <span className="text-[11px] font-bold text-blue-200 tracking-wide">Accès conventionné — gratuit</span>
              </div>
              <h1 className="text-[30px] sm:text-[34px] font-black tracking-tight text-blue-50 leading-[1.12]">
                Portails des<br />
                <span className="text-blue-300">institutions partenaires</span>
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-blue-200/60">
                Alertes sanitaires, pharmacovigilance, confirmations de livraisons
                et agrégats anonymisés du circuit national du médicament.
              </p>
            </div>

            {/* Formulaire */}
            <InstitutionLoginForm />

            {/* Mentions des portails partenaires */}
            <div className="mt-8 pt-6 border-t border-blue-800/60">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300/80">
                  <Radar className="h-3.5 w-3.5 text-blue-400" />
                  DPMED
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300/80">
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
                  SoBAPS
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300/80">
                  <Landmark className="h-3.5 w-3.5 text-blue-400" />
                  ABRP
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-300/80">
                  <FileCheck2 className="h-3.5 w-3.5 text-blue-400" />
                  Ordre des pharmaciens
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── COLONNE DROITE : univers institutionnel ──────────────────────── */}
        <div className="relative hidden lg:block overflow-hidden border-l border-blue-800/50">
          <Image
            src="/images/login/institution-bg.jpg"
            alt="Observatoire de santé publique en verre au coucher du soleil"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 48vw, 0px"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-blue-950/25 via-blue-950/50 to-[#0a1e3d]/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#061630]/90 via-transparent to-blue-950/20" />

          {/* Bloc mission */}
          <div className="absolute bottom-10 right-10 w-[320px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="rounded-2xl border border-blue-700/60 bg-[#0a1e3d]/90 backdrop-blur-xl p-6 shadow-2xl shadow-blue-950/50"
            >
              <p className="text-[11px] font-bold tracking-[0.14em] text-blue-300 uppercase">
                Missions de service public
              </p>
              <p className="mt-3 text-[15px] font-bold text-blue-50 leading-relaxed">
                « Une observation fine, en temps réel, du circuit national du médicament. »
              </p>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-blue-200/70">
                  <Radar className="h-4 w-4 text-blue-400 shrink-0" />
                  Diffusion des alertes sanitaires
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-blue-200/70">
                  <FileCheck2 className="h-4 w-4 text-blue-400 shrink-0" />
                  Traçabilité des livraisons publiquées
                </div>
                <div className="flex items-center gap-2.5 text-[12.5px] font-medium text-blue-200/70">
                  <Landmark className="h-4 w-4 text-blue-400 shrink-0" />
                  Statistiques agrégées & anonymisées
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function InstitutionConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#0a1e3d]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-300" />
        </div>
      }
    >
      <InstitutionConnexionPageInner />
    </Suspense>
  )
}
