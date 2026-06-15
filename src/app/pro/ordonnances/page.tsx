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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  FileText,
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
  ClipboardCheck,
  AlertTriangle,
  User,
  Calendar,
  Pill,
  Stethoscope,
  Image as ImageIcon,
  Loader2,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

type StatutOrdonnance = 'RECUE' | 'EN_VERIFICATION' | 'VALIDEE' | 'PARTIELLEMENT_DELIVREE' | 'DELIVREE' | 'REFUSEE'

interface LigneOrdonnance {
  id: string
  dci: string
  posologie: string | null
  quantite: number
  delivree: boolean
  medicamentId?: string | null
}

interface Ordonnance {
  id: string
  prescripteur: string
  dateOrdonnance: string
  statut: StatutOrdonnance
  imageUrl: string | null
  notes: string | null
  verifiePar: string | null
  verifieLe: string | null
  createdAt: string
  patient?: {
    id: string
    nom: string
    prenom: string
    telephone: string
  } | null
  lignes: LigneOrdonnance[]
}

interface PatientOption {
  id: string
  nom: string
  prenom: string
  telephone: string
}

interface MedicamentOption {
  id: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
}

// === Helpers ===

function formatDate(dateStr: string): string {
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

function statutOrdonnanceLabel(statut: StatutOrdonnance): string {
  const labels: Record<StatutOrdonnance, string> = {
    RECUE: 'Reçue',
    EN_VERIFICATION: 'En vérification',
    VALIDEE: 'Validée',
    PARTIELLEMENT_DELIVREE: 'Partiellement délivrée',
    DELIVREE: 'Délivrée',
    REFUSEE: 'Refusée',
  }
  return labels[statut] || statut
}

function statutOrdonnanceVariant(statut: StatutOrdonnance): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (statut) {
    case 'RECUE':
      return 'secondary'
    case 'EN_VERIFICATION':
      return 'outline'
    case 'VALIDEE':
      return 'default'
    case 'PARTIELLEMENT_DELIVREE':
      return 'outline'
    case 'DELIVREE':
      return 'default'
    case 'REFUSEE':
      return 'destructive'
    default:
      return 'secondary'
  }
}

function statutOrdonnanceBadge(statut: StatutOrdonnance) {
  const colorMap: Record<StatutOrdonnance, string> = {
    RECUE: 'bg-slate-100 text-slate-700 border-slate-200',
    EN_VERIFICATION: 'bg-amber-50 text-amber-700 border-amber-200',
    VALIDEE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PARTIELLEMENT_DELIVREE: 'bg-orange-50 text-orange-700 border-orange-200',
    DELIVREE: 'bg-green-50 text-green-700 border-green-200',
    REFUSEE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant={statutOrdonnanceVariant(statut)} className={`${colorMap[statut]} border`}>
      {statutOrdonnanceLabel(statut)}
    </Badge>
  )
}

// === Main Component ===

