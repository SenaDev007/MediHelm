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
  Truck,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Eye,
  Star,
  Phone,
  Mail,
  MapPin,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Evaluation {
  id: string
  note: number
  commentaire: string | null
  date: string
}

interface Fournisseur {
  id: string
  pharmacieId: string
  nom: string
  contact: string | null
  telephone: string | null
  email: string | null
  adresse: string | null
  actif: boolean
  note: number | null
  createdAt: string
  updatedAt: string
  evaluations?: Evaluation[]
}

// === Helpers ===

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function getNoteStars(note: number | null) {
  if (note === null) return <span className="text-sm text-muted-foreground">Non noté</span>
  const full = Math.round(note)
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`w-3 h-3 ${i < full ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{note.toFixed(1)}</span>
    </div>
  )
}

function getActifBadge(actif: boolean) {
  return actif
    ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Actif</Badge>
    : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Inactif</Badge>
}

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
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function FournisseursPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actifFilter, setActifFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [sortBy, setSortBy] = useState('nom')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null)
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Evaluation state
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [evalForm, setEvalForm] = useState({ note: '3', commentaire: '' })

  const [form, setForm] = useState({
    nom: '',
    contact: '',
    telephone: '',
    email: '',
    adresse: '',
    conditions: '',
  })

  const fetchFournisseurs = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: page.toString(), pageSize: pageSize.toString(), sortBy, sortOrder })
      if (search) params.set('search', search)
      if (actifFilter !== 'all') params.set('actif', actifFilter)
      const res = await fetch(`/api/fournisseurs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setFournisseurs(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des fournisseurs')
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, page, pageSize, sortBy, sortOrder, search, actifFilter])

  useEffect(() => { fetchFournisseurs() }, [fetchFournisseurs])
  useEffect(() => { setPage(1) }, [search, actifFilter])

  const stats = useMemo(() => ({
    total: fournisseurs.length,
    actifs: fournisseurs.filter(f => f.actif).length,
    notes: fournisseurs.filter(f => f.note !== null && f.note >= 3).length,
    sansNote: fournisseurs.filter(f => f.note === null).length,
  }), [fournisseurs])

  function handleSort(column: string) {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  function openAdd() {
    setEditingFournisseur(null)
    setForm({ nom: '', contact: '', telephone: '', email: '', adresse: '', conditions: '' })
    setDialogOpen(true)
  }

  function openEdit(f: Fournisseur) {
    setEditingFournisseur(f)
    setForm({
      nom: f.nom,
      contact: f.contact || '',
      telephone: f.telephone || '',
      email: f.email || '',
      adresse: f.adresse || '',
      conditions: '',
    })
    setDialogOpen(true)
  }

  async function openDetail(f: Fournisseur) {
    setSelectedFournisseur(f)
    setDetailOpen(true)
    // Fetch evaluations
    try {
      const res = await fetch(`/api/fournisseurs/${f.id}/evaluations?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setEvaluations(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    }
  }

  async function handleSubmit() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        nom: form.nom,
        actif: true,
      }
      if (form.contact) body.contact = form.contact
      if (form.telephone) body.telephone = form.telephone
      if (form.email) body.email = form.email
      if (form.adresse) body.adresse = form.adresse

      const url = editingFournisseur ? `/api/fournisseurs/${editingFournisseur.id}` : '/api/fournisseurs'
      const method = editingFournisseur ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success(editingFournisseur ? 'Fournisseur modifié' : 'Fournisseur ajouté')
        setDialogOpen(false)
        fetchFournisseurs()
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

  async function handleDelete() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/fournisseurs/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Fournisseur supprimé')
        setDeleteDialogOpen(false)
        setDeletingId(null)
        fetchFournisseurs()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  async function handleSubmitEval() {
    if (!selectedFournisseur || !pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/fournisseurs/${selectedFournisseur.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          note: parseInt(evalForm.note),
          commentaire: evalForm.commentaire,
          date: new Date().toISOString(),
        }),
      })
      if (res.ok) {
        toast.success('Évaluation ajoutée')
        setEvalDialogOpen(false)
        setEvalForm({ note: '3', commentaire: '' })
        // Re-fetch evaluations
        const evalRes = await fetch(`/api/fournisseurs/${selectedFournisseur.id}/evaluations?pharmacieId=${pharmacieId}`)
        if (evalRes.ok) {
          const json = await evalRes.json()
          setEvaluations(Array.isArray(json) ? json : json.data || [])
        }
        fetchFournisseurs()
      } else {
        toast.error('Erreur lors de l\'ajout de l\'évaluation')
      }
    } catch {
      toast.error('Erreur lors de l\'évaluation')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-muted-foreground text-sm">Gestion des fournisseurs et évaluations</p>
        </div>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="w-4 h-4" /> Ajouter un fournisseur
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total fournisseurs" value={stats.total} icon={Truck} variant="default" />
        <KpiCard title="Actifs" value={stats.actifs} icon={CheckCircle2} variant="success" />
        <KpiCard title="Bien notés (≥3)" value={stats.notes} icon={Star} variant="success" />
        <KpiCard title="Non notés" value={stats.sansNote} icon={XCircle} variant="warning" />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher un fournisseur..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={actifFilter} onValueChange={setActifFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="true">Actifs</SelectItem>
                <SelectItem value="false">Inactifs</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6"><TableSkeleton /></div>
          ) : fournisseurs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Truck className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Aucun fournisseur trouvé</p>
              <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier fournisseur</p>
              <Button onClick={openAdd} className="mt-4 gap-2"><Plus className="w-4 h-4" /> Ajouter</Button>
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
                      <TableHead>Contact</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fournisseurs.map(f => (
                      <TableRow key={f.id} className="cursor-pointer" onClick={() => openDetail(f)}>
                        <TableCell className="font-medium">{f.nom}</TableCell>
                        <TableCell>{f.contact || '—'}</TableCell>
                        <TableCell>{f.telephone || '—'}</TableCell>
                        <TableCell>{f.email || '—'}</TableCell>
                        <TableCell>{getNoteStars(f.note)}</TableCell>
                        <TableCell>{getActifBadge(f.actif)}</TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(f)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(f.id); setDeleteDialogOpen(true) }}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                  <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" /> {selectedFournisseur?.nom}
            </SheetTitle>
          </SheetHeader>
          {selectedFournisseur && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedFournisseur.telephone || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedFournisseur.email || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{selectedFournisseur.adresse || 'Non renseignée'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Contact :</span>
                  <span className="text-sm">{selectedFournisseur.contact || 'Non renseigné'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Note :</span>
                  {getNoteStars(selectedFournisseur.note)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Statut :</span>
                  {getActifBadge(selectedFournisseur.actif)}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">Évaluations</h3>
                  <Button size="sm" onClick={() => setEvalDialogOpen(true)} className="gap-1">
                    <Plus className="w-3 h-3" /> Ajouter
                  </Button>
                </div>
                {evaluations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Aucune évaluation pour ce fournisseur</p>
                ) : (
                  <div className="space-y-3">
                    {evaluations.map(ev => (
                      <Card key={ev.id}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            {getNoteStars(ev.note)}
                            <span className="text-xs text-muted-foreground">{formatDate(ev.date)}</span>
                          </div>
                          {ev.commentaire && <p className="text-sm mt-2">{ev.commentaire}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFournisseur ? 'Modifier le fournisseur' : 'Ajouter un fournisseur'}</DialogTitle>
            <DialogDescription>{editingFournisseur ? 'Modifiez les informations du fournisseur' : 'Remplissez les informations du nouveau fournisseur'}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="f-nom">Nom *</Label>
              <Input id="f-nom" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} placeholder="Nom du fournisseur" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="f-contact">Contact</Label>
                <Input id="f-contact" value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Personne de contact" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="f-telephone">Téléphone</Label>
                <Input id="f-telephone" value={form.telephone} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} placeholder="+229 90 00 00 00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-email">Email</Label>
              <Input id="f-email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@fournisseur.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-adresse">Adresse</Label>
              <Textarea id="f-adresse" value={form.adresse} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} placeholder="Adresse du fournisseur" rows={2} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-conditions">Conditions particulières</Label>
              <Textarea id="f-conditions" value={form.conditions} onChange={e => setForm(f => ({ ...f, conditions: e.target.value }))} placeholder="Délais de livraison, conditions de paiement..." rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingFournisseur ? 'Modifier' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Évaluer le fournisseur</DialogTitle>
            <DialogDescription>Donnez une note et un commentaire pour {selectedFournisseur?.nom}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Note (1-5) *</Label>
              <Select value={evalForm.note} onValueChange={v => setEvalForm(f => ({ ...f, note: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Très mauvais</SelectItem>
                  <SelectItem value="2">2 — Mauvais</SelectItem>
                  <SelectItem value="3">3 — Moyen</SelectItem>
                  <SelectItem value="4">4 — Bon</SelectItem>
                  <SelectItem value="5">5 — Excellent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eval-comment">Commentaire</Label>
              <Textarea id="eval-comment" value={evalForm.commentaire} onChange={e => setEvalForm(f => ({ ...f, commentaire: e.target.value }))} placeholder="Commentaire sur le fournisseur..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitEval} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Soumettre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmer la suppression</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer ce fournisseur ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
