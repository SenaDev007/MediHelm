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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  ClipboardList,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Truck,
  Package,
  AlertTriangle,
  PackageCheck,
  Loader2,
  Building2,
  Calendar,
  Banknote,
  Send,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

type StatutCommande = 'BROUILLON' | 'ENVOYEE' | 'CONFIRMEE' | 'EN_PREPARATION' | 'LIVREE_PARTIELLEMENT' | 'LIVREE' | 'ANNULEE'

interface LigneCommande {
  id: string
  dci: string
  nomCommercial: string | null
  quantite: number
  quantiteLivre: number
  prixAchat: number
  montant: number
  medicamentId?: string | null
}

interface CommandeFournisseur {
  id: string
  nomFournisseur: string
  statut: StatutCommande
  montantTotal: number
  dateLivraisonPrevue: string | null
  dateLivraisonReelle: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  fournisseurId?: string | null
  lignes: LigneCommande[]
}

interface FournisseurOption {
  id: string
  nom: string
  contact: string | null
  telephone: string | null
  email: string | null
}

interface MedicamentOption {
  id: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixPublic: number
}

// === Helpers ===

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

function statutCommandeLabel(statut: StatutCommande): string {
  const labels: Record<StatutCommande, string> = {
    BROUILLON: 'Brouillon',
    ENVOYEE: 'Envoyée',
    CONFIRMEE: 'Confirmée',
    EN_PREPARATION: 'En préparation',
    LIVREE_PARTIELLEMENT: 'Partiellement reçue',
    LIVREE: 'Reçue',
    ANNULEE: 'Annulée',
  }
  return labels[statut] || statut
}

function statutCommandeBadge(statut: StatutCommande) {
  const colorMap: Record<StatutCommande, string> = {
    BROUILLON: 'bg-gray-100 text-gray-700 border-gray-200',
    ENVOYEE: 'bg-blue-50 text-blue-700 border-blue-200',
    CONFIRMEE: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    EN_PREPARATION: 'bg-amber-50 text-amber-700 border-amber-200',
    LIVREE_PARTIELLEMENT: 'bg-orange-50 text-orange-700 border-orange-200',
    LIVREE: 'bg-green-50 text-green-700 border-green-200',
    ANNULEE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={`${colorMap[statut]} border`}>
      {statutCommandeLabel(statut)}
    </Badge>
  )
}

// === Main Component ===

