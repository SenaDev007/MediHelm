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
  AlertTriangle,
  Shield,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Eye,
  CheckCircle2,
  Clock,
  Filter,
  AlertOctagon,
  AlertCircle,
  Info,
  Siren,
  Ban,
  FileWarning,
  Pill,
  Package,
  Calendar,
  Bell,
  BellOff,
  Loader2,
  XCircle,
  Activity,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

type TypeAlerteDPMED = 'RAPPEL_LOT' | 'CONTREFACON' | 'AMM_SUSPENDUE' | 'INTERDICTION' | 'INFORMATION' | 'PHARMACOVIGILANCE'
type NiveauUrgence = 'INFO' | 'ATTENTION' | 'URGENT' | 'URGENCE_IMMEDIATE'
type StatutAlerte = 'EN_DIFFUSION' | 'ACQUITTEE' | 'EXPIREE' | 'ANNULEE'
type StatutDiffusion = 'EN_ATTENTE' | 'RECUE' | 'ACQUITTEE' | 'NON_CONCERNEE'

interface DiffusionAlerte {
  id: string
  statut: StatutDiffusion
  dateAcquittement: string | null
  commentaire: string | null
}

interface AlerteDPMED {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: TypeAlerteDPMED
  niveauUrgence: NiveauUrgence
  dciConcernee: string | null
  description: string | null
  signatureNumerique: string
  dateEmissionDPMED: string
  statut: StatutAlerte
  createdAt: string
  updatedAt: string
  diffusions?: DiffusionAlerte[]
}

interface AlerteOperationnelle {
  id: string
  type: string
  titre: string
  message: string
  lue: boolean
  createdAt: string
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

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function typeAlerteLabel(type: TypeAlerteDPMED): string {
  const labels: Record<TypeAlerteDPMED, string> = {
    RAPPEL_LOT: 'Rappel de lot',
    CONTREFACON: 'Contrefaçon',
    AMM_SUSPENDUE: 'AMM suspendue',
    INTERDICTION: 'Interdiction',
    INFORMATION: 'Information',
    PHARMACOVIGILANCE: 'Pharmacovigilance',
  }
  return labels[type] || type
}

function typeAlerteIcon(type: TypeAlerteDPMED) {
  switch (type) {
    case 'RAPPEL_LOT':
      return <Package className="w-4 h-4" />
    case 'CONTREFACON':
      return <Ban className="w-4 h-4" />
    case 'AMM_SUSPENDUE':
      return <FileWarning className="w-4 h-4" />
    case 'INTERDICTION':
      return <Siren className="w-4 h-4" />
    case 'INFORMATION':
      return <Info className="w-4 h-4" />
    case 'PHARMACOVIGILANCE':
      return <Pill className="w-4 h-4" />
    default:
      return <AlertTriangle className="w-4 h-4" />
  }
}

function niveauUrgenceLabel(niveau: NiveauUrgence): string {
  const labels: Record<NiveauUrgence, string> = {
    INFO: 'Information',
    ATTENTION: 'Attention',
    URGENT: 'Urgent',
    URGENCE_IMMEDIATE: 'Urgence immédiate',
  }
  return labels[niveau] || niveau
}

function niveauUrgenceBadge(niveau: NiveauUrgence) {
  const colorMap: Record<NiveauUrgence, string> = {
    INFO: 'bg-blue-50 text-blue-700 border-blue-200',
    ATTENTION: 'bg-amber-50 text-amber-700 border-amber-200',
    URGENT: 'bg-orange-50 text-orange-700 border-orange-200',
    URGENCE_IMMEDIATE: 'bg-red-50 text-red-700 border-red-200',
  }
  const iconMap: Record<NiveauUrgence, React.ReactNode> = {
    INFO: <Info className="w-3 h-3" />,
    ATTENTION: <AlertCircle className="w-3 h-3" />,
    URGENT: <AlertOctagon className="w-3 h-3" />,
    URGENCE_IMMEDIATE: <Siren className="w-3 h-3" />,
  }
  return (
    <Badge variant="outline" className={`${colorMap[niveau]} border flex items-center gap-1`}>
      {iconMap[niveau]}
      {niveauUrgenceLabel(niveau)}
    </Badge>
  )
}

function statutAlerteLabel(statut: StatutAlerte): string {
  const labels: Record<StatutAlerte, string> = {
    EN_DIFFUSION: 'En diffusion',
    ACQUITTEE: 'Acquitée',
    EXPIREE: 'Expirée',
    ANNULEE: 'Annulée',
  }
  return labels[statut] || statut
}

function statutAlerteBadge(statut: StatutAlerte) {
  const colorMap: Record<StatutAlerte, string> = {
    EN_DIFFUSION: 'bg-amber-50 text-amber-700 border-amber-200',
    ACQUITTEE: 'bg-green-50 text-green-700 border-green-200',
    EXPIREE: 'bg-gray-100 text-gray-500 border-gray-200',
    ANNULEE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={`${colorMap[statut]} border`}>
      {statutAlerteLabel(statut)}
    </Badge>
  )
}

function statutDiffusionLabel(statut: StatutDiffusion): string {
  const labels: Record<StatutDiffusion, string> = {
    EN_ATTENTE: 'En attente',
    RECUE: 'Reçue',
    ACQUITTEE: 'Acquitée',
    NON_CONCERNEE: 'Non concernée',
  }
  return labels[statut] || statut
}

// === Main Component ===

export default function AlertesPage() {
  const { pharmacie } = useAuth()

  // State
  const [alertes, setAlertes] = useState<AlerteDPMED[]>([])
  const [alertesOp, setAlertesOp] = useState<AlerteOperationnelle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('TOUS')
  const [filterUrgence, setFilterUrgence] = useState<string>('TOUS')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [sortBy, setSortBy] = useState<'dateEmissionDPMED' | 'niveauUrgence' | 'typeAlerte'>('dateEmissionDPMED')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Active tab
  const [activeTab, setActiveTab] = useState('dpmed')

  // Dialogs
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedAlerte, setSelectedAlerte] = useState<AlerteDPMED | null>(null)
  const [showAcquitterDialog, setShowAcquitterDialog] = useState(false)
  const [acquitterCommentaire, setAcquitterCommentaire] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // === Data Fetching ===

