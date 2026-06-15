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
  Shield,
  Plus,
  Search,
  Filter,
  CalendarDays,
  Clock,
  FileText,
  Pencil,
  Eye,
  Loader2,
  Moon,
  Sun,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface PlanningGarde {
  id: string
  pharmacieId: string
  date: string
  dateDebut: string
  dateFin: string
  type: string
  rapport: string | null
  createdAt: string
  pharmacienNom?: string
}

interface RapportGarde {
  id: string
  gardeId: string
  contenu: string
  nbVentes: number
  montantTotal: number
  incidents: string | null
  createdAt: string
}

// === Helpers ===

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

const TYPES_GARDE = ['NORMALE', 'VACANCES', 'FERIE', 'EXCEPTIONNELLE'] as const

const TYPES_GARDE_LABELS: Record<string, string> = {
  NORMALE: 'Normale',
  VACANCES: 'Vacances',
  FERIE: 'Jour férié',
  EXCEPTIONNELLE: 'Exceptionnelle',
}

function getTypeGardeBadge(type: string) {
  switch (type) {
    case 'NORMALE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><Sun className="w-3 h-3" /> Normale</Badge>
    case 'VACANCES':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs gap-1"><Calendar className="w-3 h-3" /> Vacances</Badge>
    case 'FERIE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs gap-1"><AlertCircle className="w-3 h-3" /> Férié</Badge>
    case 'EXCEPTIONNELLE':
      return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-0 text-xs gap-1"><Shield className="w-3 h-3" /> Exceptionnelle</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
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

export default function GardePage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('planning')

  const [gardes, setGardes] = useState<PlanningGarde[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Rapport
  const [rapports, setRapports] = useState<RapportGarde[]>([])
  const [rapportsLoading, setRapportsLoading] = useState(true)

  // Dialogs
  const [gardeDialogOpen, setGardeDialogOpen] = useState(false)
  const [rapportDialogOpen, setRapportDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [selectedGarde, setSelectedGarde] = useState<PlanningGarde | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [gardeForm, setGardeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    dateDebut: '',
    dateFin: '',
    type: 'NORMALE',
    pharmacienNom: '',
  })

  const [rapportForm, setRapportForm] = useState({
    contenu: '',
    nbVentes: '',
    montantTotal: '',
    incidents: '',
  })

  const fetchGardes = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: page.toString(), pageSize: '10' })
      if (search) params.set('search', search)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const res = await fetch(`/api/gardes?${params}`)
      if (res.ok) {
        const json = await res.json()
        setGardes(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des gardes')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, search, typeFilter])

  const fetchRapports = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/gardes?pharmacieId=${pharmacieId}&rapports=true`)
      if (res.ok) {
        const json = await res.json()
        setRapports(Array.isArray(json) ? json : json.rapports || [])
      }
    } catch {
      // silent
    } finally {
      setRapportsLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchGardes() }, [fetchGardes])
  useEffect(() => { fetchRapports() }, [fetchRapports])
  useEffect(() => { setPage(1) }, [search, typeFilter])

  const stats = useMemo(() => ({
    total: gardes.length,
    aVenir: gardes.filter(g => new Date(g.date) >= new Date()).length,
    avecRapport: gardes.filter(g => g.rapport).length,
    sansRapport: gardes.filter(g => !g.rapport && new Date(g.date) < new Date()).length,
  }), [gardes])

  function openAddGarde() {
    setGardeForm({ date: new Date().toISOString().split('T')[0], dateDebut: '08:00', dateFin: '20:00', type: 'NORMALE', pharmacienNom: '' })
    setGardeDialogOpen(true)
  }

  async function handleSubmitGarde() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const dateStr = gardeForm.date
      const res = await fetch('/api/gardes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          date: dateStr,
          dateDebut: `${dateStr}T${gardeForm.dateDebut}:00`,
          dateFin: `${dateStr}T${gardeForm.dateFin}:00`,
          type: gardeForm.type,
        }),
      })
      if (res.ok) {
        toast.success('Planning de garde créé')
        setGardeDialogOpen(false)
        fetchGardes()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la création')
      }
    } catch {
      toast.error('Erreur lors de la création')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmitRapport() {
    if (!selectedGarde || !pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/gardes/${selectedGarde.id}/rapport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          contenu: rapportForm.contenu,
          nbVentes: parseInt(rapportForm.nbVentes) || 0,
          montantTotal: parseFloat(rapportForm.montantTotal) || 0,
          incidents: rapportForm.incidents || null,
        }),
      })
      if (res.ok) {
        toast.success('Rapport de garde enregistré')
        setRapportDialogOpen(false)
        setRapportForm({ contenu: '', nbVentes: '', montantTotal: '', incidents: '' })
        fetchGardes()
        fetchRapports()
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

  // Calendar-like view helper
  const gardesByDate = useMemo(() => {
    const map: Record<string, PlanningGarde[]> = {}
    gardes.forEach(g => {
      const d = formatDate(g.date)
      if (!map[d]) map[d] = []
      map[d].push(g)
    })
    return map
  }, [gardes])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Garde</h1>
          <p className="text-muted-foreground text-sm">Planning de garde, rapports et suivi</p>
        </div>
        <Button onClick={openAddGarde} className="gap-2">
          <Plus className="w-4 h-4" /> Nouveau planning
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total gardes" value={stats.total} icon={Shield} variant="default" />
        <KpiCard title="À venir" value={stats.aVenir} icon={CalendarDays} variant="success" />
        <KpiCard title="Avec rapport" value={stats.avecRapport} icon={FileText} variant="success" />
        <KpiCard title="Sans rapport" value={stats.sansRapport} icon={AlertCircle} variant="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="planning" className="gap-2"><CalendarDays className="w-4 h-4" /> Planning</TabsTrigger>
          <TabsTrigger value="liste" className="gap-2"><Clock className="w-4 h-4" /> Liste</TabsTrigger>
          <TabsTrigger value="rapports" className="gap-2"><FileText className="w-4 h-4" /> Rapports</TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="planning" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {TYPES_GARDE.map(t => (
                      <SelectItem key={t} value={t}>{TYPES_GARDE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <Card><CardContent className="p-6"><TableSkeleton /></CardContent></Card>
          ) : Object.keys(gardesByDate).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <CalendarDays className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucun planning de garde</p>
                <p className="text-sm text-muted-foreground mt-1">Créez votre premier planning de garde</p>
                <Button onClick={openAddGarde} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Créer</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(gardesByDate).map(([date, items]) => (
                <Card key={date}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{date}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {items.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors" onClick={() => { setSelectedGarde(g); setDetailDialogOpen(true) }}>
                          <div className="flex items-center gap-3">
                            {getTypeGardeBadge(g.type)}
                            <div>
                              <p className="text-sm font-medium">
                                {new Date(g.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {new Date(g.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              {g.pharmacienNom && <p className="text-xs text-muted-foreground">{g.pharmacienNom}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {g.rapport ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Rapport</Badge>
                            ) : (
                              <Button size="sm" variant="outline" className="gap-1" onClick={(e) => { e.stopPropagation(); setSelectedGarde(g); setRapportDialogOpen(true) }}>
                                <FileText className="w-3 h-3" /> Rédiger
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* List View */}
        <TabsContent value="liste" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : gardes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Clock className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune garde trouvée</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Horaire</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Pharmacien</TableHead>
                          <TableHead>Rapport</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {gardes.map(g => (
                          <TableRow key={g.id}>
                            <TableCell className="font-medium">{formatDate(g.date)}</TableCell>
                            <TableCell>
                              {new Date(g.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {new Date(g.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell>{getTypeGardeBadge(g.type)}</TableCell>
                            <TableCell>{g.pharmacienNom || '—'}</TableCell>
                            <TableCell>
                              {g.rapport
                                ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Oui</Badge>
                                : <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Non</Badge>
                              }
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedGarde(g); setDetailDialogOpen(true) }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {!g.rapport && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setSelectedGarde(g); setRapportDialogOpen(true) }}>
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {page} sur {totalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>←</Button>
                      <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>→</Button>
                    </div>
                  </div>
                </>
              )}
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
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun rapport de garde</p>
                  <p className="text-sm text-muted-foreground mt-1">Les rapports sont rédigés après chaque garde</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Ventes</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Incidents</TableHead>
                        <TableHead>Contenu</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapports.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{formatDate(r.createdAt)}</TableCell>
                          <TableCell>{r.nbVentes}</TableCell>
                          <TableCell>{formatFCFA(r.montantTotal)}</TableCell>
                          <TableCell>
                            {r.incidents
                              ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Oui</Badge>
                              : <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Aucun</Badge>
                            }
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{r.contenu || '—'}</TableCell>
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

      {/* Add Garde Dialog */}
      <Dialog open={gardeDialogOpen} onOpenChange={setGardeDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau planning de garde</DialogTitle>
            <DialogDescription>Planifiez une nouvelle garde</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="g-date">Date *</Label>
              <Input id="g-date" type="date" value={gardeForm.date} onChange={e => setGardeForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="g-debut">Heure ouverture *</Label>
                <Input id="g-debut" type="time" value={gardeForm.dateDebut} onChange={e => setGardeForm(f => ({ ...f, dateDebut: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="g-fin">Heure fermeture *</Label>
                <Input id="g-fin" type="time" value={gardeForm.dateFin} onChange={e => setGardeForm(f => ({ ...f, dateFin: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-type">Type de garde *</Label>
              <Select value={gardeForm.type} onValueChange={v => setGardeForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="g-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES_GARDE.map(t => (
                    <SelectItem key={t} value={t}>{TYPES_GARDE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="g-pharmacien">Pharmacien de garde</Label>
              <Input id="g-pharmacien" value={gardeForm.pharmacienNom} onChange={e => setGardeForm(f => ({ ...f, pharmacienNom: e.target.value }))} placeholder="Nom du pharmacien" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGardeDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitGarde} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rapport Dialog */}
      <Dialog open={rapportDialogOpen} onOpenChange={setRapportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rapport de garde</DialogTitle>
            <DialogDescription>Rédigez le rapport pour la garde du {selectedGarde ? formatDate(selectedGarde.date) : ''}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="r-contenu">Contenu du rapport *</Label>
              <Textarea id="r-contenu" value={rapportForm.contenu} onChange={e => setRapportForm(f => ({ ...f, contenu: e.target.value }))} placeholder="Résumé de la garde..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="r-ventes">Nombre de ventes</Label>
                <Input id="r-ventes" type="number" value={rapportForm.nbVentes} onChange={e => setRapportForm(f => ({ ...f, nbVentes: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="r-montant">Montant total (FCFA)</Label>
                <Input id="r-montant" type="number" value={rapportForm.montantTotal} onChange={e => setRapportForm(f => ({ ...f, montantTotal: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="r-incidents">Incidents</Label>
              <Textarea id="r-incidents" value={rapportForm.incidents} onChange={e => setRapportForm(f => ({ ...f, incidents: e.target.value }))} placeholder="Décrivez tout incident survenu pendant la garde..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRapportDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitRapport} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Détail de la garde</DialogTitle>
          </DialogHeader>
          {selectedGarde && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-sm text-muted-foreground">Date</span><p className="font-medium">{formatDate(selectedGarde.date)}</p></div>
                <div><span className="text-sm text-muted-foreground">Type</span><p>{getTypeGardeBadge(selectedGarde.type)}</p></div>
                <div><span className="text-sm text-muted-foreground">Ouverture</span><p className="font-medium">{new Date(selectedGarde.dateDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p></div>
                <div><span className="text-sm text-muted-foreground">Fermeture</span><p className="font-medium">{new Date(selectedGarde.dateFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p></div>
              </div>
              {selectedGarde.pharmacienNom && (
                <div><span className="text-sm text-muted-foreground">Pharmacien</span><p className="font-medium">{selectedGarde.pharmacienNom}</p></div>
              )}
              {selectedGarde.rapport && (
                <div><span className="text-sm text-muted-foreground">Rapport</span><p className="text-sm mt-1">{selectedGarde.rapport}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
