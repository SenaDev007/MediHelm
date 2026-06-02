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
import { Textarea } from '@/components/ui/textarea'
import { HeartPulse, Plus, AlertTriangle, Eye, FileWarning, Search, ArrowRightLeft } from 'lucide-react'
import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'

interface SurveillanceItem {
  id: string
  dci: string
  nomCommercial?: string
  typeSurveillance: string
  niveauRisque: string
  description: string
  statut: string
}

interface SignalementItem {
  id: string
  dciConcernee: string
  descriptionEI: string
  gravite: string
  statutEnvoi: string
  dateDebut: string
  patientCode?: string
  evolution?: string
  actionPrise?: string
}

interface InteractionResult {
  dcis: string[]
  interactions: Array<{
    dci1: string
    dci2: string
    gravite: string
    description: string
  }>
  risqueLevel: string
}

export default function QualitePage() {
  const { pharmacie } = useAuth()
  const [surveillances, setSurveillances] = useState<SurveillanceItem[]>([])
  const [signalements, setSignalements] = useState<SignalementItem[]>([])
  const [fichesDCICount, setFichesDCICount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Signalement dialog
  const [signalementDialogOpen, setSignalementDialogOpen] = useState(false)
  const [sigPatientCode, setSigPatientCode] = useState('')
  const [sigDciConcernee, setSigDciConcernee] = useState('')
  const [sigDescription, setSigDescription] = useState('')
  const [sigGravite, setSigGravite] = useState('LEGER')
  const [sigDateDebut, setSigDateDebut] = useState('')
  const [sigEvolution, setSigEvolution] = useState('')
  const [sigActionPrise, setSigActionPrise] = useState('')

  // Interaction checker
  const [interDci1, setInterDci1] = useState('')
  const [interDci2, setInterDci2] = useState('')
  const [interactionResult, setInteractionResult] = useState<InteractionResult | null>(null)
  const [checkingInteraction, setCheckingInteraction] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const resSurv = await fetch('/api/qualite/surveillance')
      if (resSurv.ok) {
        const data = await resSurv.json()
        setSurveillances(Array.isArray(data) ? data : [])
      }
    } catch { /* ignore */ }

    if (pharmacie?.id) {
      try {
        const resSig = await fetch(`/api/qualite/signalements?pharmacieId=${pharmacie.id}`)
        if (resSig.ok) {
          const data = await resSig.json()
          setSignalements(Array.isArray(data) ? data : [])
        }
      } catch { /* ignore */ }
    }

    // Fetch DCI count
    try {
      const resDCI = await fetch('/api/qualite/dci')
      if (resDCI.ok) {
        const data = await resDCI.json()
        setFichesDCICount(Array.isArray(data) ? data.length : 0)
      }
    } catch { /* ignore */ }

    setLoading(false)
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const activeAlerts = surveillances.filter(s => s.statut === 'ACTIVE').length

  // Create signalement
  const handleCreateSignalement = async () => {
    if (!pharmacie?.id || !sigDciConcernee || !sigDescription) return
    try {
      const res = await fetch('/api/qualite/signalements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          utilisateurId: 'demo-admin',
          patientCode: sigPatientCode || 'ANONYME',
          dciConcernee: sigDciConcernee,
          descriptionEI: sigDescription,
          gravite: sigGravite,
          dateDebut: sigDateDebut || new Date().toISOString(),
          evolution: sigEvolution || null,
          actionPrise: sigActionPrise || null,
        }),
      })
      if (res.ok) {
        toast.success('Signalement EI enregistré')
        setSignalementDialogOpen(false)
        setSigPatientCode(''); setSigDciConcernee(''); setSigDescription('')
        setSigGravite('LEGER'); setSigDateDebut(''); setSigEvolution(''); setSigActionPrise('')
        loadData()
      } else {
        toast.error('Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    }
  }

  // Check interactions
  const handleCheckInteraction = async () => {
    if (!interDci1 || !interDci2) return
    setCheckingInteraction(true)
    try {
      const res = await fetch('/api/qualite/interactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dcis: [interDci1, interDci2] }),
      })
      if (res.ok) {
        const data = await res.json()
        setInteractionResult(data)
      } else {
        toast.error('Erreur lors de la vérification')
      }
    } catch {
      toast.error('Erreur lors de la vérification')
    } finally {
      setCheckingInteraction(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HeartPulse className="w-6 h-6 text-primary" />
            Pharmacovigilance & Qualité
          </h1>
          <p className="text-sm text-muted-foreground mt-1">M16 — Contrôle qualité et signalements</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" onClick={() => setSignalementDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Signalement EI
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alertes actives</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{activeAlerts}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Signalements EI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">{signalements.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">En attente envoi</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-500">
              {signalements.filter(s => s.statutEnvoi === 'EN_ATTENTE').length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Fiches DCI</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{fichesDCICount}</p>
          </CardContent>
        </Card>
      </div>

      {/* DCI Interaction Checker */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-primary" />
            Vérificateur d&apos;interactions médicamenteuses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-xs">DCI 1</Label>
              <Input
                placeholder="Ex: Paracétamol"
                value={interDci1}
                onChange={e => setInterDci1(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs">DCI 2</Label>
              <Input
                placeholder="Ex: Warfarine"
                value={interDci2}
                onChange={e => setInterDci2(e.target.value)}
              />
            </div>
            <Button
              className="gap-2"
              disabled={!interDci1 || !interDci2 || checkingInteraction}
              onClick={handleCheckInteraction}
            >
              <Search className="w-4 h-4" />
              {checkingInteraction ? 'Vérification...' : 'Vérifier'}
            </Button>
          </div>

          {interactionResult && (
            <div className={`mt-4 p-4 rounded-lg border ${
              interactionResult.risqueLevel === 'CRITIQUE' ? 'bg-destructive/5 border-destructive/20' :
              interactionResult.risqueLevel === 'ELEVE' ? 'bg-amber-400/5 border-amber-400/20' :
              interactionResult.risqueLevel === 'MODERE' ? 'bg-blue-400/5 border-blue-400/20' :
              'bg-green-400/5 border-green-400/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant={
                  interactionResult.risqueLevel === 'CRITIQUE' ? 'destructive' :
                  interactionResult.risqueLevel === 'ELEVE' ? 'default' :
                  interactionResult.risqueLevel === 'MODERE' ? 'secondary' : 'outline'
                }>
                  Niveau de risque: {interactionResult.risqueLevel}
                </Badge>
              </div>
              {interactionResult.interactions.length > 0 ? (
                <div className="space-y-2">
                  {interactionResult.interactions.map((inter, i) => (
                    <div key={i} className="text-sm">
                      <p className="font-medium">{inter.dci1} ↔ {inter.dci2}</p>
                      <Badge variant="outline" className="text-[9px] mr-2">{inter.gravite}</Badge>
                      <span className="text-muted-foreground">{inter.description}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-600">Aucune interaction connue entre ces deux DCI.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Surveillances */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Médicaments sous surveillance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Chargement...</div>
          ) : surveillances.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucune surveillance active</div>
          ) : (
            <div className="space-y-3">
              {surveillances.map((surv) => (
                <div key={surv.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-4">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      surv.niveauRisque === 'CRITIQUE' ? 'bg-red-100' : surv.niveauRisque === 'ELEVE' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      <FileWarning className={`w-5 h-5 ${
                        surv.niveauRisque === 'CRITIQUE' ? 'text-red-600' : surv.niveauRisque === 'ELEVE' ? 'text-amber-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium">{surv.dci} {surv.nomCommercial ? `(${surv.nomCommercial})` : ''}</p>
                      <p className="text-sm text-muted-foreground">{surv.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={surv.niveauRisque === 'CRITIQUE' ? 'destructive' : surv.niveauRisque === 'ELEVE' ? 'default' : 'secondary'}>
                      {surv.niveauRisque}
                    </Badge>
                    <Badge variant="outline">{surv.typeSurveillance}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signalements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            Effets indésirables signalés
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signalements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Aucun signalement</div>
          ) : (
            <div className="space-y-3">
              {signalements.map((sig) => (
                <div key={sig.id} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div>
                    <p className="font-medium">{sig.dciConcernee}</p>
                    <p className="text-sm text-muted-foreground">{sig.descriptionEI}</p>
                    {sig.patientCode && <p className="text-xs text-muted-foreground mt-0.5">Patient: {sig.patientCode}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={sig.gravite === 'GRAVE' || sig.gravite === 'FATAL' ? 'destructive' : 'secondary'}>
                      {sig.gravite}
                    </Badge>
                    <Badge variant="outline">{sig.statutEnvoi}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signalement Dialog */}
      <Dialog open={signalementDialogOpen} onOpenChange={setSignalementDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HeartPulse className="w-5 h-5 text-primary" />
              Signalement d&apos;effet indésirable
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code patient</Label>
                <Input placeholder="P-XXXX" value={sigPatientCode} onChange={e => setSigPatientCode(e.target.value)} />
              </div>
              <div>
                <Label>DCI concernée</Label>
                <Input placeholder="Paracétamol" value={sigDciConcernee} onChange={e => setSigDciConcernee(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Description de l&apos;effet indésirable</Label>
              <Textarea placeholder="Décrivez l'effet observé..." value={sigDescription} onChange={e => setSigDescription(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Gravité</Label>
                <Select value={sigGravite} onValueChange={setSigGravite}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEGER">Léger</SelectItem>
                    <SelectItem value="MODERE">Modéré</SelectItem>
                    <SelectItem value="GRAVE">Grave</SelectItem>
                    <SelectItem value="FATAL">Fatal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date de début</Label>
                <Input type="date" value={sigDateDebut} onChange={e => setSigDateDebut(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Évolution</Label>
              <Input placeholder="En cours, Guérison, Séquelles..." value={sigEvolution} onChange={e => setSigEvolution(e.target.value)} />
            </div>
            <div>
              <Label>Action prise</Label>
              <Input placeholder="Arrêt du traitement, Consultation..." value={sigActionPrise} onChange={e => setSigActionPrise(e.target.value)} />
            </div>
            <Button className="w-full" onClick={handleCreateSignalement}>Enregistrer le signalement</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
