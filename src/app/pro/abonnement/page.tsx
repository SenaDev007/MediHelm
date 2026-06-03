'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  Crown,
  Sparkles,
  Rocket,
  Globe,
  Check,
  Zap,
  Users,
  HardDrive,
  Building2,
  FileText,
  ArrowUpRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// === Types ===

interface AbonnementItem {
  id: string
  plan: string
  periode: string
  prix: number
  debut: string
  fin: string | null
  statut: string
  essaiActif: boolean
  factures?: FactureItem[]
}

interface FactureItem {
  id: string
  montant: number
  taxe: number
  total: number
  statut: string
  dateEmission: string
  dateEcheance: string
  datePaiement: string | null
}

interface PharmacieDetail {
  id: string
  nbUtilisateursMax: number
  nbCaissiersSimut: number
  nbPatientsMax: number | null
  stockageDocuments: number
  apiGrossistesMax: number
  plan: string
  statutAbonnement: string
  _count?: { utilisateurs: number }
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

const planConfig: Record<string, {
  label: string
  price: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  features: string[]
  users: number
  caissiers: number
  stockage: string
  api: string
}> = {
  SEED: {
    label: 'Seed',
    price: '19 900 FCFA/mois',
    icon: Sparkles,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    features: ['5 utilisateurs', '2 caissiers simultanés', '500 MB documents', '2 API grossistes'],
    users: 5,
    caissiers: 2,
    stockage: '500 MB',
    api: '2',
  },
  GROW: {
    label: 'Grow',
    price: '34 900 FCFA/mois',
    icon: Rocket,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    features: ['10 utilisateurs', '4 caissiers simultanés', '2 GB documents', '5 API grossistes', 'Analytics IA'],
    users: 10,
    caissiers: 4,
    stockage: '2 GB',
    api: '5',
  },
  LEAD: {
    label: 'Lead',
    price: '54 900 FCFA/mois',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    features: ['20 utilisateurs', '8 caissiers simultanés', '10 GB documents', 'API illimitées', 'Réseau multi-officines'],
    users: 20,
    caissiers: 8,
    stockage: '10 GB',
    api: 'Illimité',
  },
  NETWORK: {
    label: 'Network',
    price: 'Sur devis',
    icon: Globe,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    features: ['Utilisateurs illimités', 'Multi-officines', 'Support dédié', 'API illimitées', 'Stockage illimité'],
    users: 999,
    caissiers: 999,
    stockage: 'Illimité',
    api: 'Illimité',
  },
}

// === Main Component ===

export default function AbonnementPage() {
  const { pharmacie } = useAuth()
  const [abonnements, setAbonnements] = useState<AbonnementItem[]>([])
  const [pharmacieDetail, setPharmacieDetail] = useState<PharmacieDetail | null>(null)
  const [factures, setFactures] = useState<FactureItem[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState('')

  const fetchData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [aboRes, pharmaRes] = await Promise.all([
        fetch(`/api/abonnements?pharmacieId=${pharmacie.id}`),
        fetch(`/api/pharmacies/${pharmacie.id}`),
      ])
      if (aboRes.ok) {
        const aboData = await aboRes.json()
        setAbonnements(aboData)
        // Collect factures from all abonnements
        const allFactures: FactureItem[] = []
        aboData.forEach((a: AbonnementItem) => {
          if (a.factures) allFactures.push(...a.factures)
        })
        setFactures(allFactures)
      }
      if (pharmaRes.ok) {
        setPharmacieDetail(await pharmaRes.json())
      }
    } catch {
      setAbonnements([])
      setPharmacieDetail(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pharmacie?.id])

  const currentAbo = abonnements.find(a => a.statut === 'ACTIF' || a.statut === 'ESSAI')
  const currentPlan = pharmacie?.plan || currentAbo?.plan || 'SEED'
  const currentConfig = planConfig[currentPlan] || planConfig.SEED

  const nbUsersCurrent = pharmacieDetail?._count?.utilisateurs || 0
  const nbUsersMax = pharmacieDetail?.nbUtilisateursMax || 5
  const nbCaissiersMax = pharmacieDetail?.nbCaissiersSimut || 2
  const stockageMax = pharmacieDetail?.stockageDocuments || 500
  const apiMax = pharmacieDetail?.apiGrossistesMax || 2

  const handleUpgrade = async () => {
    if (!pharmacie?.id || !selectedPlan) return
    try {
      const plan = planConfig[selectedPlan]
      const prixMap: Record<string, number> = { SEED: 19900, GROW: 34900, LEAD: 54900, NETWORK: 0 }
      const res = await fetch('/api/abonnements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          plan: selectedPlan,
          periode: 'MENSUEL',
          prix: prixMap[selectedPlan] || 0,
          debut: new Date().toISOString(),
          statut: 'ACTIF',
          essaiActif: false,
        }),
      })
      if (res.ok) {
        toast.success('Abonnement mis à jour avec succès !')
        setUpgradeOpen(false)
        setSelectedPlan('')
        fetchData()
      } else {
        toast.error('Erreur lors de la mise à jour de l\'abonnement')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const planKeys = ['SEED', 'GROW', 'LEAD', 'NETWORK']

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-48" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-[#1D9E75]" />
            Abonnement
          </h1>
          <p className="text-sm text-muted-foreground">
            Gérez votre plan et vos factures
          </p>
        </div>
        <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setUpgradeOpen(true)}>
          <ArrowUpRight className="w-4 h-4" /> Changer de plan
        </Button>
      </div>

