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
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Receipt,
  Calculator,
  BarChart3,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Loader2,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface TresorerieData {
  soldeDisponible: number
  entreesMois: number
  sortiesMois: number
  tendance: number
}

interface EcritureComptable {
  id: string
  pharmacieId: string
  type: string
  montant: number
  libelle: string
  reference: string | null
  dateEcriture: string
  createdAt: string
}

interface Facture {
  id: string
  numero: string
  pharmacieId: string
  fournisseurNom: string
  montant: number
  statut: string
  dateEmission: string
  dateEcheance: string | null
  createdAt: string
}

interface RapportFinancier {
  id: string
  pharmacieId: string
  periode: string
  domaine: string
  chiffreAffaires: number
  charges: number
  resultat: number
  tvaCollectee: number
  tvaDeductible: number
  createdAt: string
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

function getEcritureTypeBadge(type: string) {
  switch (type) {
    case 'ENTREE':
    case 'RECETTE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Recette</Badge>
    case 'SORTIE':
    case 'DEPENSE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Dépense</Badge>
    case 'VIREMENT':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Virement</Badge>
    case 'TVA':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">TVA</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

function getFactureStatutBadge(statut: string) {
  switch (statut) {
    case 'PAYEE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Payée</Badge>
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'EN_RETARD':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">En retard</Badge>
    case 'ANNULEE':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs">Annulée</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  )
}

const TYPES_ECRITURE = ['RECETTE', 'DEPENSE', 'VIREMENT', 'TVA', 'AUTRE']
const PERIODES = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']

// === Main Component ===

export default function FinancePage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('dashboard')

  // Dashboard state
  const [tresorerie, setTresorerie] = useState<TresorerieData | null>(null)
  const [dashboardLoading, setDashboardLoading] = useState(true)

  // Ecritures state
  const [ecritures, setEcritures] = useState<EcritureComptable[]>([])
  const [ecrituresLoading, setEcrituresLoading] = useState(true)
  const [ecritureSearch, setEcritureSearch] = useState('')
  const [ecritureTypeFilter, setEcritureTypeFilter] = useState('all')
  const [ecriturePage, setEcriturePage] = useState(1)
  const [ecritureTotalPages, setEcritureTotalPages] = useState(1)

  // Factures state
  const [factures, setFactures] = useState<Facture[]>([])
  const [facturesLoading, setFacturesLoading] = useState(true)
  const [factureSearch, setFactureSearch] = useState('')
  const [factureStatutFilter, setFactureStatutFilter] = useState('all')

  // Rapports state
  const [rapports, setRapports] = useState<RapportFinancier[]>([])
  const [rapportsLoading, setRapportsLoading] = useState(true)

  // TVA state
  const [tvaData, setTvaData] = useState({ tvaCollectee: 0, tvaDeductible: 0, tvaNette: 0 })

  // Dialog state
  const [ecritureDialogOpen, setEcritureDialogOpen] = useState(false)
  const [factureDialogOpen, setFactureDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [ecritureForm, setEcritureForm] = useState({
    type: 'RECETTE',
    montant: '',
    libelle: '',
    reference: '',
    dateEcriture: new Date().toISOString().split('T')[0],
  })

  const [factureForm, setFactureForm] = useState({
    fournisseurNom: '',
    montant: '',
    dateEmission: new Date().toISOString().split('T')[0],
    dateEcheance: '',
  })

  // Fetch tresorerie
  const fetchTresorerie = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/tresorerie?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const data = await res.json()
        setTresorerie(data || { soldeDisponible: 0, entreesMois: 0, sortiesMois: 0, tendance: 0 })
      }
    } catch {
      // silent
    } finally {
      setDashboardLoading(false)
    }
  }, [pharmacieId])

