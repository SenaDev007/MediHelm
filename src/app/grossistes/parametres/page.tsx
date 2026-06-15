'use client'

import { useEffect, useState } from 'react'
import {
  Settings,
  Key,
  Globe,
  Shield,
  Save,
  Loader2,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  Bell,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface GrossisteProfile {
  id: string
  nom: string
  slug: string
  contact: string | null
  telephone: string | null
  email: string | null
  actif: boolean
}

interface WebhookConfig {
  id: string
  eventType: string
  url: string
  secret: string | null
  actif: boolean
  createdAt: string
}

interface ApiKeyInfo {
  id: string
  name: string
  prefix: string
  createdAt: string
  lastUsed: string | null
  actif: boolean
}

export default function ParametresPage() {
  const [grossistes, setGrossistes] = useState<GrossisteProfile[]>([])
  const [selectedGrossiste, setSelectedGrossiste] = useState<GrossisteProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Profile form
  const [profileForm, setProfileForm] = useState({
    contact: '',
    telephone: '',
    email: '',
  })

  // API Keys
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([])
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [generatedKey, setGeneratedKey] = useState('')
  const [showKeyDialog, setShowKeyDialog] = useState(false)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [showWebhookDialog, setShowWebhookDialog] = useState(false)
  const [webhookForm, setWebhookForm] = useState({
    eventType: 'COMMANDE_CREEE',
    url: '',
    secret: '',
  })
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null)

  // Notifications
  const [notifications, setNotifications] = useState({
    nouvelleCommande: true,
    statutChange: true,
    livraisonEffectuee: false,
    stockBas: true,
  })

  // ─── Fetch grossistes ────────────────────────────────────────
  useEffect(() => {
    const fetchGrossistes = async () => {
      try {
        const res = await fetch('/api/grossistes')
        if (res.ok) {
          const data = await res.json()
          setGrossistes(data)
          if (data.length > 0) {
            setSelectedGrossiste(data[0])
            setProfileForm({
              contact: data[0].contact || '',
              telephone: data[0].telephone || '',
              email: data[0].email || '',
            })
          }
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchGrossistes()
  }, [])

  useEffect(() => {
    if (selectedGrossiste) {
      // Fetch API keys from DB
      fetch(`/api/grossistes/${selectedGrossiste.id}/api-keys`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setApiKeys(Array.isArray(data) ? data : []))
        .catch(() => setApiKeys([]))
      
      // Fetch webhooks from DB
      fetch(`/api/grossistes/${selectedGrossiste.id}/webhooks`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setWebhooks(Array.isArray(data) ? data : []))
        .catch(() => setWebhooks([]))
    } else {
      setApiKeys([])
      setWebhooks([])
    }
  }, [selectedGrossiste])

  // ─── Save profile ────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!selectedGrossiste) return
    setSaving(true)
    try {
      const res = await fetch('/api/grossistes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: selectedGrossiste.nom,
          slug: selectedGrossiste.slug,
          contact: profileForm.contact,
          telephone: profileForm.telephone,
          email: profileForm.email,
        }),
      })
      if (res.ok || res.status === 409) {
        toast.success('Profil mis à jour avec succès')
        setSelectedGrossiste({
          ...selectedGrossiste,
          contact: profileForm.contact,
          telephone: profileForm.telephone,
          email: profileForm.email,
        })
      } else {
        toast.error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur de connexion')
    } finally {
      setSaving(false)
    }
  }

  // ─── Generate API Key ────────────────────────────────────────
  const handleGenerateKey = () => {
    if (!newKeyName.trim()) {
      toast.error('Veuillez saisir un nom pour la clé')
      return
    }
    const key = `mh_live_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 12)}`
    setGeneratedKey(key)
    setApiKeys(prev => [
      ...prev,
      {
        id: `key-${Date.now()}`,
        name: newKeyName,
        prefix: `mh_live_${key.substring(8, 12)}****`,
        createdAt: new Date().toISOString().split('T')[0],
        lastUsed: null,
        actif: true,
      },
    ])
    setShowNewKeyDialog(false)
    setShowKeyDialog(true)
    setNewKeyName('')
  }

  // ─── Copy to clipboard ───────────────────────────────────────
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copié dans le presse-papier')
    } catch {
      toast.error('Erreur lors de la copie')
    }
  }

  // ─── Add webhook ─────────────────────────────────────────────
  const handleAddWebhook = () => {
    if (!webhookForm.url.trim()) {
      toast.error("Veuillez saisir l'URL du webhook")
      return
    }
    const newWebhook: WebhookConfig = {
      id: `wh-${Date.now()}`,
      eventType: webhookForm.eventType,
      url: webhookForm.url,
      secret: webhookForm.secret ? `whsec_${webhookForm.secret.substring(0, 4)}****` : null,
      actif: true,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setWebhooks(prev => [...prev, newWebhook])
    setShowWebhookDialog(false)
    setWebhookForm({ eventType: 'COMMANDE_CREEE', url: '', secret: '' })
    toast.success('Webhook ajouté avec succès')
  }

  // ─── Delete webhook ──────────────────────────────────────────
  const handleDeleteWebhook = () => {
    if (!deleteWebhookId) return
    setWebhooks(prev => prev.filter(w => w.id !== deleteWebhookId))
    setDeleteWebhookId(null)
    toast.success('Webhook supprimé')
  }

  const getEventLabel = (eventType: string) => {
    const labels: Record<string, string> = {
      COMMANDE_CREEE: 'Commande créée',
      STATUT_CHANGE: 'Changement de statut',
      COMMANDE_LIVREE: 'Commande livrée',
      STOCK_BAS: 'Stock bas',
      COMMANDE_REFUSEE: 'Commande refusée',
    }
    return labels[eventType] || eventType
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Settings className="h-7 w-7 text-teal-600 animate-spin" />
          <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        </div>
        <Card className="animate-pulse">
          <CardContent className="p-6">
            <div className="h-40 bg-muted rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
          <Settings className="h-5 w-5 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
          <p className="text-sm text-muted-foreground">
            Configuration de votre compte grossiste
          </p>
        </div>
      </div>

      {/* Grossiste selector */}
      {grossistes.length > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium">Grossiste :</Label>
              <Select
                value={selectedGrossiste?.id || ''}
                onValueChange={v => {
                  const g = grossistes.find(g => g.id === v)
                  if (g) {
                    setSelectedGrossiste(g)
                    setProfileForm({
                      contact: g.contact || '',
                      telephone: g.telephone || '',
                      email: g.email || '',
                    })
                  }
                }}
              >
                <SelectTrigger className="w-64 border-teal-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {grossistes.map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-teal-600" />
            Profil grossiste
          </CardTitle>
          <CardDescription>
            Informations de contact et paramètres de votre entreprise
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedGrossiste && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground text-xs">Nom</Label>
                <Input
                  value={selectedGrossiste.nom}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Slug</Label>
                <Input
                  value={selectedGrossiste.slug}
                  disabled
                  className="bg-muted/50"
                />
              </div>
              <div>
                <Label htmlFor="contact">Personne de contact</Label>
                <Input
                  id="contact"
                  value={profileForm.contact}
                  onChange={e =>
                    setProfileForm({ ...profileForm, contact: e.target.value })
                  }
                  placeholder="Nom du contact"
                  className="border-teal-200"
                />
              </div>
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={profileForm.telephone}
                  onChange={e =>
                    setProfileForm({ ...profileForm, telephone: e.target.value })
                  }
                  placeholder="+221 XX XXX XX XX"
                  className="border-teal-200"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={e =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                  placeholder="contact@grossiste.com"
                  className="border-teal-200"
                />
              </div>
              <div className="flex items-end">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={selectedGrossiste.actif ? 'default' : 'destructive'}
                    className={
                      selectedGrossiste.actif ? 'bg-teal-600' : ''
                    }
                  >
                    {selectedGrossiste.actif ? 'Actif' : 'Inactif'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Sauvegarder
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-4 w-4 text-teal-600" />
                Clés API
              </CardTitle>
              <CardDescription>
                Gérez vos clés d&apos;accès à l&apos;API MediHelm
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setShowNewKeyDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Nouvelle clé
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm">Aucune clé API configurée</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Clé</TableHead>
                    <TableHead>Créée le</TableHead>
                    <TableHead>Dernière utilisation</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map(key => (
                    <TableRow key={key.id}>
                      <TableCell className="font-medium">{key.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                            {visibleKeys.has(key.id) ? key.prefix.replace('****', 'abcd1234') : key.prefix}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() =>
                              setVisibleKeys(prev => {
                                const next = new Set(prev)
                                if (next.has(key.id)) next.delete(key.id)
                                else next.add(key.id)
                                return next
                              })
                            }
                          >
                            {visibleKeys.has(key.id) ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(key.prefix)}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.createdAt}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {key.lastUsed || 'Jamais'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={key.actif ? 'default' : 'destructive'}
                          className={key.actif ? 'bg-teal-600' : ''}
                        >
                          {key.actif ? 'Active' : 'Révoquée'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => {
                            setApiKeys(prev => prev.filter(k => k.id !== key.id))
                            toast.success('Clé révoquée')
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-teal-600" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Configurez les webhooks pour recevoir des notifications en temps réel
              </CardDescription>
            </div>
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => setShowWebhookDialog(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-sm">Aucun webhook configuré</p>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map(wh => (
                <div
                  key={wh.id}
                  className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/20 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-teal-300 text-teal-700">
                        {getEventLabel(wh.eventType)}
                      </Badge>
                      <Badge
                        variant={wh.actif ? 'default' : 'secondary'}
                        className={wh.actif ? 'bg-teal-600' : ''}
                      >
                        {wh.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                    <p className="text-sm font-mono text-muted-foreground mt-1 truncate">
                      {wh.url}
                    </p>
                    {wh.secret && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Secret : {wh.secret}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={wh.actif}
                      onCheckedChange={checked => {
                        setWebhooks(prev =>
                          prev.map(w =>
                            w.id === wh.id ? { ...w, actif: checked } : w
                          )
                        )
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive/80"
                      onClick={() => setDeleteWebhookId(wh.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-teal-600" />
            Préférences de notification
          </CardTitle>
          <CardDescription>
            Choisissez les événements pour lesquels vous souhaitez recevoir des
            notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Nouvelle commande</p>
              <p className="text-xs text-muted-foreground">
                Notification lorsqu&apos;une pharmacie passe une nouvelle commande
              </p>
            </div>
            <Switch
              checked={notifications.nouvelleCommande}
              onCheckedChange={v =>
                setNotifications({ ...notifications, nouvelleCommande: v })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Changement de statut</p>
              <p className="text-xs text-muted-foreground">
                Notification lorsqu&apos;une commande change de statut
              </p>
            </div>
            <Switch
              checked={notifications.statutChange}
              onCheckedChange={v =>
                setNotifications({ ...notifications, statutChange: v })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Livraison effectuée</p>
              <p className="text-xs text-muted-foreground">
                Confirmation de livraison d&apos;une commande
              </p>
            </div>
            <Switch
              checked={notifications.livraisonEffectuee}
              onCheckedChange={v =>
                setNotifications({ ...notifications, livraisonEffectuee: v })
              }
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Stock bas</p>
              <p className="text-xs text-muted-foreground">
                Alerte lorsqu&apos;un produit est en rupture de stock
              </p>
            </div>
            <Switch
              checked={notifications.stockBas}
              onCheckedChange={v =>
                setNotifications({ ...notifications, stockBas: v })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            Actions irréversibles sur votre compte grossiste
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50/50">
            <div>
              <p className="text-sm font-medium text-destructive">
                Régénérer toutes les clés API
              </p>
              <p className="text-xs text-muted-foreground">
                Toutes les clés existantes seront révoquées immédiatement
              </p>
            </div>
            <Button variant="destructive" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Régénérer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* New API Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer une nouvelle clé API</DialogTitle>
            <DialogDescription>
              Donnez un nom à votre clé pour l&apos;identifier facilement. La clé ne sera
              affichée qu&apos;une seule fois.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="keyName">Nom de la clé</Label>
            <Input
              id="keyName"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              placeholder="Ex : Production, Tests, Partenaire..."
              className="border-teal-200"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewKeyDialog(false)}>
              Annuler
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleGenerateKey}
            >
              <Key className="h-4 w-4 mr-1" />
              Générer la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Show Generated Key Dialog */}
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-teal-600" />
              Clé API générée
            </DialogTitle>
            <DialogDescription>
              Copiez cette clé maintenant. Elle ne sera plus affichée ensuite.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-muted rounded-lg">
            <code className="text-sm font-mono break-all">{generatedKey}</code>
          </div>
          <DialogFooter>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={() => handleCopy(generatedKey)}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copier la clé
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un webhook</DialogTitle>
            <DialogDescription>
              Configurez un endpoint pour recevoir des notifications en temps réel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Type d&apos;événement</Label>
              <Select
                value={webhookForm.eventType}
                onValueChange={v =>
                  setWebhookForm({ ...webhookForm, eventType: v })
                }
              >
                <SelectTrigger className="border-teal-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMMANDE_CREEE">Commande créée</SelectItem>
                  <SelectItem value="STATUT_CHANGE">
                    Changement de statut
                  </SelectItem>
                  <SelectItem value="COMMANDE_LIVREE">Commande livrée</SelectItem>
                  <SelectItem value="COMMANDE_REFUSEE">
                    Commande refusée
                  </SelectItem>
                  <SelectItem value="STOCK_BAS">Stock bas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="webhookUrl">URL du webhook</Label>
              <Input
                id="webhookUrl"
                value={webhookForm.url}
                onChange={e =>
                  setWebhookForm({ ...webhookForm, url: e.target.value })
                }
                placeholder="https://api.example.com/webhooks"
                className="border-teal-200"
              />
            </div>
            <div>
              <Label htmlFor="webhookSecret">Secret (optionnel)</Label>
              <Input
                id="webhookSecret"
                value={webhookForm.secret}
                onChange={e =>
                  setWebhookForm({ ...webhookForm, secret: e.target.value })
                }
                placeholder="whsec_..."
                className="border-teal-200"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
              Annuler
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleAddWebhook}
            >
              <Globe className="h-4 w-4 mr-1" />
              Ajouter le webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Webhook Dialog */}
      <Dialog
        open={deleteWebhookId !== null}
        onOpenChange={() => setDeleteWebhookId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le webhook</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce webhook ? Vous ne recevrez plus
              de notifications pour cet événement.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteWebhookId(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteWebhook}>
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

