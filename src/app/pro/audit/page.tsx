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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  ShieldCheck,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  FileText,
  User,
  Clock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface AuditLog {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  utilisateur?: { nom: string; prenom: string } | null
}

interface JournalEntry {
  id: string
  date: string
  categorie: string
  description: string
  utilisateur: string
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
    second: '2-digit',
  })
}

function getActionBadge(action: string) {
  const lower = action.toLowerCase()
  if (lower.includes('create') || lower.includes('creer') || lower.includes('ajout'))
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Création</Badge>
  if (lower.includes('update') || lower.includes('modif'))
    return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Modification</Badge>
  if (lower.includes('delete') || lower.includes('supprim'))
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Suppression</Badge>
  if (lower.includes('login') || lower.includes('connexion'))
    return <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 border-0 text-xs">Connexion</Badge>
  if (lower.includes('logout') || lower.includes('deconnexion'))
    return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs">Déconnexion</Badge>
  if (lower.includes('export'))
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Export</Badge>
  return <Badge variant="outline" className="text-xs">{action}</Badge>
}

function getEntityBadge(entity: string) {
  const colors: Record<string, string> = {
    Medicament: 'bg-teal-100 text-teal-700',
    Vente: 'bg-emerald-100 text-emerald-700',
    Patient: 'bg-sky-100 text-sky-700',
    Employe: 'bg-amber-100 text-amber-700',
    Fournisseur: 'bg-violet-100 text-violet-700',
    Commande: 'bg-rose-100 text-rose-700',
    Ordonnance: 'bg-orange-100 text-orange-700',
    Document: 'bg-gray-100 text-gray-700',
    Abonnement: 'bg-primary/10 text-primary',
  }
  const color = colors[entity] || 'bg-gray-100 text-gray-700'
  return <Badge className={`${color} hover:${color} border-0 text-xs`}>{entity}</Badge>
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function AuditPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('audit')

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')
  const [entityFilter, setEntityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [journaux, setJournaux] = useState<JournalEntry[]>([])
  const [journauxLoading, setJournauxLoading] = useState(true)
  const [journalCategorieFilter, setJournalCategorieFilter] = useState('all')

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '15' })
      if (search) params.set('search', search)
      if (actionFilter !== 'all') params.set('action', actionFilter)
      if (entityFilter !== 'all') params.set('entity', entityFilter)
      if (dateFilter) params.set('date', dateFilter)
      const res = await fetch(`/api/audit-logs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setAuditLogs(Array.isArray(json) ? json : json.data || [])
        setTotalPages(json.totalPages || 1)
      }
    } catch {
      toast.error('Erreur lors du chargement des logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, actionFilter, entityFilter, dateFilter])

  const fetchJournaux = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (journalCategorieFilter !== 'all') params.set('categorie', journalCategorieFilter)
      const res = await fetch(`/api/journaux?${params}`)
      if (res.ok) {
        const json = await res.json()
        setJournaux(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setJournauxLoading(false)
    }
  }, [pharmacieId, journalCategorieFilter])

  useEffect(() => { fetchAuditLogs() }, [fetchAuditLogs])
  useEffect(() => { fetchJournaux() }, [fetchJournaux])
  useEffect(() => { setPage(1) }, [search, actionFilter, entityFilter, dateFilter])

  const stats = useMemo(() => ({
    total: auditLogs.length,
    creations: auditLogs.filter(l => l.action.toLowerCase().includes('create') || l.action.toLowerCase().includes('creer')).length,
    modifications: auditLogs.filter(l => l.action.toLowerCase().includes('update') || l.action.toLowerCase().includes('modif')).length,
    suppressions: auditLogs.filter(l => l.action.toLowerCase().includes('delete') || l.action.toLowerCase().includes('supprim')).length,
  }), [auditLogs])

  const uniqueEntities = useMemo(() => {
    const entities = new Set(auditLogs.map(l => l.entity))
    return Array.from(entities)
  }, [auditLogs])

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Audit & Journaux</h1>
          <p className="text-muted-foreground text-sm">Journal d&apos;audit et traçabilité des actions</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total actions" value={stats.total} icon={Activity} variant="default" />
        <KpiCard title="Créations" value={stats.creations} icon={CheckCircle2} variant="success" />
        <KpiCard title="Modifications" value={stats.modifications} icon={ShieldCheck} variant="warning" />
        <KpiCard title="Suppressions" value={stats.suppressions} icon={AlertTriangle} variant="danger" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="audit" className="gap-2"><ShieldCheck className="w-4 h-4" /> Journal d&apos;audit</TabsTrigger>
          <TabsTrigger value="journaux" className="gap-2"><BookOpen className="w-4 h-4" /> Journaux</TabsTrigger>
        </TabsList>

        {/* Audit Logs Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher dans les logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="create">Création</SelectItem>
                    <SelectItem value="update">Modification</SelectItem>
                    <SelectItem value="delete">Suppression</SelectItem>
                    <SelectItem value="login">Connexion</SelectItem>
                    <SelectItem value="export">Export</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-full sm:w-44">
                    <SelectValue placeholder="Entité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    {uniqueEntities.map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="w-full sm:w-40"
                  placeholder="Date"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : auditLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShieldCheck className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun log d&apos;audit</p>
                  <p className="text-sm text-muted-foreground mt-1">Les actions seront enregistrées ici</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date & Heure</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entité</TableHead>
                          <TableHead>ID entité</TableHead>
                          <TableHead>IP</TableHead>
                          <TableHead className="text-right">Détails</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {auditLogs.map(log => (
                          <TableRow key={log.id} className="cursor-pointer hover:bg-accent/50" onClick={() => { setSelectedLog(log); setDetailOpen(true) }}>
                            <TableCell className="text-sm font-mono">{formatDateTime(log.createdAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-muted-foreground" />
                                <span className="text-sm">{log.utilisateur ? `${log.utilisateur.prenom} ${log.utilisateur.nom}` : (log.userId || '—').slice(0, 8)}</span>
                              </div>
                            </TableCell>
                            <TableCell>{getActionBadge(log.action)}</TableCell>
                            <TableCell>{getEntityBadge(log.entity)}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">{log.entityId ? log.entityId.slice(0, 8) : '—'}</TableCell>
                            <TableCell className="text-sm font-mono text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); setSelectedLog(log); setDetailOpen(true) }}>
                                <Eye className="w-4 h-4" />
                              </Button>
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
        </TabsContent>

        {/* Journaux Tab */}
        <TabsContent value="journaux" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={journalCategorieFilter} onValueChange={setJournalCategorieFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes</SelectItem>
                    <SelectItem value="VENTE">Ventes</SelectItem>
                    <SelectItem value="STOCK">Stock</SelectItem>
                    <SelectItem value="RH">Ressources humaines</SelectItem>
                    <SelectItem value="FINANCE">Finance</SelectItem>
                    <SelectItem value="SECURITE">Sécurité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {journauxLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : journaux.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune entrée de journal</p>
                  <p className="text-sm text-muted-foreground mt-1">Les événements importants sont journalisés ici</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Utilisateur</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {journaux.map(j => (
                        <TableRow key={j.id}>
                          <TableCell className="text-sm font-mono">{formatDate(j.date)}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs">{j.categorie}</Badge></TableCell>
                          <TableCell className="max-w-[300px]">{j.description}</TableCell>
                          <TableCell className="text-sm">{j.utilisateur}</TableCell>
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

      {/* Detail Dialog */}
      {selectedLog && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Détail de l&apos;entrée d&apos;audit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-muted-foreground">Date & Heure</span>
                  <p className="font-medium text-sm">{formatDateTime(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Utilisateur</span>
                  <p className="font-medium text-sm">{selectedLog.utilisateur ? `${selectedLog.utilisateur.prenom} ${selectedLog.utilisateur.nom}` : selectedLog.userId || '—'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Action</span>
                  <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Entité</span>
                  <div className="mt-1">{getEntityBadge(selectedLog.entity)}</div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">ID entité</span>
                  <p className="font-mono text-sm">{selectedLog.entityId || '—'}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Adresse IP</span>
                  <p className="font-mono text-sm">{selectedLog.ipAddress || '—'}</p>
                </div>
              </div>
              {selectedLog.details && (
                <div>
                  <span className="text-sm text-muted-foreground">Détails</span>
                  <Card className="mt-1 bg-muted/50">
                    <CardContent className="p-3">
                      <pre className="text-xs whitespace-pre-wrap break-all">{selectedLog.details}</pre>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
