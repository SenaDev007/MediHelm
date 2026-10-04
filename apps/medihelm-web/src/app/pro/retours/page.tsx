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
  RotateCcw,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Trash2,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Package,
  ShieldAlert,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Retour {
  id: string
  pharmacieId: string
  type: string
  motif: string
  produits: string
  statut: string
  dateRetour: string
  fournisseurNom: string | null
  createdAt: string
}

interface Destruction {
  id: string
  pharmacieId: string
  motif: string
  produits: string
  quantite: number
  dateDestruction: string
  pvNumero: string | null
  responsable: string | null
  statut: string
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

function getRetourStatutBadge(statut: string) {
  switch (statut) {
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">En attente</Badge>
    case 'VALIDE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Validé</Badge>
    case 'REFUSE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Refusé</Badge>
    case 'TRAITE':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Traité</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getDestructionStatutBadge(statut: string) {
  switch (statut) {
    case 'PLANIFIEE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Planifiée</Badge>
    case 'EFFECTUEE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Effectuée</Badge>
    case 'ANNULEE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Annulée</Badge>
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

const TYPES_RETOUR = ['FOURNISSEUR', 'CLIENT', 'DESTRUCTION', 'AJUSTEMENT']
const MOTIFS_RETOUR = ['PERIME', 'ENDOMMAGE', 'ERREUR_LIVRAISON', 'SURSTOCK', 'RAPPEL_LOT', 'AUTRE']

// === Main Component ===

export default function RetoursPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('retours')

  const [retours, setRetours] = useState<Retour[]>([])
  const [retoursLoading, setRetoursLoading] = useState(true)
  const [retourSearch, setRetourSearch] = useState('')
  const [retourTypeFilter, setRetourTypeFilter] = useState('all')
  const [retourPage, setRetourPage] = useState(1)
  const [retourTotalPages, setRetourTotalPages] = useState(1)

  const [destructions, setDestructions] = useState<Destruction[]>([])
  const [destructionsLoading, setDestructionsLoading] = useState(true)
  const [destructionSearch, setDestructionSearch] = useState('')

  // Dialogs
  const [retourDialogOpen, setRetourDialogOpen] = useState(false)
  const [destructionDialogOpen, setDestructionDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [retourForm, setRetourForm] = useState({
    type: 'FOURNISSEUR',
    motif: 'PERIME',
    produits: '',
    fournisseurNom: '',
  })

  const [destructionForm, setDestructionForm] = useState({
    motif: 'PERIME',
    produits: '',
    quantite: '',
    dateDestruction: new Date().toISOString().split('T')[0],
    responsable: '',
  })

  const fetchRetours = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: retourPage.toString(), pageSize: '10' })
      if (retourSearch) params.set('search', retourSearch)
      if (retourTypeFilter !== 'all') params.set('type', retourTypeFilter)
      const res = await fetch(`/api/retours?${params}`)
      if (res.ok) {
        const json = await res.json()
        setRetours(Array.isArray(json) ? json : json.data || [])
        setRetourTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des retours')
    } finally {
      setRetoursLoading(false)
    }
  }, [pharmacieId, retourPage, retourSearch, retourTypeFilter])

  const fetchDestructions = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/destructions?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setDestructions(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setDestructionsLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchRetours() }, [fetchRetours])
  useEffect(() => { fetchDestructions() }, [fetchDestructions])
  useEffect(() => { setRetourPage(1) }, [retourSearch, retourTypeFilter])

  const stats = useMemo(() => ({
    totalRetours: retours.length,
    enAttente: retours.filter(r => r.statut === 'EN_ATTENTE').length,
    totalDestructions: destructions.length,
    pvManquants: destructions.filter(d => !d.pvNumero).length,
  }), [retours, destructions])

