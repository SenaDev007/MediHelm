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
  FileText,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  Lock,
  Upload,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  FileWarning,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface Document {
  id: string
  pharmacieId: string
  type: string
  titre: string
  fichierUrl: string | null
  statut: string
  dateValidite: string | null
  creePar: string | null
  createdAt: string
  updatedAt: string
}

interface CoffreDocument {
  id: string
  pharmacieId: string
  nom: string
  type: string
  taille: number
  dateUpload: string
  verrouille: boolean
}

// === Helpers ===

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const TYPES_DOCUMENT = [
  'LICENCE', 'DIPLOME', 'AUTORISATION', 'CERTIFICAT', 'CONTRAT', 'PV', 'FACTURE', 'AUTRE'
] as const

const TYPES_DOCUMENT_LABELS: Record<string, string> = {
  LICENCE: 'Licence',
  DIPLOME: 'Diplôme',
  AUTORISATION: 'Autorisation',
  CERTIFICAT: 'Certificat',
  CONTRAT: 'Contrat',
  PV: 'Procès-verbal',
  FACTURE: 'Facture',
  AUTRE: 'Autre',
}

function getTypeDocBadge(type: string) {
  const colors: Record<string, string> = {
    LICENCE: 'bg-emerald-100 text-emerald-700',
    DIPLOME: 'bg-sky-100 text-sky-700',
    AUTORISATION: 'bg-amber-100 text-amber-700',
    CERTIFICAT: 'bg-violet-100 text-violet-700',
    CONTRAT: 'bg-rose-100 text-rose-700',
    PV: 'bg-orange-100 text-orange-700',
    FACTURE: 'bg-teal-100 text-teal-700',
    AUTRE: 'bg-gray-100 text-gray-700',
  }
  const color = colors[type] || 'bg-gray-100 text-gray-700'
  return <Badge className={`${color} hover:${color} border-0 text-xs`}>{TYPES_DOCUMENT_LABELS[type] || type}</Badge>
}

