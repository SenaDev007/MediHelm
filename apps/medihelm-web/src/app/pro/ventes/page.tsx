'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/pro/auth-context'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Badge,
} from '@/components/ui/badge'
import {
  Button,
} from '@/components/ui/button'
import {
  Input,
} from '@/components/ui/input'
import {
  Label,
} from '@/components/ui/label'
import {
  Separator,
} from '@/components/ui/separator'
import {
  ScrollArea,
} from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DollarSign, ShoppingCart, TrendingUp, Clock, Search, Filter, Plus, Eye, Receipt,
  Trash2, Minus, ArrowUpDown, ChevronLeft, ChevronRight, X, Package, User, CreditCard,
  AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// Types
// ============================================================

type StatutVente = 'BROUILLON' | 'EN_COURS' | 'VALIDEE' | 'ANNULEE' | 'REMBOURSEE'
type ModePaiement = 'ESPECES' | 'WAVE' | 'MTN_MONEY' | 'MOOV_MONEY' | 'CARTE_BANCAIRE' | 'CHEQUE' | 'CREDIT' | 'ASSURANCE'

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string
  email?: string | null
  numeroAssurance?: string | null
  assurance?: string | null
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
  forme: string
  dosage: string
  prixPublic: number
  surOrdonnance: boolean
}

interface LigneVente {
  id: string
  medicamentId: string
  lotId?: string | null
  quantite: number
  prixUnitaire: number
  prixTotal: number
  remise: number
  medicament?: { id: string; nomCommercial: string; dci: string; forme?: string; dosage?: string }
}

interface Paiement {
  id: string
  montant: number
  mode: ModePaiement
  reference?: string | null
  statut: string
  createdAt: string
}

interface Vente {
  id: string
  reference: string
  pharmacieId: string
  patientId?: string | null
  utilisateurId?: string | null
  ordonnanceId?: string | null
  montantTotal: number
  montantPaye: number
  montantAssur: number
  remise: number
  statut: StatutVente
  modePaiement: ModePaiement
  createdAt: string
  updatedAt: string
  patient?: Patient | null
  lignes?: LigneVente[]
  paiements?: Paiement[]
  utilisateur?: { id: string; nom: string; prenom: string } | null
  ordonnance?: { id: string; reference: string; prescripteur: string } | null
  session?: { id: string; caisse: { nom: string } } | null
}

interface CartItem {
  medicamentId: string
  nomCommercial: string
  dci: string
  prixUnitaire: number
  quantite: number
  remise: number
}

// ============================================================
// Helpers
// ============================================================

const formatFCFA = (amount: number) =>
  new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const STATUT_LABELS: Record<StatutVente, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  VALIDEE: 'Validée',
  ANNULEE: 'Annulée',
  REMBOURSEE: 'Remboursée',
}

const STATUT_COLORS: Record<StatutVente, string> = {
  BROUILLON: 'bg-gray-100 text-gray-700 border-gray-200',
  EN_COURS: 'bg-amber-50 text-amber-700 border-amber-200',
  VALIDEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ANNULEE: 'bg-red-50 text-red-700 border-red-200',
  REMBOURSEE: 'bg-blue-50 text-blue-700 border-blue-200',
}

const MODE_PAIEMENT_LABELS: Record<ModePaiement, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  MTN_MONEY: 'MTN Money',
  MOOV_MONEY: 'Moov Money',
  CARTE_BANCAIRE: 'Carte bancaire',
  CHEQUE: 'Chèque',
  CREDIT: 'Crédit',
  ASSURANCE: 'Assurance',
}

const MODE_PAIEMENT_COLORS: Record<ModePaiement, string> = {
  ESPECES: 'bg-gray-100 text-gray-700',
  WAVE: 'bg-blue-50 text-blue-700',
  MTN_MONEY: 'bg-yellow-50 text-yellow-700',
  MOOV_MONEY: 'bg-indigo-50 text-indigo-700',
  CARTE_BANCAIRE: 'bg-purple-50 text-purple-700',
  CHEQUE: 'bg-slate-50 text-slate-700',
  CREDIT: 'bg-orange-50 text-orange-700',
  ASSURANCE: 'bg-teal-50 text-teal-700',
}