  async function handleSubmitRetour() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        type: retourForm.type,
        motif: retourForm.motif,
        produits: retourForm.produits,
        statut: 'EN_ATTENTE',
        dateRetour: new Date().toISOString(),
      }
      if (retourForm.fournisseurNom) body.fournisseurNom = retourForm.fournisseurNom

      const res = await fetch('/api/retours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Retour enregistré')
        setRetourDialogOpen(false)
        setRetourForm({ type: 'FOURNISSEUR', motif: 'PERIME', produits: '', fournisseurNom: '' })
        fetchRetours()
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

  async function handleSubmitDestruction() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          motif: destructionForm.motif,
          produits: destructionForm.produits,
          quantite: parseInt(destructionForm.quantite) || 0,
          dateDestruction: destructionForm.dateDestruction,
          responsable: destructionForm.responsable || null,
          statut: 'PLANIFIEE',
        }),
      })
      if (res.ok) {
        toast.success('Destruction planifiée')
        setDestructionDialogOpen(false)
        setDestructionForm({ motif: 'PERIME', produits: '', quantite: '', dateDestruction: new Date().toISOString().split('T')[0], responsable: '' })
        fetchDestructions()
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

  const filteredDestructions = useMemo(() => {
    if (!destructionSearch) return destructions
    const s = destructionSearch.toLowerCase()
    return destructions.filter(d =>
      (d.produits || '').toLowerCase().includes(s) ||
      (d.motif || '').toLowerCase().includes(s) ||
      (d.pvNumero || '').toLowerCase().includes(s)
    )
  }, [destructions, destructionSearch])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Retours & Destructions</h1>
          <p className="text-muted-foreground text-sm">Gestion des retours de produits et destructions réglementaires</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setRetourDialogOpen(true)} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Nouveau retour
          </Button>
          <Button variant="outline" onClick={() => setDestructionDialogOpen(true)} className="gap-2">
            <Trash2 className="w-4 h-4" /> Nouvelle destruction
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total retours" value={stats.totalRetours} icon={RotateCcw} variant="default" />
        <KpiCard title="En attente" value={stats.enAttente} icon={AlertTriangle} variant="warning" />
        <KpiCard title="Destructions" value={stats.totalDestructions} icon={Trash2} variant="default" />
        <KpiCard title="PV manquants" value={stats.pvManquants} icon={FileText} variant="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="retours" className="gap-2"><RotateCcw className="w-4 h-4" /> Retours</TabsTrigger>
          <TabsTrigger value="destructions" className="gap-2"><Trash2 className="w-4 h-4" /> Destructions</TabsTrigger>
        </TabsList>

        {/* Retours Tab */}
        <TabsContent value="retours" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un retour..." value={retourSearch} onChange={e => setRetourSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={retourTypeFilter} onValueChange={setRetourTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {TYPES_RETOUR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {retoursLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : retours.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <RotateCcw className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun retour enregistré</p>
                  <p className="text-sm text-muted-foreground mt-1">Enregistrez votre premier retour</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Motif</TableHead>
                          <TableHead>Produits</TableHead>
                          <TableHead>Fournisseur</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {retours.map(r => (
                          <TableRow key={r.id}>
                            <TableCell>{formatDate(r.dateRetour)}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{r.type}</Badge></TableCell>
                            <TableCell>{r.motif}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{r.produits}</TableCell>
                            <TableCell>{r.fournisseurNom || '—'}</TableCell>
                            <TableCell>{getRetourStatutBadge(r.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {retourPage} sur {retourTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={retourPage <= 1} onClick={() => setRetourPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={retourPage >= retourTotalPages} onClick={() => setRetourPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Destructions Tab */}
        <TabsContent value="destructions" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher une destruction..." value={destructionSearch} onChange={e => setDestructionSearch(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {destructionsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredDestructions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Trash2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune destruction enregistrée</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Motif</TableHead>
                        <TableHead>Produits</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>PV n°</TableHead>
                        <TableHead>Responsable</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDestructions.map(d => (
                        <TableRow key={d.id}>
                          <TableCell>{formatDate(d.dateDestruction)}</TableCell>
                          <TableCell>{d.motif}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{d.produits}</TableCell>
                          <TableCell>{d.quantite}</TableCell>
                          <TableCell>{d.pvNumero ? <Badge variant="outline" className="text-xs">{d.pvNumero}</Badge> : (
                            <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><ShieldAlert className="w-3 h-3" /> Manquant</Badge>
                          )}</TableCell>
                          <TableCell>{d.responsable || '—'}</TableCell>
                          <TableCell>{getDestructionStatutBadge(d.statut)}</TableCell>
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

      {/* Retour Dialog */}
      <Dialog open={retourDialogOpen} onOpenChange={setRetourDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau retour</DialogTitle>
            <DialogDescription>Enregistrez un nouveau retour de produit</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de retour *</Label>
                <Select value={retourForm.type} onValueChange={v => setRetourForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES_RETOUR.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Motif *</Label>
                <Select value={retourForm.motif} onValueChange={v => setRetourForm(f => ({ ...f, motif: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOTIFS_RETOUR.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="rt-produits">Produits concernés *</Label>
              <Textarea id="rt-produits" value={retourForm.produits} onChange={e => setRetourForm(f => ({ ...f, produits: e.target.value }))} placeholder="Liste des produits retournés..." rows={3} />
            </div>
            {retourForm.type === 'FOURNISSEUR' && (
              <div className="space-y-2">
                <Label htmlFor="rt-fournisseur">Fournisseur</Label>
                <Input id="rt-fournisseur" value={retourForm.fournisseurNom} onChange={e => setRetourForm(f => ({ ...f, fournisseurNom: e.target.value }))} placeholder="Nom du fournisseur" />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRetourDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitRetour} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Destruction Dialog */}
      <Dialog open={destructionDialogOpen} onOpenChange={setDestructionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle destruction</DialogTitle>
            <DialogDescription>Planifiez une destruction de produits (PV obligatoire)</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Motif *</Label>
              <Select value={destructionForm.motif} onValueChange={v => setDestructionForm(f => ({ ...f, motif: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MOTIFS_RETOUR.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-produits">Produits à détruire *</Label>
              <Textarea id="dt-produits" value={destructionForm.produits} onChange={e => setDestructionForm(f => ({ ...f, produits: e.target.value }))} placeholder="Liste des produits à détruire..." rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dt-quantite">Quantité</Label>
                <Input id="dt-quantite" type="number" value={destructionForm.quantite} onChange={e => setDestructionForm(f => ({ ...f, quantite: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dt-date">Date prévue *</Label>
                <Input id="dt-date" type="date" value={destructionForm.dateDestruction} onChange={e => setDestructionForm(f => ({ ...f, dateDestruction: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dt-responsable">Responsable</Label>
              <Input id="dt-responsable" value={destructionForm.responsable} onChange={e => setDestructionForm(f => ({ ...f, responsable: e.target.value }))} placeholder="Nom du responsable" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDestructionDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitDestruction} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Planifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
