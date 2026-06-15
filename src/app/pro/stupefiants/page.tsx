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
  ShieldAlert,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  ClipboardCheck,
  Scale,
  BookOpen,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface StupEntry {
  id: string
  pharmacieId: string
  medicamentNom: string
  dci: string
  type: 'ENTREE' | 'SORTIE'
  quantite: number
  lotNumero: string | null
  ordonnanceRef: string | null
  patientNom: string | null
  prescripteur: string | null
  pharmacienNom: string | null
  motif: string | null
  dateOperation: string
  createdAt: string
}

interface ComplianceCheck {
  id: string
  categorie: string
  description: string
  statut: 'CONFORME' | 'NON_CONFORME' | 'EN_COURS'
  details: string | null
}

// === Helpers ===

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'ENTREE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><ArrowUpRight className="w-3 h-3" /> Entrée</Badge>
    case 'SORTIE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><ArrowDownRight className="w-3 h-3" /> Sortie</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

function getComplianceBadge(statut: string) {
  switch (statut) {
    case 'CONFORME':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Conforme</Badge>
    case 'NON_CONFORME':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><AlertTriangle className="w-3 h-3" /> Non conforme</Badge>
    case 'EN_COURS':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs gap-1"><Loader2 className="w-3 h-3 animate-spin" /> En cours</Badge>
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
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function StupefiantsPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('registre')

  const [entries, setEntries] = useState<StupEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Compliance
  const [compliance, setCompliance] = useState<ComplianceCheck[]>([])
  const [complianceLoading, setComplianceLoading] = useState(true)

  // Dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [entryForm, setEntryForm] = useState({
    medicamentNom: '',
    dci: '',
    type: 'ENTREE' as 'ENTREE' | 'SORTIE',
    quantite: '',
    lotNumero: '',
    ordonnanceRef: '',
    patientNom: '',
    prescripteur: '',
    pharmacienNom: '',
    motif: '',
  })

  const fetchEntries = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: page.toString(), pageSize: '10' })
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/stupefiants?${params}`)
      if (res.ok) {
        const json = await res.json()
        setEntries(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement du registre')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, search, typeFilter])

  const fetchCompliance = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/stupefiants?pharmacieId=${pharmacieId}&compliance=true`)
      if (res.ok) {
        const json = await res.json()
        setCompliance(json.compliance || [])
      }
    } catch {
      setCompliance([])
    } finally {
      setComplianceLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchEntries() }, [fetchEntries])
  useEffect(() => { fetchCompliance() }, [fetchCompliance])
  useEffect(() => { setPage(1) }, [search, typeFilter])

  const stats = useMemo(() => ({
    total: entries.length,
    entrees: entries.filter(e => e.type === 'ENTREE').length,
    sorties: entries.filter(e => e.type === 'SORTIE').length,
    conformes: compliance.filter(c => c.statut === 'CONFORME').length,
    nonConformes: compliance.filter(c => c.statut === 'NON_CONFORME').length,
  }), [entries, compliance])

  async function handleSubmitEntry() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        medicamentNom: entryForm.medicamentNom,
        dci: entryForm.dci,
        type: entryForm.type,
        quantite: parseInt(entryForm.quantite) || 0,
        dateOperation: new Date().toISOString(),
      }
      if (entryForm.lotNumero) body.lotNumero = entryForm.lotNumero
      if (entryForm.ordonnanceRef) body.ordonnanceRef = entryForm.ordonnanceRef
      if (entryForm.patientNom) body.patientNom = entryForm.patientNom
      if (entryForm.prescripteur) body.prescripteur = entryForm.prescripteur
      if (entryForm.pharmacienNom) body.pharmacienNom = entryForm.pharmacienNom
      if (entryForm.motif) body.motif = entryForm.motif

      const res = await fetch('/api/stupefiants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Entrée enregistrée dans le registre')
        setEntryDialogOpen(false)
        setEntryForm({ medicamentNom: '', dci: '', type: 'ENTREE', quantite: '', lotNumero: '', ordonnanceRef: '', patientNom: '', prescripteur: '', pharmacienNom: '', motif: '' })
        fetchEntries()
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

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Stupéfiants</h1>
          <p className="text-muted-foreground text-sm">Registre des stupéfiants et conformité réglementaire</p>
        </div>
        <Button onClick={() => setEntryDialogOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Nouvelle entrée
        </Button>
      </div>

      {/* Warning banner */}
      <Card className="border-red-200 bg-red-50/50">
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800 font-medium">
              Registre réglementaire — Toute entrée dans ce registre est soumise au contrôle de la DPMED et doit être tenue à jour en permanence.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total entrées" value={stats.total} icon={BookOpen} variant="default" />
        <KpiCard title="Entrées" value={stats.entrees} icon={ArrowUpRight} variant="success" />
        <KpiCard title="Sorties" value={stats.sorties} icon={ArrowDownRight} variant="danger" />
        <KpiCard title="Non conformités" value={stats.nonConformes} icon={AlertTriangle} variant="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="registre" className="gap-2"><BookOpen className="w-4 h-4" /> Registre</TabsTrigger>
          <TabsTrigger value="conformite" className="gap-2"><ClipboardCheck className="w-4 h-4" /> Conformité</TabsTrigger>
        </TabsList>

        {/* Registre Tab */}
        <TabsContent value="registre" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher dans le registre..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="ENTREE">Entrées</SelectItem>
                    <SelectItem value="SORTIE">Sorties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Registre vide</p>
                  <p className="text-sm text-muted-foreground mt-1">Enregistrez votre première entrée de stupéfiant</p>
                  <Button onClick={() => setEntryDialogOpen(true)} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Enregistrer</Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Médicament</TableHead>
                          <TableHead>DCI</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Qté</TableHead>
                          <TableHead>N° Lot</TableHead>
                          <TableHead>Ordonnance</TableHead>
                          <TableHead>Patient</TableHead>
                          <TableHead>Prescripteur</TableHead>
                          <TableHead>Pharmacien</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {entries.map(e => (
                          <TableRow key={e.id}>
                            <TableCell className="text-sm font-mono">{formatDate(e.dateOperation)}</TableCell>
                            <TableCell className="font-medium">{e.medicamentNom}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{e.dci}</TableCell>
                            <TableCell>{getTypeBadge(e.type)}</TableCell>
                            <TableCell className="font-medium">{e.quantite}</TableCell>
                            <TableCell className="font-mono text-sm">{e.lotNumero || '—'}</TableCell>
                            <TableCell className="font-mono text-sm">{e.ordonnanceRef || '—'}</TableCell>
                            <TableCell>{e.patientNom || '—'}</TableCell>
                            <TableCell>{e.prescripteur || '—'}</TableCell>
                            <TableCell>{e.pharmacienNom || '—'}</TableCell>
                          </TableRow>
                        ))}
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

        {/* Conformité Tab */}
        <TabsContent value="conformite" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Scale className="w-4 h-4" /> Vérification de conformité
              </CardTitle>
            </CardHeader>
            <CardContent>
              {complianceLoading ? (
                <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : (
                <div className="space-y-3">
                  {compliance.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{c.categorie}</Badge>
                          {getComplianceBadge(c.statut)}
                        </div>
                        <p className="text-sm mt-1">{c.description}</p>
                        {c.details && <p className="text-xs text-muted-foreground mt-1">{c.details}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Résumé de conformité</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-emerald-50">
                  <p className="text-2xl font-bold text-emerald-600">{stats.conformes}</p>
                  <p className="text-xs text-muted-foreground">Conformes</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-amber-50">
                  <p className="text-2xl font-bold text-amber-600">{compliance.filter(c => c.statut === 'EN_COURS').length}</p>
                  <p className="text-xs text-muted-foreground">En cours</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50">
                  <p className="text-2xl font-bold text-red-600">{stats.nonConformes}</p>
                  <p className="text-xs text-muted-foreground">Non conformes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Entry Dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle entrée dans le registre</DialogTitle>
            <DialogDescription>Enregistrez une entrée ou sortie de stupéfiant</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-nom">Médicament *</Label>
                <Input id="st-nom" value={entryForm.medicamentNom} onChange={e => setEntryForm(f => ({ ...f, medicamentNom: e.target.value }))} placeholder="Nom commercial" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-dci">DCI *</Label>
                <Input id="st-dci" value={entryForm.dci} onChange={e => setEntryForm(f => ({ ...f, dci: e.target.value }))} placeholder="Dénomination commune" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type *</Label>
                <Select value={entryForm.type} onValueChange={v => setEntryForm(f => ({ ...f, type: v as 'ENTREE' | 'SORTIE' }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ENTREE">Entrée</SelectItem>
                    <SelectItem value="SORTIE">Sortie</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-quantite">Quantité *</Label>
                <Input id="st-quantite" type="number" value={entryForm.quantite} onChange={e => setEntryForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="st-lot">N° Lot</Label>
                <Input id="st-lot" value={entryForm.lotNumero} onChange={e => setEntryForm(f => ({ ...f, lotNumero: e.target.value }))} placeholder="Numéro de lot" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="st-ord">Réf. ordonnance</Label>
                <Input id="st-ord" value={entryForm.ordonnanceRef} onChange={e => setEntryForm(f => ({ ...f, ordonnanceRef: e.target.value }))} placeholder="Référence" />
              </div>
            </div>
            {entryForm.type === 'SORTIE' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="st-patient">Patient</Label>
                    <Input id="st-patient" value={entryForm.patientNom} onChange={e => setEntryForm(f => ({ ...f, patientNom: e.target.value }))} placeholder="Nom du patient" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="st-prescripteur">Prescripteur</Label>
                    <Input id="st-prescripteur" value={entryForm.prescripteur} onChange={e => setEntryForm(f => ({ ...f, prescripteur: e.target.value }))} placeholder="Médecin prescripteur" />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="st-pharmacien">Pharmacien</Label>
              <Input id="st-pharmacien" value={entryForm.pharmacienNom} onChange={e => setEntryForm(f => ({ ...f, pharmacienNom: e.target.value }))} placeholder="Nom du pharmacien" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-motif">Motif</Label>
              <Textarea id="st-motif" value={entryForm.motif} onChange={e => setEntryForm(f => ({ ...f, motif: e.target.value }))} placeholder="Motif de l'opération..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEntry} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
