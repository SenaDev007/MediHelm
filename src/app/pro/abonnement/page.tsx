'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Crown,
  CreditCard,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Sparkles,
  Zap,
  Rocket,
  Globe,
  CalendarDays,
  Receipt,
  Shield,
  Star,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Abonnement {
  id: string
  pharmacieId: string
  plan: string
  type: string
  statut: string
  montant: number
  dateDebut: string
  dateFin: string
  methodePaiement: string | null
  createdAt: string
}

interface OptionAbonnement {
  id: string
  nom: string
  description: string
  prix: number
  planRequis: string[]
}

interface PaiementHistorique {
  id: string
  date: string
  montant: number
  methode: string
  statut: string
  reference: string | null
}

// === Helpers ===

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatutBadge(statut: string) {
  switch (statut) {
    case 'ACTIF':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Actif</Badge>
    case 'EXPIRE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><XCircle className="w-3 h-3" /> Expiré</Badge>
    case 'SUSPENDU':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Suspendu</Badge>
    case 'EN_ATTENTE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">En attente</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getPaiementStatutBadge(statut: string) {
  switch (statut) {
    case 'REUSSI':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Réussi</Badge>
    case 'ECHEC':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Échoué</Badge>
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'REMBOURSE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Remboursé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

// Plan definitions
const PLANS = [
  {
    id: 'SEED',
    nom: 'Seed',
    icon: Sparkles,
    prix: 0,
    couleur: 'bg-gray-100 border-gray-300',
    iconColor: 'text-gray-600',
    description: 'Pour démarrer',
    features: ['Gestion de stock basique', '5 utilisateurs max', 'Support email', '1 pharmacie'],
  },
  {
    id: 'GROW',
    nom: 'Grow',
    icon: Zap,
    prix: 25000,
    couleur: 'bg-primary/5 border-primary/30',
    iconColor: 'text-primary',
    description: 'Pour grandir',
    features: ['Tout Seed +', 'Ventes & caisse', 'Patients & ordonnances', '15 utilisateurs max', 'Support prioritaire', 'Rapports mensuels'],
  },
  {
    id: 'LEAD',
    nom: 'Lead',
    icon: Rocket,
    prix: 50000,
    couleur: 'bg-amber-50 border-amber-300',
    iconColor: 'text-amber-600',
    description: 'Pour diriger',
    features: ['Tout Grow +', 'Finance & comptabilité', 'Garde & RH', 'Utilisateurs illimités', 'Analytics avancés', 'API intégrations'],
  },
  {
    id: 'NETWORK',
    nom: 'Network',
    icon: Globe,
    prix: 100000,
    couleur: 'bg-violet-50 border-violet-300',
    iconColor: 'text-violet-600',
    description: 'Pour le réseau',
    features: ['Tout Lead +', 'Multi-pharmacies', 'Gestion réseau', 'Promoteur dashboard', 'Support dédié', 'SLA garanti', 'Customisation'],
  },
]

// === Main Component ===

export default function AbonnementPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id
  const currentPlan = pharmacie?.plan || 'SEED'

  const [abonnement, setAbonnement] = useState<Abonnement | null>(null)
  const [loading, setLoading] = useState(true)
  const [options, setOptions] = useState<OptionAbonnement[]>([])
  const [historique, setHistorique] = useState<PaiementHistorique[]>([])

  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)

  const fetchAbonnement = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/abonnements?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data || []
        if (data.length > 0) setAbonnement(data[0])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [pharmacieId])

  const fetchOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/options-abonnement')
      if (res.ok) {
        const json = await res.json()
        setOptions(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    }
  }, [])

  const fetchHistorique = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/abonnements?pharmacieId=${pharmacieId}&historique=true`)
      if (res.ok) {
        const json = await res.json()
        setHistorique(Array.isArray(json?.historique) ? json.historique : [])
      }
    } catch {
      // silent
    }
  }, [pharmacieId])

  useEffect(() => { fetchAbonnement() }, [fetchAbonnement])
  useEffect(() => { fetchOptions() }, [fetchOptions])
  useEffect(() => { fetchHistorique() }, [fetchHistorique])

  async function handleChangePlan() {
    if (!pharmacieId || !selectedPlan) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/abonnements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          plan: selectedPlan,
          type: 'MENSUEL',
          montant: PLANS.find(p => p.id === selectedPlan)?.prix || 0,
          dateDebut: new Date().toISOString(),
          dateFin: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString(),
          statut: 'EN_ATTENTE',
        }),
      })
      if (res.ok) {
        toast.success('Demande de changement de plan envoyée')
        setUpgradeDialogOpen(false)
        fetchAbonnement()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors du changement')
      }
    } catch {
      toast.error('Erreur lors du changement de plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abonnement</h1>
        <p className="text-muted-foreground text-sm">Gérez votre plan, vos options et vos paiements</p>
      </div>

      {/* Current plan card */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Crown className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Plan {currentPlan}</h2>
                  {abonnement && getStatutBadge(abonnement.statut)}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {abonnement
                    ? `Valide du ${formatDate(abonnement.dateDebut)} au ${formatDate(abonnement.dateFin)}`
                    : 'Aucun abonnement actif'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {currentPlan !== 'NETWORK' && (
                <Button className="gap-2" onClick={() => { setSelectedPlan(''); setUpgradeDialogOpen(true) }}>
                  <ArrowUpRight className="w-4 h-4" /> Passer supérieur
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Comparer les plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => {
            const isCurrent = plan.id === currentPlan
            const Icon = plan.icon
            return (
              <Card key={plan.id} className={`relative ${isCurrent ? 'ring-2 ring-primary' : ''} ${plan.couleur}`}>
                {isCurrent && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground text-xs">Plan actuel</Badge>
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="text-center mb-4">
                    <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center bg-white ${plan.iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-lg">{plan.nom}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-2">
                      <span className="text-2xl font-bold">{plan.prix === 0 ? 'Gratuit' : formatFCFA(plan.prix)}</span>
                      {plan.prix > 0 && <span className="text-sm text-muted-foreground">/mois</span>}
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                  {!isCurrent && (
                    <Button
                      variant={plan.prix > (PLANS.find(p => p.id === currentPlan)?.prix || 0) ? 'default' : 'outline'}
                      className="w-full gap-2"
                      onClick={() => { setSelectedPlan(plan.id); setUpgradeDialogOpen(true) }}
                    >
                      {plan.prix > (PLANS.find(p => p.id === currentPlan)?.prix || 0) ? (
                        <><ArrowUpRight className="w-4 h-4" /> Passer à {plan.nom}</>
                      ) : (
                        <><ArrowDownRight className="w-4 h-4" /> Rétrograder</>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Options & Payment history */}
      <Tabs defaultValue="options">
        <TabsList>
          <TabsTrigger value="options" className="gap-2"><Star className="w-4 h-4" /> Options</TabsTrigger>
          <TabsTrigger value="historique" className="gap-2"><Receipt className="w-4 h-4" /> Historique</TabsTrigger>
        </TabsList>

        <TabsContent value="options" className="space-y-4">
          {options.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Star className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucune option disponible</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {options.map(opt => (
                <Card key={opt.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{opt.nom}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{opt.description}</p>
                      </div>
                      <span className="text-lg font-bold">{formatFCFA(opt.prix)}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-3">
                      <span className="text-xs text-muted-foreground">Plans :</span>
                      {opt.planRequis.map(p => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historique" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {historique.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun paiement enregistré</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Méthode</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {historique.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.date)}</TableCell>
                          <TableCell className="font-medium">{formatFCFA(p.montant)}</TableCell>
                          <TableCell>{p.methode}</TableCell>
                          <TableCell className="text-sm text-muted-foreground font-mono">{p.reference || '—'}</TableCell>
                          <TableCell>{getPaiementStatutBadge(p.statut)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade/Downgrade Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Changer de plan</DialogTitle>
            <DialogDescription>Confirmez le changement de votre abonnement</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Nouveau plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue placeholder="Choisir un plan" /></SelectTrigger>
                <SelectContent>
                  {PLANS.filter(p => p.id !== currentPlan).map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom} — {p.prix === 0 ? 'Gratuit' : `${formatFCFA(p.prix)}/mois`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlan && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Résumé</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Plan actuel</span>
                      <span className="font-medium">{currentPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nouveau plan</span>
                      <span className="font-medium">{selectedPlan}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Montant</span>
                      <span className="font-bold">{formatFCFA(PLANS.find(p => p.id === selectedPlan)?.prix || 0)}/mois</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleChangePlan} disabled={submitting || !selectedPlan}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer le changement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
