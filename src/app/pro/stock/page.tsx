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
import { Separator } from '@/components/ui/separator'
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Package,
  AlertTriangle,
  Clock,
  XCircle,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  Pencil,
  Trash2,
  ArrowRightLeft,
  Filter,
  CheckCircle2,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Lot {
  id: string
  medicamentId: string
  pharmacieId: string
  numeroLot: string
  quantite: number
  quantiteInitiale: number
  prixAchat: number
  dateExpiration: string
  dateReception: string
  createdAt: string
}

interface Medicament {
  id: string
  pharmacieId: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixPublic: number
  prixAvantRemise: number | null
  surOrdonnance: boolean
  estStupefiant: boolean
  stockMinimum: number
  stockSecurite: number
  codeBarres: string | null
  categorieAtc: string | null
  actif: boolean
  lots: Lot[]
  createdAt: string
  updatedAt: string
}

interface AlerteStock {
  id: string
  pharmacieId: string
  medicamentId: string
  lotId: string | null
  type: 'RUPTURE' | 'SEUIL_MINIMUM' | 'PEREMPTION_PROCHE' | 'SURSTOCK'
  message: string
  traitee: boolean
  traiteePar: string | null
  traiteeLe: string | null
  createdAt: string
  medicament: { nomCommercial: string; dci: string }
}