      {/* Current Subscription Card */}
      <Card className="border-[#1D9E75]/30 bg-gradient-to-r from-[#085041]/5 to-[#1D9E75]/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#1D9E75]/10 flex items-center justify-center">
                {(() => {
                  const Icon = currentConfig.icon
                  return <Icon className="w-7 h-7 text-[#1D9E75]" />
                })()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Plan {currentConfig.label}</h2>
                  {currentAbo?.statut && (
                    <Badge className={`text-[9px] border-0 ${currentAbo.statut === 'ACTIF' ? 'bg-[#E1F5EE] text-[#085041]' : currentAbo.statut === 'ESSAI' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-800'}`}>
                      {currentAbo.statut === 'ESSAI' ? 'Essai' : currentAbo.statut}
                    </Badge>
                  )}
                  {currentAbo?.essaiActif && (
                    <Badge className="text-[9px] bg-amber-100 text-amber-800 border-0">Essai actif</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{currentConfig.price}</p>
              </div>
            </div>
            {currentAbo && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-white/60 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground">Début</span>
                  <p className="font-medium">{new Date(currentAbo.debut).toLocaleDateString('fr-FR')}</p>
                </div>
                {currentAbo.fin && (
                  <div className="bg-white/60 rounded-lg p-2">
                    <span className="text-xs text-muted-foreground">Fin</span>
                    <p className="font-medium">{new Date(currentAbo.fin).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
                <div className="bg-white/60 rounded-lg p-2">
                  <span className="text-xs text-muted-foreground">Période</span>
                  <p className="font-medium">{currentAbo.periode === 'MENSUEL' ? 'Mensuel' : 'Annuel'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Meters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#1D9E75]" />
            Utilisation actuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-xs font-medium">Utilisateurs</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>{nbUsersCurrent} utilisés</span>
                <span className="font-medium">{nbUsersCurrent}/{nbUsersMax}</span>
              </div>
              <Progress value={(nbUsersCurrent / nbUsersMax) * 100} className="h-2" />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-xs font-medium">Caissiers simultanés</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>Max {nbCaissiersMax}</span>
                <span className="font-medium">{nbCaissiersMax}</span>
              </div>
              <Progress value={30} className="h-2" />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-xs font-medium">Stockage documents</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>{stockageMax >= 1024 ? `${stockageMax / 1024} GB` : `${stockageMax} MB`}</span>
                <span className="font-medium">{currentConfig.stockage}</span>
              </div>
              <Progress value={15} className="h-2" />
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Globe className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-xs font-medium">API grossistes</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span>{apiMax} max</span>
                <span className="font-medium">{currentConfig.api}</span>
              </div>
              <Progress value={25} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Comparison Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Comparer les plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {planKeys.map(key => {
            const plan = planConfig[key]
            const isCurrent = key === currentPlan
            const PlanIcon = plan.icon

            return (
              <Card key={key} className={`relative ${isCurrent ? 'border-[#1D9E75] ring-1 ring-[#1D9E75]/30' : ''}`}>
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-[#1D9E75] text-white border-0 text-[10px]">Plan actuel</Badge>
                  </div>
                )}
                <CardContent className="p-4 pt-6">
                  <div className="text-center mb-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.bgColor} flex items-center justify-center mx-auto mb-2`}>
                      <PlanIcon className={`w-6 h-6 ${plan.color}`} />
                    </div>
                    <h3 className="font-bold text-lg">{plan.label}</h3>
                    <p className="text-sm font-semibold text-[#1D9E75]">{plan.price}</p>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-[#1D9E75] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {!isCurrent && (
                    <Button
                      className="w-full mt-4 gap-1 text-xs"
                      variant={key === 'NETWORK' ? 'outline' : 'default'}
                      onClick={() => { setSelectedPlan(key); setUpgradeOpen(true) }}
                      style={key !== 'NETWORK' ? { backgroundColor: '#1D9E75' } : undefined}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5" />
                      {key === 'NETWORK' ? 'Nous contacter' : 'Upgrader'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#1D9E75]" />
            Factures
          </CardTitle>
          <CardDescription>{factures.length} facture{factures.length !== 1 ? 's' : ''}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Montant</TableHead>
                  <TableHead>Taxe</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead>Émission</TableHead>
                  <TableHead>Échéance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factures.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Aucune facture trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  factures.map(f => (
                    <TableRow key={f.id} className="hover:bg-muted/30">
                      <TableCell className="text-sm">{formatFCFA(f.montant)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatFCFA(f.taxe)}</TableCell>
                      <TableCell className="text-right font-medium text-sm">{formatFCFA(f.total)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[9px] border-0 ${f.statut === 'PAYEE' ? 'bg-[#E1F5EE] text-[#085041]' : f.statut === 'EN_RETARD' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                          {f.statut === 'PAYEE' ? 'Payée' : f.statut === 'EN_RETARD' ? 'En retard' : f.statut}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(f.dateEmission).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(f.dateEcheance).toLocaleDateString('fr-FR')}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="w-5 h-5 text-[#1D9E75]" />
              Changer de plan
            </DialogTitle>
            <DialogDescription>
              Sélectionnez le plan vers lequel vous souhaitez upgrader
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-sm font-medium">Plan actuel</Label>
              <p className="text-sm text-muted-foreground">{currentConfig.label} — {currentConfig.price}</p>
            </div>
            <div>
              <Label className="text-sm font-medium">Nouveau plan</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un plan" />
                </SelectTrigger>
                <SelectContent>
                  {planKeys.filter(k => k !== currentPlan).map(key => (
                    <SelectItem key={key} value={key}>
                      {planConfig[key].label} — {planConfig[key].price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPlan && planConfig[selectedPlan] && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-xs font-medium mb-2">Caractéristiques {planConfig[selectedPlan].label} :</p>
                <ul className="space-y-1">
                  {planConfig[selectedPlan].features.map((f, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <Check className="w-3 h-3 text-[#1D9E75]" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpgradeOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleUpgrade} disabled={!selectedPlan}>
              Confirmer l&apos;upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