export default function CommandesPage() {
  const { pharmacie } = useAuth()

  // State
  const [commandes, setCommandes] = useState<CommandeFournisseur[]>([])
  const [fournisseurs, setFournisseurs] = useState<FournisseurOption[]>([])
  const [medicaments, setMedicaments] = useState<MedicamentOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [filterFournisseur, setFilterFournisseur] = useState<string>('TOUS')
  const [sortBy, setSortBy] = useState<'createdAt' | 'montantTotal' | 'nomFournisseur' | 'statut'>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedCommande, setSelectedCommande] = useState<CommandeFournisseur | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New order form
  const [newFournisseurId, setNewFournisseurId] = useState('')
  const [newNomFournisseur, setNewNomFournisseur] = useState('')
  const [newDateLivraisonPrevue, setNewDateLivraisonPrevue] = useState('')
  const [newNotes, setNewNotes] = useState('')
  const [newLignes, setNewLignes] = useState<Array<{
    dci: string
    nomCommercial: string
    quantite: number
    prixAchat: number
    medicamentId: string
  }>>([
    { dci: '', nomCommercial: '', quantite: 1, prixAchat: 0, medicamentId: '' },
  ])

  // === Data Fetching ===

  const fetchCommandes = useCallback(async () => {
    if (!pharmacie?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/commandes')
      if (!res.ok) throw new Error('Erreur lors du chargement des commandes')
      const data = await res.json()
      setCommandes(Array.isArray(data) ? data : data.commandes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setCommandes([])
    } finally {
      setIsLoading(false)
    }
  }, [pharmacie?.id])

  const fetchFournisseurs = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/fournisseurs')
      if (res.ok) {
        const data = await res.json()
        setFournisseurs(Array.isArray(data) ? data : data.fournisseurs || [])
      }
    } catch {
      // Silently fail
    }
  }, [pharmacie?.id])

  const fetchMedicaments = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/medicaments')
      if (res.ok) {
        const data = await res.json()
        setMedicaments(Array.isArray(data) ? data : data.medicaments || [])
      }
    } catch {
      // Silently fail
    }
  }, [pharmacie?.id])

  useEffect(() => {
    fetchCommandes()
    fetchFournisseurs()
    fetchMedicaments()
  }, [fetchCommandes, fetchFournisseurs, fetchMedicaments])

  // === Filtering & Sorting ===

  const filteredCommandes = useMemo(() => {
    let result = [...commandes]

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (c) =>
          c.nomFournisseur.toLowerCase().includes(lower) ||
          c.lignes.some((l) => l.dci.toLowerCase().includes(lower) || (l.nomCommercial || '').toLowerCase().includes(lower))
      )
    }

    // Status filter
    if (filterStatut !== 'TOUS') {
      result = result.filter((c) => c.statut === filterStatut)
    }

    // Fournisseur filter
    if (filterFournisseur !== 'TOUS') {
      result = result.filter((c) => c.nomFournisseur === filterFournisseur)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'createdAt':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'montantTotal':
          cmp = a.montantTotal - b.montantTotal
          break
        case 'nomFournisseur':
          cmp = a.nomFournisseur.localeCompare(b.nomFournisseur)
          break
        case 'statut':
          cmp = a.statut.localeCompare(b.statut)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [commandes, searchTerm, filterStatut, filterFournisseur, sortBy, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredCommandes.length / itemsPerPage))
  const paginatedCommandes = filteredCommandes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // === KPIs ===

  const kpis = useMemo(() => {
    const total = commandes.length
    const enCours = commandes.filter((c) =>
      ['BROUILLON', 'ENVOYEE', 'CONFIRMEE', 'EN_PREPARATION'].includes(c.statut)
    ).length
    const livrees = commandes.filter((c) => c.statut === 'LIVREE').length
    const montantTotal = commandes.reduce((sum, c) => sum + c.montantTotal, 0)
    const enAttente = commandes.filter((c) => c.statut === 'BROUILLON' || c.statut === 'ENVOYEE').length
    return { total, enCours, livrees, montantTotal, enAttente }
  }, [commandes])

  // === Handlers ===

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const handleAddLigne = () => {
    setNewLignes([...newLignes, { dci: '', nomCommercial: '', quantite: 1, prixAchat: 0, medicamentId: '' }])
  }

  const handleRemoveLigne = (index: number) => {
    if (newLignes.length <= 1) return
    setNewLignes(newLignes.filter((_, i) => i !== index))
  }

  const handleLigneChange = (index: number, field: string, value: string | number) => {
    const updated = [...newLignes]
    ;(updated[index] as Record<string, string | number>)[field] = value
    // Auto-fill from medicament selection
    if (field === 'medicamentId' && typeof value === 'string' && value) {
      const med = medicaments.find((m) => m.id === value)
      if (med) {
        updated[index].dci = med.dci
        updated[index].nomCommercial = med.nomCommercial
        updated[index].prixAchat = med.prixPublic * 0.7 // Estimated purchase price
      }
    }
    setNewLignes(updated)
  }

  const newLignesTotal = useMemo(() => {
    return newLignes.reduce((sum, l) => sum + l.quantite * l.prixAchat, 0)
  }, [newLignes])

  const handleCreateCommande = async () => {
    if (!newNomFournisseur.trim()) {
      toast.error('Veuillez renseigner le fournisseur')
      return
    }
    if (newLignes.some((l) => !l.dci.trim())) {
      toast.error('Veuillez renseigner la DCI pour chaque ligne')
      return
    }
    if (newLignes.some((l) => l.prixAchat <= 0)) {
      toast.error('Veuillez renseigner un prix d\'achat valide pour chaque ligne')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fournisseurId: newFournisseurId || null,
          nomFournisseur: newNomFournisseur,
          dateLivraisonPrevue: newDateLivraisonPrevue || null,
          notes: newNotes || null,
          lignes: newLignes.map((l) => ({
            dci: l.dci,
            nomCommercial: l.nomCommercial || null,
            quantite: l.quantite,
            prixAchat: l.prixAchat,
            montant: l.quantite * l.prixAchat,
            medicamentId: l.medicamentId || null,
          })),
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la création')
      toast.success('Commande créée avec succès')
      setShowCreateDialog(false)
      resetCreateForm()
      fetchCommandes()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCreateForm = () => {
    setNewFournisseurId('')
    setNewNomFournisseur('')
    setNewDateLivraisonPrevue('')
    setNewNotes('')
    setNewLignes([{ dci: '', nomCommercial: '', quantite: 1, prixAchat: 0, medicamentId: '' }])
  }

  const handleViewDetail = (commande: CommandeFournisseur) => {
    setSelectedCommande(commande)
    setShowDetailSheet(true)
  }

  const handleSendCommande = async (id: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'ENVOYEE' }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'envoi')
      toast.success('Commande envoyée au fournisseur')
      fetchCommandes()
      if (selectedCommande?.id === id) {
        setSelectedCommande({ ...selectedCommande, statut: 'ENVOYEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'envoi')
    }
  }

  const handleConfirmCommande = async (id: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'CONFIRMEE' }),
      })
      if (!res.ok) throw new Error('Erreur lors de la confirmation')
      toast.success('Commande confirmée par le fournisseur')
      fetchCommandes()
      if (selectedCommande?.id === id) {
        setSelectedCommande({ ...selectedCommande, statut: 'CONFIRMEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la confirmation')
    }
  }

  const handleMarkReceived = async (id: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'LIVREE', dateLivraisonReelle: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Erreur lors de la réception')
      toast.success('Commande marquée comme reçue')
      fetchCommandes()
      if (selectedCommande?.id === id) {
        setSelectedCommande({
          ...selectedCommande,
          statut: 'LIVREE',
          dateLivraisonReelle: new Date().toISOString(),
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la réception')
    }
  }

  const handleCancelCommande = async (id: string) => {
    try {
      const res = await fetch(`/api/commandes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'ANNULEE' }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'annulation')
      toast.success('Commande annulée')
      fetchCommandes()
      if (selectedCommande?.id === id) {
        setSelectedCommande({ ...selectedCommande, statut: 'ANNULEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'annulation')
    }
  }

  // === Loading Skeleton ===

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  // === Render ===

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Commandes Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des commandes et réceptions fournisseur
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle commande
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total commandes"
          value={kpis.total}
          icon={ClipboardList}
          variant="default"
        />
        <KpiCard
          title="En cours"
          value={kpis.enCours}
          icon={Clock}
          variant="warning"
          subtitle="Brouillons à en préparation"
        />
        <KpiCard
          title="Reçues"
          value={kpis.livrees}
          icon={PackageCheck}
          variant="success"
        />
        <KpiCard
          title="Montant total"
          value={formatFCFA(kpis.montantTotal)}
          icon={Banknote}
          variant="default"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par fournisseur, DCI, médicament..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                className="pl-9"
              />
            </div>
            <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-full lg:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les statuts</SelectItem>
                <SelectItem value="BROUILLON">Brouillon</SelectItem>
                <SelectItem value="ENVOYEE">Envoyée</SelectItem>
                <SelectItem value="CONFIRMEE">Confirmée</SelectItem>
                <SelectItem value="EN_PREPARATION">En préparation</SelectItem>
                <SelectItem value="LIVREE_PARTIELLEMENT">Partiellement reçue</SelectItem>
                <SelectItem value="LIVREE">Reçue</SelectItem>
                <SelectItem value="ANNULEE">Annulée</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterFournisseur} onValueChange={(v) => { setFilterFournisseur(v); setCurrentPage(1) }}>
              <SelectTrigger className="w-full lg:w-52">
                <Building2 className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Fournisseur" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TOUS">Tous les fournisseurs</SelectItem>
                {fournisseurs.map((f) => (
                  <SelectItem key={f.id} value={f.nom}>
                    {f.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchCommandes} className="ml-auto">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {filteredCommandes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ClipboardList className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Aucune commande trouvée</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || filterStatut !== 'TOUS'
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Créez votre première commande fournisseur pour commencer'}
              </p>
              {!searchTerm && filterStatut === 'TOUS' && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle commande
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">N°</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('createdAt')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('nomFournisseur')}
                      >
                        <div className="flex items-center gap-1">
                          Fournisseur
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Produits</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('montantTotal')}
                      >
                        <div className="flex items-center gap-1">
                          Montant
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('statut')}
                      >
                        <div className="flex items-center gap-1">
                          Statut
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Livraison prévue</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCommandes.map((commande, idx) => {
                      const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                      return (
                        <TableRow
                          key={commande.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewDetail(commande)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {globalIdx}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {formatDate(commande.createdAt)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="w-3 h-3 text-muted-foreground" />
                              <span className="font-medium">{commande.nomFournisseur}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Package className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{commande.lignes.length} ligne(s)</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {formatFCFA(commande.montantTotal)}
                          </TableCell>
                          <TableCell>{statutCommandeBadge(commande.statut)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(commande.dateLivraisonPrevue)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(commande)}
                                title="Voir le détail"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {commande.statut === 'BROUILLON' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                  onClick={() => handleSendCommande(commande.id)}
                                  title="Envoyer"
                                >
                                  <Send className="w-4 h-4" />
                                </Button>
                              )}
                              {commande.statut === 'ENVOYEE' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-cyan-600 hover:text-cyan-700"
                                  onClick={() => handleConfirmCommande(commande.id)}
                                  title="Confirmer"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              {['CONFIRMEE', 'EN_PREPARATION'].includes(commande.statut) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700"
                                  onClick={() => handleMarkReceived(commande.id)}
                                  title="Marquer reçue"
                                >
                                  <PackageCheck className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {filteredCommandes.length} commande(s) trouvée(s)
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Commande Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Nouvelle commande fournisseur
            </DialogTitle>
            <DialogDescription>
              Passer une nouvelle commande à un fournisseur
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Fournisseur */}
            <div className="space-y-2">
              <Label>Fournisseur *</Label>
              <Select
                value={newFournisseurId}
                onValueChange={(v) => {
                  setNewFournisseurId(v)
                  const f = fournisseurs.find((f) => f.id === v)
                  if (f) setNewNomFournisseur(f.nom)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom} {f.telephone ? `— ${f.telephone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!newFournisseurId && (
                <Input
                  placeholder="Ou saisir le nom du fournisseur"
                  value={newNomFournisseur}
                  onChange={(e) => setNewNomFournisseur(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* Date de livraison prévue */}
            <div className="space-y-2">
              <Label>Date de livraison prévue</Label>
              <Input
                type="date"
                value={newDateLivraisonPrevue}
                onChange={(e) => setNewDateLivraisonPrevue(e.target.value)}
              />
            </div>

            <Separator />

            {/* Lignes de commande */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Lignes de commande</Label>
                <Button variant="outline" size="sm" onClick={handleAddLigne}>
                  <Plus className="w-4 h-4 mr-1" />
                  Ajouter une ligne
                </Button>
              </div>

              {newLignes.map((ligne, idx) => (
                <Card key={idx} className="p-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Médicament</Label>
                      <Select
                        value={ligne.medicamentId}
                        onValueChange={(v) => handleLigneChange(idx, 'medicamentId', v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner ou saisir" />
                        </SelectTrigger>
                        <SelectContent className="max-h-48">
                          {medicaments.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.nomCommercial} ({m.dci})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">DCI *</Label>
                      <Input
                        placeholder="Dénomination commune"
                        value={ligne.dci}
                        onChange={(e) => handleLigneChange(idx, 'dci', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nom commercial</Label>
                      <Input
                        placeholder="Nom du produit"
                        value={ligne.nomCommercial}
                        onChange={(e) => handleLigneChange(idx, 'nomCommercial', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité *</Label>
                      <Input
                        type="number"
                        min={1}
                        value={ligne.quantite}
                        onChange={(e) => handleLigneChange(idx, 'quantite', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prix d&apos;achat unitaire (FCFA) *</Label>
                      <Input
                        type="number"
                        min={0}
                        step={50}
                        value={ligne.prixAchat}
                        onChange={(e) => handleLigneChange(idx, 'prixAchat', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1 flex items-end gap-2">
                      <div className="flex-1">
                        <Label className="text-xs">Montant</Label>
                        <p className="font-medium text-sm mt-1">
                          {formatFCFA(ligne.quantite * ligne.prixAchat)}
                        </p>
                      </div>
                      {newLignes.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive shrink-0"
                          onClick={() => handleRemoveLigne(idx)}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}

              {/* Total */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t">
                <span className="text-sm font-medium text-muted-foreground">Total estimé :</span>
                <span className="text-lg font-bold">{formatFCFA(newLignesTotal)}</span>
              </div>
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Instructions particulières..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateCommande} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer la commande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Détail de la commande
            </SheetTitle>
          </SheetHeader>

          {selectedCommande && (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                {statutCommandeBadge(selectedCommande.statut)}
                <div className="flex gap-2">
                  {selectedCommande.statut === 'BROUILLON' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleSendCommande(selectedCommande.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Envoyer
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleCancelCommande(selectedCommande.id)}
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        Annuler
                      </Button>
                    </>
                  )}
                  {selectedCommande.statut === 'ENVOYEE' && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmCommande(selectedCommande.id)}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Confirmer
                    </Button>
                  )}
                  {['CONFIRMEE', 'EN_PREPARATION'].includes(selectedCommande.statut) && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkReceived(selectedCommande.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <PackageCheck className="w-4 h-4 mr-1" />
                      Marquer reçue
                    </Button>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Fournisseur</p>
                  <p className="font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" />
                    {selectedCommande.nomFournisseur}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Montant total</p>
                  <p className="font-bold text-lg flex items-center gap-1">
                    <Banknote className="w-3 h-3" />
                    {formatFCFA(selectedCommande.montantTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date de création</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedCommande.createdAt)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Livraison prévue</p>
                  <p className="font-medium flex items-center gap-1">
                    <Truck className="w-3 h-3" />
                    {formatDate(selectedCommande.dateLivraisonPrevue)}
                  </p>
                </div>
                {selectedCommande.dateLivraisonReelle && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase">Livraison effective</p>
                    <p className="font-medium flex items-center gap-1">
                      <PackageCheck className="w-3 h-3" />
                      {formatDate(selectedCommande.dateLivraisonReelle)}
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Lignes de commande */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Lignes de commande ({selectedCommande.lignes.length})
                </h3>
                <ScrollArea className="max-h-72">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DCI</TableHead>
                        <TableHead>Qté</TableHead>
                        <TableHead>Livré</TableHead>
                        <TableHead>P.U.</TableHead>
                        <TableHead>Montant</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedCommande.lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{ligne.dci}</p>
                              {ligne.nomCommercial && (
                                <p className="text-xs text-muted-foreground">{ligne.nomCommercial}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{ligne.quantite}</TableCell>
                          <TableCell>
                            <Badge variant={ligne.quantiteLivre >= ligne.quantite ? 'default' : 'secondary'} className="text-xs">
                              {ligne.quantiteLivre}/{ligne.quantite}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{formatFCFA(ligne.prixAchat)}</TableCell>
                          <TableCell className="font-medium text-sm">{formatFCFA(ligne.montant)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>

                {/* Total */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t mt-2">
                  <span className="text-sm font-medium text-muted-foreground">Total :</span>
                  <span className="text-lg font-bold">{formatFCFA(selectedCommande.montantTotal)}</span>
                </div>
              </div>

              {/* Notes */}
              {selectedCommande.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedCommande.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Status timeline */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Suivi de la commande</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Brouillon créé', statuts: ['BROUILLON', 'ENVOYEE', 'CONFIRMEE', 'EN_PREPARATION', 'LIVREE_PARTIELLEMENT', 'LIVREE'] },
                    { label: 'Envoyée au fournisseur', statuts: ['ENVOYEE', 'CONFIRMEE', 'EN_PREPARATION', 'LIVREE_PARTIELLEMENT', 'LIVREE'] },
                    { label: 'Confirmée par le fournisseur', statuts: ['CONFIRMEE', 'EN_PREPARATION', 'LIVREE_PARTIELLEMENT', 'LIVREE'] },
                    { label: 'En préparation', statuts: ['EN_PREPARATION', 'LIVREE_PARTIELLEMENT', 'LIVREE'] },
                    { label: 'Réceptionnée', statuts: ['LIVREE_PARTIELLEMENT', 'LIVREE'] },
                  ].map((step, idx) => {
                    const isActive = step.statuts.includes(selectedCommande.statut)
                    const isCancelled = selectedCommande.statut === 'ANNULEE'
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isCancelled
                            ? 'bg-red-100 text-red-700'
                            : isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCancelled ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className={`text-sm ${isActive ? 'font-medium' : 'text-muted-foreground'}`}>
                          {step.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