function StatutBadge({ statut }: { statut: StatutVente }) {
  return (
    <Badge variant="outline" className={`${STATUT_COLORS[statut]} text-xs font-medium px-2 py-0.5`}>
      {STATUT_LABELS[statut]}
    </Badge>
  )
}

function ModePaiementBadge({ mode }: { mode: ModePaiement }) {
  return (
    <Badge variant="secondary" className={`${MODE_PAIEMENT_COLORS[mode]} text-xs font-medium px-2 py-0.5`}>
      {MODE_PAIEMENT_LABELS[mode]}
    </Badge>
  )
}

// ============================================================
// Main Page Component
// ============================================================

export default function VentesPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id || ''

  // Data state
  const [ventes, setVentes] = useState<Vente[]>([])
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({ caDuJour: 0, nbVentesJour: 0, panierMoyen: 0, ventesEnAttente: 0 })
  const [loading, setLoading] = useState(true)

  // Filter state
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('')
  const [filterMode, setFilterMode] = useState<string>('')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'montantTotal'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)

  // Dialog state
  const [selectedVente, setSelectedVente] = useState<Vente | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [posOpen, setPosOpen] = useState(false)

  // POS state
  const [cart, setCart] = useState<CartItem[]>([])
  const [medSearch, setMedSearch] = useState('')
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [patientSearch, setPatientSearch] = useState('')
  const [posModePaiement, setPosModePaiement] = useState<ModePaiement>('ESPECES')
  const [posGlobalRemise, setPosGlobalRemise] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [showNewPatient, setShowNewPatient] = useState(false)
  const [newPatient, setNewPatient] = useState({ nom: '', prenom: '', telephone: '' })

  const limit = 20

  // ============================================================
  // Fetch ventes
  // ============================================================

  const fetchVentes = useCallback(async () => {
    if (!pharmacieId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({
        pharmacieId,
        page: String(page),
        limit: String(limit),
        sortBy,
        sortOrder,
      })
      if (search) params.set('search', search)
      if (filterStatut) params.set('statut', filterStatut)
      if (filterMode) params.set('modePaiement', filterMode)
      if (filterDateDebut) params.set('dateDebut', filterDateDebut)
      if (filterDateFin) params.set('dateFin', filterDateFin)

      const res = await fetch(`/api/ventes?${params}`)
      if (!res.ok) throw new Error('Erreur réseau')
      const data = await res.json()
      setVentes(data.ventes || [])
      setTotal(data.total || 0)
      if (data.stats) setStats(data.stats)
    } catch {
      toast.error('Erreur lors du chargement des ventes')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, search, filterStatut, filterMode, filterDateDebut, filterDateFin, sortBy, sortOrder])

  useEffect(() => {
    fetchVentes()
  }, [fetchVentes])

  // ============================================================
  // Fetch medicaments for POS
  // ============================================================

  const fetchMedicaments = useCallback(async () => {
    if (!pharmacieId || !medSearch) return
    try {
      const res = await fetch(`/api/medicaments?pharmacieId=${pharmacieId}&search=${encodeURIComponent(medSearch)}`)
      if (res.ok) {
        const data = await res.json()
        setMedicaments(data)
      }
    } catch {
      // silent
    }
  }, [pharmacieId, medSearch])

  useEffect(() => {
    const timeout = setTimeout(fetchMedicaments, 300)
    return () => clearTimeout(timeout)
  }, [fetchMedicaments])

  // ============================================================
  // Fetch patients for POS
  // ============================================================

  const fetchPatients = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (patientSearch) params.set('search', patientSearch)
      const res = await fetch(`/api/patients?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data)
      }
    } catch {
      // silent
    }
  }, [pharmacieId, patientSearch])

  useEffect(() => {
    const timeout = setTimeout(fetchPatients, 300)
    return () => clearTimeout(timeout)
  }, [fetchPatients])

  // ============================================================
  // Cart calculations
  // ============================================================

  const cartTotal = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + (item.prixUnitaire * item.quantite - item.remise), 0)
    return Math.max(0, subtotal - posGlobalRemise)
  }, [cart, posGlobalRemise])

  // ============================================================
  // Cart actions
  // ============================================================

  const addToCart = (med: Medicament) => {
    setCart(prev => {
      const existing = prev.find(i => i.medicamentId === med.id)
      if (existing) {
        return prev.map(i =>
          i.medicamentId === med.id
            ? { ...i, quantite: i.quantite + 1 }
            : i
        )
      }
      return [...prev, {
        medicamentId: med.id,
        nomCommercial: med.nomCommercial,
        dci: med.dci,
        prixUnitaire: med.prixPublic,
        quantite: 1,
        remise: 0,
      }]
    })
    toast.success(`${med.nomCommercial} ajouté au panier`)
  }

  const removeFromCart = (medicamentId: string) => {
    setCart(prev => prev.filter(i => i.medicamentId !== medicamentId))
  }

  const updateCartItem = (medicamentId: string, field: 'quantite' | 'remise', value: number) => {
    setCart(prev => prev.map(i =>
      i.medicamentId === medicamentId
        ? { ...i, [field]: Math.max(0, value) }
        : i
    ))
  }

  // ============================================================
  // Submit sale
  // ============================================================

  const handleSubmitSale = async () => {
    if (cart.length === 0) {
      toast.error('Ajoutez au moins un médicament')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          patientId: selectedPatientId || null,
          modePaiement: posModePaiement,
          remise: posGlobalRemise,
          lignes: cart.map(item => ({
            medicamentId: item.medicamentId,
            quantite: item.quantite,
            prixUnitaire: item.prixUnitaire,
            remise: item.remise,
          })),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erreur lors de la création')
      }
      toast.success('Vente enregistrée avec succès')
      setPosOpen(false)
      resetPos()
      fetchVentes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création de la vente')
    } finally {
      setSubmitting(false)
    }
  }

  // ============================================================
  // Create patient from POS
  // ============================================================

  const handleCreatePatient = async () => {
    if (!newPatient.nom || !newPatient.prenom) {
      toast.error('Nom et prénom sont requis')
      return
    }
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          ...newPatient,
        }),
      })
      if (!res.ok) throw new Error('Erreur')
      const patient = await res.json()
      setSelectedPatientId(patient.id)
      setPatients(prev => [...prev, patient])
      setShowNewPatient(false)
      setNewPatient({ nom: '', prenom: '', telephone: '' })
      toast.success('Patient créé avec succès')
    } catch {
      toast.error('Erreur lors de la création du patient')
    }
  }

  // ============================================================
  // Cancel sale
  // ============================================================

  const handleCancelVente = async (venteId: string) => {
    try {
      const res = await fetch(`/api/ventes/${venteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'ANNULEE' }),
      })
      if (!res.ok) throw new Error('Erreur')
      toast.success('Vente annulée')
      setDetailOpen(false)
      fetchVentes()
    } catch {
      toast.error('Erreur lors de l\'annulation')
    }
  }

  // ============================================================
  // Reset POS
  // ============================================================

  const resetPos = () => {
    setCart([])
    setMedSearch('')
    setMedicaments([])
    setSelectedPatientId('')
    setPatientSearch('')
    setPosModePaiement('ESPECES')
    setPosGlobalRemise(0)
    setShowNewPatient(false)
    setNewPatient({ nom: '', prenom: '', telephone: '' })
  }

  // ============================================================
  // Open detail
  // ============================================================

  const openDetail = async (vente: Vente) => {
    try {
      const res = await fetch(`/api/ventes/${vente.id}`)
      if (res.ok) {
        const full = await res.json()
        setSelectedVente(full)
      } else {
        setSelectedVente(vente)
      }
    } catch {
      setSelectedVente(vente)
    }
    setDetailOpen(true)
  }

  // ============================================================
  // Sort toggle
  // ============================================================

  const toggleSort = (field: 'createdAt' | 'montantTotal') => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const totalPages = Math.ceil(total / limit)

  // ============================================================
  // Render
  // ============================================================

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Ventes</h1>
            <p className="text-muted-foreground text-sm">Gestion des ventes et caisse</p>
          </div>
          <Button
            onClick={() => { resetPos(); setPosOpen(true) }}
            className="bg-[#1D9E75] hover:bg-[#178a65] text-white gap-2"
          >
            <Plus className="h-4 w-4" />
            Nouvelle vente
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-[#1D9E75]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">CA du jour</p>
                  <p className="text-xl font-bold mt-1">{formatFCFA(stats.caDuJour)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-[#1D9E75]" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ventes du jour</p>
                  <p className="text-xl font-bold mt-1">{stats.nbVentesJour}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-amber-500">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Panier moyen</p>
                  <p className="text-xl font-bold mt-1">{formatFCFA(stats.panierMoyen)}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">En attente</p>
                  <p className="text-xl font-bold mt-1">{stats.ventesEnAttente}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-gray-50 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters & Search */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par référence ou patient..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                    className="pl-9"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 sm:w-auto"
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4" />
                  Filtres
                  {(filterStatut || filterMode || filterDateDebut || filterDateFin) && (
                    <Badge className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center bg-[#1D9E75] text-white">
                      !
                    </Badge>
                  )}
                </Button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Statut</Label>
                    <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v === 'ALL' ? '' : v); setPage(1) }}>
                      <SelectTrigger><SelectValue placeholder="Tous les statuts" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tous les statuts</SelectItem>
                        <SelectItem value="VALIDEE">Validée</SelectItem>
                        <SelectItem value="BROUILLON">Brouillon</SelectItem>
                        <SelectItem value="EN_COURS">En cours</SelectItem>
                        <SelectItem value="ANNULEE">Annulée</SelectItem>
                        <SelectItem value="REMBOURSEE">Remboursée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Mode de paiement</Label>
                    <Select value={filterMode} onValueChange={(v) => { setFilterMode(v === 'ALL' ? '' : v); setPage(1) }}>
                      <SelectTrigger><SelectValue placeholder="Tous les modes" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">Tous les modes</SelectItem>
                        {Object.entries(MODE_PAIEMENT_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date début</Label>
                    <Input type="date" value={filterDateDebut} onChange={(e) => { setFilterDateDebut(e.target.value); setPage(1) }} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Date fin</Label>
                    <Input type="date" value={filterDateFin} onChange={(e) => { setFilterDateFin(e.target.value); setPage(1) }} />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterStatut('')
                        setFilterMode('')
                        setFilterDateDebut('')
                        setFilterDateFin('')
                        setSearch('')
                        setPage(1)
                      }}
                      className="gap-1 text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                      Réinitialiser les filtres
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="h-6 w-6 animate-spin text-[#1D9E75]" />
                  <span className="text-sm text-muted-foreground">Chargement des ventes...</span>
                </div>
              </div>
            ) : ventes.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground/40" />
                  <div>
                    <p className="font-medium">Aucune vente trouvée</p>
                    <p className="text-sm text-muted-foreground mt-1">Modifiez vos filtres ou créez une nouvelle vente</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[140px]">Référence</TableHead>
                        <TableHead>
                          <button onClick={() => toggleSort('createdAt')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Date/Heure
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead>Patient</TableHead>
                        <TableHead>
                          <button onClick={() => toggleSort('montantTotal')} className="flex items-center gap-1 hover:text-foreground transition-colors">
                            Montant
                            <ArrowUpDown className="h-3 w-3" />
                          </button>
                        </TableHead>
                        <TableHead>Mode paiement</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ventes.map((vente) => (
                        <TableRow key={vente.id} className="cursor-pointer" onClick={() => openDetail(vente)}>
                          <TableCell className="font-mono text-sm font-medium">{vente.reference}</TableCell>
                          <TableCell className="text-sm">{formatDateTime(vente.createdAt)}</TableCell>
                          <TableCell className="text-sm">
                            {vente.patient
                              ? `${vente.patient.prenom} ${vente.patient.nom}`
                              : <span className="text-muted-foreground">—</span>}
                          </TableCell>
                          <TableCell className="font-medium text-sm">{formatFCFA(vente.montantTotal)}</TableCell>
                          <TableCell><ModePaiementBadge mode={vente.modePaiement} /></TableCell>
                          <TableCell><StatutBadge statut={vente.statut} /></TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openDetail(vente) }}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Voir détails</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden divide-y">
                  {ventes.map((vente) => (
                    <div
                      key={vente.id}
                      className="p-4 hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => openDetail(vente)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-sm font-medium">{vente.reference}</span>
                        <StatutBadge statut={vente.statut} />
                      </div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-muted-foreground">{formatDateTime(vente.createdAt)}</span>
                        <span className="font-medium">{formatFCFA(vente.montantTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          {vente.patient ? `${vente.patient.prenom} ${vente.patient.nom}` : '—'}
                        </span>
                        <ModePaiementBadge mode={vente.modePaiement} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} sur {total} ventes
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page <= 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium">{page} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ============================================================
            Sale Detail Dialog
        ============================================================ */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-[#1D9E75]" />
                Détail de la vente
                {selectedVente && (
                  <span className="font-mono text-sm font-normal text-muted-foreground">
                    {selectedVente.reference}
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedVente && (
              <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="space-y-6 pb-4">
                  {/* Status & Payment */}
                  <div className="flex flex-wrap gap-3 items-center">
                    <StatutBadge statut={selectedVente.statut} />
                    <ModePaiementBadge mode={selectedVente.modePaiement} />
                    {selectedVente.ordonnance && (
                      <Badge variant="outline" className="text-xs">
                        Ordonnance: {selectedVente.ordonnance.reference || selectedVente.ordonnanceId}
                      </Badge>
                    )}
                  </div>

                  {/* Patient Info */}
                  {selectedVente.patient && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-[#1D9E75]" />
                        <span className="font-medium text-sm">Patient</span>
                      </div>
                      <p className="text-sm">
                        {selectedVente.patient.prenom} {selectedVente.patient.nom}
                      </p>
                      {selectedVente.patient.telephone && (
                        <p className="text-xs text-muted-foreground">{selectedVente.patient.telephone}</p>
                      )}
                      {selectedVente.patient.numeroAssurance && (
                        <p className="text-xs text-muted-foreground">
                          N° assurance: {selectedVente.patient.numeroAssurance}
                          {selectedVente.patient.assurance ? ` (${selectedVente.patient.assurance})` : ''}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Line Items */}
                  <div>
                    <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#1D9E75]" />
                      Lignes de vente
                    </h3>
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Médicament</TableHead>
                            <TableHead className="text-xs text-center">Qté</TableHead>
                            <TableHead className="text-xs text-right">P.U.</TableHead>
                            <TableHead className="text-xs text-right">Remise</TableHead>
                            <TableHead className="text-xs text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedVente.lignes?.map((ligne) => (
                            <TableRow key={ligne.id}>
                              <TableCell className="text-xs">
                                <div>
                                  <span className="font-medium">{ligne.medicament?.nomCommercial || '—'}</span>
                                  <span className="text-muted-foreground ml-1">({ligne.medicament?.dci || '—'})</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs text-center">{ligne.quantite}</TableCell>
                              <TableCell className="text-xs text-right">{formatFCFA(ligne.prixUnitaire)}</TableCell>
                              <TableCell className="text-xs text-right">
                                {ligne.remise > 0 ? formatFCFA(ligne.remise) : '—'}
                              </TableCell>
                              <TableCell className="text-xs text-right font-medium">{formatFCFA(ligne.prixTotal)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Sous-total</span>
                      <span>{formatFCFA(selectedVente.lignes?.reduce((s, l) => s + l.prixTotal, 0) || 0)}</span>
                    </div>
                    {selectedVente.remise > 0 && (
                      <div className="flex justify-between text-sm text-red-600">
                        <span>Remise</span>
                        <span>-{formatFCFA(selectedVente.remise)}</span>
                      </div>
                    )}
                    {selectedVente.montantAssur > 0 && (
                      <div className="flex justify-between text-sm text-blue-600">
                        <span>Montant assurance</span>
                        <span>{formatFCFA(selectedVente.montantAssur)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-[#1D9E75]">{formatFCFA(selectedVente.montantTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Montant payé</span>
                      <span>{formatFCFA(selectedVente.montantPaye)}</span>
                    </div>
                  </div>

                  {/* Payments */}
                  {selectedVente.paiements && selectedVente.paiements.length > 0 && (
                    <div>
                      <h3 className="font-medium text-sm mb-2 flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#1D9E75]" />
                        Paiements
                      </h3>
                      <div className="space-y-2">
                        {selectedVente.paiements.map((p) => (
                          <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                            <div className="flex items-center gap-2">
                              <ModePaiementBadge mode={p.mode} />
                              {p.reference && <span className="text-xs text-muted-foreground">Réf: {p.reference}</span>}
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">{formatFCFA(p.montant)}</p>
                              <Badge variant="outline" className={
                                p.statut === 'REUSSI' ? 'bg-emerald-50 text-emerald-700 text-[10px]' :
                                p.statut === 'EN_ATTENTE' ? 'bg-amber-50 text-amber-700 text-[10px]' :
                                p.statut === 'REMBOURSE' ? 'bg-blue-50 text-blue-700 text-[10px]' :
                                'bg-red-50 text-red-700 text-[10px]'
                              }>
                                {p.statut === 'REUSSI' ? 'Réussi' :
                                 p.statut === 'EN_ATTENTE' ? 'En attente' :
                                 p.statut === 'REMBOURSE' ? 'Remboursé' : 'Échec'}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Créée le {formatDateTime(selectedVente.createdAt)}</p>
                    {selectedVente.utilisateur && (
                      <p>Vendeur: {selectedVente.utilisateur.prenom} {selectedVente.utilisateur.nom}</p>
                    )}
                    {selectedVente.session && (
                      <p>Caisse: {selectedVente.session.caisse.nom}</p>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
            <DialogFooter className="gap-2 sm:gap-0">
              {selectedVente && (selectedVente.statut === 'VALIDEE' || selectedVente.statut === 'EN_COURS') && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1"
                  onClick={() => handleCancelVente(selectedVente.id)}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Annuler la vente
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setDetailOpen(false)}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ============================================================
            New Sale (POS) Sheet
        ============================================================ */}
        <Sheet open={posOpen} onOpenChange={(open) => { if (!open) resetPos(); setPosOpen(open) }}>
          <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
            <SheetHeader className="p-4 pb-3 border-b">
              <SheetTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#1D9E75]" />
                Nouvelle vente
              </SheetTitle>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
                {/* Medication Search */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Rechercher un médicament</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="DCI, nom commercial..."
                      value={medSearch}
                      onChange={(e) => setMedSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {medSearch && medicaments.length > 0 && (
                    <div className="border rounded-lg max-h-48 overflow-y-auto divide-y">
                      {medicaments.slice(0, 10).map((med) => (
                        <button
                          key={med.id}
                          className="w-full text-left p-3 hover:bg-muted/50 transition-colors"
                          onClick={() => { addToCart(med); setMedSearch('') }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{med.nomCommercial}</p>
                              <p className="text-xs text-muted-foreground">{med.dci} — {med.dosage}</p>
                            </div>
                            <span className="text-sm font-medium text-[#1D9E75]">{formatFCFA(med.prixPublic)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {medSearch && medicaments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Aucun médicament trouvé</p>
                  )}
                </div>

                {/* Cart */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Panier ({cart.length} article{cart.length > 1 ? 's' : ''})
                  </Label>
                  {cart.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg border-dashed">
                      <Package className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">Panier vide</p>
                      <p className="text-xs text-muted-foreground">Recherchez et ajoutez des médicaments</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.medicamentId} className="border rounded-lg p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{item.nomCommercial}</p>
                              <p className="text-xs text-muted-foreground">{item.dci}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 shrink-0"
                              onClick={() => removeFromCart(item.medicamentId)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartItem(item.medicamentId, 'quantite', item.quantite - 1)}
                                disabled={item.quantite <= 1}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <Input
                                type="number"
                                min={1}
                                value={item.quantite}
                                onChange={(e) => updateCartItem(item.medicamentId, 'quantite', parseInt(e.target.value) || 1)}
                                className="w-14 h-7 text-center text-sm p-0"
                              />
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => updateCartItem(item.medicamentId, 'quantite', item.quantite + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground whitespace-nowrap">Remise:</span>
                              <Input
                                type="number"
                                min={0}
                                value={item.remise || ''}
                                placeholder="0"
                                onChange={(e) => updateCartItem(item.medicamentId, 'remise', parseFloat(e.target.value) || 0)}
                                className="w-20 h-7 text-sm p-1"
                              />
                            </div>
                            <span className="ml-auto font-medium text-sm text-[#1D9E75]">
                              {formatFCFA(item.prixUnitaire * item.quantite - item.remise)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Patient Selection */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Patient (optionnel)
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Rechercher un patient..."
                      value={patientSearch}
                      onChange={(e) => setPatientSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {selectedPatientId ? (
                    <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />
                        <span className="text-sm font-medium">
                          {patients.find(p => p.id === selectedPatientId)?.prenom} {patients.find(p => p.id === selectedPatientId)?.nom}
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedPatientId('')}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {patients.slice(0, 5).map((patient) => (
                        <button
                          key={patient.id}
                          className="w-full text-left p-2.5 hover:bg-muted/50 rounded-lg transition-colors flex items-center justify-between"
                          onClick={() => setSelectedPatientId(patient.id)}
                        >
                          <span className="text-sm">{patient.prenom} {patient.nom}</span>
                          <span className="text-xs text-muted-foreground">{patient.telephone}</span>
                        </button>
                      ))}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-[#1D9E75] gap-1"
                        onClick={() => setShowNewPatient(true)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Nouveau patient
                      </Button>
                    </div>
                  )}

                  {/* New Patient Form */}
                  {showNewPatient && (
                    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                      <p className="text-sm font-medium">Nouveau patient</p>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="Nom" value={newPatient.nom} onChange={(e) => setNewPatient(p => ({ ...p, nom: e.target.value }))} />
                        <Input placeholder="Prénom" value={newPatient.prenom} onChange={(e) => setNewPatient(p => ({ ...p, prenom: e.target.value }))} />
                      </div>
                      <Input placeholder="Téléphone" value={newPatient.telephone} onChange={(e) => setNewPatient(p => ({ ...p, telephone: e.target.value }))} />
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-[#1D9E75] hover:bg-[#178a65] text-white" onClick={handleCreatePatient}>
                          Créer
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowNewPatient(false)}>
                          Annuler
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Mode de paiement
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(Object.entries(MODE_PAIEMENT_LABELS) as [ModePaiement, string][]).map(([key, label]) => (
                      <button
                        key={key}
                        className={`p-2.5 rounded-lg border text-xs font-medium transition-colors text-center ${
                          posModePaiement === key
                            ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
                            : 'border-border hover:border-[#1D9E75]/50'
                        }`}
                        onClick={() => setPosModePaiement(key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Global Discount */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Remise globale (FCFA)</Label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={posGlobalRemise || ''}
                    onChange={(e) => setPosGlobalRemise(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </ScrollArea>

            {/* Footer with totals & submit */}
            <SheetFooter className="p-4 border-t bg-background">
              <div className="w-full space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sous-total</span>
                    <span>{formatFCFA(cart.reduce((s, i) => s + i.prixUnitaire * i.quantite, 0))}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Remises lignes</span>
                    <span className="text-red-600">-{formatFCFA(cart.reduce((s, i) => s + i.remise, 0))}</span>
                  </div>
                  {posGlobalRemise > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remise globale</span>
                      <span className="text-red-600">-{formatFCFA(posGlobalRemise)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-[#1D9E75]">{formatFCFA(cartTotal)}</span>
                  </div>
                </div>
                <Button
                  className="w-full bg-[#1D9E75] hover:bg-[#178a65] text-white h-11 text-base gap-2"
                  disabled={cart.length === 0 || submitting}
                  onClick={handleSubmitSale}
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {submitting ? 'Enregistrement...' : 'Enregistrer la vente'}
                </Button>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  )
}
