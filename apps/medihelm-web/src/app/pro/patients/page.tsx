'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  Switch,
} from '@/components/ui/switch'
import {
  Textarea,
} from '@/components/ui/textarea'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Users, UserPlus, Phone, Mail, Shield, CreditCard, Search, Filter,
  Plus, Eye, Edit, ArrowUpDown, ChevronLeft, ChevronRight, X,
  Calendar, MapPin, FileText, Syringe, ShoppingCart, Activity,
  CheckCircle2, XCircle, AlertTriangle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { KpiCard } from '@/components/pro/kpi-card'

// ============================================================
// Types
// ============================================================

interface Patient {
  id: string
  pharmacieId: string
  nom: string
  prenom: string
  telephone: string
  email: string | null
  dateNaissance: string | null
  sexe: string | null
  numeroAssurance: string | null
  assurance: string | null
  adresse: string | null
  notes: string | null
  creditAutorise: boolean
  creditLimite: number
  actif: boolean
  createdAt: string
  updatedAt: string
  _count?: { ventes: number; ordonnances: number; vaccinations: number }
  creditUtilise?: number
}

interface PatientDetail extends Patient {
  ventes: {
    id: string
    reference: string
    montantTotal: number
    montantPaye: number
    modePaiement: string
    statut: string
    createdAt: string
  }[]
  ordonnances: {
    id: string
    prescripteur: string
    dateOrdonnance: string
    statut: string
    notes: string | null
    lignes: {
      medicament: { nomCommercial: string; dci: string } | null
    }[]
  }[]
  vaccinations: {
    id: string
    vaccin: string
    dateVaccin: string
    lot: string | null
    prochaineDose: string | null
  }[]
}

