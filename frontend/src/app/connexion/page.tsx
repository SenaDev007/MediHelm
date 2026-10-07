'use client'

import { Suspense, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/medihelm/Logo'
import { Shield, Eye, EyeOff, Loader2, AlertCircle, User, Store, Truck, Landmark } from 'lucide-react'

/** Les 4 espaces MediHelm — chacun avec SA page de connexion dédiée. */
const espacesMediHelm = [
  {
    icon: User,
    label: 'Espace patient',
    description: 'Compte gratuit',
    href: '/patient/connexion',
  },
  {
    icon: Store,
    label: 'Espace pharmacie (Pro)',
    description: 'Gestion d’officine',
    href: '/pro/connexion',
  },
  {
    icon: Truck,
    label: 'Espace grossiste',
    description: 'Distribution',
    href: '/grossistes/connexion',
  },
  {
    icon: Landmark,
    label: 'Espace institutionnel',
    description: 'DPMED · SoBAPS · ABRP',
    href: '/institutions/connexion',
  },
]

function ConnexionForm() {
  const searchParams = useSearchParams()
  const explicitCallbackUrl = searchParams.get('callbackUrl')
  const error = searchParams.get('error')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(
    error === 'CredentialsSignin'
      ? 'Email ou mot de passe incorrect'
      : error
        ? 'Une erreur est survenue lors de la connexion'
        : null
  )

  /**
   * Redirige vers l'espace correspondant au rôle de l'utilisateur.
   * Chaque espace MediHelm a sa destination : patient → /patient,
   * grossiste → /grossistes, institution → /institutions,
   * pharmacie → /pro, plateforme → /admin.
   */
  function destinationForRole(roleName: string | undefined | null): string {
    switch (roleName) {
      case 'PLATFORM_ADMIN':
        return '/admin'
      case 'PATIENT':
        return '/patient'
      case 'GROSSISTE_PARTNER':
      case 'GROSSISTE_ADMIN':
      case 'GROSSISTE_COMMANDES':
      case 'GROSSISTE_PREPARATEUR':
      case 'GROSSISTE_LIVREUR':
      case 'GROSSISTE_COMMERCIAL':
      case 'GROSSISTE_COMPTABLE':
        return '/grossistes'
      case 'DPMED_ADMIN':
      case 'SOBAPS_VIEWER':
      case 'ABRP_VIEWER':
        return '/institutions'
      default:
        // Rôles pharmacie : ADMIN, DIRECTEUR, PHARMACIEN, CAISSIER,
        // MAGASINIER, COMPTABLE, STAGIAIRE, PROMOTEUR
        return '/pro'
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    setAuthError(null)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setAuthError(
          result.error === 'CredentialsSignin'
            ? 'Email ou mot de passe incorrect'
            : result.error
        )
      } else if (result?.ok) {
        // Récupère la session pour router vers l'espace du rôle
        let destination = '/pro'
        try {
          const res = await fetch('/api/auth/session')
          if (res.ok) {
            const session = await res.json()
            const roleName = (session?.user as Record<string, unknown> | undefined)?.roleName as string | undefined
            destination = destinationForRole(roleName)
          }
        } catch {
          // Session illisible — destination par défaut conservée
        }
        // Un callbackUrl explicite (demande d'origine) prime sur le routage par rôle
        const callbackUrl = explicitCallbackUrl
        if (callbackUrl && callbackUrl.startsWith('/') && !callbackUrl.startsWith('//')) {
          destination = callbackUrl
        }
        // Navigation COMPLÈTE post-connexion : garantit que le cookie de session
        // fraîchement émis accompagne la requête suivante (middleware + RSC) —
        // router.push peut perdre la course contre l'installation du cookie.
        window.location.assign(destination)
      }
    } catch {
      setAuthError('Erreur de connexion au serveur')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo />
          <p className="text-sm text-muted-foreground text-center">
            L&apos;écosystème Santé de Confiance
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-border/50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Connexion
            </CardTitle>
            <CardDescription>
              Entrez vos identifiants pour accéder à votre espace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error alert */}
              {authError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{authError}</AlertDescription>
                </Alert>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@medihelm.bj"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="pr-10"
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
                disabled={isLoading || !email || !password}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Séparateur des 4 espaces — chaque espace possède son propre
            workflow d’authentification ; cette page générique sert surtout
            d’accueil administrateur plateforme et de point de chute des
            liens hérités : on y oriente l’utilisateur vers le formulaire
            de SON espace. */}
        <Card className="shadow-sm border-border/50">
          <CardHeader className="pb-3 text-center">
            <CardDescription className="text-[13px]">
              Les 4 écosystèmes MediHelm ont chacun leur propre espace
              sécurisé — accédez au vôtre :
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {espacesMediHelm.map((espace) => (
              <a
                key={espace.href}
                href={espace.href}
                className="group flex items-center gap-3 rounded-xl border border-teal-100 hover:border-teal-300 bg-teal-50/40 hover:bg-teal-50 px-3.5 py-3 transition-colors"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white border border-teal-200 text-teal-700 group-hover:border-teal-400">
                  <espace.icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold text-teal-950 truncate">
                    {espace.label}
                  </span>
                  <span className="block text-[11.5px] text-muted-foreground truncate">
                    {espace.description}
                  </span>
                </span>
              </a>
            ))}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-xs text-center text-muted-foreground">
          MediHelm © {new Date().getFullYear()} — YEHI OR Tech
        </p>
      </div>
    </div>
  )
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1D9E75]" />
      </div>
    }>
      <ConnexionForm />
    </Suspense>
  )
}
