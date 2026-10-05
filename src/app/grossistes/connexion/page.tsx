'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, Truck, Boxes, Network, Handshake, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSpaceLogin } from '@/components/auth/use-space-login'

// ─── Formulaire (composant interne — Suspense pour useSearchParams) ─────────
function GrossisteLoginForm() {
  const login = useSpaceLogin()

  return (
    <form onSubmit={login.submit} className="space-y-5">
      {login.error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 flex items-start gap-2.5"
          role="alert"
        >
          <AlertCircle className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-[13px] leading-snug text-amber-900">{login.error}</p>
        </motion.div>
      )}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-[13px] font-semibold text-slate-800">
          Email professionnel
        </Label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
          <Input
            id="email"
            type="email"
            placeholder="contact@grossiste-répartiteur.bj"
            value={login.email}
            onChange={e => login.setEmail(e.target.value)}
            className="h-[52px] pl-12 pr-4 rounded-lg border-slate-300 bg-white text-[15px] focus:border-amber-500 focus:ring-amber-200"
            autoComplete="email"
            disabled={login.loading}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-[13px] font-semibold text-slate-800">
            Mot de passe
          </Label>
          <Link href="/mot-de-passe-oublie" className="text-[12px] font-medium text-amber-700 hover:text-amber-900 hover:underline">
            Oublié ?
          </Link>
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-slate-400" />
          <Input
            id="password"
            type={login.showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={login.password}
            onChange={e => login.setPassword(e.target.value)}
            className="h-[52px] pl-12 pr-12 rounded-lg border-slate-300 bg-white text-[15px] focus:border-amber-500 focus:ring-amber-200"
            autoComplete="current-password"
            disabled={login.loading}
            required
          />
          <button
            type="button"
            onClick={login.togglePassword}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
            aria-label={login.showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {login.showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={login.loading}
        className="w-full h-[52px] rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-[15px] font-black text-white shadow-xl shadow-amber-600/25 transition-all uppercase tracking-wide"
      >
        {login.loading ? (
          <>
            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            Connexion en cours…
          </>
        ) : (
          'Entrer dans la plateforme'
        )}
      </Button>

      <p className="text-center text-[13px] text-slate-500">
        Grossiste-répartiteur sans compte ?{' '}
        <a href="mailto:partenariat@medihelm.bj" className="font-bold text-amber-700 hover:text-amber-900 hover:underline">
          Devenir partenaire
        </a>
      </p>
    </form>
  )
}

function GrossisteConnexionPageInner() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">

        {/* ─── COLONNE GAUCHE : formulaire — style industriel ───────────────── */}
        <div className="relative flex flex-col justify-center px-6 py-10 sm:px-12 lg:px-20 xl:px-28 bg-slate-100">
          {/* Bande supérieure ambrée — signature industrielle */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-slate-800" />

          <div className="mx-auto w-full max-w-md">

            {/* En-tête de marque */}
            <div className="mb-10">
              <Link href="/espace-grossiste" className="inline-flex items-center gap-3 group">
                <div className="relative h-12 w-12 overflow-hidden rounded-xl border border-slate-300 shadow-md">
                  <Image src="/logo-MediHelm-01.png" alt="MediHelm" fill className="object-cover" sizes="48px" />
                </div>
                <div>
                  <p className="text-[17px] font-black tracking-tight text-slate-900 leading-none">
                    MediHelm <span className="text-amber-600">Grossiste</span>
                  </p>
                  <p className="text-[10.5px] font-bold tracking-[0.16em] text-slate-500 uppercase mt-1">
                    Distribution pharmaceutique
                  </p>
                </div>
              </Link>
            </div>

            {/* Titre — style cadre opérationnel */}
            <div className="mb-8 border-l-4 border-amber-500 pl-4">
              <h1 className="text-[28px] sm:text-[32px] font-black tracking-tight text-slate-900 leading-[1.12] uppercase">
                Plateforme de<br />distribution
              </h1>
              <p className="mt-2.5 text-[14px] leading-relaxed text-slate-600">
                Commandes entrantes, préparation des colis, tournées de livraison
                et suivi des officines clientes — votre logistique, sans accroc.
              </p>
            </div>

            {/* Formulaire */}
            <GrossisteLoginForm />

            {/* Réassurance */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <Truck className="h-3.5 w-3.5 text-amber-600" />
                Livraisons suivies en direct
              </span>
              <Link href="/espace-grossiste" className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-amber-700">
                <ArrowLeft className="h-3 w-3" />
                Présentation de l&apos;espace
              </Link>
            </div>
          </div>
        </div>

        {/* ─── COLONNE DROITE : univers entrepôt ────────────────────────────── */}
        <div className="relative hidden lg:block overflow-hidden">
          <Image
            src="/images/login/grossiste-bg.jpg"
            alt="Entrepôt de distribution pharmaceutique avec préparation de commandes"
            fill
            priority
            className="object-cover"
            sizes="(min-width: 1024px) 48vw, 0px"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-slate-900/20 via-slate-900/45 to-slate-100/95" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-900/20" />

          {/* Indicateurs opérationnels */}
          <div className="absolute bottom-10 right-10 w-[330px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.6 }}
              className="rounded-xl border border-slate-700/60 bg-slate-900/85 backdrop-blur-xl p-6 shadow-2xl shadow-black/50"
            >
              <p className="text-[11px] font-bold tracking-[0.14em] text-amber-400 uppercase">
                Chaîne de distribution
              </p>
              <div className="mt-4 space-y-3.5">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/15 border border-amber-500/40 p-2">
                    <Boxes className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-100">Catalogue & picking</p>
                    <p className="text-[12px] text-slate-400 leading-snug mt-0.5">G01 · G04 — préparation rapide</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/15 border border-amber-500/40 p-2">
                    <Truck className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-100">Tournées & livraisons</p>
                    <p className="text-[12px] text-slate-400 leading-snug mt-0.5">G05 — confirmations SoBAPS</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-500/15 border border-amber-500/40 p-2">
                    <Network className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-[13.5px] font-bold text-slate-100">API répartiteurs</p>
                    <p className="text-[12px] text-slate-400 leading-snug mt-0.5">Webhooks UbiPharm · Promopharma</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-slate-700/60 flex items-center gap-2">
                <Handshake className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-semibold text-slate-300">Offres sur devis commercial</span>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function GrossisteConnexionPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <Loader2 className="h-8 w-8 animate-spin text-amber-600" />
        </div>
      }
    >
      <GrossisteConnexionPageInner />
    </Suspense>
  )
}
