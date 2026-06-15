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
import { Progress } from '@/components/ui/progress'
import {
  MessageSquare,
  Bell,
  Plus,
  Search,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  Eye,
  BarChart3,
  Smartphone,
  Users,
  Clock,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface CampagneSms {
  id: string
  pharmacieId: string
  titre: string
  message: string
  destinataires: number
  envoyes: number
  statut: string
  dateEnvoi: string | null
  createdAt: string
}

interface Notification {
  id: string
  userId: string
  titre: string
  message: string
  type: string
  lue: boolean
  createdAt: string
}

// === Helpers ===

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getCampagneStatutBadge(statut: string) {
  switch (statut) {
    case 'BROUILLON':
      return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100 border-0 text-xs">Brouillon</Badge>
    case 'ENVOYEE':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Envoyée</Badge>
    case 'EN_COURS':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">En cours</Badge>
    case 'ECHOUEE':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Échouée</Badge>
    case 'PLANIFIEE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Planifiée</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{statut}</Badge>
  }
}

function getTypeNotifBadge(type: string) {
  switch (type) {
    case 'INFO':
      return <Badge className="bg-sky-100 text-sky-700 hover:bg-sky-100 border-0 text-xs">Info</Badge>
    case 'ALERTE':
      return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 text-xs">Alerte</Badge>
    case 'URGENT':
      return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-0 text-xs">Urgent</Badge>
    case 'PROMO':
      return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-0 text-xs">Promo</Badge>
    default:
      return <Badge variant="outline" className="text-xs">{type}</Badge>
  }
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      ))}
    </div>
  )
}

// === Main Component ===

