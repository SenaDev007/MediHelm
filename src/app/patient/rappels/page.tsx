'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, ShieldAlert, ExternalLink, Info, Plus, Bell, Loader2, Clock, Power, PowerOff } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface RecallAlert {
  id: string
  titre: string
  description: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  numerosLotConcernes: string[] | unknown
  dateEmissionDPMED: string
  fabricantConcerne: string | null
  documentOfficielUrl: string | null
}

interface Rappel {
  id: string
  medicament: string
  heure: string
  frequence: string
  actif: boolean
  createdAt: string
}

const severityConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  URGENCE_IMMEDIATE: { label: 'Urgence immédiate', color: 'bg-red-100 text-red-800 border-red-200', icon: ShieldAlert },
  URGENT: { label: 'Urgent', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: AlertTriangle },
  NORMAL: { label: 'Normal', color: 'bg-blue-50 text-blue-800 border-blue-200', icon: Info },
  INFORMATIF: { label: 'Informatif', color: 'bg-teal-50 text-teal-800 border-teal-200', icon: Info },
}

const typeLabels: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

export default function RappelsPage() {
  const [alerts, setAlerts] = useState<RecallAlert[]>([])
  const [rappels, setRappels] = useState<Rappel[]>([])
  const [loading, setLoading] = useState(true)
  const [filterSeverity, setFilterSeverity] = useState<string | null>(null)
  const [showAddRappel, setShowAddRappel] = useState(false)
  const [savingRappel, setSavingRappel] = useState(false)
  const [newRappel, setNewRappel] = useState({ medicament: '', heure: '08:00', frequence: 'QUOTIDIEN' })
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const alertRes = await fetch('/api/alertes/dpmed')
      if (alertRes.ok) {
        const data = await alertRes.json()
        if (Array.isArray(data) && data.length > 0) {
          setAlerts(data.map((a: RecallAlert) => ({
            ...a,
            numerosLotConcernes: Array.isArray(a.numerosLotConcernes) ? a.numerosLotConcernes : [],
          })))
        }
      }

      const comptesRes = await fetch('/api/patient/comptes')
      if (comptesRes.ok) {
        const comptes = await comptesRes.json()
        if (Array.isArray(comptes) && comptes.length > 0) {
          const rappelsRes = await fetch(`/api/patient/rappels?comptePatientId=${comptes[0].id}`)
          if (rappelsRes.ok) {
            const rappelsData = await rappelsRes.json()
            if (Array.isArray(rappelsData)) {
              setRappels(rappelsData)
            }
          }
        }
      }
    } catch {
      // fallback
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleAddRappel = async () => {
    if (!newRappel.medicament) {
      toast.error('Veuillez entrer un médicament')
      return
    }
    setSavingRappel(true)
    try {
      const comptesRes = await fetch('/api/patient/comptes')
      if (comptesRes.ok) {
        const comptes = await comptesRes.json()
        if (Array.isArray(comptes) && comptes.length > 0) {
          const res = await fetch('/api/patient/rappels', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              comptePatientId: comptes[0].id,
              medicament: newRappel.medicament,
              heure: newRappel.heure,
              frequence: newRappel.frequence,
            }),
          })
          if (res.ok) {
            const created = await res.json()
            setRappels([created, ...rappels])
            toast.success('Rappel ajouté')
          } else {
            toast.error('Erreur lors de l\'ajout')
          }
        }
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    } finally {
      setSavingRappel(false)
      setShowAddRappel(false)
      setNewRappel({ medicament: '', heure: '08:00', frequence: 'QUOTIDIEN' })
    }
  }

  const handleToggleRappel = async (id: string, currentActif: boolean) => {
    setTogglingId(id)
    setRappels(rappels.map(r => r.id === id ? { ...r, actif: !currentActif } : r))
    try {
      await fetch('/api/patient/rappels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, actif: !currentActif }),
      })
      toast.success(currentActif ? 'Rappel désactivé' : 'Rappel activé')
    } catch {
      setRappels(rappels.map(r => r.id === id ? { ...r, actif: currentActif } : r))
      toast.error('Erreur lors de la modification')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = filterSeverity
    ? alerts.filter(a => a.niveauUrgence === filterSeverity)
    : alerts

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Alertes & Rappels
        </h1>
        <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700" onClick={() => setShowAddRappel(true)}>
          <Plus className="h-3 w-3 mr-1" />
          Ajouter rappel
        </Button>
      </div>

      {/* Medication Reminders */}
      {rappels.length > 0 && (
        <Card className="border-teal-200">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Mes rappels médicaments
            </h2>
            {rappels.map((rappel) => (
              <div key={rappel.id} className="flex items-center gap-3 py-2 border-b border-teal-50 last:border-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${rappel.actif ? 'bg-primary/10' : 'bg-gray-100'}`}>
                  {rappel.actif ? <Bell className="h-4 w-4 text-primary" /> : <Bell className="h-4 w-4 text-gray-400" />}
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${rappel.actif ? 'text-gray-900' : 'text-gray-500'}`}>{rappel.medicament}</p>
                  <p className="text-[10px] text-muted-foreground">{rappel.heure} — {rappel.frequence}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  disabled={togglingId === rappel.id}
                  onClick={() => handleToggleRappel(rappel.id, rappel.actif)}
                >
                  {togglingId === rappel.id ? <Loader2 className="h-4 w-4 animate-spin" /> :
                    rappel.actif ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-green-600" />
                  }
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* DPMED Alert Header */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Alertes DPMED</h2>
        <p className="text-xs text-muted-foreground">
          Alertes officielles de la Direction des Produits Médicaux et du Médicament
        </p>
      </div>

      {/* Severity filter */}
      <div className="flex gap-1.5 flex-wrap">
        <Badge
          variant={filterSeverity === null ? 'default' : 'secondary'}
          className={`cursor-pointer text-xs ${filterSeverity === null ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'}`}
          onClick={() => setFilterSeverity(null)}
        >
          Toutes ({alerts.length})
        </Badge>
        {Object.entries(severityConfig).map(([key, config]) => {
          const count = alerts.filter(a => a.niveauUrgence === key).length
          if (count === 0) return null
          return (
            <Badge
              key={key}
              variant={filterSeverity === key ? 'default' : 'secondary'}
              className={`cursor-pointer text-xs ${filterSeverity === key ? 'bg-primary text-white border-0' : 'bg-teal-50 text-teal-800 border-0'}`}
              onClick={() => setFilterSeverity(filterSeverity === key ? null : key)}
            >
              {config.label} ({count})
            </Badge>
          )
        })}
      </div>

      {/* Alert list */}
      <div className="space-y-3">
        {filtered.map((alert) => {
          const severity = severityConfig[alert.niveauUrgence] || severityConfig.INFORMATIF
          return (
            <motion.div key={alert.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className={`border-2 ${severity.color.split(' ')[2] || 'border-teal-200'}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${severity.color.split(' ').slice(0, 2).join(' ')}`}>
                      <severity.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-gray-900">{alert.titre}</h3>
                        <Badge className={`text-[9px] border-0 ${severity.color}`}>{severity.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{alert.description}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {alert.dciConcernee && (
                          <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0">{alert.dciConcernee}</Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-800 border-0">
                          {typeLabels[alert.typeAlerte] || alert.typeAlerte}
                        </Badge>
                        {Array.isArray(alert.numerosLotConcernes) && (alert.numerosLotConcernes as string[]).length > 0 && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-50 text-amber-800 border-0">
                            Lots: {(alert.numerosLotConcernes as string[]).join(', ')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        {new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {alert.fabricantConcerne && ` • ${alert.fabricantConcerne}`}
                      </p>
                      {alert.documentOfficielUrl && (
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary mt-1 p-0">
                          <ExternalLink className="h-3 w-3 mr-1" />Document officiel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        {filtered.length === 0 && (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune alerte de rappel active</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Rappel Dialog */}
      <Dialog open={showAddRappel} onOpenChange={setShowAddRappel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un rappel</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Médicament *</Label>
              <Input
                value={newRappel.medicament}
                onChange={(e) => setNewRappel({ ...newRappel, medicament: e.target.value })}
                placeholder="Nom du médicament"
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Heure de prise</Label>
              <Input
                type="time"
                value={newRappel.heure}
                onChange={(e) => setNewRappel({ ...newRappel, heure: e.target.value })}
                className="h-9 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">Fréquence</Label>
              <select
                value={newRappel.frequence}
                onChange={(e) => setNewRappel({ ...newRappel, frequence: e.target.value })}
                className="w-full h-9 text-sm rounded-md border border-input bg-background px-3"
              >
                <option value="QUOTIDIEN">Quotidien</option>
                <option value="BIDIEN">2 fois par jour</option>
                <option value="TRIDIEN">3 fois par jour</option>
                <option value="HEBDO">Hebdomadaire</option>
                <option value="MENSUEL">Mensuel</option>
              </select>
            </div>
            <Button className="w-full bg-primary hover:bg-teal-700" onClick={handleAddRappel} disabled={savingRappel}>
              {savingRappel ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Ajout...</> : 'Ajouter le rappel'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
