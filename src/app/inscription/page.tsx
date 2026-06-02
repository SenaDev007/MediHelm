'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Logo } from '@/components/medihelm/Logo'
import {
  Building2,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  FileText,
  CreditCard,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

const planInfo = [
  {
    id: 'SEED',
    nom: 'Seed',
    prix: '19 900',
    description: 'Idéal pour démarrer',
    features: ['1-2 utilisateurs', '1 caisse', 'Stock basique', '500 Mo documents'],
  },
  {
    id: 'GROW',
    nom: 'Grow',
    prix: '34 900',
    description: 'Pour les pharmacies en croissance',
    features: ['5 utilisateurs', '2 caisses', 'API grossistes', '1 Go documents'],
  },
  {
    id: 'LEAD',
    nom: 'Lead',
    prix: '54 900',
    description: 'Solution complète',
    features: ['10 utilisateurs', '4 caisses', 'Analytics IA', '5 Go documents'],
  },
  {
    id: 'NETWORK',
    nom: 'Network',
    prix: 'Sur devis',
    description: 'Pour les réseaux de pharmacies',
    features: ['Utilisateurs illimités', 'Caisses illimitées', 'API complète', 'Stockage illimité'],
  },
]

const departements = [
  'Littoral', 'Atlantique', 'Ouémé', 'Plateau', 'Zou',
  'Collines', 'Borgou', 'Alibori', 'Atacora', 'Donga', 'Couffo', 'Mono',
]

export default function InscriptionPage() {
  const router = useRouter()

  // Pharmacy fields
  const [nomPharmacie, setNomPharmacie] = useState('')
  const [adresse, setAdresse] = useState('')
  const [ville, setVille] = useState('')
  const [departement, setDepartement] = useState('')
  const [telephone, setTelephone] = useState('')
  const [emailPharmacie, setEmailPharmacie] = useState('')
  const [numeroAgrement, setNumeroAgrement] = useState('')
  const [plan, setPlan] = useState('SEED')
  const [periodeFacturation, setPeriodeFacturation] = useState('MENSUEL')

  // Admin user fields
  const [nom, setNom] = useState('')
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // State
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (!nomPharmacie || !adresse || !ville || !departement || !telephone || !numeroAgrement) {
      setError('Veuillez remplir tous les champs de la pharmacie')
      return
    }
    if (!nom || !prenom || !email || !motDePasse) {
      setError('Veuillez remplir tous les champs de l\'administrateur')
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

    setIsSubmitting(true)

    try {
      // 1. Create pharmacy
      const planLimits: Record<string, { nbUtilisateursMax: number; nbCaissiersSimut: number; stockageDocuments: number; apiGrossistesMax: number }> = {
        SEED: { nbUtilisateursMax: 2, nbCaissiersSimut: 1, stockageDocuments: 500, apiGrossistesMax: 0 },
        GROW: { nbUtilisateursMax: 5, nbCaissiersSimut: 2, stockageDocuments: 1024, apiGrossistesMax: 2 },
        LEAD: { nbUtilisateursMax: 10, nbCaissiersSimut: 4, stockageDocuments: 5120, apiGrossistesMax: 5 },
        NETWORK: { nbUtilisateursMax: 50, nbCaissiersSimut: 10, stockageDocuments: 20480, apiGrossistesMax: 10 },
      }
      const limits = planLimits[plan] || planLimits.SEED

      const pharmacieRes = await fetch('/api/pharmacies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: nomPharmacie,
          adresse,
          ville,
          departement,
          telephone,
          email: emailPharmacie || null,
          numeroAgrement,
          plan,
          statutAbonnement: 'ESSAI',
          periodeFacturation,
          nbUtilisateursMax: limits.nbUtilisateursMax,
          nbCaissiersSimut: limits.nbCaissiersSimut,
          stockageDocuments: limits.stockageDocuments,
          apiGrossistesMax: limits.apiGrossistesMax,
          dateDebutEssai: new Date().toISOString(),
          dateFinEssai: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })

      if (!pharmacieRes.ok) {
        const err = await pharmacieRes.json()
        throw new Error(err.error || 'Erreur lors de la création de la pharmacie')
      }

      const pharmacie = await pharmacieRes.json()

      // 2. Create admin user via the register endpoint (handles password hashing + role lookup)
      const userRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          email,
          motDePasse,
          nom,
          prenom,
          telephone,
          roleName: 'DIRECTEUR',
        }),
      })

      if (!userRes.ok) {
        const err = await userRes.json()
        throw new Error(err.error || 'Erreur lors de la création du compte')
      }

      // Success — redirect to login
      router.push('/connexion?registered=1')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold mt-4" style={{ color: '#085041' }}>
            Créez votre espace MédiHelm
          </h1>
          <p className="text-muted-foreground mt-1">
            Inscrivez votre pharmacie et commencez l&apos;essai gratuit de 14 jours
          </p>
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {planInfo.map((p) => (
            <button
              key={p.id}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                plan === p.id
                  ? 'border-[#1D9E75] bg-[#E1F5EE]'
                  : 'border-border hover:border-[#1D9E75]/50'
              }`}
              onClick={() => setPlan(p.id)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-sm" style={{ color: '#085041' }}>
                  {p.nom}
                </span>
                {plan === p.id && (
                  <CheckCircle2 className="h-4 w-4" style={{ color: '#1D9E75' }} />
                )}
              </div>
              <p className="text-lg font-bold" style={{ color: '#1D9E75' }}>
                {p.prix}
                {p.prix !== 'Sur devis' && (
                  <span className="text-xs font-normal text-muted-foreground"> FCFA/mois</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              <ul className="mt-2 space-y-0.5">
                {p.features.map((f, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5 shrink-0" style={{ color: '#1D9E75' }} />
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Pharmacy Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5" style={{ color: '#1D9E75' }} />
                  Informations de la pharmacie
                </CardTitle>
                <CardDescription>
                  Renseignez les détails de votre officine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nomPharmacie">Nom de la pharmacie *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="nomPharmacie"
                      placeholder="Pharmacie du Centre"
                      value={nomPharmacie}
                      onChange={(e) => setNomPharmacie(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adresse">Adresse *</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="adresse"
                      placeholder="12 Avenue de la République"
                      value={adresse}
                      onChange={(e) => setAdresse(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="ville">Ville *</Label>
                    <Input
                      id="ville"
                      placeholder="Cotonou"
                      value={ville}
                      onChange={(e) => setVille(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="departement">Département *</Label>
                    <Select value={departement} onValueChange={setDepartement}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        {departements.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telephone">Téléphone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="telephone"
                      placeholder="+229 97 00 00 00"
                      value={telephone}
                      onChange={(e) => setTelephone(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailPharmacie">Email (optionnel)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emailPharmacie"
                      type="email"
                      placeholder="contact@pharmacie.bj"
                      value={emailPharmacie}
                      onChange={(e) => setEmailPharmacie(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numeroAgrement">Numéro d&apos;agrément *</Label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="numeroAgrement"
                      placeholder="AGR-2024-XXX"
                      value={numeroAgrement}
                      onChange={(e) => setNumeroAgrement(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Facturation</Label>
                  <Select value={periodeFacturation} onValueChange={setPeriodeFacturation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MENSUEL">Mensuel</SelectItem>
                      <SelectItem value="ANNUEL">Annuel (2 mois offerts)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Admin User Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5" style={{ color: '#1D9E75' }} />
                  Compte administrateur
                </CardTitle>
                <CardDescription>
                  Créez le compte du responsable de la pharmacie
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="prenom">Prénom *</Label>
                    <Input
                      id="prenom"
                      placeholder="Aminou"
                      value={prenom}
                      onChange={(e) => setPrenom(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nom">Nom *</Label>
                    <Input
                      id="nom"
                      placeholder="Houénou"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="admin@pharmacie.bj"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

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
                    />
                  </div>
                  {confirmation && motDePasse !== confirmation && (
                    <p className="text-xs text-red-500">Les mots de passe ne correspondent pas</p>
                  )}
                </div>

                <Separator className="my-2" />

                <div className="p-3 rounded-lg" style={{ background: '#E1F5EE' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4" style={{ color: '#1D9E75' }} />
                    <span className="font-medium text-sm" style={{ color: '#085041' }}>
                      Récapitulatif
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plan</span>
                      <Badge variant="outline" style={{ color: '#1D9E75', borderColor: '#1D9E75' }}>
                        {planInfo.find((p) => p.id === plan)?.nom}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix</span>
                      <span className="font-semibold" style={{ color: '#085041' }}>
                        {planInfo.find((p) => p.id === plan)?.prix} FCFA
                        {plan !== 'NETWORK' && `/${periodeFacturation === 'ANNUEL' ? 'an' : 'mois'}`}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Essai gratuit</span>
                      <span className="text-[#1D9E75] font-medium">14 jours</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Submit */}
          <div className="mt-6 flex flex-col items-center gap-4">
            <Button
              type="submit"
              size="lg"
              className="w-full max-w-md h-12 text-base font-semibold"
              style={{ background: '#1D9E75' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création en cours...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Créer mon espace — Essai gratuit 14 jours
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              En créant votre compte, vous acceptez les conditions d&apos;utilisation de MédiHelm.
              <br />
              Vous ne serez pas facturé pendant la période d&apos;essai.
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
