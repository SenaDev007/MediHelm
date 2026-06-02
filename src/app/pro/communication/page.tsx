'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
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
import { MessageSquare, Plus, Bell, Send, Megaphone, Search, Check, Mail, Smartphone, Monitor } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

interface NotificationItem {
  id: string
  titre: string
  message: string
  canal: string
  lu: boolean
  typeReference: string | null
  referenceId: string | null
  createdAt: string
  patient: { id: string; nom: string; prenom: string } | null
  utilisateur: { id: string; nom: string; prenom: string } | null
}

interface CampagneSMS {
  id: string
  titre: string
  message: string
  destinataires: string[]
  nbEnvoyes: number
  nbDelivres: number
  dateEnvoi: string
  statut: string
  createdAt: string
}

interface Patient {
  id: string
  nom: string
  prenom: string
  telephone: string | null
}

export default function CommunicationPage() {
  const { pharmacie } = useAuth()
  const [activeTab, setActiveTab] = useState('notifications')

  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [campagnes, setCampagnes] = useState<CampagneSMS[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [addNotifDialogOpen, setAddNotifDialogOpen] = useState(false)
  const [smsDialogOpen, setSmsDialogOpen] = useState(false)
  const [campagneDialogOpen, setCampagneDialogOpen] = useState(false)

  // Notification form
  const [notifTitre, setNotifTitre] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [notifCanal, setNotifCanal] = useState('IN_APP')
  const [notifPatientId, setNotifPatientId] = useState('')

  // SMS form
  const [smsPatientId, setSmsPatientId] = useState('')
  const [smsMessage, setSmsMessage] = useState('')

  // Campagne form
  const [campTitre, setCampTitre] = useState('')
  const [campMessage, setCampMessage] = useState('')
  const [campDestinataires, setCampDestinataires] = useState<string[]>([])

  const fetchAllData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [notifRes, campRes, patRes] = await Promise.all([
        fetch(`/api/notifications?pharmacieId=${pharmacie.id}`),
        fetch(`/api/campagnes-sms?pharmacieId=${pharmacie.id}`),
        fetch(`/api/patients?pharmacieId=${pharmacie.id}`),
      ])
      if (notifRes.ok) setNotifications(await notifRes.json())
      if (campRes.ok) setCampagnes(await campRes.json())
      if (patRes.ok) setPatients(await patRes.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [pharmacie?.id])

  const filteredNotifications = useMemo(() => {
    if (!search) return notifications
    const q = search.toLowerCase()
    return notifications.filter(n =>
      n.titre.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    )
  }, [notifications, search])

  const filteredCampagnes = useMemo(() => {
    if (!search) return campagnes
    const q = search.toLowerCase()
    return campagnes.filter(c =>
      c.titre.toLowerCase().includes(q) ||
      c.message.toLowerCase().includes(q)
    )
  }, [campagnes, search])

  const unreadCount = notifications.filter(n => !n.lu).length

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'PUSH': return <Bell className="w-3.5 h-3.5" />
      case 'SMS': return <Smartphone className="w-3.5 h-3.5" />
      case 'EMAIL': return <Mail className="w-3.5 h-3.5" />
      case 'IN_APP': return <Monitor className="w-3.5 h-3.5" />
      default: return <Bell className="w-3.5 h-3.5" />
    }
  }

  const getCanalBadge = (canal: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PUSH: { label: 'Push', className: 'bg-blue-100 text-blue-800 border-0' },
      SMS: { label: 'SMS', className: 'bg-green-100 text-green-800 border-0' },
      EMAIL: { label: 'Email', className: 'bg-purple-100 text-purple-800 border-0' },
      IN_APP: { label: 'In-App', className: 'bg-gray-100 text-gray-800 border-0' },
    }
    const info = map[canal] || { label: canal, className: 'bg-gray-100 text-gray-800 border-0' }
    return (
      <Badge className={`text-[9px] ${info.className}`}>
        <span className="mr-1">{getCanalIcon(canal)}</span>
        {info.label}
      </Badge>
    )
  }

  const getStatutCampagneBadge = (statut: string) => {
    const map: Record<string, { label: string; className: string }> = {
      BROUILLON: { label: 'Brouillon', className: 'bg-gray-100 text-gray-800 border-0' },
      ENVOYEE: { label: 'Envoyée', className: 'bg-blue-100 text-blue-800 border-0' },
      TERMINEE: { label: 'Terminée', className: 'bg-[#E1F5EE] text-[#085041] border-0' },
      ECHOUEE: { label: 'Échouée', className: 'bg-red-100 text-red-800 border-0' },
    }
    const info = map[statut] || { label: statut, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const handleMarkAsRead = async (id: string, lu: boolean) => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, lu }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu } : n))
        toast.success(lu ? 'Marqué comme lu' : 'Marqué comme non lu')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true, pharmacieId: pharmacie.id }),
      })
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, lu: true })))
        toast.success('Toutes les notifications marquées comme lues')
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  const handleAddNotification = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          titre: notifTitre,
          message: notifMessage,
          canal: notifCanal,
          patientId: notifPatientId || null,
        }),
      })
      if (res.ok) {
        toast.success('Notification créée avec succès')
        setAddNotifDialogOpen(false)
        resetNotifForm()
        fetchAllData()
      } else {
        toast.error('Erreur lors de la création de la notification')
      }
    } catch {
      toast.error('Erreur lors de la création de la notification')
    }
  }

  const handleSendSMS = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          titre: 'SMS Manuel',
          message: smsMessage,
          canal: 'SMS',
          patientId: smsPatientId || null,
        }),
      })
      if (res.ok) {
        toast.success('SMS envoyé avec succès')
        setSmsDialogOpen(false)
        setSmsPatientId('')
        setSmsMessage('')
        fetchAllData()
      } else {
        toast.error("Erreur lors de l'envoi du SMS")
      }
    } catch {
      toast.error("Erreur lors de l'envoi du SMS")
    }
  }

  const handleCreateCampagne = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/campagnes-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          titre: campTitre,
          message: campMessage,
          destinataires: campDestinataires,
        }),
      })
      if (res.ok) {
        toast.success('Campagne créée avec succès')
        setCampagneDialogOpen(false)
        resetCampagneForm()
        fetchAllData()
      } else {
        toast.error('Erreur lors de la création de la campagne')
      }
    } catch {
      toast.error('Erreur lors de la création de la campagne')
    }
  }

  const resetNotifForm = () => { setNotifTitre(''); setNotifMessage(''); setNotifCanal('IN_APP'); setNotifPatientId('') }
  const resetCampagneForm = () => { setCampTitre(''); setCampMessage(''); setCampDestinataires([]) }

  const toggleDestinataire = (id: string) => {
    setCampDestinataires(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const selectAllPatients = () => {
    if (campDestinataires.length === patients.length) {
      setCampDestinataires([])
    } else {
      setCampDestinataires(patients.map(p => p.id))
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-[#1D9E75]" />
            Communication
          </h1>
          <p className="text-sm text-muted-foreground">
            Notifications, SMS et campagnes
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Non lues</span>
                <span className="text-xl font-bold block text-amber-600">{unreadCount}</span>
              </div>
              <Bell className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total notifications</span>
                <span className="text-xl font-bold block">{notifications.length}</span>
              </div>
              <MessageSquare className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Campagnes</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{campagnes.length}</span>
              </div>
              <Megaphone className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="notifications" className="gap-1">
              <Bell className="w-3.5 h-3.5" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="ml-1 text-[8px] bg-red-500 text-white border-0 px-1.5 py-0">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sms" className="gap-1">
              <Send className="w-3.5 h-3.5" />
              SMS
            </TabsTrigger>
            <TabsTrigger value="campagnes" className="gap-1">
              <Megaphone className="w-3.5 h-3.5" />
              Campagnes
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'notifications' && (
              <div className="flex gap-1">
                <Button variant="outline" size="sm" className="gap-1" onClick={handleMarkAllAsRead}>
                  <Check className="w-3.5 h-3.5" /> Tout lire
                </Button>
                <Button className="gap-1 bg-[#1D9E75] hover:bg-[#085041]" size="sm" onClick={() => setAddNotifDialogOpen(true)}>
                  <Plus className="w-3.5 h-3.5" /> Créer
                </Button>
              </div>
            )}
            {activeTab === 'sms' && (
              <Button className="gap-1 bg-[#1D9E75] hover:bg-[#085041]" size="sm" onClick={() => setSmsDialogOpen(true)}>
                <Send className="w-3.5 h-3.5" /> Envoyer SMS
              </Button>
            )}
            {activeTab === 'campagnes' && (
              <Button className="gap-1 bg-[#1D9E75] hover:bg-[#085041]" size="sm" onClick={() => setCampagneDialogOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Campagne
              </Button>
            )}
          </div>
        </div>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Titre</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-center">Canal</TableHead>
                      <TableHead>Destinataire</TableHead>
                      <TableHead className="text-center">Lu</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotifications.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune notification trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotifications.map(n => (
                        <TableRow key={n.id} className={`hover:bg-muted/30 ${!n.lu ? 'bg-[#E1F5EE]/30' : ''}`}>
                          <TableCell>
                            {!n.lu && <div className="w-2 h-2 rounded-full bg-[#1D9E75] mx-auto" />}
                          </TableCell>
                          <TableCell>
                            <span className={`text-sm ${!n.lu ? 'font-semibold' : 'font-medium'}`}>{n.titre}</span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                            {n.message}
                          </TableCell>
                          <TableCell className="text-center">{getCanalBadge(n.canal)}</TableCell>
                          <TableCell className="text-sm">
                            {n.patient ? `${n.patient.nom} ${n.patient.prenom}` : n.utilisateur ? `${n.utilisateur.prenom} ${n.utilisateur.nom}` : '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            {n.lu ? (
                              <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Lu</Badge>
                            ) : (
                              <Badge className="text-[9px] bg-amber-100 text-amber-800 border-0">Non lu</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(n.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkAsRead(n.id, !n.lu)}
                              title={n.lu ? 'Marquer comme non lu' : 'Marquer comme lu'}
                            >
                              {n.lu ? <Mail className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SMS Tab */}
        <TabsContent value="sms" className="mt-4">
          <Card>
            <CardContent className="p-6">
              <div className="text-center max-w-md mx-auto">
                <Smartphone className="w-12 h-12 text-[#1D9E75]/30 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Envoyer un SMS rapide</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  Envoyez un SMS individuel à un patient de votre pharmacie
                </p>
                <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setSmsDialogOpen(true)}>
                  <Send className="w-4 h-4" />
                  Nouveau SMS
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent SMS notifications */}
          {notifications.filter(n => n.canal === 'SMS').length > 0 && (
            <Card className="mt-4">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Destinataire</TableHead>
                        <TableHead>Message</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-center">Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {notifications
                        .filter(n => n.canal === 'SMS')
                        .slice(0, 10)
                        .map(n => (
                          <TableRow key={n.id} className="hover:bg-muted/30">
                            <TableCell className="text-sm">
                              {n.patient ? `${n.patient.nom} ${n.patient.prenom}` : '—'}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                              {n.message}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-center">
                              {n.lu ? (
                                <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Délivré</Badge>
                              ) : (
                                <Badge className="text-[9px] bg-amber-100 text-amber-800 border-0">En attente</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Campagnes Tab */}
        <TabsContent value="campagnes" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campagne</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="text-center">Destinataires</TableHead>
                      <TableHead className="text-center">Envoyés</TableHead>
                      <TableHead className="text-center">Délivrés</TableHead>
                      <TableHead>Date envoi</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCampagnes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucune campagne trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCampagnes.map(c => (
                        <TableRow key={c.id} className="hover:bg-muted/30">
                          <TableCell className="font-medium text-sm">{c.titre}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[250px] truncate">{c.message}</TableCell>
                          <TableCell className="text-center text-sm">{c.destinataires.length}</TableCell>
                          <TableCell className="text-center text-sm">{c.nbEnvoyes}</TableCell>
                          <TableCell className="text-center text-sm font-medium text-[#1D9E75]">{c.nbDelivres}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(c.dateEnvoi).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-center">{getStatutCampagneBadge(c.statut)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Notification Dialog */}
      <Dialog open={addNotifDialogOpen} onOpenChange={setAddNotifDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Créer une notification</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input placeholder="Titre de la notification" value={notifTitre} onChange={e => setNotifTitre(e.target.value)} />
            </div>
            <div>
              <Label>Message *</Label>
              <Input placeholder="Contenu du message" value={notifMessage} onChange={e => setNotifMessage(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Canal</Label>
                <Select value={notifCanal} onValueChange={setNotifCanal}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN_APP">In-App</SelectItem>
                    <SelectItem value="PUSH">Push</SelectItem>
                    <SelectItem value="SMS">SMS</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Patient</Label>
                <Select value={notifPatientId} onValueChange={setNotifPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optionnel" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nom} {p.prenom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddNotification}>
              Créer la notification
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send SMS Dialog */}
      <Dialog open={smsDialogOpen} onOpenChange={setSmsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Envoyer un SMS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Patient *</Label>
              <Select value={smsPatientId} onValueChange={setSmsPatientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un patient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nom} {p.prenom} {p.telephone ? `(${p.telephone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message *</Label>
              <Input
                placeholder="Votre message..."
                value={smsMessage}
                onChange={e => setSmsMessage(e.target.value)}
                maxLength={160}
              />
              <span className="text-xs text-muted-foreground">{smsMessage.length}/160</span>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleSendSMS}>
              <Send className="w-4 h-4 mr-2" />
              Envoyer le SMS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Campagne Dialog */}
      <Dialog open={campagneDialogOpen} onOpenChange={setCampagneDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer une campagne SMS</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Titre *</Label>
              <Input placeholder="Titre de la campagne" value={campTitre} onChange={e => setCampTitre(e.target.value)} />
            </div>
            <div>
              <Label>Message *</Label>
              <Input
                placeholder="Message de la campagne..."
                value={campMessage}
                onChange={e => setCampMessage(e.target.value)}
                maxLength={160}
              />
              <span className="text-xs text-muted-foreground">{campMessage.length}/160</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Destinataires ({campDestinataires.length} sélectionnés)</Label>
                <Button variant="ghost" size="sm" className="text-xs" onClick={selectAllPatients}>
                  {campDestinataires.length === patients.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-1">
                {patients.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun patient disponible</p>
                ) : (
                  patients.map(p => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={campDestinataires.includes(p.id)}
                        onChange={() => toggleDestinataire(p.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{p.nom} {p.prenom}</span>
                      {p.telephone && (
                        <span className="text-xs text-muted-foreground ml-auto">{p.telephone}</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleCreateCampagne} disabled={campDestinataires.length === 0}>
              <Megaphone className="w-4 h-4 mr-2" />
              Créer et envoyer la campagne
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
