'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
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
  HeartPulse,
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
  AlertTriangle,
  Pill,
  Activity,
  Shield,
  Zap,
  AlertOctagon,
  Loader2,
  Send,
  FileText,
  ArrowRightLeft,
  Beaker,
  Stethoscope,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

type GraviteEI = 'MINEUR' | 'MODERE' | 'GRAVE' | 'VITAL'
type StatutSignalement = 'EN_ATTENTE' | 'SOUMIS' | 'ACQUITTE' | 'CLOTURE'
type TypeSurveillance = 'SOUS_SURVEILLANCE' | 'RAPPEL_LOT' | 'CONTREFACON' | 'AMM_SUSPENDUE' | 'INTERDICTION'
type NiveauRisque = 'FAIBLE' | 'MODERE' | 'ELEVE' | 'CRITIQUE'

interface SignalementEI {
  id: string
  dciConcernee: string
  descriptionEI: string
  gravite: GraviteEI
  dateDebut: string
  statutEnvoi: StatutSignalement
  refDPMED: string | null
  createdAt: string
  updatedAt: string
}

interface MedicamentSurveillance {
  id: string
  dci: string
  nomCommercial: string | null
  typeSurveillance: TypeSurveillance
  description: string
  sourceAlerte: string
  dateEmission: string
  niveauRisque: NiveauRisque
  statut: string
}

