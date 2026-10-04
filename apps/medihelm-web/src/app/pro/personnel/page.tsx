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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  UserPlus,
  Search,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  FileText,
  LogIn,
  LogOut,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Employe {
  id: string
  pharmacieId: string
  nom: string
  prenom: string
  poste: string
  telephone: string | null
  email: string | null
  typeContrat: string
  salaireBrut: number
  dateEmbauche: string
  actif: boolean
  createdAt: string
  updatedAt: string
}

interface Conge {
  id: string
  pharmacieId: string
  type: string
  dateDebut: string
  dateFin: string
  motif: string | null
  statut: string
  approuvePar: string | null
  createdAt: string
  employeId?: string
}

interface Presence {
  id: string
  pharmacieId: string
  date: string
  heureArrivee: string | null
  heureDepart: string | null
  statut: string
  createdAt: string
  employeId?: string
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

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TYPES_CONTRAT = ['CDI', 'CDD', 'STAGE', 'APPRENTISSAGE', 'INTERIM', 'CONSULTANT'] as const

const TYPES_CONTRAT_LABELS: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  APPRENTISSAGE: 'Apprentissage',
  INTERIM: 'Intérim',
  CONSULTANT: 'Consultant',
}

const TYPES_CONGE = ['ANNUEL', 'MALADIE', 'MATERNITE', 'PATERNITE', 'SANS_SOLDE', 'EXCEPTIONNEL'] as const

const TYPES_CONGE_LABELS: Record<string, string> = {
  ANNUEL: 'Annuel',
  MALADIE: 'Maladie',
  MATERNITE: 'Maternité',
  PATERNITE: 'Paternité',
  SANS_SOLDE: 'Sans solde',
  EXCEPTIONNEL: 'Exceptionnel',
}

