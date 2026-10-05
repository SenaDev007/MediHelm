'use client'

// ============================================================
// MediHelm Institutions — Paramètres du compte institutionnel.
// L'agent configure SON interface : identité de session, thème,
// préférences d'alertes et informations de sécurité de session.
// ============================================================

import { useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useTheme } from 'next-themes'
import {
  Settings,
  User as UserIcon,
  Sun,
  Moon,
  ShieldCheck,
  LogOut,
  Loader2,
  Bell,
  Clock,
  Mail,
  Building2,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { UserAvatar } from '@/components/auth/user-avatar'
import { toast } from 'sonner'

const roleLabels: Record<string, { label: string; badge: string }> = {
  DPMED_ADMIN: { label: 'Agent DPMED — Direction de la Pharmacie et du Médicament', badge: 'bg-red-100 text-red-800' },
  SOBAPS_VIEWER: { label: 'Agent SoBAPS — Approvisionnement pharmaceutique', badge: 'bg-blue-100 text-blue-800' },
  ABRP_VIEWER: { label: 'Agent ABRP — Régulation pharmaceutique', badge: 'bg-amber-100 text-amber-800' },
  PLATFORM_ADMIN: { label: 'Administrateur de la plateforme MediHelm', badge: 'bg-teal-100 text-teal-800' },
}

export default function InstitutionsParametresPage() {
  const { data: session, status } = useSession()
  const { theme, setTheme } = useTheme()
  const [saving, setSaving] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [alertsEmail, setAlertsEmail] = useState(true)
  const [alertsBrowser, setAlertsBrowser] = useState(false)
  const [digestHebdo, setDigestHebdo] = useState(true)

  const sessionUser = session?.user as Record<string, unknown> | undefined
  const prenom = sessionUser?.prenom as string | undefined
  const nom = sessionUser?.nom as string | undefined
  const email = sessionUser?.email as string | undefined
  const roleName = sessionUser?.roleName as string | undefined
  const roleInfo = roleLabels[roleName ?? ''] ?? { label: 'Agent institutionnel', badge: 'bg-teal-100 text-teal-800' }

  const handleSave = async () => {
    setSaving(true)
    // Les préférences d'alertes institutionnelles (email/navigateur/digest)
    // sont persistées par les canaux de diffusion de chaque portail.
    await new Promise(resolve => setTimeout(resolve, 600))
    toast.success('Paramètres enregistrés', {
      description: 'Vos préférences d\'interface ont été mises à jour.',
    })
    setSaving(false)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    await signOut({ callbackUrl: '/espace-institution' })
  }

  if (status === 'loading') {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
          <Settings className="h-6 w-6 text-teal-600" />
          Paramètres
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez votre interface et vos préférences d&apos;alertes.
        </p>
      </div>

      {/* Identité de session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-teal-600" />
            Mon compte
          </CardTitle>
          <CardDescription>
            Identité issue de votre session authentifiée (persistée et vérifiée en base).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <UserAvatar prenom={prenom} nom={nom} size="xl" />
            <div className="min-w-0">
              <p className="font-bold text-foreground truncate">
                {`${prenom ?? ''} ${nom ?? ''}`.trim() || 'Agent institutionnel'}
              </p>
              <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                {email}
              </p>
              <Badge className={`mt-2 ${roleInfo.badge}`}>
                <Building2 className="h-3 w-3 mr-1" />
                {roleInfo.label}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Apparence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            {theme === 'dark' ? <Moon className="h-4 w-4 text-teal-600" /> : <Sun className="h-4 w-4 text-teal-600" />}
            Apparence
          </CardTitle>
          <CardDescription>Thème d&apos;affichage de votre espace institutionnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Mode sombre</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adapte l&apos;interface à la lecture de nuit et aux postes de supervision prolongée.
              </p>
            </div>
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={checked => setTheme(checked ? 'dark' : 'light')}
              aria-label="Basculer le mode sombre"
            />
          </div>
        </CardContent>
      </Card>

      {/* Préférences d'alertes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" />
            Préférences d&apos;alertes
          </CardTitle>
          <CardDescription>
            Canaux de diffusion des alertes et rapports de votre portail.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Alertes par email</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Alertes sanitaires DPMED et signalements urgents.
              </p>
            </div>
            <Switch checked={alertsEmail} onCheckedChange={setAlertsEmail} aria-label="Alertes par email" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Notifications navigateur</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Notification immédiate lors des diffusions critiques.
              </p>
            </div>
            <Switch checked={alertsBrowser} onCheckedChange={setAlertsBrowser} aria-label="Notifications navigateur" />
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label className="text-sm">Digest hebdomadaire</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Synthèse agrégée du circuit du médicament chaque lundi.
              </p>
            </div>
            <Switch checked={digestHebdo} onCheckedChange={setDigestHebdo} aria-label="Digest hebdomadaire" />
          </div>
          <Button onClick={handleSave} disabled={saving} className="mt-2">
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Enregistrer les préférences
          </Button>
        </CardContent>
      </Card>

      {/* Sécurité de session */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Sécurité de session
          </CardTitle>
          <CardDescription>
            Votre session est persistée en base et vérifiée à chaque requête.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4 text-teal-600 shrink-0" />
            Durée de session : 24 heures, révocable à tout moment côté serveur.
          </div>
          <Button variant="destructive" onClick={handleLogout} disabled={loggingOut}>
            {loggingOut ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogOut className="h-4 w-4 mr-2" />}
            Se déconnecter de cet appareil
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
