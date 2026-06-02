'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { UserCog, Plus, Search, Phone, Mail, Calendar, Clock, CheckCircle2, XCircle, FileText, Edit2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Employe {
  id: string
  nom: string
  prenom: string
  poste: string
  typeContrat: string
  dateEmbauche: string
  dateFinContrat: string | null
  salaireBase: number | null
  telephone: string | null
  email: string | null
  actif: boolean
  sexe?: string | null
  adresse?: string | null
  dateNaissance?: string | null
}

interface Planning {
  id: string
  employeId: string
  date: string
  heureDebut: string
  heureFin: string
  poste: string
  employe: { id: string; nom: string; prenom: string; poste: string }
}

interface Conge {
  id: string
  employeId: string
  typeConge: string
  dateDebut: string
  dateFin: string
  statut: string
  motif: string | null
  employe: { id: string; nom: string; prenom: string; poste: string }
}

interface Presence {
  id: string
  employeId: string
  date: string
  heureArrivee: string
  heureDepart: string | null
  statut: string
  employe: { id: string; nom: string; prenom: string; poste: string }
}

interface BulletinPaie {
  id: string
  employeId: string
  mois: number
  annee: number
  salaireBrut: number
  cotisations: number
  salaireNet: number
  prime: number | null
  avance: number | null
  employe: { id: string; nom: string; prenom: string; poste: string }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

const contratLabels: Record<string, string> = {
  CDI: 'CDI',
  CDD: 'CDD',
  STAGE: 'Stage',
  TEMPORAIRE: 'Temporaire',
}

const congeStatutConfig: Record<string, { label: string; color: string }> = {
  DEMANDE: { label: 'Demandé', color: 'bg-amber-400 text-gray-900' },
  VALIDE: { label: 'Validé', color: 'bg-primary text-white' },
  REFUSE: { label: 'Refusé', color: 'bg-destructive text-white' },
  EN_COURS: { label: 'En cours', color: 'bg-blue-500 text-white' },
  TERMINE: { label: 'Terminé', color: 'bg-gray-400 text-white' },
}

const posteColorConfig: Record<string, { bg: string; text: string; border: string }> = {
  PHARMACIEN: { bg: 'bg-primary/15', text: 'text-primary', border: 'border-primary/30' },
  CAISSIER: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  MAGASINIER: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  PREPARATEUR: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  STAGIAIRE: { bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' },
}

function getPosteColor(poste: string) {
  const key = Object.keys(posteColorConfig).find(k => poste.toUpperCase().includes(k))
  return key ? posteColorConfig[key] : { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' }
}

const congeTypeLabels: Record<string, string> = {
  CONGE_ANNUEL: 'Congé annuel',
  CONGE_MALADIE: 'Congé maladie',
  CONGE_MATERNITE: 'Congé maternité',
  CONGE_SANS_SOLDE: 'Sans solde',
  PERMISSION: 'Permission',
}

export default function PersonnelPage() {
  const { pharmacie } = useAuth()
  const [employes, setEmployes] = useState<Employe[]>([])
  const [plannings, setPlannings] = useState<Planning[]>([])
  const [conges, setConges] = useState<Conge[]>([])
  const [presences, setPresences] = useState<Presence[]>([])
  const [bulletins, setBulletins] = useState<BulletinPaie[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('employes')

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [selectedEmploye, setSelectedEmploye] = useState<Employe | null>(null)
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)
  const [congeDialogOpen, setCongeDialogOpen] = useState(false)
  const [presenceDialogOpen, setPresenceDialogOpen] = useState(false)
  const [bulletinDialogOpen, setBulletinDialogOpen] = useState(false)

  // Create employee form
  const [formNom, setFormNom] = useState('')
  const [formPrenom, setFormPrenom] = useState('')
  const [formPoste, setFormPoste] = useState('')
  const [formTelephone, setFormTelephone] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formTypeContrat, setFormTypeContrat] = useState('')
  const [formSalaire, setFormSalaire] = useState('')

  // Edit form
  const [editNom, setEditNom] = useState('')
  const [editPrenom, setEditPrenom] = useState('')
  const [editPoste, setEditPoste] = useState('')
  const [editTelephone, setEditTelephone] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editSalaire, setEditSalaire] = useState('')

  // Planning form
  const [planEmployeId, setPlanEmployeId] = useState('')
  const [planDate, setPlanDate] = useState('')
  const [planHeureDebut, setPlanHeureDebut] = useState('08:00')
  const [planHeureFin, setPlanHeureFin] = useState('17:00')
  const [planPoste, setPlanPoste] = useState('')

  // Congé form
  const [congeEmployeId, setCongeEmployeId] = useState('')
  const [congeType, setCongeType] = useState('CONGE_ANNUEL')
  const [congeDateDebut, setCongeDateDebut] = useState('')
  const [congeDateFin, setCongeDateFin] = useState('')
  const [congeMotif, setCongeMotif] = useState('')

  // Presence form
  const [presEmployeId, setPresEmployeId] = useState('')
  const [presDate, setPresDate] = useState(new Date().toISOString().split('T')[0])
  const [presHeureArrivee, setPresHeureArrivee] = useState('')

  // Bulletin form
  const [bulEmployeId, setBulEmployeId] = useState('')
  const [bulMois, setBulMois] = useState('')
  const [bulAnnee, setBulAnnee] = useState('')

  // Planning week navigation
  const [planningWeekOffset, setPlanningWeekOffset] = useState(0)

  // Bulletin filtering
  const [bulFilterMois, setBulFilterMois] = useState<string>('all')
  const [bulFilterAnnee, setBulFilterAnnee] = useState<string>('all')

  // Congé filtering
  const [congeFilterStatut, setCongeFilterStatut] = useState<string>('all')

  const refreshData = async () => {
    if (!pharmacie?.id) return
    const [emps, plans, cgs, pres, bulls] = await Promise.all([
      fetch(`/api/employes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/plannings?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/conges?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/presences?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      fetch(`/api/bulletins-paie?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
    ])
    setEmployes(emps)
    setPlannings(plans)
    setConges(cgs)
    setPresences(pres)
    setBulletins(bulls)
    setLoading(false)
  }

  useEffect(() => {
    if (pharmacie?.id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshData()
    }
  }, [pharmacie?.id])

  const filtered = useMemo(() => {
    if (!search) return employes
    const q = search.toLowerCase()
    return employes.filter(e =>
      e.nom.toLowerCase().includes(q) ||
      e.prenom.toLowerCase().includes(q) ||
      e.poste.toLowerCase().includes(q)
    )
  }, [employes, search])

  // Create employee
  const handleAddEmployee = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/employes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: formNom,
          prenom: formPrenom,
          poste: formPoste,
          telephone: formTelephone || null,
          email: formEmail || null,
          typeContrat: formTypeContrat || 'CDD',
          dateEmbauche: new Date().toISOString(),
          salaireBase: formSalaire ? parseFloat(formSalaire) : null,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Employé ajouté avec succès')
        setCreateOpen(false)
        setFormNom(''); setFormPrenom(''); setFormPoste('')
        setFormTelephone(''); setFormEmail(''); setFormTypeContrat(''); setFormSalaire('')
        refreshData()
      } else {
        toast.error("Erreur lors de l'ajout de l'employé")
      }
    } catch {
      toast.error("Erreur lors de l'ajout de l'employé")
    }
  }

  // Edit employee
  const handleEditEmployee = async () => {
    if (!selectedEmploye) return
    try {
      const res = await fetch(`/api/employes/${selectedEmploye.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: editNom,
          prenom: editPrenom,
          poste: editPoste,
          telephone: editTelephone || null,
          email: editEmail || null,
          salaireBase: editSalaire ? parseFloat(editSalaire) : null,
        }),
      })
      if (res.ok) {
        toast.success('Employé mis à jour')
        setEditOpen(false)
        refreshData()
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // Create planning
  const handleCreatePlanning = async () => {
    if (!pharmacie?.id || !planEmployeId || !planDate) return
    try {
      const res = await fetch('/api/plannings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          employeId: planEmployeId,
          date: planDate,
          heureDebut: new Date(`${planDate}T${planHeureDebut}`).toISOString(),
          heureFin: new Date(`${planDate}T${planHeureFin}`).toISOString(),
          poste: planPoste || 'PHARMACIEN',
        }),
      })
      if (res.ok) {
        toast.success('Planning ajouté')
        setPlanningDialogOpen(false)
        setPlanEmployeId(''); setPlanDate(''); setPlanPoste('')
        refreshData()
      }
    } catch {
      toast.error('Erreur lors de la création du planning')
    }
  }

  // Create congé
  const handleCreateConge = async () => {
    if (!pharmacie?.id || !congeEmployeId) return
    try {
      const res = await fetch('/api/conges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          employeId: congeEmployeId,
          typeConge: congeType,
          dateDebut: congeDateDebut,
          dateFin: congeDateFin,
          motif: congeMotif || null,
        }),
      })
      if (res.ok) {
        toast.success('Demande de congé enregistrée')
        setCongeDialogOpen(false)
        setCongeEmployeId(''); setCongeDateDebut(''); setCongeDateFin(''); setCongeMotif('')
        refreshData()
      }
    } catch {
      toast.error('Erreur lors de la demande de congé')
    }
  }

  // Approve/refuse congé
  const handleCongeAction = async (congeId: string, statut: string) => {
    try {
      const res = await fetch('/api/conges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: congeId, statut, approuvePar: 'demo-admin' }),
      })
      if (res.ok) {
        toast.success(statut === 'VALIDE' ? 'Congé approuvé' : 'Congé refusé')
        refreshData()
      }
    } catch {
      toast.error('Erreur lors de la mise à jour')
    }
  }

  // Create presence
  const handleCreatePresence = async () => {
    if (!pharmacie?.id || !presEmployeId) return
    try {
      const res = await fetch('/api/presences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          employeId: presEmployeId,
          date: presDate,
          heureArrivee: presHeureArrivee ? new Date(`${presDate}T${presHeureArrivee}`).toISOString() : new Date().toISOString(),
          statut: 'PRESENT',
        }),
      })
      if (res.ok) {
        toast.success('Présence enregistrée')
        setPresenceDialogOpen(false)
        setPresEmployeId(''); setPresHeureArrivee('')
        refreshData()
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  // Generate bulletin
  const handleGenerateBulletin = async () => {
    if (!pharmacie?.id || !bulEmployeId || !bulMois || !bulAnnee) return
    const emp = employes.find(e => e.id === bulEmployeId)
    if (!emp) return
    try {
      const salaireBrut = emp.salaireBase || 0
      const cotisations = salaireBrut * 0.18
      const res = await fetch('/api/bulletins-paie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          employeId: bulEmployeId,
          mois: parseInt(bulMois),
          annee: parseInt(bulAnnee),
          salaireBrut,
          cotisations,
        }),
      })
      if (res.ok) {
        toast.success('Bulletin de paie généré')
        setBulletinDialogOpen(false)
        setBulEmployeId(''); setBulMois(''); setBulAnnee('')
        refreshData()
      }
    } catch {
      toast.error('Erreur lors de la génération')
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UserCog className="w-6 h-6 text-primary" />
            Personnel
          </h1>
          <p className="text-sm text-muted-foreground">{employes.length} employés • {employes.filter(e => e.actif).length} actifs</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4" /> Nouvel employé</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nouvel employé</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Nom</Label><Input placeholder="Nom" value={formNom} onChange={e => setFormNom(e.target.value)} /></div>
                <div><Label>Prénom</Label><Input placeholder="Prénom" value={formPrenom} onChange={e => setFormPrenom(e.target.value)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Poste</Label><Input placeholder="Pharmacien, Préparateur..." value={formPoste} onChange={e => setFormPoste(e.target.value)} /></div>
                <div>
                  <Label>Type de contrat</Label>
                  <Select value={formTypeContrat} onValueChange={setFormTypeContrat}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDI">CDI</SelectItem>
                      <SelectItem value="CDD">CDD</SelectItem>
                      <SelectItem value="STAGE">Stage</SelectItem>
                      <SelectItem value="TEMPORAIRE">Temporaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Téléphone</Label><Input placeholder="+229..." value={formTelephone} onChange={e => setFormTelephone(e.target.value)} /></div>
                <div><Label>Email</Label><Input placeholder="email@example.com" value={formEmail} onChange={e => setFormEmail(e.target.value)} /></div>
              </div>
              <div><Label>Salaire base (FCFA)</Label><Input type="number" placeholder="0" value={formSalaire} onChange={e => setFormSalaire(e.target.value)} /></div>
              <Button className="w-full" onClick={handleAddEmployee}>Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="employes">Employés</TabsTrigger>
          <TabsTrigger value="planning">Planning</TabsTrigger>
          <TabsTrigger value="conges">Congés ({conges.filter(c => c.statut === 'DEMANDE').length})</TabsTrigger>
          <TabsTrigger value="presences">Présences</TabsTrigger>
          <TabsTrigger value="paie">Bulletins de paie</TabsTrigger>
        </TabsList>

        {/* === EMPLOYES TAB === */}
        <TabsContent value="employes" className="space-y-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher un employé..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.length === 0 ? (
              <Card className="col-span-full"><CardContent className="py-12 text-center text-muted-foreground">Aucun employé trouvé</CardContent></Card>
            ) : (
              filtered.map(emp => (
                <Card key={emp.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setSelectedEmploye(emp); setDetailOpen(true) }}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                        {emp.prenom[0]}{emp.nom[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{emp.prenom} {emp.nom}</span>
                          {!emp.actif && <Badge variant="outline" className="text-[9px]">Inactif</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground block">{emp.poste}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-[9px]">{contratLabels[emp.typeContrat] || emp.typeContrat}</Badge>
                          {emp.salaireBase && <span className="text-xs text-muted-foreground">{formatFCFA(emp.salaireBase)}</span>}
                        </div>
                        <div className="flex flex-col gap-0.5 mt-1.5">
                          {emp.telephone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="w-3 h-3" />{emp.telephone}</span>}
                          {emp.email && <span className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="w-3 h-3" />{emp.email}</span>}
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" />Embauche: {formatDate(emp.dateEmbauche)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* === PLANNING TAB === */}
        <TabsContent value="planning" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPlanningWeekOffset(planningWeekOffset - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <h2 className="text-lg font-semibold">
                {(() => {
                  const today = new Date()
                  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
                  const weekStart = new Date(today)
                  weekStart.setDate(today.getDate() - dayOfWeek + planningWeekOffset * 7)
                  const weekEnd = new Date(weekStart)
                  weekEnd.setDate(weekStart.getDate() + 6)
                  return `${weekStart.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`
                })()}
              </h2>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPlanningWeekOffset(planningWeekOffset + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              {planningWeekOffset !== 0 && (
                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPlanningWeekOffset(0)}>
                  Cette semaine
                </Button>
              )}
            </div>
            <Button className="gap-2" onClick={() => setPlanningDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Ajouter shift
            </Button>
          </div>

          {/* Legend */}
          <div className="flex gap-3 flex-wrap">
            {Object.entries(posteColorConfig).map(([key, config]) => (
              <div key={key} className="flex items-center gap-1.5">
                <div className={`w-3 h-3 rounded ${config.bg} border ${config.border}`} />
                <span className="text-[10px] text-muted-foreground capitalize">{key.toLowerCase()}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <Card>
            <CardContent className="p-4 overflow-x-auto">
              <div className="grid grid-cols-7 gap-1 min-w-[700px]">
                {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map(jour => (
                  <div key={jour} className="text-center text-xs font-semibold text-muted-foreground py-2 border-b">
                    {jour}
                  </div>
                ))}
                {(() => {
                  const today = new Date()
                  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1
                  const weekStart = new Date(today)
                  weekStart.setDate(today.getDate() - dayOfWeek + planningWeekOffset * 7)
                  
                  return Array.from({ length: 7 }, (_, i) => {
                    const day = new Date(weekStart)
                    day.setDate(weekStart.getDate() + i)
                    const dateStr = day.toISOString().split('T')[0]
                    const dayPlannings = plannings.filter(p => new Date(p.date).toISOString().split('T')[0] === dateStr)
                    const isToday = dateStr === new Date().toISOString().split('T')[0]

                    return (
                      <div key={i} className={`min-h-24 border rounded-lg p-1 ${isToday ? 'bg-primary/5 border-primary/30' : ''}`}>
                        <div className={`text-[10px] text-center mb-1 ${isToday ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
                          {day.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </div>
                        {dayPlannings.map(p => {
                          const colors = getPosteColor(p.poste)
                          return (
                            <div key={p.id} className={`text-[9px] rounded p-1 mb-0.5 border ${colors.bg} ${colors.text} ${colors.border}`}>
                              <div className="font-medium">{p.employe.prenom} {p.employe.nom[0]}.</div>
                              <div>{new Date(p.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}-{new Date(p.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === CONGES TAB === */}
        <TabsContent value="conges" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Demandes de congé</h2>
            <Button className="gap-2" onClick={() => setCongeDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Demander un congé
            </Button>
          </div>

          {/* Statut filter */}
          <div className="flex gap-1.5 flex-wrap">
            {Object.entries({ all: 'Toutes', ...Object.fromEntries(Object.entries(congeStatutConfig).map(([k, v]) => [k, v.label])) }).map(([key, label]) => {
              const count = key === 'all' ? conges.length : conges.filter(c => c.statut === key).length
              return (
                <Badge
                  key={key}
                  variant={congeFilterStatut === key ? 'default' : 'secondary'}
                  className={`cursor-pointer text-xs ${congeFilterStatut === key ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'}`}
                  onClick={() => setCongeFilterStatut(key)}
                >
                  {label} ({count})
                </Badge>
              )
            })}
          </div>

          <div className="space-y-2">
            {(() => {
              const filteredConges = congeFilterStatut === 'all' ? conges : conges.filter(c => c.statut === congeFilterStatut)
              return filteredConges.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">Aucune demande de congé{congeFilterStatut !== 'all' ? ` avec le statut ${congeStatutConfig[congeFilterStatut]?.label || congeFilterStatut}` : ''}</CardContent></Card>
              ) : (
                filteredConges.map(c => {
                  const config = congeStatutConfig[c.statut] || congeStatutConfig.DEMANDE
                  return (
                    <Card key={c.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs">
                            {c.employe.prenom[0]}{c.employe.nom[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{c.employe.prenom} {c.employe.nom}</p>
                            <p className="text-xs text-muted-foreground">
                              {congeTypeLabels[c.typeConge] || c.typeConge.replace(/_/g, ' ')} • {formatDate(c.dateDebut)} → {formatDate(c.dateFin)}
                            </p>
                            {c.motif && <p className="text-xs text-muted-foreground mt-0.5">{c.motif}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-[9px] ${config.color}`}>{config.label}</Badge>
                          {c.statut === 'DEMANDE' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={() => handleCongeAction(c.id, 'VALIDE')}>
                                <CheckCircle2 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleCongeAction(c.id, 'REFUSE')}>
                                <XCircle className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )
            })()}
          </div>
        </TabsContent>

        {/* === PRESENCES TAB === */}
        <TabsContent value="presences" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Présences</h2>
            <Button className="gap-2" onClick={() => setPresenceDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Enregistrer présence
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employé</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Arrivée</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Départ</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {presences.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Aucune présence enregistrée</td></tr>
                    ) : (
                      presences.slice(0, 30).map(p => (
                        <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-sm">{p.employe.prenom} {p.employe.nom}</td>
                          <td className="p-3 text-sm">{formatDate(p.date)}</td>
                          <td className="p-3 text-sm">{new Date(p.heureArrivee).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="p-3 text-sm">{p.heureDepart ? new Date(p.heureDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                          <td className="p-3 text-center"><Badge variant={p.statut === 'PRESENT' ? 'default' : 'outline'} className="text-[9px]">{p.statut}</Badge></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === BULLETINS DE PAIE TAB === */}
        <TabsContent value="paie" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Bulletins de paie</h2>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2" onClick={() => {
                toast.success('Export Excel en cours de génération...')
              }}>
                <Download className="w-4 h-4" /> Exporter
              </Button>
              <Button className="gap-2" onClick={() => setBulletinDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Générer bulletin
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <Select value={bulFilterMois} onValueChange={setBulFilterMois}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tous les mois" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les mois</SelectItem>
                {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={bulFilterAnnee} onValueChange={setBulFilterAnnee}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue placeholder="Toutes années" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes années</SelectItem>
                {[2024, 2025, 2026].map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Employé</th>
                      <th className="text-left p-3 text-xs font-medium text-muted-foreground">Période</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Salaire Brut</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Cotisations (18% CNSS)</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Salaire Net</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Prime</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Avance</th>
                      <th className="text-right p-3 text-xs font-medium text-muted-foreground">Net à Payer</th>
                      <th className="text-center p-3 text-xs font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = bulletins.filter(b => {
                        if (bulFilterMois !== 'all' && b.mois !== parseInt(bulFilterMois)) return false
                        if (bulFilterAnnee !== 'all' && b.annee !== parseInt(bulFilterAnnee)) return false
                        return true
                      })
                      return filtered.length === 0 ? (
                        <tr><td colSpan={9} className="text-center py-8 text-muted-foreground text-sm">Aucun bulletin généré</td></tr>
                      ) : (
                        filtered.map(b => {
                          const salaireNetAvant = b.salaireBrut - b.cotisations
                          const netAPayer = b.salaireNet
                          return (
                        <tr key={b.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="p-3 text-sm">{b.employe.prenom} {b.employe.nom}</td>
                          <td className="p-3 text-sm">{b.mois}/{b.annee}</td>
                          <td className="p-3 text-sm text-right">{formatFCFA(b.salaireBrut)}</td>
                          <td className="p-3 text-sm text-right text-destructive">-{formatFCFA(b.cotisations)}</td>
                          <td className="p-3 text-sm text-right">{formatFCFA(salaireNetAvant)}</td>
                          <td className="p-3 text-sm text-right text-primary">{b.prime ? `+${formatFCFA(b.prime)}` : '—'}</td>
                          <td className="p-3 text-sm text-right text-amber-600">{b.avance ? `-${formatFCFA(b.avance)}` : '—'}</td>
                          <td className="p-3 text-sm text-right font-semibold text-primary">{formatFCFA(netAPayer)}</td>
                          <td className="p-3 text-center">
                            <Button variant="ghost" size="sm" className="h-7 text-[9px] gap-1 text-primary" onClick={() => toast.success('Génération PDF en cours...')}>
                              <FileText className="w-3 h-3" /> PDF
                            </Button>
                          </td>
                        </tr>
                        )})
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">
          {selectedEmploye && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEmploye.prenom} {selectedEmploye.nom}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary font-bold text-xl">
                    {selectedEmploye.prenom[0]}{selectedEmploye.nom[0]}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Poste</span><p className="font-medium">{selectedEmploye.poste}</p></div>
                  <div><span className="text-muted-foreground">Contrat</span><p className="font-medium">{contratLabels[selectedEmploye.typeContrat]}</p></div>
                  <div><span className="text-muted-foreground">Embauche</span><p className="font-medium">{formatDate(selectedEmploye.dateEmbauche)}</p></div>
                  <div><span className="text-muted-foreground">Fin contrat</span><p className="font-medium">{formatDate(selectedEmploye.dateFinContrat)}</p></div>
                  <div><span className="text-muted-foreground">Salaire</span><p className="font-medium">{selectedEmploye.salaireBase ? formatFCFA(selectedEmploye.salaireBase) : '—'}</p></div>
                  <div><span className="text-muted-foreground">Statut</span><p><Badge variant={selectedEmploye.actif ? 'default' : 'outline'}>{selectedEmploye.actif ? 'Actif' : 'Inactif'}</Badge></p></div>
                </div>
                <Separator />
                <div className="space-y-1">
                  {selectedEmploye.telephone && (
                    <p className="text-sm flex items-center gap-2"><Phone className="w-3 h-3" />{selectedEmploye.telephone}</p>
                  )}
                  {selectedEmploye.email && (
                    <p className="text-sm flex items-center gap-2"><Mail className="w-3 h-3" />{selectedEmploye.email}</p>
                  )}
                </div>
                <Button className="w-full gap-2" onClick={() => {
                  setEditNom(selectedEmploye.nom)
                  setEditPrenom(selectedEmploye.prenom)
                  setEditPoste(selectedEmploye.poste)
                  setEditTelephone(selectedEmploye.telephone || '')
                  setEditEmail(selectedEmploye.email || '')
                  setEditSalaire(selectedEmploye.salaireBase?.toString() || '')
                  setDetailOpen(false)
                  setEditOpen(true)
                }}>
                  <Edit2 className="w-4 h-4" /> Modifier
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Modifier l&apos;employé</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Nom</Label><Input value={editNom} onChange={e => setEditNom(e.target.value)} /></div>
              <div><Label>Prénom</Label><Input value={editPrenom} onChange={e => setEditPrenom(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Poste</Label><Input value={editPoste} onChange={e => setEditPoste(e.target.value)} /></div>
              <div><Label>Salaire</Label><Input type="number" value={editSalaire} onChange={e => setEditSalaire(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Téléphone</Label><Input value={editTelephone} onChange={e => setEditTelephone(e.target.value)} /></div>
              <div><Label>Email</Label><Input value={editEmail} onChange={e => setEditEmail(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={handleEditEmployee}>Sauvegarder</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Planning Dialog */}
      <Dialog open={planningDialogOpen} onOpenChange={setPlanningDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un shift</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Employé</Label>
              <Select value={planEmployeId} onValueChange={setPlanEmployeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {employes.filter(e => e.actif).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Heure début</Label><Input type="time" value={planHeureDebut} onChange={e => setPlanHeureDebut(e.target.value)} /></div>
              <div><Label>Heure fin</Label><Input type="time" value={planHeureFin} onChange={e => setPlanHeureFin(e.target.value)} /></div>
            </div>
            <div><Label>Poste</Label><Input placeholder="PHARMACIEN" value={planPoste} onChange={e => setPlanPoste(e.target.value)} /></div>
            <Button className="w-full" onClick={handleCreatePlanning}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Congé Dialog */}
      <Dialog open={congeDialogOpen} onOpenChange={setCongeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Demande de congé</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Employé</Label>
              <Select value={congeEmployeId} onValueChange={setCongeEmployeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {employes.filter(e => e.actif).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type de congé</Label>
              <Select value={congeType} onValueChange={setCongeType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONGE_ANNUEL">Congé annuel</SelectItem>
                  <SelectItem value="CONGE_MALADIE">Congé maladie</SelectItem>
                  <SelectItem value="CONGE_MATERNITE">Congé maternité</SelectItem>
                  <SelectItem value="CONGE_SANS_SOLDE">Sans solde</SelectItem>
                  <SelectItem value="PERMISSION">Permission</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date début</Label><Input type="date" value={congeDateDebut} onChange={e => setCongeDateDebut(e.target.value)} /></div>
              <div><Label>Date fin</Label><Input type="date" value={congeDateFin} onChange={e => setCongeDateFin(e.target.value)} /></div>
            </div>
            <div><Label>Motif</Label><Textarea placeholder="Raison du congé..." value={congeMotif} onChange={e => setCongeMotif(e.target.value)} /></div>
            <Button className="w-full" onClick={handleCreateConge}>Soumettre la demande</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Presence Dialog */}
      <Dialog open={presenceDialogOpen} onOpenChange={setPresenceDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Enregistrer une présence</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Employé</Label>
              <Select value={presEmployeId} onValueChange={setPresEmployeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {employes.filter(e => e.actif).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Date</Label><Input type="date" value={presDate} onChange={e => setPresDate(e.target.value)} /></div>
            <div><Label>Heure d&apos;arrivée</Label><Input type="time" value={presHeureArrivee} onChange={e => setPresHeureArrivee(e.target.value)} /></div>
            <Button className="w-full" onClick={handleCreatePresence}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulletin Dialog */}
      <Dialog open={bulletinDialogOpen} onOpenChange={setBulletinDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Générer un bulletin de paie</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Employé</Label>
              <Select value={bulEmployeId} onValueChange={setBulEmployeId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {employes.filter(e => e.actif && e.salaireBase).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom} — {formatFCFA(e.salaireBase || 0)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Mois</Label>
                <Select value={bulMois} onValueChange={setBulMois}>
                  <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                  <SelectContent>
                    {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Année</Label><Input type="number" value={bulAnnee} onChange={e => setBulAnnee(e.target.value)} placeholder="2025" /></div>
            </div>
            <Button className="w-full" onClick={handleGenerateBulletin}>Générer le bulletin</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