interface InteractionResult {
  medicament1: string
  medicament2: string
  niveau: 'MINEURE' | 'MODEREE' | 'MAJEURE' | 'CONTRE-INDICATION'
  description: string
  conduite: string
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

function graviteLabel(gravite: GraviteEI): string {
  const labels: Record<GraviteEI, string> = {
    MINEUR: 'Mineur',
    MODERE: 'Modéré',
    GRAVE: 'Grave',
    VITAL: 'Vital',
  }
  return labels[gravite] || gravite
}

function graviteBadge(gravite: GraviteEI) {
  const colorMap: Record<GraviteEI, string> = {
    MINEUR: 'bg-green-50 text-green-700 border-green-200',
    MODERE: 'bg-amber-50 text-amber-700 border-amber-200',
    GRAVE: 'bg-orange-50 text-orange-700 border-orange-200',
    VITAL: 'bg-red-50 text-red-700 border-red-200',
  }
  const iconMap: Record<GraviteEI, React.ReactNode> = {
    MINEUR: <Activity className="w-3 h-3" />,
    MODERE: <AlertTriangle className="w-3 h-3" />,
    GRAVE: <AlertOctagon className="w-3 h-3" />,
    VITAL: <Zap className="w-3 h-3" />,
  }
  return (
    <Badge variant="outline" className={`${colorMap[gravite]} border flex items-center gap-1`}>
      {iconMap[gravite]}
      {graviteLabel(gravite)}
    </Badge>
  )
}

function statutSignalementLabel(statut: StatutSignalement): string {
  const labels: Record<StatutSignalement, string> = {
    EN_ATTENTE: 'En attente',
    SOUMIS: 'Soumis au DPMED',
    ACQUITTE: 'Acquitté',
    CLOTURE: 'Clôturé',
  }
  return labels[statut] || statut
}

function statutSignalementBadge(statut: StatutSignalement) {
  const colorMap: Record<StatutSignalement, string> = {
    EN_ATTENTE: 'bg-amber-50 text-amber-700 border-amber-200',
    SOUMIS: 'bg-blue-50 text-blue-700 border-blue-200',
    ACQUITTE: 'bg-green-50 text-green-700 border-green-200',
    CLOTURE: 'bg-gray-100 text-gray-600 border-gray-200',
  }
  return (
    <Badge variant="outline" className={`${colorMap[statut]} border`}>
      {statutSignalementLabel(statut)}
    </Badge>
  )
}

function typeSurveillanceLabel(type: TypeSurveillance): string {
  const labels: Record<TypeSurveillance, string> = {
    SOUS_SURVEILLANCE: 'Sous surveillance',
    RAPPEL_LOT: 'Rappel de lot',
    CONTREFACON: 'Contrefaçon',
    AMM_SUSPENDUE: 'AMM suspendue',
    INTERDICTION: 'Interdiction',
  }
  return labels[type] || type
}

function niveauRisqueBadge(niveau: NiveauRisque) {
  const colorMap: Record<NiveauRisque, string> = {
    FAIBLE: 'bg-green-50 text-green-700 border-green-200',
    MODERE: 'bg-amber-50 text-amber-700 border-amber-200',
    ELEVE: 'bg-orange-50 text-orange-700 border-orange-200',
    CRITIQUE: 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={`${colorMap[niveau]} border`}>
      {niveau}
    </Badge>
  )
}

function interactionNiveauBadge(niveau: InteractionResult['niveau']) {
  const colorMap: Record<string, string> = {
    MINEURE: 'bg-green-50 text-green-700 border-green-200',
    MODEREE: 'bg-amber-50 text-amber-700 border-amber-200',
    MAJEURE: 'bg-orange-50 text-orange-700 border-orange-200',
    'CONTRE-INDICATION': 'bg-red-50 text-red-700 border-red-200',
  }
  return (
    <Badge variant="outline" className={`${colorMap[niveau]} border`}>
      {niveau}
    </Badge>
  )
}

// === Main Component ===

export default function QualitePage() {
  const { pharmacie } = useAuth()

  // State
  const [signalements, setSignalements] = useState<SignalementEI[]>([])
  const [surveillances, setSurveillances] = useState<MedicamentSurveillance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Signalements filters
  const [searchSignalement, setSearchSignalement] = useState('')
  const [filterGravite, setFilterGravite] = useState<string>('TOUS')
  const [filterStatut, setFilterStatut] = useState<string>('TOUS')
  const [sortBy, setSortBy] = useState<'dateDebut' | 'gravite' | 'statutEnvoi'>('dateDebut')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Pagination signalements
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Active tab
  const [activeTab, setActiveTab] = useState('signalements')

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDetailSheet, setShowDetailSheet] = useState(false)
  const [selectedSignalement, setSelectedSignalement] = useState<SignalementEI | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // New signalement form
  const [newDci, setNewDci] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newGravite, setNewGravite] = useState<GraviteEI>('MODERE')
  const [newDateDebut, setNewDateDebut] = useState(new Date().toISOString().split('T')[0])

  // Interaction checker
  const [interactionMed1, setInteractionMed1] = useState('')
  const [interactionMed2, setInteractionMed2] = useState('')
  const [interactionResults, setInteractionResults] = useState<InteractionResult[]>([])
  const [isCheckingInteractions, setIsCheckingInteractions] = useState(false)

  // Quality score
  const [qualiteScore, setQualiteScore] = useState<number>(0)

  // === Data Fetching ===

  const fetchSignalements = useCallback(async () => {
    if (!pharmacie?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/qualite/signalements')
      if (!res.ok) throw new Error('Erreur lors du chargement des signalements')
      const data = await res.json()
      setSignalements(Array.isArray(data) ? data : data.signalements || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      setSignalements([])
    } finally {
      setIsLoading(false)
    }
  }, [pharmacie?.id])

  const fetchSurveillances = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/qualite/surveillance')
      if (res.ok) {
        const data = await res.json()
        setSurveillances(Array.isArray(data) ? data : data.surveillances || [])
      }
    } catch {
      // Silently fail
    }
  }, [pharmacie?.id])

  useEffect(() => {
    fetchSignalements()
    fetchSurveillances()
  }, [fetchSignalements, fetchSurveillances])

  // Compute quality score
  useEffect(() => {
    if (signalements.length === 0) {
      setQualiteScore(85)
    } else {
      const clots = signalements.filter((s) => s.statutEnvoi === 'ACQUITTE' || s.statutEnvoi === 'CLOTURE').length
      const ratio = clots / signalements.length
      setQualiteScore(Math.round(ratio * 100))
    }
  }, [signalements])

  // === Filtering & Sorting ===

  const filteredSignalements = useMemo(() => {
    let result = [...signalements]

    if (searchSignalement) {
      const lower = searchSignalement.toLowerCase()
      result = result.filter(
        (s) =>
          s.dciConcernee.toLowerCase().includes(lower) ||
          s.descriptionEI.toLowerCase().includes(lower) ||
          (s.refDPMED || '').toLowerCase().includes(lower)
      )
    }

    if (filterGravite !== 'TOUS') {
      result = result.filter((s) => s.gravite === filterGravite)
    }

    if (filterStatut !== 'TOUS') {
      result = result.filter((s) => s.statutEnvoi === filterStatut)
    }

    const graviteOrder: Record<GraviteEI, number> = { VITAL: 4, GRAVE: 3, MODERE: 2, MINEUR: 1 }
    result.sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'dateDebut':
          cmp = new Date(a.dateDebut).getTime() - new Date(b.dateDebut).getTime()
          break
        case 'gravite':
          cmp = graviteOrder[a.gravite] - graviteOrder[b.gravite]
          break
        case 'statutEnvoi':
          cmp = a.statutEnvoi.localeCompare(b.statutEnvoi)
          break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

    return result
  }, [signalements, searchSignalement, filterGravite, filterStatut, sortBy, sortDir])

  const totalPages = Math.max(1, Math.ceil(filteredSignalements.length / itemsPerPage))
  const paginatedSignalements = filteredSignalements.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // === KPIs ===

  const kpis = useMemo(() => {
    const total = signalements.length
    const enAttente = signalements.filter((s) => s.statutEnvoi === 'EN_ATTENTE').length
    const graves = signalements.filter((s) => s.gravite === 'GRAVE' || s.gravite === 'VITAL').length
    const soumis = signalements.filter((s) => s.statutEnvoi === 'SOUMIS').length
    const clotures = signalements.filter((s) => s.statutEnvoi === 'CLOTURE' || s.statutEnvoi === 'ACQUITTE').length
    const surveillanceActives = surveillances.filter((s) => s.statut === 'ACTIVE').length
    return { total, enAttente, graves, soumis, clotures, surveillanceActives }
  }, [signalements, surveillances])

  // === Handlers ===

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortDir('desc')
    }
  }

  const handleViewDetail = (signalement: SignalementEI) => {
    setSelectedSignalement(signalement)
    setShowDetailSheet(true)
  }

  const handleCreateSignalement = async () => {
    if (!newDci.trim()) {
      toast.error('Veuillez renseigner la DCI du médicament')
      return
    }
    if (!newDescription.trim()) {
      toast.error('Veuillez décrire l\'effet indésirable')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/qualite/signalements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dciConcernee: newDci,
          descriptionEI: newDescription,
          gravite: newGravite,
          dateDebut: newDateDebut,
        }),
      })
      if (!res.ok) throw new Error('Erreur lors de la création')
      toast.success('Signalement d\'EI créé avec succès')
      setShowCreateDialog(false)
      resetCreateForm()
      fetchSignalements()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCreateForm = () => {
    setNewDci('')
    setNewDescription('')
    setNewGravite('MODERE')
    setNewDateDebut(new Date().toISOString().split('T')[0])
  }

  const handleSoumettreDPMED = async (id: string) => {
    try {
      const res = await fetch(`/api/qualite/signalements/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statutEnvoi: 'SOUMIS' }),
      })
      if (!res.ok) throw new Error('Erreur lors de la soumission')
      toast.success('Signalement soumis au DPMED')
      fetchSignalements()
      if (selectedSignalement?.id === id) {
        setSelectedSignalement({ ...selectedSignalement, statutEnvoi: 'SOUMIS' })
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la soumission')
    }
  }

  const handleCheckInteractions = async () => {
    if (!interactionMed1.trim() || !interactionMed2.trim()) {
      toast.error('Veuillez renseigner au moins deux médicaments')
      return
    }

    setIsCheckingInteractions(true)
    try {
      const res = await fetch('/api/qualite/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicaments: [interactionMed1, interactionMed2],
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setInteractionResults(Array.isArray(data) ? data : data.interactions || [])
      } else {
        setInteractionResults([])
      }
    } catch {
      setInteractionResults([])
    } finally {
      setIsCheckingInteractions(false)
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
            <HeartPulse className="w-6 h-6 text-primary" />
            Pharmacovigilance & Qualité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signalement d&apos;effets indésirables, surveillance et interactions médicamenteuses
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Nouveau signalement
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Total EI"
          value={kpis.total}
          icon={HeartPulse}
          variant="default"
        />
        <KpiCard
          title="En attente"
          value={kpis.enAttente}
          icon={Clock}
          variant="warning"
        />
        <KpiCard
          title="Graves / Vitaux"
          value={kpis.graves}
          icon={AlertOctagon}
          variant="danger"
        />
        <KpiCard
          title="Soumis DPMED"
          value={kpis.soumis}
          icon={Send}
          variant="default"
        />
        <KpiCard
          title="En surveillance"
          value={kpis.surveillanceActives}
          icon={Shield}
          variant="warning"
        />
      </div>

      {/* Quality Score + Interaction Checker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quality Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Score de qualité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold">{qualiteScore}%</span>
              <Badge variant={qualiteScore >= 70 ? 'default' : 'destructive'}>
                {qualiteScore >= 85 ? 'Excellent' : qualiteScore >= 70 ? 'Satisfaisant' : 'À améliorer'}
              </Badge>
            </div>
            <Progress
              value={qualiteScore}
              className={`h-3 ${qualiteScore < 50 ? '[&>div]:bg-red-500' : qualiteScore < 70 ? '[&>div]:bg-amber-500' : '[&>div]:bg-green-500'}`}
            />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{kpis.clotures}</p>
                <p className="text-xs text-muted-foreground">Clôturés</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-2 text-center">
                <p className="text-lg font-bold">{kpis.total}</p>
                <p className="text-xs text-muted-foreground">Total EI</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interaction Checker */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4" />
              Vérificateur d&apos;interactions
            </CardTitle>
            <CardDescription>
              Vérifiez les interactions entre deux ou plusieurs médicaments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Médicament 1</Label>
                  <Input
                    placeholder="Ex: Méthotrexate"
                    value={interactionMed1}
                    onChange={(e) => setInteractionMed1(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Médicament 2</Label>
                  <Input
                    placeholder="Ex: Ibuprofène"
                    value={interactionMed2}
                    onChange={(e) => setInteractionMed2(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={handleCheckInteractions}
                disabled={isCheckingInteractions || !interactionMed1.trim() || !interactionMed2.trim()}
                className="w-full"
              >
                {isCheckingInteractions ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Vérifier les interactions
              </Button>

              {/* Results */}
              {interactionResults.length > 0 && (
                <div className="space-y-3 mt-4">
                  <Separator />
                  <p className="text-sm font-semibold">
                    {interactionResults.length} interaction(s) trouvée(s)
                  </p>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-3">
                      {interactionResults.map((interaction, idx) => (
                        <Card
                          key={idx}
                          className={`${
                            interaction.niveau === 'CONTRE-INDICATION'
                              ? 'border-red-300 bg-red-50/50'
                              : interaction.niveau === 'MAJEURE'
                                ? 'border-orange-300 bg-orange-50/50'
                                : ''
                          }`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Pill className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {interaction.medicament1} + {interaction.medicament2}
                                </span>
                              </div>
                              {interactionNiveauBadge(interaction.niveau)}
                            </div>
                            <p className="text-sm text-muted-foreground">{interaction.description}</p>
                            <div className="mt-2 bg-muted/50 rounded p-2">
                              <p className="text-xs font-medium flex items-center gap-1">
                                <Stethoscope className="w-3 h-3" />
                                Conduite à tenir :
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">{interaction.conduite}</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {interactionResults.length === 0 && interactionMed1 && interactionMed2 && !isCheckingInteractions && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Cliquez sur &quot;Vérifier les interactions&quot; pour analyser
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="signalements" className="flex items-center gap-2">
            <HeartPulse className="w-4 h-4" />
            Signalements EI
          </TabsTrigger>
          <TabsTrigger value="surveillance" className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Surveillance
          </TabsTrigger>
        </TabsList>

        {/* === Signalements Tab === */}
        <TabsContent value="signalements" className="space-y-4 mt-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par DCI, description, réf DPMED..."
                    value={searchSignalement}
                    onChange={(e) => { setSearchSignalement(e.target.value); setCurrentPage(1) }}
                    className="pl-9"
                  />
                </div>
                <Select value={filterGravite} onValueChange={(v) => { setFilterGravite(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full lg:w-44">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Gravité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Toutes gravités</SelectItem>
                    <SelectItem value="MINEUR">Mineur</SelectItem>
                    <SelectItem value="MODERE">Modéré</SelectItem>
                    <SelectItem value="GRAVE">Grave</SelectItem>
                    <SelectItem value="VITAL">Vital</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatut} onValueChange={(v) => { setFilterStatut(v); setCurrentPage(1) }}>
                  <SelectTrigger className="w-full lg:w-44">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TOUS">Tous statuts</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="SOUMIS">Soumis</SelectItem>
                    <SelectItem value="ACQUITTE">Acquitté</SelectItem>
                    <SelectItem value="CLOTURE">Clôturé</SelectItem>
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
                <Button variant="outline" size="sm" onClick={fetchSignalements} className="ml-auto">
                  Réessayer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              {filteredSignalements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <HeartPulse className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Aucun signalement EI</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchSignalement || filterGravite !== 'TOUS'
                      ? 'Modifiez vos filtres pour voir plus de résultats'
                      : 'Signalez un effet indésirable pour commencer'}
                  </p>
                  {!searchSignalement && filterGravite === 'TOUS' && (
                    <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Nouveau signalement
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
                            onClick={() => handleSort('dateDebut')}
                          >
                            <div className="flex items-center gap-1">
                              Date
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead>DCI</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead
                            className="cursor-pointer select-none hover:bg-muted/50"
                            onClick={() => handleSort('gravite')}
                          >
                            <div className="flex items-center gap-1">
                              Gravité
                              <ArrowUpDown className="w-3 h-3" />
                            </div>
                          </TableHead>
                          <TableHead
                            className="cursor-pointer select-none hover:bg-muted/50"
                            onClick={() => handleSort('statutEnvoi')}
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
                        {paginatedSignalements.map((sig, idx) => {
                          const globalIdx = (currentPage - 1) * itemsPerPage + idx + 1
                          return (
                            <TableRow
                              key={sig.id}
                              className={`cursor-pointer hover:bg-muted/50 ${
                                sig.gravite === 'VITAL' ? 'bg-red-50/50' : sig.gravite === 'GRAVE' ? 'bg-orange-50/30' : ''
                              }`}
                              onClick={() => handleViewDetail(sig)}
                            >
                              <TableCell className="font-mono text-xs text-muted-foreground">
                                {globalIdx}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(sig.dateDebut)}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {sig.dciConcernee}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <p className="text-sm max-w-48 truncate" title={sig.descriptionEI}>
                                  {sig.descriptionEI}
                                </p>
                              </TableCell>
                              <TableCell>{graviteBadge(sig.gravite)}</TableCell>
                              <TableCell>{statutSignalementBadge(sig.statutEnvoi)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleViewDetail(sig)}
                                    title="Voir le détail"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  {sig.statutEnvoi === 'EN_ATTENTE' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                      onClick={() => handleSoumettreDPMED(sig.id)}
                                      title="Soumettre au DPMED"
                                    >
                                      <Send className="w-4 h-4" />
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
                      {filteredSignalements.length} signalement(s)
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

        {/* === Surveillance Tab === */}
        <TabsContent value="surveillance" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Médicaments sous surveillance
              </CardTitle>
              <CardDescription>
                DCI sous surveillance par les autorités réglementaires
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {surveillances.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Shield className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground">Aucun médicament sous surveillance</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Les DCI sous surveillance apparaîtront ici
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>DCI</TableHead>
                        <TableHead>Nom commercial</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Niveau de risque</TableHead>
                        <TableHead>Source</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surveillances.map((surv) => (
                        <TableRow key={surv.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs font-medium">
                              {surv.dci}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {surv.nomCommercial || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {typeSurveillanceLabel(surv.typeSurveillance)}
                            </Badge>
                          </TableCell>
                          <TableCell>{niveauRisqueBadge(surv.niveauRisque)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {surv.sourceAlerte}
                          </TableCell>
                          <TableCell className="text-sm">
                            {formatDate(surv.dateEmission)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={surv.statut === 'ACTIVE' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {surv.statut === 'ACTIVE' ? 'Active' : surv.statut}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Signalement Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5" />
              Nouveau signalement d&apos;effet indésirable
            </DialogTitle>
            <DialogDescription>
              Signaler un effet indésirable (EI) observé chez un patient
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* DCI */}
            <div className="space-y-2">
              <Label>DCI du médicament *</Label>
              <Input
                placeholder="Ex: Paracétamol, Amoxicilline..."
                value={newDci}
                onChange={(e) => setNewDci(e.target.value)}
              />
            </div>

            {/* Gravité */}
            <div className="space-y-2">
              <Label>Gravité *</Label>
              <Select value={newGravite} onValueChange={(v) => setNewGravite(v as GraviteEI)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MINEUR">Mineur — Gêne légère, pas de risque vital</SelectItem>
                  <SelectItem value="MODERE">Modéré — Nécessite une intervention médicale</SelectItem>
                  <SelectItem value="GRAVE">Grave — Hospitalisation ou incapacité</SelectItem>
                  <SelectItem value="VITAL">Vital — Mise en jeu du pronostic vital</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date début */}
            <div className="space-y-2">
              <Label>Date d&apos;apparition</Label>
              <Input
                type="date"
                value={newDateDebut}
                onChange={(e) => setNewDateDebut(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description de l&apos;EI *</Label>
              <Textarea
                placeholder="Décrivez l'effet indésirable observé, les symptômes, le contexte..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={4}
              />
            </div>

            {newGravite === 'GRAVE' || newGravite === 'VITAL' ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800 flex items-start gap-2">
                  <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0" />
                  Ce signalement sera prioritairement transmis au DPMED en raison de sa gravité.
                </p>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreateSignalement} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le signalement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Sheet */}
      <Sheet open={showDetailSheet} onOpenChange={setShowDetailSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5" />
              Détail du signalement
            </SheetTitle>
          </SheetHeader>

          {selectedSignalement && (
            <div className="mt-6 space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between">
                {statutSignalementBadge(selectedSignalement.statutEnvoi)}
                {selectedSignalement.statutEnvoi === 'EN_ATTENTE' && (
                  <Button
                    size="sm"
                    onClick={() => handleSoumettreDPMED(selectedSignalement.id)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Soumettre au DPMED
                  </Button>
                )}
              </div>

              {/* Gravité */}
              <div>{graviteBadge(selectedSignalement.gravite)}</div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">DCI</p>
                  <p className="font-medium flex items-center gap-1">
                    <Pill className="w-3 h-3" />
                    {selectedSignalement.dciConcernee}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Date d&apos;apparition</p>
                  <p className="font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(selectedSignalement.dateDebut)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Réf DPMED</p>
                  <p className="font-mono text-sm">
                    {selectedSignalement.refDPMED || 'Non attribué'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Créé le</p>
                  <p className="text-sm">{formatDateTime(selectedSignalement.createdAt)}</p>
                </div>
              </div>

              <Separator />

              {/* Description */}
              <div>
                <p className="text-xs text-muted-foreground uppercase mb-1">Description de l&apos;EI</p>
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{selectedSignalement.descriptionEI}</p>
                </div>
              </div>

              {/* Workflow */}
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Workflow du signalement</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Signalement créé', statuts: ['EN_ATTENTE', 'SOUMIS', 'ACQUITTE', 'CLOTURE'] },
                    { label: 'Soumis au DPMED', statuts: ['SOUMIS', 'ACQUITTE', 'CLOTURE'] },
                    { label: 'Acquitté par le DPMED', statuts: ['ACQUITTE', 'CLOTURE'] },
                    { label: 'Clôturé', statuts: ['CLOTURE'] },
                  ].map((step, idx) => {
                    const isActive = step.statuts.includes(selectedSignalement.statutEnvoi)
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                          isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <CheckCircle2 className="w-4 h-4" />
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
