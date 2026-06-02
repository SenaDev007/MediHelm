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
  User,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
} from 'lucide-react'

export default function PatientInscriptionPage() {
  const router = useRouter()

  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [telephone, setTelephone] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nom || !prenom || !telephone || !motDePasse) {
      setError('Veuillez remplir tous les champs obligatoires')
      return
    }

    if (motDePasse !== confirmation) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (motDePasse.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }

    setIsLoading(true)
    try {
      const res = await fetch('/api/patient/comptes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom,
          prenom,
          telephone,
          email: email || null,
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
        setError(err.error || 'Erreur lors de la création du compte')
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
            Créez votre compte patient MédiHelm
          </p>
        </div>

        {/* Registration Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <User className="h-5 w-5" style={{ color: '#1D9E75' }} />
              Inscription Patient
            </CardTitle>
            <CardDescription>
              Créez votre compte pour accéder à vos données de santé
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

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="prenom">Prénom *</Label>
                  <Input
                    id="prenom"
                    placeholder="Fatou"
                    value={prenom}
                    onChange={(e) => setPrenom(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nom">Nom *</Label>
                  <Input
                    id="nom"
                    placeholder="Agossou"
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Telephone */}
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone *</Label>
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
                <p className="text-xs text-muted-foreground">
                  Votre numéro de téléphone est votre identifiant unique
                </p>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email (optionnel)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="fatou@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="motDePasse">Mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="motDePasse"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Au moins 6 caractères"
                    value={motDePasse}
                    onChange={(e) => setMotDePasse(e.target.value)}
                    className="pl-9 pr-10"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
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

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmer le mot de passe *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmation"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Retapez le mot de passe"
                    value={confirmation}
                    onChange={(e) => setConfirmation(e.target.value)}
                    className="pl-9"
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                  />
                </div>
                {confirmation && motDePasse !== confirmation && (
                  <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {/* Benefits */}
              <div className="p-3 rounded-lg space-y-1.5" style={{ background: '#E1F5EE' }}>
                <p className="text-xs font-medium" style={{ color: '#085041' }}>
                  Avec votre compte patient MédiHelm :
                </p>
                <ul className="space-y-1">
                  {[
                    'Consultez votre historique d\'achats',
                    'Suivez vos ordonnances',
                    'Recevez des rappels de médicaments',
                    'Comparez les prix en pharmacie',
                    'Gérez vos vaccinations',
                  ].map((item, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="h-3 w-3 shrink-0" style={{ color: '#1D9E75' }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                style={{ background: '#1D9E75' }}
                disabled={isLoading || !nom || !prenom || !telephone || !motDePasse}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Créer mon compte
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Login link */}
        <div className="text-center">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => router.push('/patient/connexion')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Déjà un compte ? Se connecter
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
