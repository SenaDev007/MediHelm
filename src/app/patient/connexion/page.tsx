'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function ConnexionPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError('Veuillez saisir votre adresse email')
      return
    }
    if (!password.trim()) {
      setError('Veuillez saisir votre mot de passe')
      return
    }

    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      })

      if (result?.error) {
        switch (result.error) {
          case 'Identifiants invalides':
            setError('Email ou mot de passe incorrect')
            break
          case 'Compte désactivé. Contactez votre administrateur.':
            setError('Votre compte a été désactivé. Contactez le support.')
            break
          case 'Pharmacie désactivée. Contactez le support MédiHelm.':
            setError('La pharmacie associée est désactivée. Contactez le support.')
            break
          default:
            setError('Erreur de connexion. Vérifiez vos identifiants.')
        }
      } else if (result?.ok) {
        router.push('/patient')
        router.refresh()
      }
    } catch {
      setError('Une erreur est survenue. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* Logo & Header */}
        <div className="text-center mb-6">
          <Image src="/logo-MediHelm-01.png" alt="MédiHelm" width={56} height={56} className="mx-auto mb-3" />
          <h1 className="text-xl font-bold text-teal-800">Connexion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accédez à votre espace patient MédiHelm
          </p>
          <Badge variant="secondary" className="mt-2 bg-teal-50 text-teal-800 border-0 text-xs">
            100% Gratuit
          </Badge>
        </div>

        {/* Login Form */}
        <Card className="border-teal-200">
          <CardContent className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
                >
                  <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{error}</p>
                </motion.div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium text-gray-900">
                  Adresse email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="votre@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null) }}
                    className="pl-10 h-11 border-teal-200 focus:border-primary focus:ring-primary"
                    autoComplete="email"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-gray-900">
                    Mot de passe
                  </Label>
                  <Link
                    href="/mot-de-passe-oublie"
                    className="text-[11px] text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Votre mot de passe"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null) }}
                    className="pl-10 pr-10 h-11 border-teal-200 focus:border-primary focus:ring-primary"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-teal-700 text-sm font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <Separator className="my-4 bg-teal-100" />

            {/* Register link */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Pas encore de compte ?{' '}
                <Link href="/patient/inscription" className="text-primary font-semibold hover:underline">
                  Créer un compte
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Back link */}
        <div className="text-center mt-4">
          <Link
            href="/patient"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour à l&apos;accueil
          </Link>
        </div>

        {/* Info section */}
        <div className="mt-6 space-y-2">
          <p className="text-[10px] text-muted-foreground text-center">
            En vous connectant, vous acceptez nos conditions d&apos;utilisation
            et notre politique de confidentialité.
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            <span>🔒 Données sécurisées</span>
            <span>🇧🇯 Conforme Bénin</span>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
