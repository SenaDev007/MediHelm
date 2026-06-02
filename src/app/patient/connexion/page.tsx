'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/medihelm/Logo'
import {
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Shield,
  ArrowRight,
} from 'lucide-react'

export default function PatientConnexionPage() {
  const router = useRouter()

  const [telephone, setTelephone] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!telephone || !motDePasse) {
      setError('Veuillez remplir tous les champs')
      return
    }

    setIsLoading(true)
    try {
      // Authenticate via the patient comptes API
      const res = await fetch('/api/patient/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'login',
          telephone,
          motDePasse,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        // Store session in localStorage
        localStorage.setItem('patientSession', JSON.stringify({
          id: data.id,
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone,
          email: data.email,
        }))
        router.push('/patient')
      } else {
        const err = await res.json()
        setError(err.error || 'Identifiants invalides')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-[#E1F5EE]/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground text-center">
            Espace Patient MédiHelm
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5" style={{ color: '#1D9E75' }} />
              Connexion Patient
            </CardTitle>
            <CardDescription>
              Connectez-vous pour accéder à votre espace santé
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Telephone */}
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="telephone"
                    type="tel"
                    placeholder="+229 97 00 00 00"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                style={{ background: '#1D9E75' }}
                disabled={isLoading || !telephone || !motDePasse}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  <>
                    Se connecter
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register link */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Pas encore de compte ?{' '}
            <Button
              variant="link"
              className="p-0 h-auto text-[#1D9E75]"
              onClick={() => router.push('/patient/inscription')}
            >
              Créer un compte
            </Button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          MédiHelm © {new Date().getFullYear()} — YEHI OR Tech
        </p>
      </div>
    </div>
  )
}