interface MedicamentsResponse {
  data: Medicament[]
  total: number
  page: number
  pageSize: number
  totalPages: number
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

function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  const diff = target.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function getStockTotal(medicament: Medicament): number {
  return medicament.lots.reduce((sum, lot) => sum + lot.quantite, 0)
}

type StockStatus = 'OK' | 'ALERTE' | 'RUPTURE'

function getStockStatus(medicament: Medicament): StockStatus {
  const total = getStockTotal(medicament)
  if (total === 0) return 'RUPTURE'
  if (total <= medicament.stockMinimum) return 'ALERTE'
  return 'OK'
}

function getStatusBadge(status: StockStatus) {
  switch (status) {
    case 'OK':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">OK</Badge>
    case 'ALERTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Alerte</Badge>
    case 'RUPTURE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Rupture</Badge>
  }
}

function getDaysRemainingBadge(days: number) {
  if (days <= 0) {
    return <Badge variant="destructive" className="text-xs">Expiré</Badge>
  }
  if (days < 30) {
    return <Badge variant="destructive" className="text-xs">{days}j</Badge>
  }
  if (days < 60) {
    return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-xs">{days}j</Badge>
  }
  if (days <= 90) {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">{days}j</Badge>
  }
  return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">{days}j</Badge>
}

function getAlertTypeBadge(type: string) {
  switch (type) {
    case 'RUPTURE':
      return <Badge variant="destructive" className="text-xs">Rupture</Badge>
    case 'SEUIL_MINIMUM':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Seuil min.</Badge>
    case 'PEREMPTION_PROCHE':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-xs">Péremption</Badge>
    case 'SURSTOCK':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-0 text-xs">Surstock</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

const FORMES_GALENIQUES = [
  'COMPRIME', 'GELULE', 'SIROP', 'INJECTION', 'POMMADE',
  'GOUTTES', 'SUPPOSITOIRE', 'INHALATEUR', 'SOLUTION', 'POUDRE', 'AUTRE'
]

const FORMES_LABELS: Record<string, string> = {
  COMPRIME: 'Comprimé',
  GELULE: 'Gélule',
  SIROP: 'Sirop',
  INJECTION: 'Injection',
  POMMADE: 'Pommade',
  GOUTTES: 'Gouttes',
  SUPPOSITOIRE: 'Suppositoire',
  INHALATEUR: 'Inhalateur',
  SOLUTION: 'Solution',
  POUDRE: 'Poudre',
  AUTRE: 'Autre',
}

const CATEGORIES_ATC = ['A', 'B', 'C', 'D', 'G', 'H', 'J', 'L', 'M', 'N', 'P', 'R', 'S', 'V']

// === Main Component ===

export default function StockPage() {
  const { pharmacie, user } = useAuth()
  const pharmacieId = pharmacie?.id

  // Data state
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [totalMedicaments, setTotalMedicaments] = useState(0)
  const [alertes, setAlertes] = useState<AlerteStock[]>([])
  const [loading, setLoading] = useState(true)
  const [alertesLoading, setAlertesLoading] = useState(true)

  // Table state
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [formeFilter, setFormeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('nomCommercial')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Detail/Dialog state
  const [selectedMedicament, setSelectedMedicament] = useState<Medicament | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [addMedicamentOpen, setAddMedicamentOpen] = useState(false)
  const [addLotOpen, setAddLotOpen] = useState(false)
  const [mouvementOpen, setMouvementOpen] = useState(false)
  const [mouvementMedicament, setMouvementMedicament] = useState<Medicament | null>(null)

  // Form state
  const [medicamentForm, setMedicamentForm] = useState({
    dci: '',
    nomCommercial: '',
    forme: 'COMPRIME',
    dosage: '',
    prixPublic: '',
    prixAvantRemise: '',
    surOrdonnance: false,
    estStupefiant: false,
    stockMinimum: '5',
    stockSecurite: '10',
    codeBarres: '',
    categorieAtc: '',
  })
  const [lotForm, setLotForm] = useState({
    medicamentId: '',
    numeroLot: '',
    quantite: '',
    quantiteInitiale: '',
    prixAchat: '',
    dateExpiration: '',
  })
  const [mouvementForm, setMouvementForm] = useState({
    medicamentId: '',
    lotId: '',
    type: 'ENTREE' as string,
    quantite: '',
    prixUnitaire: '',
    motif: '',
    reference: '',
  })

  // Fetch medicaments
  const fetchMedicaments = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({
        pharmacieId,
        page: page.toString(),
        pageSize: pageSize.toString(),
        sortBy,
        sortOrder,
      })
      if (search) params.set('search', search)
      if (formeFilter && formeFilter !== 'all') params.set('forme', formeFilter)

      const res = await fetch(`/api/medicaments?${params}`)
      if (res.ok) {
        const json: MedicamentsResponse = await res.json()
        setMedicaments(json.data || [])
        setTotalMedicaments(json.total || 0)
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des médicaments')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, pageSize, sortBy, sortOrder, search, formeFilter])

  // Fetch alertes
  const fetchAlertes = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/stocks/alertes?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const data = await res.json()
        setAlertes(Array.isArray(data) ? data : [])
      }
    } catch {
      // silent
    } finally {
      setAlertesLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => {
    fetchMedicaments()
  }, [fetchMedicaments])

  useEffect(() => {
    fetchAlertes()
  }, [fetchAlertes])

  // Reset page when search/filter changes
  useEffect(() => {
    setPage(1)
  }, [search, formeFilter])

  // Computed stats
  const stats = useMemo(() => {
    const allMeds = medicaments
    const totalProducts = totalMedicaments
    const stockAlerts = alertes.filter(a => !a.traitee && (a.type === 'SEUIL_MINIMUM' || a.type === 'SURSTOCK')).length
    const expiringSoon = alertes.filter(a => !a.traitee && a.type === 'PEREMPTION_PROCHE').length
    const outOfStock = alertes.filter(a => !a.traitee && a.type === 'RUPTURE').length

    // Also compute from loaded data for more accuracy
    const outOfStockFromData = allMeds.filter(m => getStockStatus(m) === 'RUPTURE').length
    const alertFromData = allMeds.filter(m => getStockStatus(m) === 'ALERTE').length

    return {
      totalProducts,
      stockAlerts: Math.max(stockAlerts, alertFromData),
      expiringSoon,
      outOfStock: Math.max(outOfStock, outOfStockFromData),
    }
  }, [medicaments, alertes, totalMedicaments])

  // Sort handler
  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Add medicament
  async function handleAddMedicament() {
    if (!pharmacieId) return
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        dci: medicamentForm.dci,
        nomCommercial: medicamentForm.nomCommercial,
        forme: medicamentForm.forme,
        dosage: medicamentForm.dosage,
        prixPublic: parseFloat(medicamentForm.prixPublic) || 0,
        surOrdonnance: medicamentForm.surOrdonnance,
        estStupefiant: medicamentForm.estStupefiant,
        stockMinimum: parseInt(medicamentForm.stockMinimum) || 5,
        stockSecurite: parseInt(medicamentForm.stockSecurite) || 10,
        actif: true,
      }
      if (medicamentForm.prixAvantRemise) body.prixAvantRemise = parseFloat(medicamentForm.prixAvantRemise)
      if (medicamentForm.codeBarres) body.codeBarres = medicamentForm.codeBarres
      if (medicamentForm.categorieAtc) body.categorieAtc = medicamentForm.categorieAtc

      const res = await fetch('/api/medicaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Médicament ajouté avec succès')
        setAddMedicamentOpen(false)
        resetMedicamentForm()
        fetchMedicaments()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout du médicament')
    }
  }

  // Add lot
  async function handleAddLot() {
    if (!pharmacieId) return
    try {
      const res = await fetch('/api/stocks/lots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          medicamentId: lotForm.medicamentId,
          numeroLot: lotForm.numeroLot,
          quantite: parseInt(lotForm.quantite) || 0,
          quantiteInitiale: parseInt(lotForm.quantiteInitiale) || 0,
          prixAchat: parseFloat(lotForm.prixAchat) || 0,
          dateExpiration: lotForm.dateExpiration,
        }),
      })
      if (res.ok) {
        toast.success('Lot ajouté avec succès')
        setAddLotOpen(false)
        resetLotForm()
        fetchMedicaments()
        if (selectedMedicament?.id === lotForm.medicamentId) {
          // Refresh selected medicament lots
          const medRes = await fetch(`/api/medicaments?pharmacieId=${pharmacieId}&search=${selectedMedicament.nomCommercial}`)
          if (medRes.ok) {
            const json: MedicamentsResponse = await medRes.json()
            const updated = json.data?.find((m: Medicament) => m.id === lotForm.medicamentId)
            if (updated) setSelectedMedicament(updated)
          }
        }
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'ajout du lot')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout du lot')
    }
  }

  // Add mouvement
  async function handleAddMouvement() {
    if (!pharmacieId) return
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        medicamentId: mouvementForm.medicamentId,
        type: mouvementForm.type,
        quantite: parseInt(mouvementForm.quantite) || 0,
      }
      if (mouvementForm.lotId) body.lotId = mouvementForm.lotId
      if (mouvementForm.prixUnitaire) body.prixUnitaire = parseFloat(mouvementForm.prixUnitaire)
      if (mouvementForm.motif) body.motif = mouvementForm.motif
      if (mouvementForm.reference) body.reference = mouvementForm.reference
      if (user?.id) body.utilisateurId = user.id

      const res = await fetch('/api/stocks/mouvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Mouvement enregistré avec succès')
        setMouvementOpen(false)
        resetMouvementForm()
        fetchMedicaments()
        fetchAlertes()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement du mouvement')
    }
  }

  // Mark alerte as resolved
  async function handleResolveAlerte(id: string) {
    try {
      const res = await fetch('/api/stocks/alertes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, traiteePar: user?.id }),
      })
      if (res.ok) {
        toast.success('Alerte marquée comme traitée')
        fetchAlertes()
      } else {
        toast.error('Erreur lors du traitement de l\'alerte')
      }
    } catch {
      toast.error('Erreur lors du traitement de l\'alerte')
    }
  }

  // Form resetters
  function resetMedicamentForm() {
    setMedicamentForm({
      dci: '', nomCommercial: '', forme: 'COMPRIME', dosage: '',
      prixPublic: '', prixAvantRemise: '', surOrdonnance: false,
      estStupefiant: false, stockMinimum: '5', stockSecurite: '10',
      codeBarres: '', categorieAtc: '',
    })
  }

  function resetLotForm() {
    setLotForm({ medicamentId: '', numeroLot: '', quantite: '', quantiteInitiale: '', prixAchat: '', dateExpiration: '' })
  }

  function resetMouvementForm() {
    setMouvementForm({ medicamentId: '', lotId: '', type: 'ENTREE', quantite: '', prixUnitaire: '', motif: '', reference: '' })
  }

  // Open add lot for specific medicament
  function openAddLot(med: Medicament) {
    setLotForm(prev => ({ ...prev, medicamentId: med.id }))
    setAddLotOpen(true)
  }

  // Open mouvement for specific medicament
  function openMouvement(med: Medicament) {
    setMouvementMedicament(med)
    setMouvementForm(prev => ({ ...prev, medicamentId: med.id, lotId: '' }))
    setMouvementOpen(true)
  }

  // Active alertes (not treated)
  const activeAlertes = alertes.filter(a => !a.traitee)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestion du Stock</h1>
          <p className="text-sm text-muted-foreground">
            Suivez vos médicaments, lots et alertes de stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openAddLot(selectedMedicament || medicaments[0])} disabled={medicaments.length === 0}>
            <Plus className="w-4 h-4 mr-1" /> Lot
          </Button>
          <Button variant="outline" size="sm" onClick={() => { if (medicaments.length > 0) openMouvement(medicaments[0]) }} disabled={medicaments.length === 0}>
            <ArrowRightLeft className="w-4 h-4 mr-1" /> Mouvement
          </Button>
          <Button size="sm" className="bg-[#1D9E75] hover:bg-[#1D9E75]/90" onClick={() => { resetMedicamentForm(); setAddMedicamentOpen(true) }}>
            <Plus className="w-4 h-4 mr-1" /> Médicament
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total produits"
          value={stats.totalProducts}
          icon={Package}
          variant="default"
          subtitle="médicaments en catalogue"
        />
        <KpiCard
          title="Alertes stock"
          value={stats.stockAlerts}
          icon={AlertTriangle}
          variant={stats.stockAlerts > 0 ? 'warning' : 'default'}
          subtitle="sous seuil minimum"
        />
        <KpiCard
          title="Péremption proche"
          value={stats.expiringSoon}
          icon={Clock}
          variant={stats.expiringSoon > 0 ? 'warning' : 'default'}
          subtitle="expirent sous 90 jours"
        />
        <KpiCard
          title="Rupture de stock"
          value={stats.outOfStock}
          icon={XCircle}
          variant={stats.outOfStock > 0 ? 'danger' : 'default'}
          subtitle="produits indisponibles"
        />
      </div>

      {/* Main content tabs */}
      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">Inventaire</TabsTrigger>
          <TabsTrigger value="alertes">
            Alertes {activeAlertes.length > 0 && (
              <Badge variant="destructive" className="ml-1.5 text-[10px] h-5 min-w-[20px] flex items-center justify-center">
                {activeAlertes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === INVENTAIRE TAB === */}
        <TabsContent value="stock" className="space-y-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom, DCI, dosage..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={formeFilter} onValueChange={setFormeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
                    <SelectValue placeholder="Forme" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les formes</SelectItem>
                    {FORMES_GALENIQUES.map(f => (
                      <SelectItem key={f} value={f}>{FORMES_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Medication Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer select-none" onClick={() => handleSort('nomCommercial')}>
                        <div className="flex items-center gap-1">
                          Nom commercial
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="cursor-pointer select-none hidden md:table-cell" onClick={() => handleSort('dci')}>
                        <div className="flex items-center gap-1">
                          DCI
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="hidden lg:table-cell">Forme</TableHead>
                      <TableHead className="hidden lg:table-cell">Dosage</TableHead>
                      <TableHead className="cursor-pointer select-none text-right" onClick={() => handleSort('prixPublic')}>
                        <div className="flex items-center justify-end gap-1">
                          Prix public
                          <ArrowUpDown className="h-3 w-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center hidden sm:table-cell">Min.</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {medicaments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                          <p>Aucun médicament trouvé</p>
                          <p className="text-xs mt-1">Ajoutez un médicament ou modifiez vos filtres</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      medicaments.map((med) => {
                        const stockTotal = getStockTotal(med)
                        const status = getStockStatus(med)
                        return (
                          <TableRow
                            key={med.id}
                            className="cursor-pointer hover:bg-muted/50"
                            onClick={() => { setSelectedMedicament(med); setDetailOpen(true) }}
                          >
                            <TableCell className="font-medium">
                              <div>
                                <span>{med.nomCommercial}</span>
                                {med.estStupefiant && (
                                  <Badge variant="outline" className="ml-1.5 text-[9px] text-red-600 border-red-200 bg-red-50">Stup.</Badge>
                                )}
                                {med.surOrdonnance && (
                                  <Badge variant="outline" className="ml-1 text-[9px] text-blue-600 border-blue-200 bg-blue-50">R.O.</Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground md:hidden">{med.dci}</span>
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{med.dci}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">{FORMES_LABELS[med.forme] || med.forme}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm">{med.dosage}</TableCell>
                            <TableCell className="text-right text-sm">{formatFCFA(med.prixPublic)}</TableCell>
                            <TableCell className="text-center">
                              <span className={`text-sm font-semibold ${
                                status === 'RUPTURE' ? 'text-red-600' :
                                status === 'ALERTE' ? 'text-amber-600' :
                                'text-foreground'
                              }`}>
                                {stockTotal}
                              </span>
                            </TableCell>
                            <TableCell className="text-center hidden sm:table-cell text-sm text-muted-foreground">{med.stockMinimum}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(status)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => { setSelectedMedicament(med); setDetailOpen(true) }}
                                  title="Voir les lots"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openMouvement(med)}
                                  title="Mouvement de stock"
                                >
                                  <ArrowRightLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => openAddLot(med)}
                                  title="Ajouter un lot"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {totalMedicaments} produit{totalMedicaments > 1 ? 's' : ''} • Page {page}/{totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === ALERTES TAB === */}
        <TabsContent value="alertes" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Alertes de stock actives
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
                </div>
              ) : activeAlertes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
                  <p>Aucune alerte active</p>
                  <p className="text-xs mt-1">Tout semble en ordre ✅</p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {activeAlertes.map((alerte) => (
                      <div
                        key={alerte.id}
                        className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 ${
                            alerte.type === 'RUPTURE' ? 'bg-red-100 text-red-600' :
                            alerte.type === 'PEREMPTION_PROCHE' ? 'bg-orange-100 text-orange-600' :
                            alerte.type === 'SEUIL_MINIMUM' ? 'bg-amber-100 text-amber-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {alerte.type === 'RUPTURE' ? <XCircle className="w-4 h-4" /> :
                             alerte.type === 'PEREMPTION_PROCHE' ? <Clock className="w-4 h-4" /> :
                             <AlertTriangle className="w-4 h-4" />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">{alerte.medicament?.nomCommercial}</span>
                              {getAlertTypeBadge(alerte.type)}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{alerte.message}</p>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(alerte.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleResolveAlerte(alerte.id)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Traiter
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === MEDICAMENT DETAIL SHEET (Lots) === */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#1D9E75]" />
              {selectedMedicament?.nomCommercial}
            </SheetTitle>
          </SheetHeader>
          {selectedMedicament && (
            <div className="mt-6 space-y-6">
              {/* Medication info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-xs text-muted-foreground">DCI</span>
                  <p className="text-sm font-medium">{selectedMedicament.dci}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Forme</span>
                  <p className="text-sm font-medium">{FORMES_LABELS[selectedMedicament.forme] || selectedMedicament.forme}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Dosage</span>
                  <p className="text-sm font-medium">{selectedMedicament.dosage}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Prix public</span>
                  <p className="text-sm font-medium">{formatFCFA(selectedMedicament.prixPublic)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Stock total</span>
                  <p className={`text-sm font-bold ${getStockStatus(selectedMedicament) === 'RUPTURE' ? 'text-red-600' : getStockStatus(selectedMedicament) === 'ALERTE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {getStockTotal(selectedMedicament)} unités
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Seuil minimum</span>
                  <p className="text-sm font-medium">{selectedMedicament.stockMinimum}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Seuil sécurité</span>
                  <p className="text-sm font-medium">{selectedMedicament.stockSecurite}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Statut</span>
                  <div className="mt-0.5">{getStatusBadge(getStockStatus(selectedMedicament))}</div>
                </div>
              </div>

              <Separator />

              {/* Lots */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Lots ({selectedMedicament.lots.length})</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => openAddLot(selectedMedicament)}
                  >
                    <Plus className="w-3 h-3 mr-1" /> Ajouter un lot
                  </Button>
                </div>

                {selectedMedicament.lots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun lot enregistré</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-2">
                      {selectedMedicament.lots.map((lot) => {
                        const days = daysUntil(lot.dateExpiration)
                        return (
                          <div
                            key={lot.id}
                            className="p-3 rounded-lg border bg-card space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-semibold">Lot {lot.numeroLot}</span>
                              {getDaysRemainingBadge(days)}
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-muted-foreground">Quantité restante</span>
                                <p className={`font-medium ${lot.quantite === 0 ? 'text-red-600' : ''}`}>
                                  {lot.quantite} / {lot.quantiteInitiale}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Prix d&apos;achat</span>
                                <p className="font-medium">{formatFCFA(lot.prixAchat)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date expiration</span>
                                <p className="font-medium">{formatDate(lot.dateExpiration)}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Date réception</span>
                                <p className="font-medium">{formatDate(lot.dateReception)}</p>
                              </div>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${
                                  lot.quantite === 0 ? 'bg-red-400' :
                                  lot.quantite / lot.quantiteInitiale < 0.3 ? 'bg-amber-400' :
                                  'bg-emerald-400'
                                }`}
                                style={{ width: `${Math.min(100, (lot.quantite / lot.quantiteInitiale) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-[#1D9E75] hover:bg-[#1D9E75]/90"
                  size="sm"
                  onClick={() => { openMouvement(selectedMedicament); setDetailOpen(false) }}
                >
                  <ArrowRightLeft className="w-4 h-4 mr-1" /> Mouvement
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { openAddLot(selectedMedicament); setDetailOpen(false) }}
                >
                  <Plus className="w-4 h-4 mr-1" /> Nouveau lot
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* === ADD MEDICAMENT DIALOG === */}
      <Dialog open={addMedicamentOpen} onOpenChange={setAddMedicamentOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter un médicament</DialogTitle>
            <DialogDescription>
              Renseignez les informations du nouveau médicament
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nomCommercial">Nom commercial *</Label>
                <Input
                  id="nomCommercial"
                  value={medicamentForm.nomCommercial}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, nomCommercial: e.target.value }))}
                  placeholder="Ex: Doliprane"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dci">DCI *</Label>
                <Input
                  id="dci"
                  value={medicamentForm.dci}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, dci: e.target.value }))}
                  placeholder="Ex: Paracétamol"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forme">Forme galénique *</Label>
                <Select value={medicamentForm.forme} onValueChange={(v) => setMedicamentForm(f => ({ ...f, forme: v }))}>
                  <SelectTrigger id="forme">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMES_GALENIQUES.map(f => (
                      <SelectItem key={f} value={f}>{FORMES_LABELS[f]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage *</Label>
                <Input
                  id="dosage"
                  value={medicamentForm.dosage}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, dosage: e.target.value }))}
                  placeholder="Ex: 500mg"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prixPublic">Prix public (FCFA) *</Label>
                <Input
                  id="prixPublic"
                  type="number"
                  value={medicamentForm.prixPublic}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, prixPublic: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prixAvantRemise">Prix avant remise</Label>
                <Input
                  id="prixAvantRemise"
                  type="number"
                  value={medicamentForm.prixAvantRemise}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, prixAvantRemise: e.target.value }))}
                  placeholder="Optionnel"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="stockMinimum">Stock minimum</Label>
                <Input
                  id="stockMinimum"
                  type="number"
                  value={medicamentForm.stockMinimum}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, stockMinimum: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockSecurite">Stock de sécurité</Label>
                <Input
                  id="stockSecurite"
                  type="number"
                  value={medicamentForm.stockSecurite}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, stockSecurite: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="codeBarres">Code-barres</Label>
                <Input
                  id="codeBarres"
                  value={medicamentForm.codeBarres}
                  onChange={(e) => setMedicamentForm(f => ({ ...f, codeBarres: e.target.value }))}
                  placeholder="Optionnel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="categorieAtc">Catégorie ATC</Label>
                <Select value={medicamentForm.categorieAtc || '_none'} onValueChange={(v) => setMedicamentForm(f => ({ ...f, categorieAtc: v === '_none' ? '' : v }))}>
                  <SelectTrigger id="categorieAtc">
                    <SelectValue placeholder="Sélectionner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Aucune</SelectItem>
                    {CATEGORIES_ATC.map(c => (
                      <SelectItem key={c} value={c}>Catégorie {c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="surOrdonnance"
                  checked={medicamentForm.surOrdonnance}
                  onCheckedChange={(checked) => setMedicamentForm(f => ({ ...f, surOrdonnance: !!checked }))}
                />
                <Label htmlFor="surOrdonnance" className="text-sm font-normal">Sur ordonnance</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="estStupefiant"
                  checked={medicamentForm.estStupefiant}
                  onCheckedChange={(checked) => setMedicamentForm(f => ({ ...f, estStupefiant: !!checked }))}
                />
                <Label htmlFor="estStupefiant" className="text-sm font-normal">Stupéfiant</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMedicamentOpen(false)}>Annuler</Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90"
              onClick={handleAddMedicament}
              disabled={!medicamentForm.nomCommercial || !medicamentForm.dci || !medicamentForm.dosage || !medicamentForm.prixPublic}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === ADD LOT DIALOG === */}
      <Dialog open={addLotOpen} onOpenChange={setAddLotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un lot</DialogTitle>
            <DialogDescription>
              Enregistrez un nouveau lot pour un médicament
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="lotMedicament">Médicament *</Label>
              <Select
                value={lotForm.medicamentId}
                onValueChange={(v) => setLotForm(f => ({ ...f, medicamentId: v }))}
              >
                <SelectTrigger id="lotMedicament">
                  <SelectValue placeholder="Sélectionner un médicament" />
                </SelectTrigger>
                <SelectContent>
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nomCommercial} — {m.dci}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="numeroLot">Numéro de lot *</Label>
              <Input
                id="numeroLot"
                value={lotForm.numeroLot}
                onChange={(e) => setLotForm(f => ({ ...f, numeroLot: e.target.value }))}
                placeholder="Ex: LOT2025-001"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantiteInitiale">Quantité initiale *</Label>
                <Input
                  id="quantiteInitiale"
                  type="number"
                  value={lotForm.quantiteInitiale}
                  onChange={(e) => setLotForm(f => ({ ...f, quantiteInitiale: e.target.value, quantite: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantiteLot">Quantité actuelle</Label>
                <Input
                  id="quantiteLot"
                  type="number"
                  value={lotForm.quantite}
                  onChange={(e) => setLotForm(f => ({ ...f, quantite: e.target.value }))}
                  placeholder="Identique à l'initiale"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prixAchat">Prix d&apos;achat (FCFA) *</Label>
                <Input
                  id="prixAchat"
                  type="number"
                  value={lotForm.prixAchat}
                  onChange={(e) => setLotForm(f => ({ ...f, prixAchat: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateExpiration">Date d&apos;expiration *</Label>
                <Input
                  id="dateExpiration"
                  type="date"
                  value={lotForm.dateExpiration}
                  onChange={(e) => setLotForm(f => ({ ...f, dateExpiration: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddLotOpen(false)}>Annuler</Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90"
              onClick={handleAddLot}
              disabled={!lotForm.medicamentId || !lotForm.numeroLot || !lotForm.quantiteInitiale || !lotForm.prixAchat || !lotForm.dateExpiration}
            >
              Ajouter le lot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* === STOCK MOUVEMENT DIALOG === */}
      <Dialog open={mouvementOpen} onOpenChange={setMouvementOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enregistrer un mouvement</DialogTitle>
            <DialogDescription>
              {mouvementMedicament
                ? `Mouvement pour ${mouvementMedicament.nomCommercial} — ${mouvementMedicament.dci}`
                : 'Enregistrez une entrée, sortie ou ajustement de stock'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {!mouvementMedicament && (
              <div className="space-y-2">
                <Label htmlFor="mvtMedicament">Médicament *</Label>
                <Select
                  value={mouvementForm.medicamentId}
                  onValueChange={(v) => setMouvementForm(f => ({ ...f, medicamentId: v, lotId: '' }))}
                >
                  <SelectTrigger id="mvtMedicament">
                    <SelectValue placeholder="Sélectionner un médicament" />
                  </SelectTrigger>
                  <SelectContent>
                    {medicaments.map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.nomCommercial} — {m.dci}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mvtType">Type de mouvement *</Label>
                <Select
                  value={mouvementForm.type}
                  onValueChange={(v) => setMouvementForm(f => ({ ...f, type: v }))}
                >
                  <SelectTrigger id="mvtType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTREE">Entrée</SelectItem>
                    <SelectItem value="SORTIE">Sortie</SelectItem>
                    <SelectItem value="AJUSTEMENT">Ajustement</SelectItem>
                    <SelectItem value="DESTRUCTION">Destruction</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mvtQuantite">
                  {mouvementForm.type === 'AJUSTEMENT' ? 'Nouvelle quantité' : 'Quantité'} *
                </Label>
                <Input
                  id="mvtQuantite"
                  type="number"
                  value={mouvementForm.quantite}
                  onChange={(e) => setMouvementForm(f => ({ ...f, quantite: e.target.value }))}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mvtLot">Lot concerné</Label>
              <Select
                value={mouvementForm.lotId || '_none'}
                onValueChange={(v) => setMouvementForm(f => ({ ...f, lotId: v === '_none' ? '' : v }))}
              >
                <SelectTrigger id="mvtLot">
                  <SelectValue placeholder="Sélectionner un lot (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Aucun lot</SelectItem>
                  {(mouvementMedicament?.lots || medicaments.find(m => m.id === mouvementForm.medicamentId)?.lots || []).map(lot => (
                    <SelectItem key={lot.id} value={lot.id}>
                      Lot {lot.numeroLot} — {lot.quantite} dispo. — Exp. {formatDate(lot.dateExpiration)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mvtPrix">Prix unitaire (FCFA)</Label>
                <Input
                  id="mvtPrix"
                  type="number"
                  value={mouvementForm.prixUnitaire}
                  onChange={(e) => setMouvementForm(f => ({ ...f, prixUnitaire: e.target.value }))}
                  placeholder="Optionnel"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mvtReference">Référence</Label>
                <Input
                  id="mvtReference"
                  value={mouvementForm.reference}
                  onChange={(e) => setMouvementForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="Ex: BC-2025-001"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mvtMotif">Motif</Label>
              <Input
                id="mvtMotif"
                value={mouvementForm.motif}
                onChange={(e) => setMouvementForm(f => ({ ...f, motif: e.target.value }))}
                placeholder="Raison du mouvement"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMouvementOpen(false)}>Annuler</Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90"
              onClick={handleAddMouvement}
              disabled={!mouvementForm.medicamentId || !mouvementForm.type || !mouvementForm.quantite}
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
