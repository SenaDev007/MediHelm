'use client'

import { useAuth } from '@/app/pro/auth-context'
import { AlertBadge } from '@/components/pro/alert-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, ShieldCheck, Eye, CheckCircle2, ExternalLink, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DiffusionAlerte {
  id: string
  alerteId: string
  lotsConcernes: string[]
  canalEnvoi: string[]
  dateEnvoi: string
  dateAcquittement: string | null
  actionPrise: string | null
  alerte: {
    id: string
    referenceOfficielle: string
    titre: string
    description: string
    typeAlerte: string
    niveauUrgence: string
    dciConcernee: string | null
    numerosLotConcernes: string[]
    fabricantConcerne: string | null
    sourceEmission: string
    documentOfficielUrl: string | null
    dateEmissionDPMED: string
    statut: string
    medicamentSurv: {
      dci: string
      nomCommercial: string | null
      niveauRisque: string
    } | null
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const typeLabels: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

export default function AlertesPage() {
  const { pharmacie } = useAuth()
  const [alertes, setAlertes] = useState<DiffusionAlerte[]>([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedAlerte, setSelectedAlerte] = useState<DiffusionAlerte | null>(null)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/alertes/dpmed?pharmacieId=${pharmacie.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setAlertes(data))
        .catch(() => setAlertes([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filteredAlertes = alertes.filter(a => {
    if (filterType !== 'all' && a.alerte.typeAlerte !== filterType) return false
    if (filterStatus === 'acquittée' && !a.dateAcquittement) return false
    if (filterStatus === 'non-acquittée' && a.dateAcquittement) return false
    return true
  })

  const handleAcquitter = async (diffusionId: string) => {
    try {
      const res = await fetch(`/api/alertes/dpmed/${diffusionId}/acquitter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actionPrise: 'Pris en charge' }),
      })
      if (res.ok) {
        setAlertes(prev => prev.map(a =>
          a.id === diffusionId
            ? { ...a, dateAcquittement: new Date().toISOString(), actionPrise: 'Pris en charge' }
            : a
        ))
      }
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    )
  }

  const nonAcquittees = alertes.filter(a => !a.dateAcquittement).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            Alertes DPMED
          </h1>
          <p className="text-sm text-muted-foreground">
            {alertes.length} alertes • {nonAcquittees} non acquittées
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="destructive" className="text-xs">
            {nonAcquittees} en attente
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-56">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Type d'alerte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                <SelectItem value="CONTREFACON">Contrefaçon</SelectItem>
                <SelectItem value="AMM_SUSPENDUE">AMM suspendue</SelectItem>
                <SelectItem value="PHARMACOVIGILANCE">Pharmacovigilance</SelectItem>
                <SelectItem value="INFO_REGLEMENTAIRE">Info réglementaire</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="non-acquittée">Non acquittée</SelectItem>
                <SelectItem value="acquittée">Acquittée</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alertes List */}
      <div className="space-y-3">
        {filteredAlertes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ShieldCheck className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Aucune alerte DPMED active</p>
              <p className="text-xs text-muted-foreground mt-1">Votre pharmacie est à jour</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlertes.map(diffusion => (
            <Card
              key={diffusion.id}
              className={`transition-all hover:shadow-md ${!diffusion.dateAcquittement ? 'border-l-4 border-l-destructive' : 'border-l-4 border-l-primary'}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <AlertBadge level={diffusion.alerte.niveauUrgence} />
                        <Badge variant="outline" className="text-[10px]">
                          {typeLabels[diffusion.alerte.typeAlerte] || diffusion.alerte.typeAlerte}
                        </Badge>
                        {!diffusion.dateAcquittement && (
                          <Badge variant="destructive" className="text-[10px]">Non acquittée</Badge>
                        )}
                        {diffusion.dateAcquittement && (
                          <Badge className="text-[10px] bg-primary text-primary-foreground">Acquittée ✓</Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{diffusion.alerte.titre}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {diffusion.alerte.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>📅 {formatDate(diffusion.alerte.dateEmissionDPMED)}</span>
                    {diffusion.alerte.dciConcernee && (
                      <span>💊 DCI: {diffusion.alerte.dciConcernee}</span>
                    )}
                    {diffusion.alerte.fabricantConcerne && (
                      <span>🏭 {diffusion.alerte.fabricantConcerne}</span>
                    )}
                    <span>📋 Ref: {diffusion.alerte.referenceOfficielle}</span>
                  </div>

                  {diffusion.lotsConcernes.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Lots concernés:</span>
                      {diffusion.lotsConcernes.map(lot => (
                        <Badge key={lot} variant="outline" className="text-[10px]">{lot}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setSelectedAlerte(diffusion)}
                    >
                      <Eye className="w-3 h-3" />
                      Détails
                    </Button>
                    {!diffusion.dateAcquittement && (
                      <Button
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleAcquitter(diffusion.id)}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Acquitter
                      </Button>
                    )}
                    {diffusion.alerte.documentOfficielUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs"
                        asChild
                      >
                        <a href={diffusion.alerte.documentOfficielUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" />
                          Document officiel
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAlerte} onOpenChange={() => setSelectedAlerte(null)}>
        <DialogContent className="max-w-lg">
          {selectedAlerte && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Détails de l&apos;alerte
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-3">
                  <div>
                    <h3 className="font-semibold">{selectedAlerte.alerte.titre}</h3>
                    <div className="flex gap-2 mt-2">
                      <AlertBadge level={selectedAlerte.alerte.niveauUrgence} />
                      <Badge variant="outline" className="text-[10px]">
                        {typeLabels[selectedAlerte.alerte.typeAlerte]}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-medium">Description</span>
                    <p className="text-sm text-muted-foreground mt-1">{selectedAlerte.alerte.description}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">Référence</span>
                      <p className="font-medium">{selectedAlerte.alerte.referenceOfficielle}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Source</span>
                      <p className="font-medium">{selectedAlerte.alerte.sourceEmission}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date émission</span>
                      <p className="font-medium">{formatDate(selectedAlerte.alerte.dateEmissionDPMED)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date réception</span>
                      <p className="font-medium">{formatDate(selectedAlerte.dateEnvoi)}</p>
                    </div>
                    {selectedAlerte.alerte.dciConcernee && (
                      <div>
                        <span className="text-muted-foreground">DCI concernée</span>
                        <p className="font-medium">{selectedAlerte.alerte.dciConcernee}</p>
                      </div>
                    )}
                    {selectedAlerte.alerte.fabricantConcerne && (
                      <div>
                        <span className="text-muted-foreground">Fabricant</span>
                        <p className="font-medium">{selectedAlerte.alerte.fabricantConcerne}</p>
                      </div>
                    )}
                  </div>

                  {selectedAlerte.alerte.numerosLotConcernes.length > 0 && (
                    <div>
                      <span className="text-sm font-medium">Numéros de lot concernés</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedAlerte.alerte.numerosLotConcernes.map(lot => (
                          <Badge key={lot} variant="outline" className="text-[10px]">{lot}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedAlerte.alerte.medicamentSurv && (
                    <div>
                      <span className="text-sm font-medium">Médicament sous surveillance</span>
                      <p className="text-sm">{selectedAlerte.alerte.medicamentSurv.nomCommercial || selectedAlerte.alerte.medicamentSurv.dci}</p>
                      <AlertBadge level={selectedAlerte.alerte.medicamentSurv.niveauRisque} className="mt-1" />
                    </div>
                  )}

                  {/* Timeline */}
                  <div>
                    <span className="text-sm font-medium">Chronologie</span>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-muted-foreground">Émise par DPMED — {formatDate(selectedAlerte.alerte.dateEmissionDPMED)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-muted-foreground">Reçue — {formatDate(selectedAlerte.dateEnvoi)}</span>
                      </div>
                      {selectedAlerte.dateAcquittement && (
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-2 h-2 rounded-full bg-green-600" />
                          <span className="text-muted-foreground">Acquittée — {formatDate(selectedAlerte.dateAcquittement)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
