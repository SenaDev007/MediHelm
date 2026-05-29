"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import {
  Key,
  Globe,
  Shield,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  Building2,
  Mail,
  Phone,
  MapPin,
  Webhook,
  RefreshCw,
} from "lucide-react"
import type { PartenaireGrossisteInfo } from "@/lib/grossiste-utils"

export default function ParametresPage() {
  const [grossiste, setGrossiste] = useState<PartenaireGrossisteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [showApiKey, setShowApiKey] = useState(false)
  const [showWebhook, setShowWebhook] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState("")
  const [webhookEnabled, setWebhookEnabled] = useState(true)
  const [apiNotifications, setApiNotifications] = useState(true)
  const [emailNotifications, setEmailNotifications] = useState(true)

  useEffect(() => {
    async function fetchGrossiste() {
      try {
        const res = await fetch("/api/grossistes?actif=true")
        const data = await res.json()
        if (data.length > 0) {
          setGrossiste(data[0])
        }
      } catch (error) {
        console.error("Erreur:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchGrossiste()
  }, [])

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} copié dans le presse-papier`)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de votre compte grossiste</p>
      </div>

      <Tabs defaultValue="compte" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="compte">Compte</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        {/* Compte Tab */}
        <TabsContent value="compte" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-[#1D9E75]" />
                  Informations du compte
                </CardTitle>
                <CardDescription>Détails de votre partenariat grossiste</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Nom du grossiste</Label>
                  <p className="font-semibold text-lg">{grossiste?.nom || "—"}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Code grossiste</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-sm">
                      {grossiste?.codeGrossiste || "—"}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Statut</Label>
                  <div className="flex items-center gap-2">
                    <Badge className={grossiste?.actif ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {grossiste?.actif ? "Actif" : "Inactif"}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground text-xs">Date de création</Label>
                  <p className="text-sm">
                    {grossiste?.createdAt
                      ? new Date(grossiste.createdAt).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-5 w-5 text-[#1D9E75]" />
                  Coordonnées
                </CardTitle>
                <CardDescription>Informations de contact</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Email de contact</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    defaultValue="contact@ubipharm.bj"
                    placeholder="contact@ubipharm.bj"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Téléphone</Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    defaultValue="+229 97 00 00 00"
                    placeholder="+229 XX XX XX XX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Input
                    id="address"
                    defaultValue="Zone Industrielle, Cotonou, Bénin"
                    placeholder="Adresse complète"
                  />
                </div>
                <Button
                  className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white mt-2"
                  onClick={() => toast.success("Paramètres sauvegardés")}
                >
                  Sauvegarder les modifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="h-5 w-5 text-[#1D9E75]" />
                Configuration API
              </CardTitle>
              <CardDescription>
                Informations de connexion à l&apos;API MédiHelm pour l&apos;intégration de vos systèmes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* API Endpoint */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Endpoint API du grossiste</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 border rounded-lg px-4 py-2.5 font-mono text-sm">
                    <Globe className="h-4 w-4 inline mr-2 text-[#1D9E75]" />
                    {grossiste?.apiEndpoint || "—"}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(grossiste?.apiEndpoint || "", "Endpoint API")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  L&apos;URL de votre API que MédiHelm utilise pour envoyer les commandes
                </p>
              </div>

              <Separator />

              {/* API Key */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Clé API (hash)</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 border rounded-lg px-4 py-2.5 font-mono text-sm">
                    <Shield className="h-4 w-4 inline mr-2 text-[#1D9E75]" />
                    {showApiKey
                      ? grossiste?.apiKeyHash || "—"
                      : "••••••••••••••••••••••••"}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(grossiste?.apiKeyHash || "", "Clé API")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Hash de votre clé API. La clé complète n&apos;est jamais affichée pour des raisons de sécurité.
                </p>
              </div>

              <Separator />

              {/* MédiHelm API Info */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs">API MédiHelm — URLs d&apos;intégration</Label>

                <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Réception des commandes</p>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded border block">
                      POST /api/grossistes/{grossiste?.id?.substring(0, 8) || "{id}"}.../commandes
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Mise à jour du statut</p>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded border block">
                      PATCH /api/grossistes/commandes/{"{commandeId}"}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Catalogue de prix</p>
                    <code className="text-sm font-mono bg-background px-2 py-1 rounded border block">
                      GET /api/grossistes/{grossiste?.id?.substring(0, 8) || "{id}"}.../catalogue
                    </code>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => {
                  const docs = {
                    baseUrl: "https://api.medihelm.sn",
                    endpoints: {
                      receiveOrder: "POST /api/grossistes/{id}/commandes",
                      updateStatus: "PATCH /api/grossistes/commandes/{commandeId}",
                      getCatalogue: "GET /api/grossistes/{id}/catalogue",
                      comparePrices: "GET /api/grossistes/compare?dci={dci}",
                    },
                    statuses: ["ENVOYEE", "CONFIRMEE", "REFUSEE", "EN_PREPARATION", "EN_LIVRAISON", "LIVREE", "LITIGE"],
                  }
                  copyToClipboard(JSON.stringify(docs, null, 2), "Documentation API")
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier la documentation API
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Webhook className="h-5 w-5 text-[#1D9E75]" />
                Configuration Webhooks
              </CardTitle>
              <CardDescription>
                Recevez des notifications en temps réel lorsque des événements se produisent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook Secret */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Secret webhook</Label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-muted/50 border rounded-lg px-4 py-2.5 font-mono text-sm">
                    <Shield className="h-4 w-4 inline mr-2 text-[#1D9E75]" />
                    {showWebhook
                      ? grossiste?.webhookSecret || "—"
                      : "••••••••••••••••••••"}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowWebhook(!showWebhook)}
                  >
                    {showWebhook ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(grossiste?.webhookSecret || "", "Secret webhook")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Utilisé pour vérifier l&apos;authenticité des webhooks reçus (signature HMAC-SHA256)
                </p>
              </div>

              <Separator />

              {/* Webhook URL */}
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">URL de réception webhook</Label>
                <Input
                  id="webhookUrl"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.ubipharm.sn/webhooks/medihelm"
                />
                <p className="text-xs text-muted-foreground">
                  L&apos;URL où MédiHelm enverra les notifications d&apos;événements
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer les webhooks</Label>
                  <p className="text-xs text-muted-foreground">Recevoir les notifications en temps réel</p>
                </div>
                <Switch
                  checked={webhookEnabled}
                  onCheckedChange={setWebhookEnabled}
                />
              </div>

              <Separator />

              {/* Webhook Events */}
              <div className="space-y-3">
                <Label className="text-muted-foreground text-xs">Événements webhook disponibles</Label>
                <div className="space-y-2">
                  {[
                    { event: "commande.nouvelle", description: "Nouvelle commande reçue d'une pharmacie" },
                    { event: "commande.statut", description: "Changement de statut d'une commande" },
                    { event: "catalogue.mise_a_jour", description: "Mise à jour du catalogue demandée" },
                    { event: "livraison.confirmee", description: "Confirmation de livraison" },
                    { event: "litige.ouvert", description: "Ouverture d'un litige" },
                  ].map((wh) => (
                    <div key={wh.event} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                      <div>
                        <code className="text-xs font-mono text-[#1D9E75]">{wh.event}</code>
                        <p className="text-xs text-muted-foreground mt-0.5">{wh.description}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">Actif</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                  onClick={() => toast.success("Paramètres sauvegardés")}
                >
                  Sauvegarder
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Test webhook envoyé")}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester le webhook
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Préférences de notifications</CardTitle>
              <CardDescription>Gérez vos alertes et notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Nouvelles commandes</Label>
                    <p className="text-xs text-muted-foreground">Notification lorsqu&apos;une pharmacie passe commande</p>
                  </div>
                  <Switch
                    checked={apiNotifications}
                    onCheckedChange={setApiNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertes email</Label>
                    <p className="text-xs text-muted-foreground">Recevoir les alertes importantes par email</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rappels de livraison</Label>
                    <p className="text-xs text-muted-foreground">Rappels pour les commandes en attente de livraison</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Rapport hebdomadaire</Label>
                    <p className="text-xs text-muted-foreground">Résumé hebdomadaire de votre activité</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Alertes stock bas</Label>
                    <p className="text-xs text-muted-foreground">Notification quand un produit est en rupture</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Button
                className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
                onClick={() => toast.success("Paramètres sauvegardés")}
              >
                Sauvegarder les préférences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
