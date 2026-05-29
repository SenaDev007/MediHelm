'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HeartPulse, Plus, AlertTriangle, Eye, FileWarning } from 'lucide-react'
import { useState, useEffect } from 'react'
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
}

export default function QualitePage() {
  const { pharmacie } = useAuth()
  const [surveillances, setSurveillances] = useState<SurveillanceItem[]>([])
  const [signalements, setSignalements] = useState<SignalementItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
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

      setLoading(false)
    }
    loadData()
  }, [pharmacie?.id])

  const activeAlerts = surveillances.filter(s => s.statut === 'ACTIVE').length

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
        <Button className="bg-primary hover:bg-primary/90" onClick={() => toast('Fonctionnalité de signalement bientôt disponible')}>
          <Plus className="w-4 h-4 mr-2" />
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
            <p className="text-3xl font-bold text-green-600">5</p>
          </CardContent>
        </Card>
      </div>

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
    </div>
  )
}