function getContratBadge(type: string) {
  switch (type) {
    case 'CDI':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">CDI</Badge>
    case 'CDD':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">CDD</Badge>
    case 'STAGE':
      return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 text-xs">Stage</Badge>
    case 'APPRENTISSAGE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Apprentissage</Badge>
    case 'INTERIM':
      return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-0 text-xs">Intérim</Badge>
    case 'CONSULTANT':
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 text-xs">Consultant</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

function getCongeStatutBadge(statut: string) {
  switch (statut) {
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'APPROUVE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Approuvé</Badge>
    case 'REFUSE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Refusé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getPresenceStatutBadge(statut: string) {
  switch (statut) {
    case 'PRESENT':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Présent</Badge>
    case 'ABSENT':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Absent</Badge>
    case 'RETARD':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Retard</Badge>
    case 'CONGE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Congé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

// === Skeletons ===

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function PersonnelPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  // Tab state
  const [activeTab, setActiveTab] = useState('employes')

  // Employe state
  const [employes, setEmployes] = useState<Employe[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [contratFilter, setContratFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('nom')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Conge state
  const [conges, setConges] = useState<Conge[]>([])
  const [congesLoading, setCongesLoading] = useState(true)
  const [congeSearch, setCongeSearch] = useState('')
  const [congeStatutFilter, setCongeStatutFilter] = useState('all')

  // Presence state
  const [presences, setPresences] = useState<Presence[]>([])
  const [presencesLoading, setPresencesLoading] = useState(true)
  const [presenceDate, setPresenceDate] = useState(new Date().toISOString().split('T')[0])

  // Dialog state
  const [employeDialogOpen, setEmployeDialogOpen] = useState(false)
  const [congeDialogOpen, setCongeDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingEmploye, setEditingEmploye] = useState<Employe | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [employeForm, setEmployeForm] = useState({
    nom: '',
    prenom: '',
    poste: '',
    telephone: '',
    email: '',
    typeContrat: 'CDI',
    salaireBrut: '',
    dateEmbauche: '',
  })

  const [congeForm, setCongeForm] = useState({
    type: 'ANNUEL',
    dateDebut: '',
    dateFin: '',
    motif: '',
  })

  // Fetch employes
  const fetchEmployes = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: page.toString(), pageSize: pageSize.toString(), sortBy, sortOrder })
      if (search) params.set('search', search)
      if (contratFilter !== 'all') params.set('typeContrat', contratFilter)
      const res = await fetch(`/api/employes?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEmployes(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des employés')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, pageSize, sortBy, sortOrder, search, contratFilter])

  // Fetch conges
  const fetchConges = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (congeStatutFilter !== 'all') params.set('statut', congeStatutFilter)
      const res = await fetch(`/api/conges?${params}`)
      if (res.ok) {
        const json = await res.json()
        setConges(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des congés')
    } finally {
      setCongesLoading(false)
    }
  }, [pharmacieId, congeStatutFilter])

  // Fetch presences
  const fetchPresences = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, date: presenceDate })
      const res = await fetch(`/api/presences?${params}`)
      if (res.ok) {
        const json = await res.json()
        setPresences(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement des présences')
    } finally {
      setPresencesLoading(false)
    }
  }, [pharmacieId, presenceDate])

  useEffect(() => { fetchEmployes() }, [fetchEmployes])
  useEffect(() => { fetchConges() }, [fetchConges])
  useEffect(() => { fetchPresences() }, [fetchPresences])
  useEffect(() => { setPage(1) }, [search, contratFilter])

  // Computed stats
  const stats = useMemo(() => {
    const total = employes.length
    const actifs = employes.filter(e => e.actif).length
    const congesEnAttente = conges.filter(c => c.statut === 'EN_ATTENTE').length
    const presentsAujourdhui = presences.filter(p => p.statut === 'PRESENT').length
    return { total, actifs, congesEnAttente, presentsAujourdhui }
  }, [employes, conges, presences])

  // Filtered conges
  const filteredConges = useMemo(() => {
    if (!congeSearch) return conges
    const s = congeSearch.toLowerCase()
    return conges.filter(c =>
      (c.type || '').toLowerCase().includes(s) ||
      (c.motif || '').toLowerCase().includes(s) ||
      (c.statut || '').toLowerCase().includes(s)
    )
  }, [conges, congeSearch])

  // Sort handler
  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  // Open add employe dialog
  function openAddEmploye() {
    setEditingEmploye(null)
    setEmployeForm({ nom: '', prenom: '', poste: '', telephone: '', email: '', typeContrat: 'CDI', salaireBrut: '', dateEmbauche: '' })
    setEmployeDialogOpen(true)
  }

  // Open edit employe dialog
  function openEditEmploye(employe: Employe) {
    setEditingEmploye(employe)
    setEmployeForm({
      nom: employe.nom,
      prenom: employe.prenom,
      poste: employe.poste,
      telephone: employe.telephone || '',
      email: employe.email || '',
      typeContrat: employe.typeContrat,
      salaireBrut: employe.salaireBrut.toString(),
      dateEmbauche: employe.dateEmbauche ? new Date(employe.dateEmbauche).toISOString().split('T')[0] : '',
    })
    setEmployeDialogOpen(true)
  }

  // Submit employe
  async function handleSubmitEmploye() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        nom: employeForm.nom,
        prenom: employeForm.prenom,
        poste: employeForm.poste,
        typeContrat: employeForm.typeContrat,
        salaireBrut: parseFloat(employeForm.salaireBrut) || 0,
        dateEmbauche: employeForm.dateEmbauche,
        actif: true,
      }
      if (employeForm.telephone) body.telephone = employeForm.telephone
      if (employeForm.email) body.email = employeForm.email

      const url = editingEmploye ? `/api/employes/${editingEmploye.id}` : '/api/employes'
      const method = editingEmploye ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingEmploye ? 'Employé modifié avec succès' : 'Employé ajouté avec succès')
        setEmployeDialogOpen(false)
        fetchEmployes()
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

  // Delete employe
  async function handleDeleteEmploye() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/employes/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Employé supprimé avec succès')
        setDeleteDialogOpen(false)
        setDeletingId(null)
        fetchEmployes()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  // Submit conge
  async function handleSubmitConge() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/conges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          type: congeForm.type,
          dateDebut: congeForm.dateDebut,
          dateFin: congeForm.dateFin,
          motif: congeForm.motif,
          statut: 'EN_ATTENTE',
        }),
      })
      if (res.ok) {
        toast.success('Demande de congé enregistrée')
        setCongeDialogOpen(false)
        setCongeForm({ type: 'ANNUEL', dateDebut: '', dateFin: '', motif: '' })
        fetchConges()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement du congé')
    } finally {
      setSubmitting(false)
    }
  }

  // Approve/Reject conge
  async function handleCongeAction(congeId: string, action: 'APPROUVE' | 'REFUSE') {
    try {
      const res = await fetch(`/api/conges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: congeId, statut: action }),
      })
      if (res.ok) {
        toast.success(action === 'APPROUVE' ? 'Congé approuvé' : 'Congé refusé')
        fetchConges()
      } else {
        toast.error('Erreur lors du traitement')
      }
    } catch {
      toast.error('Erreur lors du traitement du congé')
    }
  }

  // Check-in/out
  async function handleCheckIn() {
    if (!pharmacieId) return
    try {
      const res = await fetch('/api/presences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacieId, date: presenceDate, heureArrivee: new Date().toISOString(), statut: 'PRESENT' }),
      })
      if (res.ok) {
        toast.success('Pointage d\'arrivée enregistré')
        fetchPresences()
      } else {
        toast.error('Erreur lors du pointage')
      }
    } catch {
      toast.error('Erreur lors du pointage')
    }
  }

  async function handleCheckOut(presenceId: string) {
    try {
      const res = await fetch('/api/presences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: presenceId, heureDepart: new Date().toISOString() }),
      })
      if (res.ok) {
        toast.success('Pointage de départ enregistré')
        fetchPresences()
      } else {
        toast.error('Erreur lors du pointage')
      }
    } catch {
      toast.error('Erreur lors du pointage de départ')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Personnel</h1>
          <p className="text-muted-foreground text-sm">Gestion des ressources humaines — Employés, congés et présences</p>
        </div>
        <Button onClick={openAddEmploye} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Ajouter un employé
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total employés" value={stats.total} icon={Users} variant="default" />
        <KpiCard title="Actifs" value={stats.actifs} icon={Briefcase} variant="success" />
        <KpiCard title="Congés en attente" value={stats.congesEnAttente} icon={CalendarDays} variant="warning" />
        <KpiCard title="Présents aujourd&apos;hui" value={stats.presentsAujourdhui} icon={Clock} variant="success" />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employes" className="gap-2">
            <Users className="w-4 h-4" /> Employés
          </TabsTrigger>
          <TabsTrigger value="conges" className="gap-2">
            <CalendarDays className="w-4 h-4" /> Congés
          </TabsTrigger>
          <TabsTrigger value="presences" className="gap-2">
            <Clock className="w-4 h-4" /> Présences
          </TabsTrigger>
        </TabsList>

        {/* Employés Tab */}
        <TabsContent value="employes" className="space-y-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un employé..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={contratFilter} onValueChange={setContratFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type de contrat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les contrats</SelectItem>
                    {TYPES_CONTRAT.map(t => (
                      <SelectItem key={t} value={t}>{TYPES_CONTRAT_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : employes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun employé trouvé</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier employé pour commencer</p>
                  <Button onClick={openAddEmploye} className="mt-4 gap-2">
                    <Plus className="w-4 h-4" /> Ajouter un employé
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('nom')}>
                            <div className="flex items-center gap-1">Nom <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead>Prénom</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('poste')}>
                            <div className="flex items-center gap-1">Poste <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead>Contrat</TableHead>
                          <TableHead className="cursor-pointer" onClick={() => handleSort('salaireBrut')}>
                            <div className="flex items-center gap-1">Salaire <ArrowUpDown className="w-3 h-3" /></div>
                          </TableHead>
                          <TableHead>Date embauche</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employes.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.nom}</TableCell>
                            <TableCell>{emp.prenom}</TableCell>
                            <TableCell>{emp.poste}</TableCell>
                            <TableCell>{getContratBadge(emp.typeContrat)}</TableCell>
                            <TableCell>{formatFCFA(emp.salaireBrut)}</TableCell>
                            <TableCell>{formatDate(emp.dateEmbauche)}</TableCell>
                            <TableCell>
                              {emp.actif
                                ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Actif</Badge>
                                : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Inactif</Badge>
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditEmploye(emp)}>
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(emp.id); setDeleteDialogOpen(true) }}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  {/* Pagination */}
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      Page {page} sur {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Congés Tab */}
        <TabsContent value="conges" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher un congé..."
                    value={congeSearch}
                    onChange={e => setCongeSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={congeStatutFilter} onValueChange={setCongeStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les statuts</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="APPROUVE">Approuvé</SelectItem>
                    <SelectItem value="REFUSE">Refusé</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={() => setCongeDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Nouvelle demande
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {congesLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredConges.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <CalendarDays className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun congé trouvé</p>
                  <p className="text-sm text-muted-foreground mt-1">Créez une nouvelle demande de congé</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Date début</TableHead>
                        <TableHead>Date fin</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredConges.map(c => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{TYPES_CONGE_LABELS[c.type] || c.type}</Badge>
                          </TableCell>
                          <TableCell>{formatDate(c.dateDebut)}</TableCell>
                          <TableCell>{formatDate(c.dateFin)}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{c.motif || '—'}</TableCell>
                          <TableCell>{getCongeStatutBadge(c.statut)}</TableCell>
                          <TableCell className="text-right">
                            {c.statut === 'EN_ATTENTE' && (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleCongeAction(c.id, 'APPROUVE')}>
                                  <CheckCircle2 className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleCongeAction(c.id, 'REFUSE')}>
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Présences Tab */}
        <TabsContent value="presences" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="flex items-center gap-2">
                  <Label htmlFor="presence-date" className="text-sm font-medium whitespace-nowrap">Date :</Label>
                  <Input
                    id="presence-date"
                    type="date"
                    value={presenceDate}
                    onChange={e => setPresenceDate(e.target.value)}
                    className="w-48"
                  />
                </div>
                <div className="flex gap-2 ml-auto">
                  <Button onClick={handleCheckIn} className="gap-2">
                    <LogIn className="w-4 h-4" /> Pointer arrivée
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {presencesLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : presences.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune présence enregistrée</p>
                  <p className="text-sm text-muted-foreground mt-1">Pour la date sélectionnée</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Heure arrivée</TableHead>
                        <TableHead>Heure départ</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {presences.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{formatDate(p.date)}</TableCell>
                          <TableCell>{formatDateTime(p.heureArrivee)}</TableCell>
                          <TableCell>{formatDateTime(p.heureDepart)}</TableCell>
                          <TableCell>{getPresenceStatutBadge(p.statut)}</TableCell>
                          <TableCell className="text-right">
                            {!p.heureDepart && p.statut === 'PRESENT' && (
                              <Button variant="outline" size="sm" className="gap-1" onClick={() => handleCheckOut(p.id)}>
                                <LogOut className="w-3 h-3" /> Pointer départ
                              </Button>
                            )}
                          </TableCell>
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

      {/* Add/Edit Employe Dialog */}
      <Dialog open={employeDialogOpen} onOpenChange={setEmployeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingEmploye ? 'Modifier l\'employé' : 'Ajouter un employé'}</DialogTitle>
            <DialogDescription>
              {editingEmploye ? 'Modifiez les informations de l\'employé' : 'Remplissez les informations du nouvel employé'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-nom">Nom *</Label>
                <Input id="emp-nom" value={employeForm.nom} onChange={e => setEmployeForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom de famille" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-prenom">Prénom *</Label>
                <Input id="emp-prenom" value={employeForm.prenom} onChange={e => setEmployeForm(f => ({ ...f, prenom: e.target.value }))} placeholder="Prénom" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-poste">Poste *</Label>
              <Input id="emp-poste" value={employeForm.poste} onChange={e => setEmployeForm(f => ({ ...f, poste: e.target.value }))} placeholder="Ex: Pharmacien, Caissier..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-telephone">Téléphone</Label>
                <Input id="emp-telephone" value={employeForm.telephone} onChange={e => setEmployeForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+229 90 00 00 00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-email">Email</Label>
                <Input id="emp-email" type="email" value={employeForm.email} onChange={e => setEmployeForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemple.com" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emp-contrat">Type de contrat *</Label>
                <Select value={employeForm.typeContrat} onValueChange={v => setEmployeForm(f => ({ ...f, typeContrat: v }))}>
                  <SelectTrigger id="emp-contrat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_CONTRAT.map(t => (
                      <SelectItem key={t} value={t}>{TYPES_CONTRAT_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emp-salaire">Salaire brut (FCFA)</Label>
                <Input id="emp-salaire" type="number" value={employeForm.salaireBrut} onChange={e => setEmployeForm(f => ({ ...f, salaireBrut: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-date-embauche">Date d&apos;embauche *</Label>
              <Input id="emp-date-embauche" type="date" value={employeForm.dateEmbauche} onChange={e => setEmployeForm(f => ({ ...f, dateEmbauche: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEmploye} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingEmploye ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conge Dialog */}
      <Dialog open={congeDialogOpen} onOpenChange={setCongeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle demande de congé</DialogTitle>
            <DialogDescription>Remplissez les informations de la demande</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="conge-type">Type de congé</Label>
              <Select value={congeForm.type} onValueChange={v => setCongeForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="conge-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_CONGE.map(t => (
                    <SelectItem key={t} value={t}>{TYPES_CONGE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="conge-debut">Date début *</Label>
                <Input id="conge-debut" type="date" value={congeForm.dateDebut} onChange={e => setCongeForm(f => ({ ...f, dateDebut: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conge-fin">Date fin *</Label>
                <Input id="conge-fin" type="date" value={congeForm.dateFin} onChange={e => setCongeForm(f => ({ ...f, dateFin: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="conge-motif">Motif</Label>
              <Textarea id="conge-motif" value={congeForm.motif} onChange={e => setCongeForm(f => ({ ...f, motif: e.target.value }))} placeholder="Raison du congé..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCongeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitConge} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer cet employé ? Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteEmploye}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