  const fetchAlertes = useCallback(async () => {
    if (!pharmacie?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/alertes/dpmed')
      if (!res.ok) throw new Error('Erreur lors du chargement des alertes DPMED')
      const data = await res.json()
      setAlertes(Array.isArray(data) ? data : data.alertes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setAlertes([])
    } finally {
      setIsLoading(false)
    }
  }, [pharmacie?.id])

  const fetchAlertesOp = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/alertes/operationnelles')
      if (res.ok) {
        const data = await res.json()
        setAlertesOp(Array.isArray(data) ? data : data.alertes || [])
      }
    } catch {
      // Silently fail
    }
  }, [pharmacie?.id])

  useEffect(() => {
    fetchAlertes()
    fetchAlertesOp()
  }, [fetchAlertes, fetchAlertesOp])

  // === Filtering & Sorting ===

  const filteredAlertes = useMemo(() => {
    let result = [...alertes]

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase()
      result = result.filter(
        (a) =>
          a.titre.toLowerCase().includes(lower) ||
          a.referenceOfficielle.toLowerCase().includes(lower) ||
          (a.dciConcernee || '').toLowerCase().includes(lower) ||
          (a.description || '').toLowerCase().includes(lower)
      )
    }

    // Type filter
    if (filterType !== 'TOUS') {
      result = result.filter((a) => a.typeAlerte === filterType)
    }

    // Urgence filter
    if (filterUrgence !== 'TOUS') {
      result = result.filter((a) => a.niveauUrgence === filterUrgence)
    }

    // Statut filter
    if (filterStatut !== 'TOUS') {
      result = result.filter((a) => a.statut === filterStatut)
    }

    // Sort
    const urgenceOrder: Record<NiveauUrgence, number> = {
      URGENCE_IMMEDIATE: 4,
      URGENT: 3,
      ATTENTION: 2,
      INFO: 1,
    }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'dateEmissionDPMED':
          cmp = new Date(a.dateEmissionDPMED).getTime() - new Date(b.dateEmissionDPMED).getTime()
          break
        case 'niveauUrgence':
          cmp = urgenceOrder[a.niveauUrgence] - urgenceOrder[b.niveauUrgence]
          break
        case 'typeAlerte':
          cmp = a.typeAlerte.localeCompare(b.typeAlerte)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [alertes, searchTerm, filterType, filterUrgence, filterStatut, sortBy, sortDir])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredAlertes.length / itemsPerPage))
  const paginatedAlertes = filteredAlertes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Operationnelles filter
  const [filterOpLue, setFilterOpLue] = useState<string>('TOUTES')
  const filteredAlertesOp = useMemo(() => {
    let result = [...alertesOp]
    if (filterOpLue === 'NON_LUES') {
      result = result.filter((a) => !a.lue)
    } else if (filterOpLue === 'LUES') {
      result = result.filter((a) => a.lue)
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [alertesOp, filterOpLue])

  // === KPIs ===

  const kpis = useMemo(() => {
    const total = alertes.length
    const enDiffusion = alertes.filter((a) => a.statut === 'EN_DIFFUSION').length
    const urgentes = alertes.filter((a) => a.niveauUrgence === 'URGENT' || a.niveauUrgence === 'URGENCE_IMMEDIATE').length
    const acquitees = alertes.filter((a) => a.statut === 'ACQUITTEE').length
    const nonAcquitees = alertes.filter((a) => a.statut === 'EN_DIFFUSION').length
    const opNonLues = alertesOp.filter((a) => !a.lue).length
    return { total, enDiffusion, urgentes, acquitees, nonAcquitees, opNonLues }
  }, [alertes, alertesOp])

  // === Handlers ===

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const handleViewDetail = (alerte: AlerteDPMED) => {
    setSelectedAlerte(alerte)
    setShowDetailSheet(true)
  }

  const handleOpenAcquitter = (alerte: AlerteDPMED) => {
    setSelectedAlerte(alerte)
    setAcquitterCommentaire('')
    setShowAcquitterDialog(true)
  }

  const handleAcquitter = async () => {
    if (!selectedAlerte) return
    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/alertes/dpmed/${selectedAlerte.id}/acquitter`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentaire: acquitterCommentaire || null,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de l\'acquittement')
      toast.success('Alerte acquittée avec succès')
      setShowAcquitterDialog(false)
      fetchAlertes()
      if (selectedAlerte) {
        setSelectedAlerte({ ...selectedAlerte, statut: 'ACQUITTEE' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\'acquittement')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkOpLue = async (id: string) => {
    try {
      const res = await fetch(`/api/alertes/operationnelles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lue: true }),
      })
      if (!res.ok) throw new Error('Erreur')
      setAlertesOp((prev) => prev.map((a) => (a.id === id ? { ...a, lue: true } : a)))
      toast.success('Alerte marquée comme lue')
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // === Loading Skeleton ===

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
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
            <AlertTriangle className="w-6 h-6 text-primary" />
            Alertes & Notifications
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Alertes DPMED, opérations et notifications réglementaires
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total alertes DPMED"
          value={kpis.total}
          icon={Shield}
          variant="default"
        />
        <KpiCard
          title="En diffusion"
          value={kpis.nonAcquitees}
          icon={Bell}
          variant="warning"
          subtitle="Non acquittées"
        />
        <KpiCard
          title="Urgentes / Critiques"
          value={kpis.urgentes}
          icon={AlertOctagon}
          variant="danger"
        />
        <KpiCard
          title="Alertes op. non lues"
          value={kpis.opNonLues}
          icon={Activity}
          variant={kpis.opNonLues > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dpmed" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Alertes DPMED
          </TabsTrigger>
          <TabsTrigger value="operationnelles" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Alertes opérationnelles
            {kpis.opNonLues > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs px-1.5 py-0">
                {kpis.opNonLues}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* === DPMED Tab === */}
        <TabsContent value="dpmed" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par titre, référence, DCI..."
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                    className="pl-9"
                  />
                </div>
                <Select value={filterType} onValueChange={(v) => { setFilterType(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full lg:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous les types</SelectItem>
                    <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                    <SelectItem value="CONTREFACON">Contrefaçon</SelectItem>
                    <SelectItem value="AMM_SUSPENDUE">AMM suspendue</SelectItem>
                    <SelectItem value="INTERDICTION">Interdiction</SelectItem>
                    <SelectItem value="INFORMATION">Information</SelectItem>
                    <SelectItem value="PHARMACOVIGILANCE">Pharmacovigilance</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterUrgence} onValueChange={(v) => { setFilterUrgence(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full lg:w-44">
                    <SelectValue placeholder="Urgence" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous niveaux</SelectItem>
                    <SelectItem value="INFO">Information</SelectItem>
                    <SelectItem value="ATTENTION">Attention</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="URGENCE_IMMEDIATE">Urgence immédiate</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full lg:w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous statuts</SelectItem>
                    <SelectItem value="EN_DIFFUSION">En diffusion</SelectItem>
                    <SelectItem value="ACQUITTEE">Acquitée</SelectItem>
                    <SelectItem value="EXPIREE">Expirée</SelectItem>
                    <SelectItem value="ANNULEE">Annulée</SelectItem>
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
                <Button variant="outline" size="sm" onClick={fetchAlertes} className="ml-auto">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              {filteredAlertes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Aucune alerte DPMED</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les alertes de la Direction de la Pharmacie apparaîtront ici
                  </p>
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
                            onClick={() => handleSort('niveauUrgence')}
                          >
                            <div className="flex items-center gap-1">
                              Urgence
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer select-none hover:bg-muted/50"
                            onClick={() => handleSort('typeAlerte')}
                          >
                            <div className="flex items-center gap-1">
                              Type
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead>Titre</TableHead>
                          <TableHead>DCI concernée</TableHead>
                          <TableHead
                            className="cursor-pointer select-none hover:bg-muted/50"
                            onClick={() => handleSort('dateEmissionDPMED')}
                          >
                            <div className="flex items-center gap-1">
                              Date DPMED
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedAlertes.map((alerte, idx) => {
                          const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                          return (
                            <TableRow
                              key={alerte.id}
                              className={`cursor-pointer hover:bg-muted/50 ${
                                alerte.niveauUrgence === 'URGENCE_IMMEDIATE' ? 'bg-red-50/50' : ''
                              }`}
                              onClick={() => handleViewDetail(alerte)}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {globalIdx}
                              </TableCell>
                              <TableCell>{niveauUrgenceBadge(alerte.niveauUrgence)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {typeAlerteIcon(alerte.typeAlerte)}
                                  <span className="text-sm">{typeAlerteLabel(alerte.typeAlerte)}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <p className="font-medium text-sm max-w-48 truncate" title={alerte.titre}>
                                  {alerte.titre}
                                </p>
                                <p className="text-xs text-muted-foreground">{alerte.referenceOfficielle}</p>
                              </TableCell>
                              <TableCell>
                                {alerte.dciConcernee ? (
                                  <Badge variant="outline" className="text-xs">
                                    {alerte.dciConcernee}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  {formatDate(alerte.dateEmissionDPMED)}
                                </div>
                              </TableCell>
                              <TableCell>{statutAlerteBadge(alerte.statut)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDetail(alerte)}
                                    title="Voir le détail"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {alerte.statut === 'EN_DIFFUSION' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-green-600 hover:text-green-700"
                                      onClick={() => handleOpenAcquitter(alerte)}
                                      title="Acquitter"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
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
                      {filteredAlertes.length} alerte(s) DPMED
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
        </TabsContent>

        {/* === Opérationnelles Tab === */}
        <TabsContent value="operationnelles" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Select value={filterOpLue} onValueChange={setFilterOpLue}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUTES">Toutes</SelectItem>
                    <SelectItem value="NON_LUES">Non lues</SelectItem>
                    <SelectItem value="LUES">Lues</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">
                  {filteredAlertesOp.length} alerte(s) opérationnelle(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {filteredAlertesOp.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Activity className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-muted-foreground">Aucune alerte opérationnelle</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Les alertes de stock, d&apos;expiration et autres apparaîtront ici
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredAlertesOp.map((alerteOp) => {
                const typeIcon = (type: string) => {
                  switch (type) {
                    case 'RUPTURE_STOCK':
                      return <Package className="w-5 h-5 text-red-500" />
                    case 'PEREMPTION':
                      return <Clock className="w-5 h-5 text-amber-500" />
                    case 'SEUIL_MINIMUM':
                      return <AlertCircle className="w-5 h-5 text-orange-500" />
                    default:
                      return <Bell className="w-5 h-5 text-blue-500" />
                  }
                }
                return (
                  <Card
                    key={alerteOp.id}
                    className={`${!alerteOp.lue ? 'border-l-4 border-l-primary bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 shrink-0">
                          {typeIcon(alerteOp.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`text-sm font-medium ${!alerteOp.lue ? 'font-semibold' : ''}`}>
                              {alerteOp.titre}
                            </h4>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-xs text-muted-foreground">
                                {formatDateTime(alerteOp.createdAt)}
                              </span>
                              {!alerteOp.lue && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => handleMarkOpLue(alerteOp.id)}
                                >
                                  <BellOff className="w-3 h-3 mr-1" />
                                  Marquer lue
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alerteOp.message}</p>
                          <Badge variant="outline" className="text-xs mt-2">
                            {alerteOp.type.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Détail de l&apos;alerte DPMED
            </SheetTitle>
          </SheetHeader>

          {selectedAlerte && (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                {statutAlerteBadge(selectedAlerte.statut)}
                {selectedAlerte.statut === 'EN_DIFFUSION' && (
                  <Button
                    size="sm"
                    onClick={() => handleOpenAcquitter(selectedAlerte)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Acquitter
                  </Button>
                )}
              </div>

              {/* Urgence & Type */}
              <div className="flex items-center gap-3">
                {niveauUrgenceBadge(selectedAlerte.niveauUrgence)}
                <Badge variant="outline" className="flex items-center gap-1">
                  {typeAlerteIcon(selectedAlerte.typeAlerte)}
                  {typeAlerteLabel(selectedAlerte.typeAlerte)}
                </Badge>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Référence</p>
                  <p className="font-mono text-sm font-medium">{selectedAlerte.referenceOfficielle}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date émission DPMED</p>
                  <p className="font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedAlerte.dateEmissionDPMED)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">DCI concernée</p>
                  <p className="font-medium flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {selectedAlerte.dciConcernee || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Signature numérique</p>
                  <p className="font-mono text-xs text-muted-foreground truncate" title={selectedAlerte.signatureNumerique}>
                    {selectedAlerte.signatureNumerique || '—'}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Titre */}
              <div>
                <p className="text-xs text-muted-foreground uppercase">Titre</p>
                <h3 className="font-semibold text-lg">{selectedAlerte.titre}</h3>
              </div>

              {/* Description */}
              {selectedAlerte.description && (
                <div>
                  <p className="text-xs text-muted-foreground uppercase mb-1">Description</p>
                  <div className="bg-muted/50 rounded-lg p-4">
                    <p className="text-sm whitespace-pre-wrap">{selectedAlerte.description}</p>
                  </div>
                </div>
              )}

              {/* Diffusions */}
              {selectedAlerte.diffusions && selectedAlerte.diffusions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3">Pharmacies concernées</h3>
                    <ScrollArea className="max-h-48">
                      <div className="space-y-2">
                        {selectedAlerte.diffusions.map((diff) => (
                          <Card key={diff.id} className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <Badge variant="outline" className="text-xs">
                                  {statutDiffusionLabel(diff.statut)}
                                </Badge>
                              </div>
                              <div className="text-right">
                                {diff.dateAcquittement && (
                                  <p className="text-xs text-muted-foreground">
                                    Acquittée le {formatDateTime(diff.dateAcquittement)}
                                  </p>
                                )}
                                {diff.commentaire && (
                                  <p className="text-xs text-muted-foreground">{diff.commentaire}</p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </>
              )}

              {/* Metadata */}
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                <div>
                  <p className="uppercase">Créée le</p>
                  <p>{formatDateTime(selectedAlerte.createdAt)}</p>
                </div>
                <div>
                  <p className="uppercase">Mise à jour le</p>
                  <p>{formatDateTime(selectedAlerte.updatedAt)}</p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Acquitter Dialog */}
      <Dialog open={showAcquitterDialog} onOpenChange={setShowAcquitterDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Acquitter l&apos;alerte
            </DialogTitle>
            <DialogDescription>
              Confirmer la prise en compte de cette alerte DPMED
            </DialogDescription>
          </DialogHeader>

          {selectedAlerte && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-sm">{selectedAlerte.titre}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Réf: {selectedAlerte.referenceOfficielle}
                </p>
              </div>

              <div className="space-y-2">
                <Label>Commentaire (optionnel)</Label>
                <Textarea
                  placeholder="Action prise, mesures appliquées..."
                  value={acquitterCommentaire}
                  onChange={(e) => setAcquitterCommentaire(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  L&apos;acquittement confirme que vous avez pris connaissance de cette alerte et appliqué les mesures nécessaires.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAcquitterDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleAcquitter}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Acquitter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
