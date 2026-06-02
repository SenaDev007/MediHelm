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
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

export default function MotDePasseOubliePage() {
  const router = useRouter()

  // Step 1: Enter email
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 2: Email sent confirmation
  const [emailSent, setEmailSent] = useState(false)
  const [demoToken, setDemoToken] = useState<string | null>(null)

  // Step 3: Reset with token (demo mode)
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email) {
      setError('Veuillez entrer votre adresse email')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        const data = await res.json()
        setEmailSent(true)
        // Demo mode: capture the token
        if (data._demoToken) {
          setDemoToken(data._demoToken)
          setToken(data._demoToken)
        }
      } else {
        const err = await res.json()
        setError(err.error || 'Erreur lors de la demande')
      }
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetError(null)

    if (!token || !newPassword || !confirmPassword) {
      setResetError('Veuillez remplir tous les champs')
      return
    }

    if (newPassword !== confirmPassword) {
      setResetError('Les mots de passe ne correspondent pas')
      return
    }

    if (newPassword.length < 6) {
      setResetError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setResetLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email,
          newPassword,
        }),
      })

      if (res.ok) {
        setResetSuccess(true)
      } else {
        const err = await res.json()
        setResetError(err.error || 'Erreur lors de la réinitialisation')
      }
    } catch {
      setResetError('Erreur de connexion au serveur')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground text-center">
            Réinitialisation du mot de passe
          </p>
        </div>

        {/* Success state */}
        {resetSuccess ? (
          <Card className="shadow-lg border-border/50">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: '#E1F5EE' }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: '#1D9E75' }} />
                </div>
              </div>
              <h2 className="text-lg font-semibold" style={{ color: '#085041' }}>
                Mot de passe mis à jour !
              </h2>
              <p className="text-sm text-muted-foreground">
                Votre mot de passe a été réinitialisé avec succès.
                Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.
              </p>
              <Button
                className="w-full"
                style={{ background: '#1D9E75' }}
                onClick={() => router.push('/connexion')}
              >
                Se connecter
              </Button>
            </CardContent>
          </Card>
        ) : !emailSent ? (
          /* Step 1: Enter email */
          <Card className="shadow-lg border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <KeyRound className="h-5 w-5" style={{ color: '#1D9E75' }} />
                Mot de passe oublié ?
              </CardTitle>
              <CardDescription>
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRequestReset} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@medihelm.bj"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                      disabled={isLoading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  style={{ background: '#1D9E75' }}
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    'Envoyer le lien de réinitialisation'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Step 2: Email sent + Demo reset form */
          <Card className="shadow-lg border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Mail className="h-5 w-5" style={{ color: '#1D9E75' }} />
                Vérifiez votre email
              </CardTitle>
              <CardDescription>
                Un email de réinitialisation a été envoyé à <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Demo mode notice */}
                {demoToken && (
                  <Alert className="border-amber-300 bg-amber-50">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Mode démo :</strong> L&apos;envoi d&apos;email n&apos;est pas configuré.
                      Votre jeton de réinitialisation est pré-rempli ci-dessous.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleConfirmReset} className="space-y-4">
                  {resetError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{resetError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="token">Jeton de réinitialisation</Label>
                    <Input
                      id="token"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Collez le jeton reçu par email"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="newPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Au moins 6 caractères"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pl-9 pr-10"
                        required
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

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Retapez le mot de passe"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-9"
                        required
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    style={{ background: '#1D9E75' }}
                    disabled={resetLoading || !token || !newPassword || !confirmPassword}
                  >
                    {resetLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Réinitialisation...
                      </>
                    ) : (
                      'Réinitialiser le mot de passe'
                    )}
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Back to login */}
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => router.push('/connexion')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour à la connexion
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          MédiHelm © {new Date().getFullYear()} — YEHI OR Tech
        </p>
      </div>
    </div>
  )
}