export default function CommunicationPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('sms')

  const [campagnes, setCampagnes] = useState<CampagneSms[]>([])
  const [smsLoading, setSmsLoading] = useState(true)
  const [smsSearch, setSmsSearch] = useState('')
  const [smsStatutFilter, setSmsStatutFilter] = useState('all')

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSearch, setNotifSearch] = useState('')
  const [notifTypeFilter, setNotifTypeFilter] = useState('all')

  // Dialogs
  const [smsDialogOpen, setSmsDialogOpen] = useState(false)
  const [notifDialogOpen, setNotifDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [smsForm, setSmsForm] = useState({
    titre: '',
    message: '',
    destinataires: '',
    dateEnvoi: '',
  })

  const [notifForm, setNotifForm] = useState({
    titre: '',
    message: '',
    type: 'INFO',
  })

  const fetchCampagnes = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (smsStatutFilter !== 'all') params.set('statut', smsStatutFilter)
      const res = await fetch(`/api/campagnes-sms?${params}`)
      if (res.ok) {
        const json = await res.json()
        setCampagnes(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      toast.error('Erreur lors du chargement')
    } finally {
      setSmsLoading(false)
    }
  }, [pharmacieId, smsStatutFilter])

  const fetchNotifications = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const params = new URLSearchParams({ pharmacieId })
      if (notifTypeFilter !== 'all') params.set('type', notifTypeFilter)
      const res = await fetch(`/api/notifications?${params}`)
      if (res.ok) {
        const json = await res.json()
        setNotifications(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setNotifLoading(false)
    }
  }, [pharmacieId, notifTypeFilter])

  useEffect(() => { fetchCampagnes() }, [fetchCampagnes])
  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  const stats = useMemo(() => {
    const totalEnvoyes = campagnes.reduce((s, c) => s + c.envoyes, 0)
    const totalDestinataires = campagnes.reduce((s, c) => s + c.destinataires, 0)
    const notifNonLues = notifications.filter(n => !n.lue).length
    return { totalEnvoyes, totalDestinataires, notifNonLues, tauxLivraison: totalDestinataires > 0 ? Math.round((totalEnvoyes / totalDestinataires) * 100) : 0 }
  }, [campagnes, notifications])

  const filteredCampagnes = useMemo(() => {
    if (!smsSearch) return campagnes
    const s = smsSearch.toLowerCase()
    return campagnes.filter(c =>
      (c.titre || '').toLowerCase().includes(s) ||
      (c.message || '').toLowerCase().includes(s)
    )
  }, [campagnes, smsSearch])

  const filteredNotifs = useMemo(() => {
    if (!notifSearch) return notifications
    const s = notifSearch.toLowerCase()
    return notifications.filter(n =>
      (n.titre || '').toLowerCase().includes(s) ||
      (n.message || '').toLowerCase().includes(s)
    )
  }, [notifications, notifSearch])

  async function handleSubmitSms() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const body: Record<string, unknown> = {
        pharmacieId,
        titre: smsForm.titre,
        message: smsForm.message,
        destinataires: parseInt(smsForm.destinataires) || 0,
        statut: smsForm.dateEnvoi ? 'PLANIFIEE' : 'BROUILLON',
      }
      if (smsForm.dateEnvoi) body.dateEnvoi = smsForm.dateEnvoi

      const res = await fetch('/api/campagnes-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        toast.success('Campagne SMS créée')
        setSmsDialogOpen(false)
        setSmsForm({ titre: '', message: '', destinataires: '', dateEnvoi: '' })
        fetchCampagnes()
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

  async function handleSubmitNotif() {
    if (!pharmacieId) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId,
          titre: notifForm.titre,
          message: notifForm.message,
          type: notifForm.type,
        }),
      })
      if (res.ok) {
        toast.success('Notification envoyée')
        setNotifDialogOpen(false)
        setNotifForm({ titre: '', message: '', type: 'INFO' })
        fetchNotifications()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSendCampagne(id: string) {
    try {
      const res = await fetch(`/api/campagnes-sms`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, statut: 'EN_COURS', dateEnvoi: new Date().toISOString() }),
      })
      if (res.ok) {
        toast.success('Campagne envoyée')
        fetchCampagnes()
      } else {
        toast.error('Erreur lors de l\'envoi')
      }
    } catch {
      toast.error('Erreur lors de l\'envoi')
    }
  }

  async function handleMarkNotifRead(id: string) {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, lue: true }),
      })
      if (res.ok) {
        fetchNotifications()
      }
    } catch {
      // silent
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Communication</h1>
          <p className="text-muted-foreground text-sm">SMS, notifications push et statistiques</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setSmsDialogOpen(true)} className="gap-2">
            <MessageSquare className="w-4 h-4" /> Nouvelle campagne SMS
          </Button>
          <Button variant="outline" onClick={() => setNotifDialogOpen(true)} className="gap-2">
            <Bell className="w-4 h-4" /> Notification push
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="SMS envoyés" value={stats.totalEnvoyes} icon={Send} variant="default" />
        <KpiCard title="Destinataires" value={stats.totalDestinataires} icon={Users} variant="default" />
        <KpiCard title="Taux livraison" value={`${stats.tauxLivraison}%`} icon={BarChart3} variant="success" />
        <KpiCard title="Notif. non lues" value={stats.notifNonLues} icon={Bell} variant="warning" />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="sms" className="gap-2"><MessageSquare className="w-4 h-4" /> Campagnes SMS</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="w-4 h-4" /> Notifications</TabsTrigger>
          <TabsTrigger value="stats" className="gap-2"><BarChart3 className="w-4 h-4" /> Statistiques</TabsTrigger>
        </TabsList>

        {/* SMS Tab */}
        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher une campagne..." value={smsSearch} onChange={e => setSmsSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={smsStatutFilter} onValueChange={setSmsStatutFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="BROUILLON">Brouillon</SelectItem>
                    <SelectItem value="ENVOYEE">Envoyée</SelectItem>
                    <SelectItem value="EN_COURS">En cours</SelectItem>
                    <SelectItem value="PLANIFIEE">Planifiée</SelectItem>
                    <SelectItem value="ECHOUEE">Échouée</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {smsLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredCampagnes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <MessageSquare className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune campagne SMS</p>
                  <p className="text-sm text-muted-foreground mt-1">Créez votre première campagne</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Destinataires</TableHead>
                        <TableHead>Envoyés</TableHead>
                        <TableHead>Taux</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCampagnes.map(c => {
                        const taux = c.destinataires > 0 ? Math.round((c.envoyes / c.destinataires) * 100) : 0
                        return (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{c.titre}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-sm">{c.message}</TableCell>
                            <TableCell>{c.destinataires}</TableCell>
                            <TableCell>{c.envoyes}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={taux} className="w-16 h-2" />
                                <span className="text-xs">{taux}%</span>
                              </div>
                            </TableCell>
                            <TableCell>{getCampagneStatutBadge(c.statut)}</TableCell>
                            <TableCell className="text-right">
                              {c.statut === 'BROUILLON' && (
                                <Button size="sm" variant="outline" className="gap-1" onClick={() => handleSendCampagne(c.id)}>
                                  <Send className="w-3 h-3" /> Envoyer
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Rechercher une notification..." value={notifSearch} onChange={e => setNotifSearch(e.target.value)} className="pl-9" />
                </div>
                <Select value={notifTypeFilter} onValueChange={setNotifTypeFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="ALERTE">Alerte</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="PROMO">Promo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              {notifLoading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : filteredNotifs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Titre</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Lu</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNotifs.map(n => (
                        <TableRow key={n.id} className={!n.lue ? 'bg-amber-50/50' : ''}>
                          <TableCell className="font-medium">{n.titre}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-sm">{n.message}</TableCell>
                          <TableCell>{getTypeNotifBadge(n.type)}</TableCell>
                          <TableCell className="text-sm">{formatDate(n.createdAt)}</TableCell>
                          <TableCell>
                            {n.lue
                              ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              : <XCircle className="w-4 h-4 text-amber-500" />
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {!n.lue && (
                              <Button size="sm" variant="ghost" onClick={() => handleMarkNotifRead(n.id)}>
                                <Eye className="w-3 h-3" />
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

        {/* Stats Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Performance SMS</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Envoyés</span>
                      <span className="font-medium">{stats.totalEnvoyes}</span>
                    </div>
                    <Progress value={stats.totalDestinataires > 0 ? (stats.totalEnvoyes / stats.totalDestinataires) * 100 : 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Taux de livraison</span>
                      <span className="font-medium">{stats.tauxLivraison}%</span>
                    </div>
                    <Progress value={stats.tauxLivraison} className="h-2" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4">
                    <div className="text-center p-3 rounded-lg bg-emerald-50">
                      <p className="text-lg font-bold text-emerald-600">{stats.totalEnvoyes}</p>
                      <p className="text-xs text-muted-foreground">Délivrés</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-amber-50">
                      <p className="text-lg font-bold text-amber-600">{stats.totalDestinataires - stats.totalEnvoyes}</p>
                      <p className="text-xs text-muted-foreground">En attente</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-sky-50">
                      <p className="text-lg font-bold text-sky-600">{campagnes.length}</p>
                      <p className="text-xs text-muted-foreground">Campagnes</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Notifications push</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 rounded-lg bg-sky-50">
                      <p className="text-2xl font-bold text-sky-600">{notifications.length}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center p-4 rounded-lg bg-amber-50">
                      <p className="text-2xl font-bold text-amber-600">{stats.notifNonLues}</p>
                      <p className="text-xs text-muted-foreground">Non lues</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {['INFO', 'ALERTE', 'URGENT', 'PROMO'].map(type => {
                      const count = notifications.filter(n => n.type === type).length
                      return (
                        <div key={type} className="flex items-center justify-between text-sm">
                          <span>{getTypeNotifBadge(type)}</span>
                          <span className="font-medium">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle campagne SMS</DialogTitle>
            <DialogDescription>Créez et envoyez une campagne SMS</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sms-titre">Titre *</Label>
              <Input id="sms-titre" value={smsForm.titre} onChange={e => setSmsForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la campagne" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sms-message">Message *</Label>
              <Textarea id="sms-message" value={smsForm.message} onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))} placeholder="Contenu du SMS..." rows={4} maxLength={160} />
              <p className="text-xs text-muted-foreground text-right">{smsForm.message.length}/160</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-dest">Nombre de destinataires</Label>
                <Input id="sms-dest" type="number" value={smsForm.destinataires} onChange={e => setSmsForm(f => ({ ...f, destinataires: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-date">Date d&apos;envoi (optionnel)</Label>
                <Input id="sms-date" type="datetime-local" value={smsForm.dateEnvoi} onChange={e => setSmsForm(f => ({ ...f, dateEnvoi: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSmsDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitSms} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Dialog */}
      <Dialog open={notifDialogOpen} onOpenChange={setNotifDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Envoyer une notification</DialogTitle>
            <DialogDescription>Envoyez une notification push aux utilisateurs</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nf-titre">Titre *</Label>
              <Input id="nf-titre" value={notifForm.titre} onChange={e => setNotifForm(f => ({ ...f, titre: e.target.value }))} placeholder="Titre de la notification" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nf-message">Message *</Label>
              <Textarea id="nf-message" value={notifForm.message} onChange={e => setNotifForm(f => ({ ...f, message: e.target.value }))} placeholder="Contenu de la notification..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={notifForm.type} onValueChange={v => setNotifForm(f => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="ALERTE">Alerte</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                  <SelectItem value="PROMO">Promo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSubmitNotif} disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Envoyer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
