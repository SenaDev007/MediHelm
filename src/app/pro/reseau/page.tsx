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
  Globe,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Building2,
  ArrowRightLeft,
  Eye,
  MapPin,
  Phone,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Reseau {
  id: string
  nom: string
  description: string | null
  nbPharmacies: number
  createdAt: string
}

interface PharmaciseReseau {
  id: string
  nom: string
  adresse: string
  ville: string
  telephone: string
  actif: boolean
  plan: string
}

interface Transfert {
  id: string
  pharmacieSourceId: string
  pharmacieSourceNom: string
  pharmacieDestId: string
  pharmacieDestNom: string
  produits: string
  statut: string
  dateTransfert: string
  motif: string | null
  createdAt: string
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

function getTransfertStatutBadge(statut: string) {
  switch (statut) {
    case 'EN_ATTENTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs gap-1"><Clock className="w-3 h-3" /> En attente</Badge>
    case 'EN_COURS':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs gap-1"><Loader2 className="w-3 h-3 animate-spin" /> En cours</Badge>
    case 'LIVRE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs gap-1"><CheckCircle2 className="w-3 h-3" /> Livré</Badge>
    case 'ANNULE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><XCircle className="w-3 h-3" /> Annulé</Badge>
    case 'REFUSE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><XCircle className="w-3 h-3" /> Refusé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
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
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function ReseauPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('overview')

  const [reseaux, setReseaux] = useState<Reseau[]>([])
  const [reseauxLoading, setReseauxLoading] = useState(true)

  const [pharmaciesReseau, setPharmaciesReseau] = useState<PharmaciseReseau[]>([])
  const [pharmaciesLoading, setPharmaciesLoading] = useState(true)
  const [pharmSearch, setPharmSearch] = useState('')

  const [transferts, setTransferts] = useState<Transfert[]>([])
  const [transfertsLoading, setTransfertsLoading] = useState(true)
  const [transfertSearch, setTransfertSearch] = useState('')
  const [transfertStatutFilter, setTransfertStatutFilter] = useState('all')
  const [transfertPage, setTransfertPage] = useState(1)
  const [transfertTotalPages, setTransfertTotalPages] = useState(1)

  // Dialog
  const [transfertDialogOpen, setTransfertDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [transfertForm, setTransfertForm] = useState({
    pharmacieDestId: '',
    produits: '',
    motif: '',
  })

  const fetchReseaux = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/reseaux?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setReseaux(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setReseauxLoading(false)
    }
  }, [pharmacieId])

  const fetchPharmacies = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/reseaux?pharmacieId=${pharmacieId}&pharmacies=true`)
      if (res.ok) {
        const json = await res.json()
        setPharmaciesReseau(json.pharmacies || [])
      }
    } catch {
      // silent
    } finally {
      setPharmaciesLoading(false)
    }
  }, [pharmacieId])

  const fetchTransferts = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: transfertPage.toString(), pageSize: '10' })
      if (transfertStatutFilter !== 'all') params.set('statut', transfertStatutFilter)
      const res = await fetch(`/api/transferts?${params}`)
      if (res.ok) {
        const json = await res.json()
        setTransferts(Array.isArray(json) ? json : json.data || [])
        setTransfertTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des transferts')
    } finally {
      setTransfertsLoading(false)
    }
  }, [pharmacieId, transfertPage, transfertStatutFilter])

  useEffect(() => { fetchReseaux() }, [fetchReseaux])
  useEffect(() => { fetchPharmacies() }, [fetchPharmacies])
  useEffect(() => { fetchTransferts() }, [fetchTransferts])
  useEffect(() => { setTransfertPage(1) }, [transfertSearch, transfertStatutFilter])

  const stats = useMemo(() => ({
    nbReseaux: reseaux.length,
    nbPharmacies: pharmaciesReseau.length,
    nbTransferts: transferts.length,
    enAttente: transferts.filter(t => t.statut === 'EN_ATTENTE').length,
  }), [reseaux, pharmaciesReseau, transferts])

  const filteredPharmacies = useMemo(() => {
    if (!pharmSearch) return pharmaciesReseau
    const s = pharmSearch.toLowerCase()
    return pharmaciesReseau.filter(p =>
      (p.nom || '').toLowerCase().includes(s) ||
      (p.ville || '').toLowerCase().includes(s)
    )
  }, [pharmaciesReseau, pharmSearch])

  async function handleSubmitTransfert() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieSourceId: pharmacieId,
        pharmacieDestId: transfertForm.pharmacieDestId,
        produits: transfertForm.produits,
        statut: 'EN_ATTENTE',
        dateTransfert: new Date().toISOString(),
      }
      if (transfertForm.motif) body.motif = transfertForm.motif

      const res = await fetch('/api/transferts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Demande de transfert envoyée')
        setTransfertDialogOpen(false)
        setTransfertForm({ pharmacieDestId: '', produits: '', motif: '' })
        fetchTransferts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors du transfert')
      }
    } catch {
      toast.error('Erreur lors du transfert')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Réseau</h1>
          <p className="text-muted-foreground text-sm">Gestion réseau, multi-pharmacies et transferts</p>
        </div>
        <Button onClick={() => setTransfertDialogOpen(true)} className="gap-2">
          <ArrowRightLeft className="w-4 h-4" /> Nouveau transfert
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Réseaux" value={stats.nbReseaux} icon={Globe} variant="default" />
        <KpiCard title="Pharmacies" value={stats.nbPharmacies} icon={Building2} variant="success" />
        <KpiCard title="Transferts" value={stats.nbTransferts} icon={ArrowRightLeft} variant="default" />
        <KpiCard title="En attente" value={stats.enAttente} icon={Clock} variant="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2"><Globe className="w-4 h-4" /> Réseau</TabsTrigger>
          <TabsTrigger value="pharmacies" className="gap-2"><Building2 className="w-4 h-4" /> Pharmacies</TabsTrigger>
          <TabsTrigger value="transferts" className="gap-2"><ArrowRightLeft className="w-4 h-4" /> Transferts</TabsTrigger>
        </TabsList>

        {/* Network Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {reseauxLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : reseaux.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Globe className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucun réseau configuré</p>
                <p className="text-sm text-muted-foreground mt-1">Contactez un promoteur pour rejoindre un réseau</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reseaux.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Globe className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold">{r.nom}</h3>
                          {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-lg font-bold">{r.nbPharmacies}</p>
                        <p className="text-xs text-muted-foreground">Pharmacies</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium">{formatDate(r.createdAt)}</p>
                        <p className="text-xs text-muted-foreground">Créé le</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pharmacies Tab */}
        <TabsContent value="pharmacies" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Rechercher une pharmacie..." value={pharmSearch} onChange={e => setPharmSearch(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>

          {pharmaciesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : filteredPharmacies.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucune pharmacie dans le réseau</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPharmacies.map(p => (
                <Card key={p.id} className={`hover:shadow-md transition-shadow ${p.id === pharmacieId ? 'ring-2 ring-primary' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{p.nom}</h4>
                        {p.id === pharmacieId && <Badge className="mt-1 bg-primary/10 text-primary hover:bg-primary/10 border-0 text-xs">Votre pharmacie</Badge>}
                      </div>
                      {p.actif
                        ? <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Active</Badge>
                        : <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Inactive</Badge>
                      }
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-3 h-3" /> <span>{p.adresse}, {p.ville}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="w-3 h-3" /> <span>{p.telephone}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{p.plan}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Transferts Tab */}
        <TabsContent value="transferts" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un transfert..." value={transfertSearch} onChange={e => setTransfertSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={transfertStatutFilter} onValueChange={setTransfertStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="LIVRE">Livré</SelectItem>
                    <SelectItem value="ANNULE">Annulé</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {transfertsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : transferts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ArrowRightLeft className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun transfert</p>
                  <p className="text-sm text-muted-foreground mt-1">Effectuez votre premier transfert entre pharmacies</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Source</TableHead>
                          <TableHead>Destination</TableHead>
                          <TableHead>Produits</TableHead>
                          <TableHead>Motif</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transferts.map(t => (
                          <TableRow key={t.id}>
                            <TableCell>{formatDate(t.dateTransfert)}</TableCell>
                            <TableCell className="font-medium">{t.pharmacieSourceNom}</TableCell>
                            <TableCell className="font-medium">{t.pharmacieDestNom}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{t.produits}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{t.motif || '—'}</TableCell>
                            <TableCell>{getTransfertStatutBadge(t.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                  <div className="flex items-center justify-between p-4 border-t">
                    <p className="text-sm text-muted-foreground">Page {transfertPage} sur {transfertTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={transfertPage <= 1} onClick={() => setTransfertPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={transfertPage >= transfertTotalPages} onClick={() => setTransfertPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transfert Dialog */}
      <Dialog open={transfertDialogOpen} onOpenChange={setTransfertDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau transfert</DialogTitle>
            <DialogDescription>Envoyez des produits vers une autre pharmacie du réseau</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="tf-dest">Pharmacie destination *</Label>
              <Select value={transfertForm.pharmacieDestId} onValueChange={v => setTransfertForm(f => ({ ...f, pharmacieDestId: v }))}>
                <SelectTrigger id="tf-dest"><SelectValue placeholder="Choisir une pharmacie" /></SelectTrigger>
                <SelectContent>
                  {pharmaciesReseau.filter(p => p.id !== pharmacieId).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.nom} — {p.ville}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tf-produits">Produits à transférer *</Label>
              <Textarea id="tf-produits" value={transfertForm.produits} onChange={e => setTransfertForm(f => ({ ...f, produits: e.target.value }))} placeholder="Liste des produits et quantités..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tf-motif">Motif</Label>
              <Input id="tf-motif" value={transfertForm.motif} onChange={e => setTransfertForm(f => ({ ...f, motif: e.target.value }))} placeholder="Raison du transfert" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransfertDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitTransfert} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Send className="w-4 h-4 mr-1" /> Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