function getStatutDocBadge(statut: string) {
  switch (statut) {
    case 'BROUILLON':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs">Brouillon</Badge>
    case 'VALIDE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Validé</Badge>
    case 'EXPIRE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Expiré</Badge>
    case 'ARCHIVE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Archivé</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getExpirationBadge(dateValidite: string | null) {
  if (!dateValidite) return <Badge variant="outline" className="text-xs">Sans expiration</Badge>
  const days = daysUntil(dateValidite)
  if (days <= 0) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs gap-1"><FileWarning className="w-3 h-3" /> Expiré</Badge>
  if (days <= 30) return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">{days}j</Badge>
  if (days <= 90) return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">{days}j</Badge>
  return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">{days}j</Badge>
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
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

export default function DocumentsPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('documents')

  const [documents, setDocuments] = useState<Document[]>([])
  const [docsLoading, setDocsLoading] = useState(true)
  const [docSearch, setDocSearch] = useState('')
  const [docTypeFilter, setDocTypeFilter] = useState('all')
  const [docPage, setDocPage] = useState(1)
  const [docTotalPages, setDocTotalPages] = useState(1)

  const [coffreDocs, setCoffreDocs] = useState<CoffreDocument[]>([])
  const [coffreLoading, setCoffreLoading] = useState(true)

  // Expiring alerts
  const [expiringDocs, setExpiringDocs] = useState<Document[]>([])

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [uploadForm, setUploadForm] = useState({
    titre: '',
    type: 'LICENCE',
    dateValidite: '',
    fichierUrl: '',
  })

  const fetchDocuments = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId, page: docPage.toString(), pageSize: '10' })
      if (docSearch) params.set('search', docSearch)
      if (docTypeFilter !== 'all') params.set('type', docTypeFilter)
      const res = await fetch(`/api/documents?${params}`)
      if (res.ok) {
        const json = await res.json()
        setDocuments(Array.isArray(json) ? json : json.data || [])
        setDocTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des documents')
    } finally {
      setDocsLoading(false)
    }
  }, [pharmacieId, docPage, docSearch, docTypeFilter])

  const fetchCoffre = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/coffre-numerique?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setCoffreDocs(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setCoffreLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchDocuments() }, [fetchDocuments])
  useEffect(() => { fetchCoffre() }, [fetchCoffre])
  useEffect(() => { setDocPage(1) }, [docSearch, docTypeFilter])

  // Compute expiring docs
  useEffect(() => {
    const expiring = documents.filter(d => {
      if (!d.dateValidite) return false
      const days = daysUntil(d.dateValidite)
      return days <= 90 && days > 0
    })
    const expired = documents.filter(d => d.dateValidite && daysUntil(d.dateValidite) <= 0)
    setExpiringDocs([...expired, ...expiring])
  }, [documents])

  const stats = useMemo(() => ({
    total: documents.length,
    valides: documents.filter(d => d.statut === 'VALIDE').length,
    expirants: expiringDocs.length,
    coffre: coffreDocs.length,
  }), [documents, expiringDocs, coffreDocs])

  async function handleUpload() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        titre: uploadForm.titre,
        type: uploadForm.type,
        statut: 'VALIDE',
      }
      if (uploadForm.dateValidite) body.dateValidite = uploadForm.dateValidite
      if (uploadForm.fichierUrl) body.fichierUrl = uploadForm.fichierUrl

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Document ajouté avec succès')
        setUploadDialogOpen(false)
        setUploadForm({ titre: '', type: 'LICENCE', dateValidite: '', fichierUrl: '' })
        fetchDocuments()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!deletingId) return
    try {
      const res = await fetch(`/api/documents/${deletingId}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Document supprimé')
        setDeleteDialogOpen(false)
        setDeletingId(null)
        fetchDocuments()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch {
      toast.error('Erreur lors de la suppression')
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-muted-foreground text-sm">Gestion documentaire et coffre numérique</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} className="gap-2">
          <Upload className="w-4 h-4" /> Ajouter un document
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total documents" value={stats.total} icon={FileText} variant="default" />
        <KpiCard title="Validés" value={stats.valides} icon={CheckCircle2} variant="success" />
        <KpiCard title="Expiring/Expirés" value={stats.expirants} icon={AlertTriangle} variant="warning" />
        <KpiCard title="Coffre numérique" value={stats.coffre} icon={Lock} variant="default" />
      </div>

      {/* Expiration alerts */}
      {expiringDocs.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-medium text-amber-800">Alertes d&apos;expiration</h3>
            </div>
            <div className="space-y-2">
              {expiringDocs.slice(0, 5).map(d => (
                <div key={d.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getTypeDocBadge(d.type)}
                    <span className="font-medium">{d.titre}</span>
                  </div>
                  {getExpirationBadge(d.dateValidite)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="documents" className="gap-2"><FileText className="w-4 h-4" /> Documents</TabsTrigger>
          <TabsTrigger value="coffre" className="gap-2"><Lock className="w-4 h-4" /> Coffre numérique</TabsTrigger>
        </TabsList>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un document..." value={docSearch} onChange={e => setDocSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les types</SelectItem>
                    {TYPES_DOCUMENT.map(t => (
                      <SelectItem key={t} value={t}>{TYPES_DOCUMENT_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {docsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun document trouvé</p>
                  <p className="text-sm text-muted-foreground mt-1">Ajoutez votre premier document</p>
                  <Button onClick={() => setUploadDialogOpen(true)} className="mt-4 gap-2">
                    <Upload className="w-4 h-4" /> Ajouter
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Titre</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead>Validité</TableHead>
                          <TableHead>Expiration</TableHead>
                          <TableHead>Ajouté le</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {documents.map(d => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                {d.titre}
                              </div>
                            </TableCell>
                            <TableCell>{getTypeDocBadge(d.type)}</TableCell>
                            <TableCell>{getStatutDocBadge(d.statut)}</TableCell>
                            <TableCell>{d.dateValidite ? formatDate(d.dateValidite) : '—'}</TableCell>
                            <TableCell>{getExpirationBadge(d.dateValidite)}</TableCell>
                            <TableCell>{formatDate(d.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {d.fichierUrl && (
                                  <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                    <a href={d.fichierUrl} target="_blank" rel="noopener noreferrer">
                                      <Download className="w-4 h-4" />
                                    </a>
                                  </Button>
                                )}
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeletingId(d.id); setDeleteDialogOpen(true) }}>
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
                    <p className="text-sm text-muted-foreground">Page {docPage} sur {docTotalPages}</p>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" disabled={docPage <= 1} onClick={() => setDocPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                      <Button variant="outline" size="icon" disabled={docPage >= docTotalPages} onClick={() => setDocPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coffre Numérique Tab */}
        <TabsContent value="coffre" className="space-y-4">
          {coffreLoading ? (
            <Card><CardContent className="p-6"><TableSkeleton /></CardContent></Card>
          ) : coffreDocs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Lock className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Coffre numérique vide</p>
                <p className="text-sm text-muted-foreground mt-1">Les documents sécurisés apparaîtront ici</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {coffreDocs.map(d => (
                <Card key={d.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                          <Lock className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">{d.nom}</h4>
                          <p className="text-xs text-muted-foreground">{d.type}</p>
                        </div>
                      </div>
                      {d.verrouille && <ShieldCheck className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div><span className="block">Taille</span><span className="font-medium text-foreground">{formatFileSize(d.taille)}</span></div>
                      <div><span className="block">Upload</span><span className="font-medium text-foreground">{formatDate(d.dateUpload)}</span></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un document</DialogTitle>
            <DialogDescription>Téléchargez ou référencez un nouveau document</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="doc-titre">Titre *</Label>
              <Input id="doc-titre" value={uploadForm.titre} onChange={e => setUploadForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre du document" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-type">Type *</Label>
              <Select value={uploadForm.type} onValueChange={v => setUploadForm(f => ({ ...f, type: v }))}>
                <SelectTrigger id="doc-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES_DOCUMENT.map(t => (
                    <SelectItem key={t} value={t}>{TYPES_DOCUMENT_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-validite">Date de validité</Label>
              <Input id="doc-validite" type="date" value={uploadForm.dateValidite} onChange={e => setUploadForm(f => ({ ...f, dateValidite: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-url">URL du fichier</Label>
              <Input id="doc-url" value={uploadForm.fichierUrl} onChange={e => setUploadForm(f => ({ ...f, fichierUrl: e.target.value }))} placeholder="https://..." />
              <p className="text-xs text-muted-foreground">Ou utilisez l&apos;upload de fichier via le stockage</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpload} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Supprimer le document</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer ce document ?</DialogDescription>
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
