'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Moon, Plus, Calendar, Clock, User, FileText, BarChart3 } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

interface GardeItem {
  id: string
  date: string
  type: string
  heureDebut: string
  heureFin: string
  pharmacienId: string | null
  pharmacien: { id: string; nom: string; prenom: string } | null
  rapportGarde: {
    id: string
    nbVentes: number
    chiffreAffaires: number
    incidents: unknown
  } | null
}

interface Employe {
  id: string
  nom: string
  prenom: string
  poste: string
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

export default function GardePage() {
  const { pharmacie } = useAuth()
  const [gardes, setGardes] = useState<GardeItem[]>([])
  const [employes, setEmployes] = useState<Employe[]>([])
  const [loading, setLoading] = useState(true)
  const [planningDialogOpen, setPlanningDialogOpen] = useState(false)
  const [rapportDialogOpen, setRapportDialogOpen] = useState(false)
  const [selectedGarde, setSelectedGarde] = useState<GardeItem | null>(null)

  // Planning form
  const [formDate, setFormDate] = useState('')
  const [formType, setFormType] = useState('Nuit')
  const [formHeureDebut, setFormHeureDebut] = useState('20:00')
  const [formHeureFin, setFormHeureFin] = useState('08:00')
  const [formPharmacienId, setFormPharmacienId] = useState('')

  // Rapport form
  const [rapportNbVentes, setRapportNbVentes] = useState('')
  const [rapportCA, setRapportCA] = useState('')
  const [rapportIncidents, setRapportIncidents] = useState('')

  const loadData = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const [gardesRes, employesRes] = await Promise.all([
        fetch(`/api/gardes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/employes?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ])
      setGardes(gardesRes)
      setEmployes(employesRes)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const pharmacienEmployes = useMemo(() =>
    employes.filter(e => e.poste.toLowerCase().includes('pharmacien') || e.poste.toLowerCase().includes('pharmacie')),
    [employes]
  )

  // Calculate real CA from gardes with reports
  const totalCAGarde = useMemo(() =>
    gardes.reduce((sum, g) => sum + (g.rapportGarde?.chiffreAffaires || 0), 0),
    [gardes]
  )

  const prochaineGarde = useMemo(() => {
    const now = new Date()
    const futures = gardes.filter(g => new Date(g.date) >= now)
    return futures.length > 0 ? futures[0] : null
  }, [gardes])

  const dernierCAGarde = useMemo(() => {
    const withReport = gardes.filter(g => g.rapportGarde)
    return withReport.length > 0 ? withReport[0].rapportGarde!.chiffreAffaires : 0
  }, [gardes])

  // Calendar view data — current month
  const calendarDays = useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: Array<{ date: Date; gardes: GardeItem[] }> = []

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      const dayGardes = gardes.filter(g => new Date(g.date).toISOString().split('T')[0] === dateStr)
      days.push({ date: new Date(d), gardes: dayGardes })
    }

    return days
  }, [gardes])

  // Create planning
  const handleCreatePlanning = async () => {
    if (!pharmacie?.id || !formDate || !formType) return
    try {
      const res = await fetch('/api/gardes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          date: formDate,
          type: formType,
          heureDebut: new Date(`${formDate}T${formHeureDebut}`).toISOString(),
          heureFin: new Date(`${formDate}T${formHeureFin}`).toISOString(),
          pharmacienId: formPharmacienId || null,
        }),
      })
      if (res.ok) {
        toast.success('Planning de garde ajouté')
        setPlanningDialogOpen(false)
        setFormDate(''); setFormType('Nuit'); setFormHeureDebut('20:00'); setFormHeureFin('08:00'); setFormPharmacienId('')
        loadData()
      }
    } catch {
      toast.error('Erreur lors de la création')
    }
  }

  // Create rapport
  const handleCreateRapport = async () => {
    if (!selectedGarde || !pharmacie?.id) return
    try {
      const res = await fetch(`/api/gardes/${selectedGarde.id}/rapport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          pharmacienId: selectedGarde.pharmacienId || 'demo-admin',
          nbVentes: parseInt(rapportNbVentes) || 0,
          chiffreAffaires: parseFloat(rapportCA) || 0,
          incidents: rapportIncidents ? JSON.stringify({ description: rapportIncidents }) : null,
        }),
      })
      if (res.ok) {
        toast.success('Rapport de garde enregistré')
        setRapportDialogOpen(false)
        setRapportNbVentes(''); setRapportCA(''); setRapportIncidents('')
        loadData()
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Moon className="w-6 h-6 text-primary" />
            Pharmacie de Garde
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Planning et rapports de garde</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setPlanningDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Ajouter planning
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Gardes ce mois</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{gardes.filter(g => {
              const d = new Date(g.date)
              const now = new Date()
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Prochaine garde</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {prochaineGarde ? new Date(prochaineGarde.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' }) : 'Aucune'}
            </p>
            {prochaineGarde?.type && <Badge variant="secondary" className="mt-1">{prochaineGarde.type}</Badge>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">CA Dernière garde</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{formatFCFA(dernierCAGarde)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Calendrier — {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(j => (
              <div key={j} className="text-center text-xs font-semibold text-muted-foreground py-2">{j}</div>
            ))}
            {/* Fill empty cells before first day */}
            {Array.from({ length: (calendarDays[0]?.date.getDay() || 1) - 1 }, (_, i) => (
              <div key={`empty-${i}`} className="min-h-16" />
            ))}
            {calendarDays.map(({ date, gardes: dayGardes }) => {
              const isToday = date.toDateString() === new Date().toDateString()
              return (
                <div key={date.toISOString()} className={`min-h-16 border rounded p-1 ${isToday ? 'bg-primary/5 border-primary/30' : ''}`}>
                  <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                    {date.getDate()}
                  </div>
                  {dayGardes.map(g => (
                    <div key={g.id} className="text-[9px] bg-primary/10 text-primary rounded px-1 cursor-pointer hover:bg-primary/20"
                      onClick={() => {
                        setSelectedGarde(g)
                        setRapportDialogOpen(true)
                      }}
                    >
                      {g.type}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gardes List */}
      <Card>
        <CardHeader>
          <CardTitle>Planning de garde</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : gardes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun planning de garde</div>
          ) : (
            <div className="space-y-3">
              {gardes.map((garde) => (
                <div key={garde.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{new Date(garde.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {new Date(garde.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} - {new Date(garde.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={garde.type === 'Nuit' ? 'default' : 'secondary'}>
                      {garde.type}
                    </Badge>
                    {garde.pharmacien && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <User className="w-3 h-3" />
                        {garde.pharmacien.prenom} {garde.pharmacien.nom}
                      </div>
                    )}
                    {garde.rapportGarde ? (
                      <Badge variant="outline" className="text-[9px] gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {formatFCFA(garde.rapportGarde.chiffreAffaires)}
                      </Badge>
                    ) : (
                      <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={() => {
                        setSelectedGarde(garde)
                        setRapportDialogOpen(true)
                      }}>
                        <FileText className="w-3 h-3" /> Rapport
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Planning Dialog */}
      <Dialog open={planningDialogOpen} onOpenChange={setPlanningDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un planning de garde</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div><Label>Date</Label><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></div>
            <div>
              <Label>Type</Label>
              <Select value={formType} onValueChange={setFormType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nuit">Nuit (20h-08h)</SelectItem>
                  <SelectItem value="Week-end">Week-end</SelectItem>
                  <SelectItem value="Jour férié">Jour férié</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Heure début</Label><Input type="time" value={formHeureDebut} onChange={e => setFormHeureDebut(e.target.value)} /></div>
              <div><Label>Heure fin</Label><Input type="time" value={formHeureFin} onChange={e => setFormHeureFin(e.target.value)} /></div>
            </div>
            <div>
              <Label>Pharmacien</Label>
              <Select value={formPharmacienId} onValueChange={setFormPharmacienId}>
                <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>
                  {pharmacienEmployes.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.prenom} {e.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleCreatePlanning}>Ajouter</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rapport Dialog */}
      <Dialog open={rapportDialogOpen} onOpenChange={setRapportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Rapport de garde
              {selectedGarde && <span className="text-sm font-normal text-muted-foreground">— {new Date(selectedGarde.date).toLocaleDateString('fr-FR')}</span>}
            </DialogTitle>
          </DialogHeader>
          {selectedGarde?.rapportGarde ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-lg p-3 text-center">
                  <span className="text-xs text-muted-foreground block">Ventes</span>
                  <span className="text-xl font-bold">{selectedGarde.rapportGarde.nbVentes}</span>
                </div>
                <div className="bg-primary/5 rounded-lg p-3 text-center">
                  <span className="text-xs text-muted-foreground block">Chiffre d&apos;affaires</span>
                  <span className="text-xl font-bold text-primary">{formatFCFA(selectedGarde.rapportGarde.chiffreAffaires)}</span>
                </div>
              </div>
              {selectedGarde.rapportGarde.incidents && (
                <div className="bg-amber-400/5 border border-amber-400/20 rounded-lg p-3">
                  <span className="text-xs font-semibold text-amber-600">Incidents</span>
                  <p className="text-sm mt-1">{JSON.stringify(selectedGarde.rapportGarde.incidents)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 py-4">
              <div><Label>Nombre de ventes</Label><Input type="number" value={rapportNbVentes} onChange={e => setRapportNbVentes(e.target.value)} /></div>
              <div><Label>Chiffre d&apos;affaires (FCFA)</Label><Input type="number" value={rapportCA} onChange={e => setRapportCA(e.target.value)} /></div>
              <div><Label>Incidents (optionnel)</Label><Input placeholder="Description des incidents..." value={rapportIncidents} onChange={e => setRapportIncidents(e.target.value)} /></div>
              <Button className="w-full" onClick={handleCreateRapport}>Enregistrer le rapport</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