interface PatientsResponse {
  patients: Patient[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats: {
    totalActifs: number
    patientsAvecAssurance: number
    creditsEnCours: number
    nouveauxMois: number
  }
}

// ============================================================
// Helpers
// ============================================================

function formatFCFA(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateLong(date: string): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

const ASSURANCE_LABELS: Record<string, string> = {
  CNSS: 'CNSS',
  RAMU: 'RAMU',
  ASSURANCE_PRIVEE: 'Assurance privée',
}

const ASSURANCE_COLORS: Record<string, string> = {
  CNSS: 'bg-blue-100 text-blue-800 border-blue-200',
  RAMU: 'bg-green-100 text-green-800 border-green-200',
  ASSURANCE_PRIVEE: 'bg-purple-100 text-purple-800 border-purple-200',
}

const SEXE_LABELS: Record<string, string> = {
  M: 'Masculin',
  F: 'Féminin',
}

const MODE_PAIEMENT_LABELS: Record<string, string> = {
  ESPECES: 'Espèces',
  WAVE: 'Wave',
  MTN_MONEY: 'MTN Money',
  MOOV_MONEY: 'Moov Money',
  CARTE_BANCAIRE: 'Carte bancaire',
  CHEQUE: 'Chèque',
  CREDIT: 'Crédit',
  ASSURANCE: 'Assurance',
}

const STATUT_VENTE_LABELS: Record<string, string> = {
  BROUILLON: 'Brouillon',
  EN_COURS: 'En cours',
  VALIDEE: 'Validée',
  ANNULEE: 'Annulée',
  REMBOURSEE: 'Remboursée',
}

const STATUT_ORDONNANCE_LABELS: Record<string, string> = {
  RECUE: 'Reçue',
  EN_VERIFICATION: 'En vérification',
  VALIDEE: 'Validée',
  PARTIELLEMENT_DELIVREE: 'Partiellement délivrée',
  DELIVREE: 'Délivrée',
  REFUSEE: 'Refusée',
}

const EMPTY_STATS = {
  totalActifs: 0,
  patientsAvecAssurance: 0,
  creditsEnCours: 0,
  nouveauxMois: 0,
}

// ============================================================
// Main Component
// ============================================================

export default function PatientsPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id || ''

  // --- State ---
  const [patients, setPatients] = useState<Patient[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState(EMPTY_STATS)
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [actifFilter, setActifFilter] = useState<string>('all')
  const [assuranceFilter, setAssuranceFilter] = useState<string>('all')
  const [creditFilter, setCreditFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('nom')
  const [sortOrder, setSortOrder] = useState<string>('asc')
  const [page, setPage] = useState(1)
  const limit = 20

  // Dialogs
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [showCreditDialog, setShowCreditDialog] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<PatientDetail | null>(null)
  const [editPatient, setEditPatient] = useState<Patient | null>(null)
  const [creditPatient, setCreditPatient] = useState<Patient | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Form state
  const emptyForm = {
    nom: '', prenom: '', telephone: '', email: '', dateNaissance: '',
    sexe: '', numeroAssurance: '', assurance: 'none', adresse: '', notes: '',
    creditAutorise: false, creditLimite: 0,
  }
  const [form, setForm] = useState(emptyForm)

  // --- Fetch patients ---
  const fetchPatients = useCallback(async () => {
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
      if (actifFilter !== 'all') params.set('actif', actifFilter)
      if (assuranceFilter !== 'all') params.set('assurance', assuranceFilter)
      if (creditFilter !== 'all') params.set('creditStatus', creditFilter)

      const res = await fetch(`/api/patients?${params}`)
      if (!res.ok) throw new Error()
      const data: PatientsResponse = await res.json()
      setPatients(data.patients)
      setTotal(data.total)
      setTotalPages(data.totalPages)
      setStats(data.stats)
    } catch {
      toast.error('Erreur lors du chargement des patients')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, sortBy, sortOrder, search, actifFilter, assuranceFilter, creditFilter])

  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [search, actifFilter, assuranceFilter, creditFilter, sortBy, sortOrder])

  // --- Fetch patient detail ---
  const fetchPatientDetail = async (patientId: string) => {
    if (!pharmacieId) return
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/patients/${patientId}?pharmacieId=${pharmacieId}`)
      if (!res.ok) throw new Error()
      const data: PatientDetail = await res.json()
      setSelectedPatient(data)
    } catch {
      toast.error('Erreur lors du chargement du patient')
    } finally {
      setDetailLoading(false)
    }
  }

  // --- Save patient (add/edit) ---
  const handleSavePatient = async (isEdit: boolean) => {
    if (!pharmacieId || !form.nom || !form.prenom) {
      toast.error('Nom et prénom sont requis')
      return
    }
    setSaving(true)
    try {
      const payload = {
        pharmacieId,
        nom: form.nom,
        prenom: form.prenom,
        telephone: form.telephone,
        email: form.email || null,
        dateNaissance: form.dateNaissance || null,
        sexe: form.sexe || null,
        numeroAssurance: form.numeroAssurance || null,
        assurance: form.assurance === 'none' ? null : form.assurance,
        adresse: form.adresse || null,
        notes: form.notes || null,
        creditAutorise: form.creditAutorise,
        creditLimite: form.creditAutorise ? form.creditLimite : 0,
      }

      if (isEdit && editPatient) {
        const res = await fetch(`/api/patients/${editPatient.id}?pharmacieId=${pharmacieId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('Patient mis à jour avec succès')
        setShowEditDialog(false)
      } else {
        const res = await fetch('/api/patients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error()
        toast.success('Patient créé avec succès')
        setShowAddDialog(false)
      }
      setForm(emptyForm)
      setEditPatient(null)
      fetchPatients()
    } catch {
      toast.error(isEdit ? 'Erreur lors de la mise à jour' : 'Erreur lors de la création')
    } finally {
      setSaving(false)
    }
  }

  // --- Toggle credit ---
  const handleSaveCredit = async () => {
    if (!pharmacieId || !creditPatient) return
    setSaving(true)
    try {
      const res = await fetch(`/api/patients/${creditPatient.id}?pharmacieId=${pharmacieId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          creditAutorise: creditPatient.creditAutorise,
          creditLimite: creditPatient.creditLimite,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Crédit mis à jour')
      setShowCreditDialog(false)
      setCreditPatient(null)
      fetchPatients()
    } catch {
      toast.error('Erreur lors de la mise à jour du crédit')
    } finally {
      setSaving(false)
    }
  }

  // --- Toggle active ---
  const handleToggleActive = async (patient: Patient) => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/patients/${patient.id}?pharmacieId=${pharmacieId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          actif: !patient.actif,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success(patient.actif ? 'Patient désactivé' : 'Patient réactivé')
      fetchPatients()
    } catch {
      toast.error('Erreur lors du changement de statut')
    }
  }

  // --- Open edit dialog ---
  const openEdit = (patient: Patient) => {
    setEditPatient(patient)
    setForm({
      nom: patient.nom,
      prenom: patient.prenom,
      telephone: patient.telephone,
      email: patient.email || '',
      dateNaissance: patient.dateNaissance
        ? new Date(patient.dateNaissance).toISOString().split('T')[0]
        : '',
      sexe: patient.sexe || '',
      numeroAssurance: patient.numeroAssurance || '',
      assurance: patient.assurance || 'none',
      adresse: patient.adresse || '',
      notes: patient.notes || '',
      creditAutorise: patient.creditAutorise,
      creditLimite: patient.creditLimite,
    })
    setShowEditDialog(true)
  }

  // --- Open detail dialog ---
  const openDetail = (patient: Patient) => {
    fetchPatientDetail(patient.id)
    setShowDetailDialog(true)
  }

  // --- Sort toggle ---
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  // --- Memoized filtered check ---
  const hasActiveFilters = useMemo(() => {
    return search !== '' || actifFilter !== 'all' || assuranceFilter !== 'all' || creditFilter !== 'all'
  }, [search, actifFilter, assuranceFilter, creditFilter])

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
          <p className="text-sm text-muted-foreground">
            Gérez vos patients, leurs informations et crédits
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm)
            setShowAddDialog(true)
          }}
          className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Nouveau patient
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Patients actifs"
          value={stats.totalActifs}
          icon={Users}
          variant="success"
        />
        <KpiCard
          title="Avec assurance"
          value={stats.patientsAvecAssurance}
          icon={Shield}
          variant="default"
        />
        <KpiCard
          title="Crédits en cours"
          value={formatFCFA(stats.creditsEnCours)}
          icon={CreditCard}
          variant="warning"
        />
        <KpiCard
          title="Nouveaux ce mois"
          value={stats.nouveauxMois}
          icon={Activity}
          variant="default"
        />
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, téléphone, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={actifFilter} onValueChange={setActifFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="true">Actif</SelectItem>
                  <SelectItem value="false">Inactif</SelectItem>
                </SelectContent>
              </Select>

              <Select value={assuranceFilter} onValueChange={setAssuranceFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Assurance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes assurances</SelectItem>
                  <SelectItem value="CNSS">CNSS</SelectItem>
                  <SelectItem value="RAMU">RAMU</SelectItem>
                  <SelectItem value="ASSURANCE_PRIVEE">Assurance privée</SelectItem>
                </SelectContent>
              </Select>

              <Select value={creditFilter} onValueChange={setCreditFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Crédit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous crédits</SelectItem>
                  <SelectItem value="autorise">Crédit autorisé</SelectItem>
                  <SelectItem value="non_autorise">Sans crédit</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setActifFilter('all')
                    setAssuranceFilter('all')
                    setCreditFilter('all')
                  }}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="w-3 h-3" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun patient trouvé</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                {hasActiveFilters
                  ? 'Essayez de modifier vos filtres de recherche'
                  : 'Ajoutez votre premier patient pour commencer'}
              </p>
              {!hasActiveFilters && (
                <Button
                  onClick={() => {
                    setForm(emptyForm)
                    setShowAddDialog(true)
                  }}
                  className="mt-4 bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Ajouter un patient
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[220px]">
                        <button
                          onClick={() => handleSort('nom')}
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          Nom complet
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Téléphone</TableHead>
                      <TableHead className="hidden lg:table-cell">Email</TableHead>
                      <TableHead>Assurance</TableHead>
                      <TableHead className="hidden md:table-cell">Crédit autorisé</TableHead>
                      <TableHead className="hidden lg:table-cell">Limite crédit</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {patients.map((patient) => (
                      <TableRow
                        key={patient.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetail(patient)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] font-semibold text-sm shrink-0">
                              {patient.prenom[0]}{patient.nom[0]}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium truncate">
                                {patient.prenom} {patient.nom}
                              </p>
                              <p className="text-xs text-muted-foreground md:hidden">
                                {patient.telephone}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="flex items-center gap-1.5 text-sm">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                            {patient.telephone}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {patient.email ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                              {patient.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {patient.assurance ? (
                            <Badge
                              variant="outline"
                              className={ASSURANCE_COLORS[patient.assurance] || 'bg-gray-100 text-gray-800'}
                            >
                              {ASSURANCE_LABELS[patient.assurance] || patient.assurance}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Aucune</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {patient.creditAutorise ? (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200" variant="outline">
                              <CreditCard className="w-3 h-3 mr-1" />
                              Oui
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">Non</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">
                          {patient.creditAutorise ? formatFCFA(patient.creditLimite) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              patient.actif
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-red-50 text-red-700 border-red-200'
                            }
                          >
                            {patient.actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openDetail(patient)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Voir les détails</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openEdit(patient)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Modifier</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => {
                                      setCreditPatient(patient)
                                      setShowCreditDialog(true)
                                    }}
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Gérer le crédit</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  {total} patient{total !== 1 ? 's' : ''} au total
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ============================================================ */}
      {/* Add Patient Dialog */}
      {/* ============================================================ */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-[#1D9E75]" />
              Nouveau patient
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid gap-4 py-4">
              {/* Personal Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="add-nom">Nom *</Label>
                    <Input
                      id="add-nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      placeholder="Nom de famille"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-prenom">Prénom *</Label>
                    <Input
                      id="add-prenom"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                      placeholder="Prénom"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-telephone">Téléphone</Label>
                    <Input
                      id="add-telephone"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                      placeholder="+229 90 00 00 00"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-email">Email</Label>
                    <Input
                      id="add-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-dateNaissance">Date de naissance</Label>
                    <Input
                      id="add-dateNaissance"
                      type="date"
                      value={form.dateNaissance}
                      onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-sexe">Sexe</Label>
                    <Select value={form.sexe} onValueChange={(v) => setForm({ ...form, sexe: v })}>
                      <SelectTrigger id="add-sexe">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="add-adresse">Adresse</Label>
                  <Input
                    id="add-adresse"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                    placeholder="Adresse du patient"
                  />
                </div>
              </div>

              <Separator />

              {/* Insurance Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Assurance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="add-assurance">Type d&apos;assurance</Label>
                    <Select value={form.assurance} onValueChange={(v) => setForm({ ...form, assurance: v })}>
                      <SelectTrigger id="add-assurance">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="CNSS">CNSS</SelectItem>
                        <SelectItem value="RAMU">RAMU</SelectItem>
                        <SelectItem value="ASSURANCE_PRIVEE">Assurance privée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="add-numeroAssurance">N° assurance</Label>
                    <Input
                      id="add-numeroAssurance"
                      value={form.numeroAssurance}
                      onChange={(e) => setForm({ ...form, numeroAssurance: e.target.value })}
                      placeholder="Numéro d'assurance"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credit Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Crédit
                </h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.creditAutorise}
                    onCheckedChange={(v) => setForm({ ...form, creditAutorise: v })}
                  />
                  <Label>Autoriser le crédit</Label>
                </div>
                {form.creditAutorise && (
                  <div className="space-y-1">
                    <Label htmlFor="add-creditLimite">Limite de crédit (FCFA)</Label>
                    <Input
                      id="add-creditLimite"
                      type="number"
                      value={form.creditLimite}
                      onChange={(e) => setForm({ ...form, creditLimite: parseFloat(e.target.value) || 0 })}
                      placeholder="0"
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="add-notes">Notes</Label>
                <Textarea
                  id="add-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Notes sur le patient..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => handleSavePatient(false)}
              disabled={saving || !form.nom || !form.prenom}
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Créer le patient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Edit Patient Dialog */}
      {/* ============================================================ */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#1D9E75]" />
              Modifier le patient
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="grid gap-4 py-4">
              {/* Personal Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-nom">Nom *</Label>
                    <Input
                      id="edit-nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-prenom">Prénom *</Label>
                    <Input
                      id="edit-prenom"
                      value={form.prenom}
                      onChange={(e) => setForm({ ...form, prenom: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-telephone">Téléphone</Label>
                    <Input
                      id="edit-telephone"
                      value={form.telephone}
                      onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-email">Email</Label>
                    <Input
                      id="edit-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-dateNaissance">Date de naissance</Label>
                    <Input
                      id="edit-dateNaissance"
                      type="date"
                      value={form.dateNaissance}
                      onChange={(e) => setForm({ ...form, dateNaissance: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-sexe">Sexe</Label>
                    <Select value={form.sexe} onValueChange={(v) => setForm({ ...form, sexe: v })}>
                      <SelectTrigger id="edit-sexe">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">Masculin</SelectItem>
                        <SelectItem value="F">Féminin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-adresse">Adresse</Label>
                  <Input
                    id="edit-adresse"
                    value={form.adresse}
                    onChange={(e) => setForm({ ...form, adresse: e.target.value })}
                  />
                </div>
              </div>

              <Separator />

              {/* Insurance Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Assurance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-assurance">Type d&apos;assurance</Label>
                    <Select value={form.assurance} onValueChange={(v) => setForm({ ...form, assurance: v })}>
                      <SelectTrigger id="edit-assurance">
                        <SelectValue placeholder="Sélectionner" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Aucune</SelectItem>
                        <SelectItem value="CNSS">CNSS</SelectItem>
                        <SelectItem value="RAMU">RAMU</SelectItem>
                        <SelectItem value="ASSURANCE_PRIVEE">Assurance privée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-numeroAssurance">N° assurance</Label>
                    <Input
                      id="edit-numeroAssurance"
                      value={form.numeroAssurance}
                      onChange={(e) => setForm({ ...form, numeroAssurance: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credit Info */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Crédit
                </h3>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={form.creditAutorise}
                    onCheckedChange={(v) => setForm({ ...form, creditAutorise: v })}
                  />
                  <Label>Autoriser le crédit</Label>
                </div>
                {form.creditAutorise && (
                  <div className="space-y-1">
                    <Label htmlFor="edit-creditLimite">Limite de crédit (FCFA)</Label>
                    <Input
                      id="edit-creditLimite"
                      type="number"
                      value={form.creditLimite}
                      onChange={(e) => setForm({ ...form, creditLimite: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                )}
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => handleSavePatient(true)}
              disabled={saving || !form.nom || !form.prenom}
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Patient Detail Dialog */}
      {/* ============================================================ */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-[#1D9E75]" />
              Détails du patient
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : selectedPatient ? (
            <ScrollArea className="max-h-[70vh] pr-4">
              <div className="space-y-6">
                {/* Header info */}
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] font-bold text-xl shrink-0">
                    {selectedPatient.prenom[0]}{selectedPatient.nom[0]}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold">
                      {selectedPatient.prenom} {selectedPatient.nom}
                    </h2>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={
                          selectedPatient.actif
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }
                      >
                        {selectedPatient.actif ? 'Actif' : 'Inactif'}
                      </Badge>
                      {selectedPatient.assurance && (
                        <Badge
                          variant="outline"
                          className={ASSURANCE_COLORS[selectedPatient.assurance] || ''}
                        >
                          {ASSURANCE_LABELS[selectedPatient.assurance] || selectedPatient.assurance}
                        </Badge>
                      )}
                      {selectedPatient.creditAutorise && (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                          Crédit autorisé
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowDetailDialog(false)
                        openEdit(selectedPatient)
                      }}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(selectedPatient)}
                    >
                      {selectedPatient.actif ? (
                        <><XCircle className="w-4 h-4 mr-1" /> Désactiver</>
                      ) : (
                        <><CheckCircle2 className="w-4 h-4 mr-1" /> Réactiver</>
                      )}
                    </Button>
                  </div>
                </div>

                <Separator />

                {/* Tabs */}
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="info" className="text-xs sm:text-sm">Informations</TabsTrigger>
                    <TabsTrigger value="ventes" className="text-xs sm:text-sm">
                      Achats ({selectedPatient.ventes?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="ordonnances" className="text-xs sm:text-sm">
                      Ordonnances ({selectedPatient.ordonnances?.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="vaccinations" className="text-xs sm:text-sm">
                      Vaccinations ({selectedPatient.vaccinations?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Info Tab */}
                  <TabsContent value="info" className="mt-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Personal */}
                      <Card>
                        <CardContent className="p-4 space-y-3">
                          <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Informations personnelles
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nom complet</span>
                              <span className="font-medium">{selectedPatient.prenom} {selectedPatient.nom}</span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Téléphone</span>
                              <span className="font-medium flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {selectedPatient.telephone}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Email</span>
                              <span className="font-medium">
                                {selectedPatient.email || '—'}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Date de naissance</span>
                              <span className="font-medium flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {formatDate(selectedPatient.dateNaissance)}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Sexe</span>
                              <span className="font-medium">
                                {selectedPatient.sexe ? SEXE_LABELS[selectedPatient.sexe] || selectedPatient.sexe : '—'}
                              </span>
                            </div>
                            <Separator />
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Adresse</span>
                              <span className="font-medium text-right max-w-[60%] flex items-center gap-1 justify-end">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {selectedPatient.adresse || '—'}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Insurance + Credit */}
                      <div className="space-y-4">
                        <Card>
                          <CardContent className="p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              Assurance
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Assureur</span>
                                <span className="font-medium">
                                  {selectedPatient.assurance
                                    ? ASSURANCE_LABELS[selectedPatient.assurance] || selectedPatient.assurance
                                    : 'Aucune'}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">N° assurance</span>
                                <span className="font-medium">{selectedPatient.numeroAssurance || '—'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4 space-y-3">
                            <h4 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                              <CreditCard className="w-4 h-4" />
                              Crédit
                            </h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Crédit autorisé</span>
                                <span className="font-medium">
                                  {selectedPatient.creditAutorise ? (
                                    <Badge className="bg-green-50 text-green-700 border-green-200" variant="outline">Oui</Badge>
                                  ) : (
                                    <Badge className="bg-red-50 text-red-700 border-red-200" variant="outline">Non</Badge>
                                  )}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Limite de crédit</span>
                                <span className="font-medium">
                                  {selectedPatient.creditAutorise ? formatFCFA(selectedPatient.creditLimite) : '—'}
                                </span>
                              </div>
                              <Separator />
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Solde utilisé</span>
                                <span className="font-medium text-amber-600">
                                  {selectedPatient.creditUtilise ? formatFCFA(selectedPatient.creditUtilise) : '0 FCFA'}
                                </span>
                              </div>
                              {selectedPatient.creditAutorise && selectedPatient.creditUtilise !== undefined && (
                                <>
                                  <Separator />
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Disponible</span>
                                    <span className="font-medium text-[#1D9E75]">
                                      {formatFCFA(selectedPatient.creditLimite - selectedPatient.creditUtilise)}
                                    </span>
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Notes */}
                    {selectedPatient.notes && (
                      <Card>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-semibold text-muted-foreground mb-2">Notes</h4>
                          <p className="text-sm whitespace-pre-wrap">{selectedPatient.notes}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  {/* Ventes Tab */}
                  <TabsContent value="ventes" className="mt-4">
                    {selectedPatient.ventes && selectedPatient.ventes.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.ventes.map((vente) => (
                          <Card key={vente.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#1D9E75]/10 text-[#1D9E75]">
                                    <ShoppingCart className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{vente.reference}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateLong(vente.createdAt)} · {MODE_PAIEMENT_LABELS[vente.modePaiement] || vente.modePaiement}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold">{formatFCFA(vente.montantTotal)}</p>
                                  <Badge
                                    variant="outline"
                                    className={
                                      vente.statut === 'VALIDEE'
                                        ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                                        : vente.statut === 'ANNULEE'
                                        ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                                        : 'bg-gray-50 text-gray-700 border-gray-200 text-xs'
                                    }
                                  >
                                    {STATUT_VENTE_LABELS[vente.statut] || vente.statut}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <ShoppingCart className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Aucun achat enregistré</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Ordonnances Tab */}
                  <TabsContent value="ordonnances" className="mt-4">
                    {selectedPatient.ordonnances && selectedPatient.ordonnances.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.ordonnances.map((ordo) => (
                          <Card key={ordo.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-100 text-blue-700">
                                    <FileText className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">
                                      Dr. {ordo.prescripteur}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDate(ordo.dateOrdonnance)}
                                      {ordo.lignes && ordo.lignes.length > 0 && (
                                        <> · {ordo.lignes.length} médicament{ordo.lignes.length > 1 ? 's' : ''}</>
                                      )}
                                    </p>
                                    {ordo.notes && (
                                      <p className="text-xs text-muted-foreground mt-0.5">{ordo.notes}</p>
                                    )}
                                  </div>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={
                                    ordo.statut === 'DELIVREE'
                                      ? 'bg-green-50 text-green-700 border-green-200 text-xs'
                                      : ordo.statut === 'REFUSEE'
                                      ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                                      : 'bg-blue-50 text-blue-700 border-blue-200 text-xs'
                                  }
                                >
                                  {STATUT_ORDONNANCE_LABELS[ordo.statut] || ordo.statut}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Aucune ordonnance enregistrée</p>
                      </div>
                    )}
                  </TabsContent>

                  {/* Vaccinations Tab */}
                  <TabsContent value="vaccinations" className="mt-4">
                    {selectedPatient.vaccinations && selectedPatient.vaccinations.length > 0 ? (
                      <div className="space-y-2">
                        {selectedPatient.vaccinations.map((vacc) => (
                          <Card key={vacc.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-700">
                                    <Syringe className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{vacc.vaccin}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatDateLong(vacc.dateVaccin)}
                                      {vacc.lot && <> · Lot : {vacc.lot}</>}
                                    </p>
                                  </div>
                                </div>
                                {vacc.prochaineDose && (
                                  <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Prochaine dose</p>
                                    <p className="text-xs font-medium text-amber-600">
                                      {formatDate(vacc.prochaineDose)}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10">
                        <Syringe className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Aucune vaccination enregistrée</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* ============================================================ */}
      {/* Credit Management Dialog */}
      {/* ============================================================ */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-[#1D9E75]" />
              Gestion du crédit
            </DialogTitle>
          </DialogHeader>
          {creditPatient && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#1D9E75]/10 text-[#1D9E75] font-semibold">
                  {creditPatient.prenom[0]}{creditPatient.nom[0]}
                </div>
                <div>
                  <p className="font-medium">{creditPatient.prenom} {creditPatient.nom}</p>
                  <p className="text-xs text-muted-foreground">{creditPatient.telephone}</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Autoriser le crédit</Label>
                  <p className="text-xs text-muted-foreground">
                    Permet au patient d&apos;acheter à crédit
                  </p>
                </div>
                <Switch
                  checked={creditPatient.creditAutorise}
                  onCheckedChange={(v) =>
                    setCreditPatient({ ...creditPatient, creditAutorise: v })
                  }
                />
              </div>

              {creditPatient.creditAutorise && (
                <div className="space-y-1">
                  <Label htmlFor="credit-limite">Limite de crédit (FCFA)</Label>
                  <Input
                    id="credit-limite"
                    type="number"
                    value={creditPatient.creditLimite}
                    onChange={(e) =>
                      setCreditPatient({
                        ...creditPatient,
                        creditLimite: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                  {creditPatient.creditLimite > 0 && (
                    <div className="flex items-center gap-2 mt-2 p-2 bg-amber-50 rounded-md border border-amber-200">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Le patient pourra accumuler jusqu&apos;à {formatFCFA(creditPatient.creditLimite)} de crédit
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleSaveCredit}
              disabled={saving}
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