  // Fetch ecritures
  const fetchEcritures = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: ecriturePage.toString(), pageSize: '10' })
      if (ecritureTypeFilter !== 'all') params.set('type', ecritureTypeFilter)
      if (ecritureSearch) params.set('search', ecritureSearch)
      const res = await fetch(`/api/ecritures?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEcritures(Array.isArray(json) ? json : json.data || [])
        setEcritureTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des écritures')
    } finally {
      setEcrituresLoading(false)
    }
  }, [pharmacieId, ecriturePage, ecritureTypeFilter, ecritureSearch])

  // Fetch factures
  const fetchFactures = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (factureStatutFilter !== 'all') params.set('statut', factureStatutFilter)
      const res = await fetch(`/api/factures?${params}`)
      if (res.ok) {
        const json = await res.json()
        setFactures(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des factures')
    } finally {
      setFacturesLoading(false)
    }
  }, [pharmacieId, factureStatutFilter])

  // Fetch rapports
  const fetchRapports = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/rapports-financiers?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setRapports(Array.isArray(json) ? json : json.data || [])
        // Compute TVA from rapports
        if (Array.isArray(json) && json.length > 0) {
          const latest = json[0]
          setTvaData({
            tvaCollectee: latest.tvaCollectee || 0,
            tvaDeductible: latest.tvaDeductible || 0,
            tvaNette: (latest.tvaCollectee || 0) - (latest.tvaDeductible || 0),
          })
        }
      }
    } catch {
      // silent
    } finally {
      setRapportsLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchTresorerie() }, [fetchTresorerie])
  useEffect(() => { fetchEcritures() }, [fetchEcritures])
  useEffect(() => { fetchFactures() }, [fetchFactures])
  useEffect(() => { fetchRapports() }, [fetchRapports])
  useEffect(() => { setEcriturePage(1) }, [ecritureSearch, ecritureTypeFilter])

  // Submit ecriture
  async function handleSubmitEcriture() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        type: ecritureForm.type,
        montant: parseFloat(ecritureForm.montant) || 0,
        libelle: ecritureForm.libelle,
        dateEcriture: ecritureForm.dateEcriture,
      }
      if (ecritureForm.reference) body.reference = ecritureForm.reference

      const res = await fetch('/api/ecritures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Écriture comptable enregistrée')
        setEcritureDialogOpen(false)
        setEcritureForm({ type: 'RECETTE', montant: '', libelle: '', reference: '', dateEcriture: new Date().toISOString().split('T')[0] })
        fetchEcritures()
        fetchTresorerie()
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

  // Submit facture
  async function handleSubmitFacture() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        fournisseurNom: factureForm.fournisseurNom,
        montant: parseFloat(factureForm.montant) || 0,
        dateEmission: factureForm.dateEmission,
        statut: 'EN_ATTENTE',
      }
      if (factureForm.dateEcheance) body.dateEcheance = factureForm.dateEcheance

      const res = await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Facture créée avec succès')
        setFactureDialogOpen(false)
        setFactureForm({ fournisseurNom: '', montant: '', dateEmission: new Date().toISOString().split('T')[0], dateEcheance: '' })
        fetchFactures()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création de la facture')
    } finally {
      setSubmitting(false)
    }
  }

  // Computed
  const filteredFactures = useMemo(() => {
    if (!factureSearch) return factures
    const s = factureSearch.toLowerCase()
    return factures.filter(f =>
      (f.fournisseurNom || '').toLowerCase().includes(s) ||
      (f.numero || '').toLowerCase().includes(s)
    )
  }, [factures, factureSearch])

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance & Comptabilité</h1>
          <p className="text-muted-foreground text-sm">Trésorerie, écritures comptables, factures et rapports financiers</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard" className="gap-2"><Wallet className="w-4 h-4" /> Tableau de bord</TabsTrigger>
          <TabsTrigger value="ecritures" className="gap-2"><Calculator className="w-4 h-4" /> Écritures</TabsTrigger>
          <TabsTrigger value="factures" className="gap-2"><Receipt className="w-4 h-4" /> Factures</TabsTrigger>
          <TabsTrigger value="tva" className="gap-2"><DollarSign className="w-4 h-4" /> TVA</TabsTrigger>
          <TabsTrigger value="rapports" className="gap-2"><BarChart3 className="w-4 h-4" /> Rapports</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="Solde disponible"
              value={tresorerie ? formatFCFA(tresorerie.soldeDisponible) : '—'}
              icon={Wallet}
              variant="success"
              trend={tresorerie ? { value: tresorerie.tendance, label: 'ce mois' } : undefined}
            />
            <KpiCard
              title="Entrées du mois"
              value={tresorerie ? formatFCFA(tresorerie.entreesMois) : '—'}
              icon={TrendingUp}
              variant="default"
            />
            <KpiCard
              title="Sorties du mois"
              value={tresorerie ? formatFCFA(tresorerie.sortiesMois) : '—'}
              icon={TrendingDown}
              variant="danger"
            />
            <KpiCard
              title="Résultat net"
              value={tresorerie ? formatFCFA(tresorerie.entreesMois - tresorerie.sortiesMois) : '—'}
              icon={DollarSign}
              variant={tresorerie && tresorerie.entreesMois - tresorerie.sortiesMois >= 0 ? 'success' : 'danger'}
            />
          </div>

          {/* Quick summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" /> Dernières recettes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {ecritures.filter(e => e.type === 'RECETTE').slice(0, 5).map(e => (
                      <div key={e.id} className="flex justify-between items-center text-sm">
                        <span className="truncate">{e.libelle}</span>
                        <span className="text-emerald-600 font-medium">{formatFCFA(e.montant)}</span>
                      </div>
                    ))}
                    {ecritures.filter(e => e.type === 'RECETTE').length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune recette enregistrée</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ArrowDownRight className="w-4 h-4 text-red-600" /> Dernières dépenses
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dashboardLoading ? (
                  <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {ecritures.filter(e => e.type === 'DEPENSE').slice(0, 5).map(e => (
                      <div key={e.id} className="flex justify-between items-center text-sm">
                        <span className="truncate">{e.libelle}</span>
                        <span className="text-red-600 font-medium">{formatFCFA(e.montant)}</span>
                      </div>
                    ))}
                    {ecritures.filter(e => e.type === 'DEPENSE').length === 0 && (
                      <p className="text-sm text-muted-foreground">Aucune dépense enregistrée</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Écritures Tab */}
        <TabsContent value="ecritures" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher une écriture..." value={ecritureSearch} onChange={e => setEcritureSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={ecritureTypeFilter} onValueChange={setEcritureTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {TYPES_ECRITURE.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={() => setEcritureDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Nouvelle écriture
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {ecrituresLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : ecritures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Calculator className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune écriture comptable</p>
                  <p className="text-sm text-muted-foreground mt-1">Enregistrez votre première écriture</p>
                  <Button onClick={() => setEcritureDialogOpen(true)} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Nouvelle écriture
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Libellé</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ecritures.map(e => (
                          <TableRow key={e.id}>
                            <TableCell>{formatDate(e.dateEcriture)}</TableCell>
                            <TableCell className="font-medium max-w-[200px] truncate">{e.libelle}</TableCell>
                            <TableCell>{getEcritureTypeBadge(e.type)}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{e.reference || '—'}</TableCell>
                            <TableCell className="text-right font-medium">
                              <span className={e.type === 'RECETTE' ? 'text-emerald-600' : e.type === 'DEPENSE' ? 'text-red-600' : ''}>
                                {e.type === 'RECETTE' ? '+' : e.type === 'DEPENSE' ? '-' : ''}{formatFCFA(e.montant)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {ecriturePage} sur {ecritureTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={ecriturePage <= 1} onClick={() => setEcriturePage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" disabled={ecriturePage >= ecritureTotalPages} onClick={() => setEcriturePage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Factures Tab */}
        <TabsContent value="factures" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher une facture..." value={factureSearch} onChange={e => setFactureSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={factureStatutFilter} onValueChange={setFactureStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="PAYEE">Payée</SelectItem>
                    <SelectItem value="EN_RETARD">En retard</SelectItem>
                    <SelectItem value="ANNULEE">Annulée</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setFactureDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Nouvelle facture
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {facturesLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredFactures.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Receipt className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune facture trouvée</p>
                  <p className="text-sm text-muted-foreground mt-1">Créez votre première facture</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N°</TableHead>
                        <TableHead>Fournisseur</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Émission</TableHead>
                        <TableHead>Échéance</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFactures.map(f => (
                        <TableRow key={f.id}>
                          <TableCell className="font-mono text-sm">{f.numero || f.id.slice(0, 8)}</TableCell>
                          <TableCell className="font-medium">{f.fournisseurNom}</TableCell>
                          <TableCell className="font-medium">{formatFCFA(f.montant)}</TableCell>
                          <TableCell>{formatDate(f.dateEmission)}</TableCell>
                          <TableCell>{f.dateEcheance ? formatDate(f.dateEcheance) : '—'}</TableCell>
                          <TableCell>{getFactureStatutBadge(f.statut)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TVA Tab */}
        <TabsContent value="tva" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TVA collectée</p>
                    <p className="text-xl font-bold">{formatFCFA(tvaData.tvaCollectee)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TVA déductible</p>
                    <p className="text-xl font-bold">{formatFCFA(tvaData.tvaDeductible)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tvaData.tvaNette >= 0 ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <DollarSign className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">TVA nette à reverser</p>
                    <p className="text-xl font-bold">{formatFCFA(tvaData.tvaNette)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Détail TVA</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                La TVA nette est calculée comme la différence entre la TVA collectée sur les ventes et la TVA déductible sur les achats.
                Un montant positif indique un reversement à effectuer, un montant négatif indique un crédit de TVA.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rapports Tab */}
        <TabsContent value="rapports" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {rapportsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : rapports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun rapport financier</p>
                  <p className="text-sm text-muted-foreground mt-1">Les rapports sont générés automatiquement chaque mois</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Chiffre d&apos;affaires</TableHead>
                        <TableHead>Charges</TableHead>
                        <TableHead>Résultat</TableHead>
                        <TableHead>TVA collectée</TableHead>
                        <TableHead>TVA déductible</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapports.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.periode}</TableCell>
                          <TableCell className="text-emerald-600">{formatFCFA(r.chiffreAffaires)}</TableCell>
                          <TableCell className="text-red-600">{formatFCFA(r.charges)}</TableCell>
                          <TableCell className={`font-bold ${r.resultat >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatFCFA(r.resultat)}
                          </TableCell>
                          <TableCell>{formatFCFA(r.tvaCollectee)}</TableCell>
                          <TableCell>{formatFCFA(r.tvaDeductible)}</TableCell>
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

      {/* Écriture Dialog */}
      <Dialog open={ecritureDialogOpen} onOpenChange={setEcritureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle écriture comptable</DialogTitle>
            <DialogDescription>Enregistrez une nouvelle écriture dans le journal comptable</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ec-type">Type *</Label>
                <Select value={ecritureForm.type} onValueChange={v => setEcritureForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger id="ec-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES_ECRITURE.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-montant">Montant (FCFA) *</Label>
                <Input id="ec-montant" type="number" value={ecritureForm.montant} onChange={e => setEcritureForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ec-libelle">Libellé *</Label>
              <Input id="ec-libelle" value={ecritureForm.libelle} onChange={e => setEcritureForm(f => ({ ...f, libelle: e.target.value }))} placeholder="Description de l'écriture" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ec-reference">Référence</Label>
                <Input id="ec-reference" value={ecritureForm.reference} onChange={e => setEcritureForm(f => ({ ...f, reference: e.target.value }))} placeholder="N° facture, etc." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ec-date">Date *</Label>
                <Input id="ec-date" type="date" value={ecritureForm.dateEcriture} onChange={e => setEcritureForm(f => ({ ...f, dateEcriture: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEcritureDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEcriture} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facture Dialog */}
      <Dialog open={factureDialogOpen} onOpenChange={setFactureDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle facture</DialogTitle>
            <DialogDescription>Créez une nouvelle facture fournisseur</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="fac-fournisseur">Fournisseur *</Label>
              <Input id="fac-fournisseur" value={factureForm.fournisseurNom} onChange={e => setFactureForm(f => ({ ...f, fournisseurNom: e.target.value }))} placeholder="Nom du fournisseur" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fac-montant">Montant (FCFA) *</Label>
              <Input id="fac-montant" type="number" value={factureForm.montant} onChange={e => setFactureForm(f => ({ ...f, montant: e.target.value }))} placeholder="0" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fac-emission">Date d&apos;émission *</Label>
                <Input id="fac-emission" type="date" value={factureForm.dateEmission} onChange={e => setFactureForm(f => ({ ...f, dateEmission: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fac-echeance">Date d&apos;échéance</Label>
                <Input id="fac-echeance" type="date" value={factureForm.dateEcheance} onChange={e => setFactureForm(f => ({ ...f, dateEcheance: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFactureDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitFacture} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la facture
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