export default function OrdonnancesPage() {
  const { pharmacie } = useAuth()

  // State
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([])
  const [patients, setPatients] = useState<PatientOption[]>([])
  const [medicaments, setMedicaments] = useState<MedicamentOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [filterDateDebut, setFilterDateDebut] = useState('')
  const [filterDateFin, setFilterDateFin] = useState('')
  const [sortBy, setSortBy] = useState<'dateOrdonnance' | 'prescripteur' | 'statut'>('dateOrdonnance')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedOrdonnance, setSelectedOrdonnance] = useState<Ordonnance | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New prescription form
  const [newPrescripteur, setNewPrescripteur] = useState('')
  const [newPatientId, setNewPatientId] = useState('')
  const [newDateOrdonnance, setNewDateOrdonnance] = useState(new Date().toISOString().split('T')[0])
  const [newNotes, setNewNotes] = useState('')
  const [newLignes, setNewLignes] = useState<Array<{ dci: string; posologie: string; quantite: number; medicamentId: string }>>([
    { dci: '', posologie: '', quantite: 1, medicamentId: '' },
  ])

  // === Data Fetching ===

  const fetchOrdonnances = useCallback(async () => {
    if (!pharmacie?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/ordonnances')
      if (!res.ok) throw new Error('Erreur lors du chargement des ordonnances')
      const data = await res.json()
      setOrdonnances(Array.isArray(data) ? data : data.ordonnances || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setOrdonnances([])
    } finally {
      setIsLoading(false)
    }
  }, [pharmacie?.id])

  const fetchPatients = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/patients')
      if (res.ok) {
        const data = await res.json()
        setPatients(Array.isArray(data) ? data : data.patients || [])
      }
    } catch {
      // Silently fail - patients are for the dropdown
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
    fetchOrdonnances()
    fetchPatients()
    fetchMedicaments()
  }, [fetchOrdonnances, fetchPatients, fetchMedicaments])

  // === Filtering & Sorting ===

  const filteredOrdonnances = useMemo(() => {
    let result = [...ordonnances]

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (o) =>
          o.prescripteur.toLowerCase().includes(lower) ||
          (o.patient?.nom || '').toLowerCase().includes(lower) ||
          (o.patient?.prenom || '').toLowerCase().includes(lower) ||
          o.lignes.some((l) => l.dci.toLowerCase().includes(lower))
      )
    }

    // Status filter
    if (filterStatut !== 'TOUS') {
      result = result.filter((o) => o.statut === filterStatut)
    }

    // Date range filter
    if (filterDateDebut) {
      const debut = new Date(filterDateDebut)
      result = result.filter((o) => new Date(o.dateOrdonnance) >= debut)
    }
    if (filterDateFin) {
      const fin = new Date(filterDateFin)
      fin.setHours(23, 59, 59)
      result = result.filter((o) => new Date(o.dateOrdonnance) <= fin)
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'dateOrdonnance':
          cmp = new Date(a.dateOrdonnance).getTime() - new Date(b.dateOrdonnance).getTime()
          break
        case 'prescripteur':
          cmp = a.prescripteur.localeCompare(b.prescripteur)
          break
        case 'statut':
          cmp = a.statut.localeCompare(b.statut)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [ordonnances, searchTerm, filterStatut, filterDateDebut, filterDateFin, sortBy, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredOrdonnances.length / itemsPerPage))
  const paginatedOrdonnances = filteredOrdonnances.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // === KPIs ===

  const kpis = useMemo(() => {
    const total = ordonnances.length
    const enAttente = ordonnances.filter((o) => o.statut === 'RECUE' || o.statut === 'EN_VERIFICATION').length
    const validees = ordonnances.filter((o) => o.statut === 'VALIDEE').length
    const delivrees = ordonnances.filter((o) => o.statut === 'DELIVREE').length
    const refusees = ordonnances.filter((o) => o.statut === 'REFUSEE').length
    return { total, enAttente, validees, delivrees, refusees }
  }, [ordonnances])

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
    setNewLignes([...newLignes, { dci: '', posologie: '', quantite: 1, medicamentId: '' }])
  }

  const handleRemoveLigne = (index: number) => {
    if (newLignes.length <= 1) return
    setNewLignes(newLignes.filter((_, i) => i !== index))
  }

  const handleLigneChange = (index: number, field: keyof typeof newLignes[0], value: string | number) => {
    const updated = [...newLignes]
    updated[index] = { ...updated[index], [field]: value }
    // Auto-fill DCI from medicament selection
    if (field === 'medicamentId' && value) {
      const med = medicaments.find((m) => m.id === value)
      if (med) {
        updated[index].dci = med.dci
      }
    }
    setNewLignes(updated)
  }

  const handleCreateOrdonnance = async () => {
    if (!newPrescripteur.trim()) {
      toast.error('Veuillez renseigner le prescripteur')
      return
    }
    if (newLignes.some((l) => !l.dci.trim())) {
      toast.error('Veuillez renseigner la DCI pour chaque ligne')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/ordonnances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prescripteur: newPrescripteur,
          patientId: newPatientId || null,
          dateOrdonnance: newDateOrdonnance,
          notes: newNotes || null,
          lignes: newLignes.map((l) => ({
            dci: l.dci,
            posologie: l.posologie || null,
            quantite: l.quantite,
            medicamentId: l.medicamentId || null,
          })),
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la création')
      toast.success('Ordonnance créée avec succès')
      setShowCreateDialog(false)
      resetCreateForm()
      fetchOrdonnances()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCreateForm = () => {
    setNewPrescripteur('')
    setNewPatientId('')
    setNewDateOrdonnance(new Date().toISOString().split('T')[0])
    setNewNotes('')
    setNewLignes([{ dci: '', posologie: '', quantite: 1, medicamentId: '' }])
  }

  const handleViewDetail = (ordonnance: Ordonnance) => {
    setSelectedOrdonnance(ordonnance)
    setShowDetailSheet(true)
  }

  const handleValidateOrdonnance = async (id: string) => {
    try {
      const res = await fetch(`/api/ordonnances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'VALIDEE' }),
      })
      if (!res.ok) throw new Error('Erreur lors de la validation')
      toast.success('Ordonnance validée')
      fetchOrdonnances()
      if (selectedOrdonnance?.id === id) {
        setSelectedOrdonnance({ ...selectedOrdonnance, statut: 'VALIDEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la validation')
    }
  }

  const handleDeliverOrdonnance = async (id: string) => {
    try {
      const res = await fetch(`/api/ordonnances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'DELIVREE', lignesDelivrees: true }),
      })
      if (!res.ok) throw new Error('Erreur lors de la délivrance')
      toast.success('Ordonnance délivrée')
      fetchOrdonnances()
      if (selectedOrdonnance?.id === id) {
        setSelectedOrdonnance({
          ...selectedOrdonnance,
          statut: 'DELIVREE',
          lignes: selectedOrdonnance.lignes.map((l) => ({ ...l, delivree: true })),
        })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la délivrance')
    }
  }

  const handleRefuseOrdonnance = async (id: string) => {
    try {
      const res = await fetch(`/api/ordonnances/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'REFUSEE' }),
      })
      if (!res.ok) throw new Error('Erreur lors du refus')
      toast.success('Ordonnance refusée')
      fetchOrdonnances()
      if (selectedOrdonnance?.id === id) {
        setSelectedOrdonnance({ ...selectedOrdonnance, statut: 'REFUSEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du refus')
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
            <FileText className="w-6 h-6 text-primary" />
            Ordonnances
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des ordonnances et prescriptions médicales
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nouvelle ordonnance
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total ordonnances"
          value={kpis.total}
          icon={FileText}
          variant="default"
        />
        <KpiCard
          title="En attente"
          value={kpis.enAttente}
          icon={Clock}
          variant="warning"
          subtitle="Reçues / En vérification"
        />
        <KpiCard
          title="Validées"
          value={kpis.validees}
          icon={CheckCircle2}
          variant="success"
        />
        <KpiCard
          title="Délivrées"
          value={kpis.delivrees}
          icon={ClipboardCheck}
          variant="success"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par prescripteur, patient, DCI..."
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
                <SelectItem value="RECUE">Reçue</SelectItem>
                <SelectItem value="EN_VERIFICATION">En vérification</SelectItem>
                <SelectItem value="VALIDEE">Validée</SelectItem>
                <SelectItem value="PARTIELLEMENT_DELIVREE">Partiellement délivrée</SelectItem>
                <SelectItem value="DELIVREE">Délivrée</SelectItem>
                <SelectItem value="REFUSEE">Refusée</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={filterDateDebut}
              onChange={(e) => { setFilterDateDebut(e.target.value); setCurrentPage(1) }}
              className="w-full lg:w-40"
              placeholder="Date début"
            />
            <Input
              type="date"
              value={filterDateFin}
              onChange={(e) => { setFilterDateFin(e.target.value); setCurrentPage(1) }}
              className="w-full lg:w-40"
              placeholder="Date fin"
            />
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchOrdonnances} className="ml-auto">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardContent className="p-0">
          {filteredOrdonnances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold text-muted-foreground">Aucune ordonnance trouvée</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm || filterStatut !== 'TOUS'
                  ? 'Modifiez vos filtres pour voir plus de résultats'
                  : 'Créez votre première ordonnance pour commencer'}
              </p>
              {!searchTerm && filterStatut === 'TOUS' && (
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvelle ordonnance
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
                        onClick={() => handleSort('dateOrdonnance')}
                      >
                        <div className="flex items-center gap-1">
                          Date
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('prescripteur')}
                      >
                        <div className="flex items-center gap-1">
                          Prescripteur
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Médicaments</TableHead>
                      <TableHead
                        className="cursor-pointer select-none hover:bg-muted/50"
                        onClick={() => handleSort('statut')}
                      >
                        <div className="flex items-center gap-1">
                          Statut
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOrdonnances.map((ordonnance, idx) => {
                      const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                      return (
                        <TableRow
                          key={ordonnance.id}
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleViewDetail(ordonnance)}
                        >
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {globalIdx}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-muted-foreground" />
                              {formatDate(ordonnance.dateOrdonnance)}
                            </div>
                          </TableCell>
                          <TableCell>
                            {ordonnance.patient ? (
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-muted-foreground" />
                                <span className="font-medium">
                                  {ordonnance.patient.prenom} {ordonnance.patient.nom}
                                </span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Stethoscope className="w-3 h-3 text-muted-foreground" />
                              {ordonnance.prescripteur}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Pill className="w-3 h-3 text-muted-foreground" />
                              <span className="text-sm">{ordonnance.lignes.length} ligne(s)</span>
                            </div>
                          </TableCell>
                          <TableCell>{statutOrdonnanceBadge(ordonnance.statut)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleViewDetail(ordonnance)}
                                title="Voir le détail"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              {(ordonnance.statut === 'RECUE' || ordonnance.statut === 'EN_VERIFICATION') && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:text-emerald-700"
                                  onClick={() => handleValidateOrdonnance(ordonnance.id)}
                                  title="Valider"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                              )}
                              {ordonnance.statut === 'VALIDEE' && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700"
                                  onClick={() => handleDeliverOrdonnance(ordonnance.id)}
                                  title="Délivrer"
                                >
                                  <ClipboardCheck className="w-4 h-4" />
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
                  {filteredOrdonnances.length} ordonnance(s) trouvée(s)
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

      {/* Create Ordonnance Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Nouvelle ordonnance
            </DialogTitle>
            <DialogDescription>
              Enregistrer une nouvelle ordonnance médicale
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Patient */}
            <div className="space-y-2">
              <Label>Patient</Label>
              <Select value={newPatientId} onValueChange={setNewPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.prenom} {p.nom} — {p.telephone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prescripteur */}
            <div className="space-y-2">
              <Label>Prescripteur *</Label>
              <Input
                placeholder="Nom du médecin prescripteur"
                value={newPrescripteur}
                onChange={(e) => setNewPrescripteur(e.target.value)}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date de l&apos;ordonnance</Label>
              <Input
                type="date"
                value={newDateOrdonnance}
                onChange={(e) => setNewDateOrdonnance(e.target.value)}
              />
            </div>

            <Separator />

            {/* Lignes de médicaments */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Lignes de prescription</Label>
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
                          <SelectValue placeholder="Sélectionner ou saisir DCI" />
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
                      <Label className="text-xs">Posologie</Label>
                      <Input
                        placeholder="Ex: 1 comprimé 3 fois/jour"
                        value={ligne.posologie}
                        onChange={(e) => handleLigneChange(idx, 'posologie', e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Quantité</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={ligne.quantite}
                          onChange={(e) => handleLigneChange(idx, 'quantite', parseInt(e.target.value) || 1)}
                          className="w-24"
                        />
                        {newLignes.length > 1 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveLigne(idx)}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Notes complémentaires..."
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
            <Button onClick={handleCreateOrdonnance} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer l&apos;ordonnance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Détail de l&apos;ordonnance
            </SheetTitle>
          </SheetHeader>

          {selectedOrdonnance && (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                {statutOrdonnanceBadge(selectedOrdonnance.statut)}
                <div className="flex gap-2">
                  {(selectedOrdonnance.statut === 'RECUE' || selectedOrdonnance.statut === 'EN_VERIFICATION') && (
                    <Button
                      size="sm"
                      onClick={() => handleValidateOrdonnance(selectedOrdonnance.id)}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Valider
                    </Button>
                  )}
                  {selectedOrdonnance.statut === 'VALIDEE' && (
                    <Button
                      size="sm"
                      onClick={() => handleDeliverOrdonnance(selectedOrdonnance.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" />
                      Délivrer
                    </Button>
                  )}
                  {(selectedOrdonnance.statut === 'RECUE' || selectedOrdonnance.statut === 'EN_VERIFICATION') && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRefuseOrdonnance(selectedOrdonnance.id)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Refuser
                    </Button>
                  )}
                </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedOrdonnance.dateOrdonnance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Prescripteur</p>
                  <p className="font-medium flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" />
                    {selectedOrdonnance.prescripteur}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Patient</p>
                  <p className="font-medium flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {selectedOrdonnance.patient
                      ? `${selectedOrdonnance.patient.prenom} ${selectedOrdonnance.patient.nom}`
                      : 'Non renseigné'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Vérifié par</p>
                  <p className="font-medium">
                    {selectedOrdonnance.verifiePar || '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Lignes de prescription */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Pill className="w-4 h-4" />
                  Lignes de prescription ({selectedOrdonnance.lignes.length})
                </h3>
                <ScrollArea className="max-h-64">
                  <div className="space-y-2">
                    {selectedOrdonnance.lignes.map((ligne) => (
                      <Card
                        key={ligne.id}
                        className={`p-3 ${ligne.delivree ? 'bg-green-50 border-green-200' : 'bg-white'}`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{ligne.dci}</p>
                            {ligne.posologie && (
                              <p className="text-xs text-muted-foreground">{ligne.posologie}</p>
                            )}
                            <p className="text-xs text-muted-foreground">Quantité : {ligne.quantite}</p>
                          </div>
                          <Badge variant={ligne.delivree ? 'default' : 'secondary'} className="text-xs">
                            {ligne.delivree ? 'Délivrée' : 'En attente'}
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* Image */}
              {selectedOrdonnance.imageUrl && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <ImageIcon className="w-4 h-4" />
                      Image de l&apos;ordonnance
                    </h3>
                    <div className="border rounded-lg p-2 bg-muted/30">
                      <img
                        src={selectedOrdonnance.imageUrl}
                        alt="Ordonnance"
                        className="max-w-full h-auto rounded"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              {selectedOrdonnance.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedOrdonnance.notes}
                    </p>
                  </div>
                </>
              )}

              {/* Validation workflow */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Workflow de validation</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      ['RECUE', 'EN_VERIFICATION', 'VALIDEE', 'PARTIELLEMENT_DELIVREE', 'DELIVREE'].includes(selectedOrdonnance.statut)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Ordonnance reçue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      ['VALIDEE', 'PARTIELLEMENT_DELIVREE', 'DELIVREE'].includes(selectedOrdonnance.statut)
                        ? 'bg-green-100 text-green-700'
                        : selectedOrdonnance.statut === 'EN_VERIFICATION'
                          ? 'bg-amber-100 text-amber-700'
                          : selectedOrdonnance.statut === 'REFUSEE'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-400'
                    }`}>
                      {selectedOrdonnance.statut === 'REFUSEE' ? (
                        <XCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-sm">
                      {selectedOrdonnance.statut === 'REFUSEE' ? 'Refusée' : 'Vérification & validation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      ['PARTIELLEMENT_DELIVREE', 'DELIVREE'].includes(selectedOrdonnance.statut)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Délivrance</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
