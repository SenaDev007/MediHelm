'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
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
  CreditCard,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  DollarSign,
  Receipt,
  Wallet,
  User,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Credit {
  id: string
  pharmacieId: string
  patientId: string | null
  patientNom: string
  montant: number
  montantPaye: number
  statut: string
  echeance: string | null
  createdAt: string
  updatedAt: string
}

interface Paiement {
  id: string
  creditId: string
  montant: number
  methode: string
  reference: string | null
  statut: string
  createdAt: string
}

interface FedapayStatus {
  connecte: boolean
  dernierSync: string | null
  nbTransactions: number
  montantTotal: number
}

// === Helpers ===

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getStatutBadge(statut: string) {
  switch (statut) {
    case 'EN_COURS':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs gap-1"><Clock className="w-3 h-3" /> En cours</Badge>
    case 'PAYE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Payé</Badge>
    case 'EN_RETARD':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><AlertTriangle className="w-3 h-3" /> En retard</Badge>
    case 'ANNULE':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs gap-1"><XCircle className="w-3 h-3" /> Annulé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getPaiementStatutBadge(statut: string) {
  switch (statut) {
    case 'REUSSI':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Réussi</Badge>
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'ECHEC':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Échoué</Badge>
    case 'REMBOURSE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Remboursé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getProgressColor(montantPaye: number, montant: number) {
  const ratio = montant > 0 ? montantPaye / montant : 0
  if (ratio >= 1) return 'bg-emerald-500'
  if (ratio >= 0.5) return 'bg-amber-500'
  return 'bg-red-500'
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function CreditsPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('credits')

  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statutFilter, setStatutFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [paiements, setPaiements] = useState<Paiement[]>([])
  const [paiementsLoading, setPaiementsLoading] = useState(true)

  const [fedapay, setFedapay] = useState<FedapayStatus>({
    connecte: false,
    dernierSync: null,
    nbTransactions: 0,
    montantTotal: 0,
  })

  // Dialogs
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false)
  const [selectedCredit, setSelectedCredit] = useState<Credit | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [creditForm, setCreditForm] = useState({
    patientNom: '',
    montant: '',
    echeance: '',
  })

  const [paiementForm, setPaiementForm] = useState({
    montant: '',
    methode: 'ESPECES',
    reference: '',
  })

  const fetchCredits = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: page.toString(), pageSize: '10' })
      if (search) params.set('search', search)
      if (statutFilter !== 'all') params.set('statut', statutFilter)
      const res = await fetch(`/api/credits?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCredits(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des crédits')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, search, statutFilter])

  const fetchPaiements = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/paiements/fedapay?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setPaiements(Array.isArray(json?.paiements) ? json.paiements : [])
        if (json?.fedapay) {
          setFedapay(json.fedapay)
        }
      }
    } catch {
      // silent
    } finally {
      setPaiementsLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchCredits() }, [fetchCredits])
  useEffect(() => { fetchPaiements() }, [fetchPaiements])
  useEffect(() => { setPage(1) }, [search, statutFilter])

  const stats = useMemo(() => {
    const totalCredits = credits.reduce((s, c) => s + c.montant, 0)
    const totalPaye = credits.reduce((s, c) => s + c.montantPaye, 0)
    const enCours = credits.filter(c => c.statut === 'EN_COURS').length
    const enRetard = credits.filter(c => c.statut === 'EN_RETARD').length
    return { totalCredits, totalPaye, enCours, enRetard }
  }, [credits])

  async function handleSubmitCredit() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        montant: parseFloat(creditForm.montant) || 0,
        montantPaye: 0,
        statut: 'EN_COURS',
      }
      if (creditForm.patientNom) body.patientNom = creditForm.patientNom
      if (creditForm.echeance) body.echeance = creditForm.echeance

      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Crédit enregistré')
        setCreditDialogOpen(false)
        setCreditForm({ patientNom: '', montant: '', echeance: '' })
        fetchCredits()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitPaiement() {
    if (!selectedCredit || !pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/paiements/fedapay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          creditId: selectedCredit.id,
          montant: parseFloat(paiementForm.montant) || 0,
          methode: paiementForm.methode,
          reference: paiementForm.reference || null,
          statut: 'REUSSI',
        }),
      })
      if (res.ok) {
        toast.success('Paiement enregistré')
        setPaiementDialogOpen(false)
        setPaiementForm({ montant: '', methode: 'ESPECES', reference: '' })
        fetchCredits()
        fetchPaiements()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors du paiement')
      }
    } catch {
      toast.error('Erreur lors du paiement')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crédits</h1>
          <p className="text-muted-foreground text-sm">Crédits patients, suivi des paiements et Fedapay</p>
        </div>
        <Button onClick={() => setCreditDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau crédit
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total crédits" value={formatFCFA(stats.totalCredits)} icon={CreditCard} variant="danger" />
        <KpiCard title="Total payé" value={formatFCFA(stats.totalPaye)} icon={DollarSign} variant="success" />
        <KpiCard title="En cours" value={stats.enCours} icon={Clock} variant="warning" />
        <KpiCard title="En retard" value={stats.enRetard} icon={AlertTriangle} variant="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="credits" className="gap-2"><CreditCard className="w-4 h-4" /> Crédits</TabsTrigger>
          <TabsTrigger value="paiements" className="gap-2"><Receipt className="w-4 h-4" /> Paiements</TabsTrigger>
          <TabsTrigger value="fedapay" className="gap-2"><Wallet className="w-4 h-4" /> Fedapay</TabsTrigger>
        </TabsList>

        {/* Credits Tab */}
        <TabsContent value="credits" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un crédit..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={statutFilter} onValueChange={setStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="PAYE">Payé</SelectItem>
                    <SelectItem value="EN_RETARD">En retard</SelectItem>
                    <SelectItem value="ANNULE">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : credits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CreditCard className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun crédit trouvé</p>
                  <p className="text-sm text-muted-foreground mt-1">Enregistrez votre premier crédit patient</p>
                  <Button onClick={() => setCreditDialogOpen(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Nouveau crédit
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Patient</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Payé</TableHead>
                          <TableHead>Reste</TableHead>
                          <TableHead>Progression</TableHead>
                          <TableHead>Échéance</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {credits.map(c => {
                          const reste = c.montant - c.montantPaye
                          const progress = c.montant > 0 ? (c.montantPaye / c.montant) * 100 : 0
                          return (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  {c.patientNom}
                                </div>
                              </TableCell>
                              <TableCell>{formatFCFA(c.montant)}</TableCell>
                              <TableCell className="text-emerald-600">{formatFCFA(c.montantPaye)}</TableCell>
                              <TableCell className={reste > 0 ? 'text-red-600 font-medium' : 'text-emerald-600'}>
                                {formatFCFA(reste)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${getProgressColor(c.montantPaye, c.montant)}`} style={{ width: `${Math.min(progress, 100)}%` }} />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                                </div>
                              </TableCell>
                              <TableCell>{formatDate(c.echeance)}</TableCell>
                              <TableCell>{getStatutBadge(c.statut)}</TableCell>
                              <TableCell className="text-right">
                                {reste > 0 && (
                                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setSelectedCredit(c); setPaiementForm(f => ({ ...f, montant: reste.toString() })); setPaiementDialogOpen(true) }}>
                                    <DollarSign className="w-3 h-3" /> Payer
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {page} sur {totalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Paiements Tab */}
        <TabsContent value="paiements" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {paiementsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : paiements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun paiement enregistré</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
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
                      {paiements.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.createdAt)}</TableCell>
                          <TableCell className="font-medium">{formatFCFA(p.montant)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{p.methode}</Badge></TableCell>
                          <TableCell className="font-mono text-sm text-muted-foreground">{p.reference || '—'}</TableCell>
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

        {/* Fedapay Tab */}
        <TabsContent value="fedapay" className="space-y-4">
          <Card className={fedapay.connecte ? 'border-emerald-200 bg-emerald-50/50' : 'border-amber-200 bg-amber-50/50'}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${fedapay.connecte ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold">Fedapay</h3>
                    {fedapay.connecte
                      ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><ShieldCheck className="w-3 h-3" /> Connecté</Badge>
                      : <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Non configuré</Badge>
                    }
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {fedapay.connecte
                      ? `Dernière synchronisation : ${formatDate(fedapay.dernierSync) || 'Récente'}`
                      : 'Configurez votre compte Fedapay pour accepter les paiements mobiles'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {fedapay.connecte && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transactions Fedapay</p>
                      <p className="text-xl font-bold">{fedapay.nbTransactions}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Montant total</p>
                      <p className="text-xl font-bold">{formatFCFA(fedapay.montantTotal)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Credit Dialog */}
      <Dialog open={creditDialogOpen} onOpenChange={setCreditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau crédit patient</DialogTitle>
            <DialogDescription>Enregistrez un nouveau crédit pour un patient</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cr-patient">Nom du patient *</Label>
              <Input id="cr-patient" value={creditForm.patientNom} onChange={e => setCreditForm(f => ({ ...f, patientNom: e.target.value }))} placeholder="Nom complet du patient" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-montant">Montant du crédit (FCFA) *</Label>
              <Input id="cr-montant" type="number" value={creditForm.montant} onChange={e => setCreditForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cr-echeance">Date d&apos;échéance</Label>
              <Input id="cr-echeance" type="date" value={creditForm.echeance} onChange={e => setCreditForm(f => ({ ...f, echeance: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreditDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitCredit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Paiement Dialog */}
      <Dialog open={paiementDialogOpen} onOpenChange={setPaiementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
            <DialogDescription>
              Paiement pour {selectedCredit?.patientNom} — Reste : {selectedCredit ? formatFCFA(selectedCredit.montant - selectedCredit.montantPaye) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pa-montant">Montant (FCFA) *</Label>
              <Input id="pa-montant" type="number" value={paiementForm.montant} onChange={e => setPaiementForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-methode">Méthode de paiement *</Label>
              <Select value={paiementForm.methode} onValueChange={v => setPaiementForm(f => ({ ...f, methode: v }))}>
                <SelectTrigger id="pa-methode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ESPECES">Espèces</SelectItem>
                  <SelectItem value="WAVE">Wave</SelectItem>
                  <SelectItem value="MTN_MONEY">MTN Money</SelectItem>
                  <SelectItem value="MOOV_MONEY">Moov Money</SelectItem>
                  <SelectItem value="CARTE_BANCAIRE">Carte bancaire</SelectItem>
                  <SelectItem value="CHEQUE">Chèque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-ref">Référence</Label>
              <Input id="pa-ref" value={paiementForm.reference} onChange={e => setPaiementForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° transaction, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaiementDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitPaiement} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer le paiement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
