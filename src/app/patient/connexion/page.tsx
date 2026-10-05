'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, HeartPulse, MapPin, Building2, Sparkles, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpaceLogin } from '@/components/auth/use-space-login'

// ─── Formulaire (composant interne — Suspense pour useSearchParams) ─────────
function PatientLoginForm() {
  const login = useSpaceLogin()

  return (
    <form onSubmit={login.submit} className="space-y-5">
      {login.error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] leading-snug text-red-700">{login.error}</p>
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-semibold text-teal-950">
          Adresse email
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-teal-400" />
          <Input
            id="email"
            type="email"
            placeholder="votre@email.com"
            value={login.email}
            onChange={e => login.setEmail(e.target.value)}
            className="h-[52px] pl-12 pr-4 rounded-2xl border-teal-200 bg-white/90 text-[15px] focus:border-teal-500 focus:ring-teal-200 shadow-sm"
            autoComplete="email"
            disabled={login.loading}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-[13px] font-semibold text-teal-950">
            Mot de passe
          </Label>
          <Link href="/mot-de-passe-oublie" className="text-[12px] font-medium text-teal-700 hover:text-teal-900 hover:underline">
            Oublié ?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-teal-400" />
          <Input
            id="password"
            type={login.showPassword ? 'text' : 'password'}
            placeholder="Votre mot de passe"
            value={login.password}
            onChange={e => login.setPassword(e.target.value)}
            className="h-[52px] pl-12 pr-12 rounded-2xl border-teal-200 bg-white/90 text-[15px] focus:border-teal-500 focus:ring-teal-200 shadow-sm"
            autoComplete="current-password"
            disabled={login.loading}
            required
          />
          <button
            type="button"
            onClick={login.togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-teal-400 hover:text-teal-700"
            aria-label={login.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {login.showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={login.loading}
        className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-[15px] font-bold shadow-lg shadow-teal-600/25 transition-all"
      >
        {login.loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connexion en cours…
          </>
        ) : (
          <>
            Accéder à mon espace patient
            <ArrowRight className="h-[18px] w-[18px] ml-1.5" />
          </>
        )}
      </Button>

      <p className="text-center text-[13px] text-teal-900/70">
        Pas encore de compte ?{' '}
        <Link href="/patient/inscription" className="font-bold text-teal-700 hover:text-teal-900 hover:underline">
          Créer mon compte gratuit
        </Link>
      </p>
    </form>
  )
}

function PatientConnexionPageInner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-emerald-50/70">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* ─── COLONNE GAUCHE : formulaire ─────────────────────────────────── */}
        <div className="flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 xl:px-28">
          <div className="mx-auto w-full max-w-md">

            {/* En-tête de marque */}
            <div className="mb-9">
              <Link href="/" className="inline-flex items-center gap-3 group">
                <div className="relative h-12 w-12 overflow-hidden rounded-2xl border border-teal-100 shadow-sm">
                  <Image src="/logo-MediHelm-01.png" alt="MediHelm" fill className="object-cover" sizes="48px" />
                </div>
                <div>
                  <p className="text-[17px] font-black tracking-tight text-teal-950 leading-none">MediHelm</p>
                  <p className="text-[10.5px] font-semibold tracking-[0.14em] text-teal-600 uppercase mt-1">
                    L&apos;écosystème Santé de Confiance
                  </p>
                </div>
              </Link>
            </div>

            {/* Titre */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-teal-100/80 border border-teal-200 px-3 py-1 mb-4">
                <Sparkles className="h-3.5 w-3.5 text-teal-700" />
                <span className="text-[11px] font-bold text-teal-800 tracking-wide">Compte patient 100% gratuit</span>
              </div>
              <h1 className="text-[30px] sm:text-[34px] font-black tracking-tight text-teal-950 leading-[1.12]">
                Bon retour<br />parmi vos pharmacies
              </h1>
              <p className="mt-3 text-[14.5px] leading-relaxed text-teal-900/60">
                Retrouvez vos commandes, vos ordonnances, vos rappels de traitement
                et la pharmacie de garde la plus proche de vous.
              </p>
            </div>

            {/* Formulaire */}
            <PatientLoginForm />

            {/* Réassurance */}
            <div className="mt-8 pt-6 border-t border-teal-100/80 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-800/70">
                <HeartPulse className="h-3.5 w-3.5 text-teal-600" />
                Données de santé protégées
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-teal-800/70">
                <MapPin className="h-3.5 w-3.5 text-teal-600" />
                Tout le Bénin
              </span>
            </div>
          </div>
        </div>

        {/* ─── COLONNE DROITE : univers patient ─────────────────────────────── */}
        <div className="relative hidden lg:block overflow-hidden">
          <Image
            src="/images/login/patient-bg.jpg"
            alt="Patiente utilisant l'application MediHelm devant une pharmacie au Bénin"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 48vw, 0px"
          />
          {/* Voile dégradé vers le formulaire */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-50/95 via-teal-900/10 to-teal-950/45" />
          <div className="absolute inset-0 bg-gradient-to-t from-teal-950/55 via-transparent to-transparent" />

          {/* Carte flottante — repères patient */}
          <div className="absolute bottom-10 right-10 w-[300px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="rounded-3xl border border-white/50 bg-white/85 backdrop-blur-xl p-6 shadow-2xl shadow-teal-950/20"
            >
              <p className="text-[11px] font-bold tracking-[0.12em] text-teal-700 uppercase">
                Votre espace santé
              </p>
              <p className="mt-2 text-[19px] font-black text-teal-950 leading-snug">
                345+ officines géolocalisées
              </p>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center gap-2.5 text-[13px] font-medium text-teal-900/80">
                  <Building2 className="h-4 w-4 text-teal-600 shrink-0" />
                  12 départements couverts
                </div>
                <div className="flex items-center gap-2.5 text-[13px] font-medium text-teal-900/80">
                  <MapPin className="h-4 w-4 text-teal-600 shrink-0" />
                  Pharmacie de garde en temps réel
                </div>
                <div className="flex items-center gap-2.5 text-[13px] font-medium text-teal-900/80">
                  <HeartPulse className="h-4 w-4 text-teal-600 shrink-0" />
                  Rappels de traitement intelligents
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PatientConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-teal-50">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      }
    >
      <PatientConnexionPageInner />
    </Suspense>
  )
}
