'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  AlertTriangle,
  ArrowLeft,
  Clock,
  CheckCircle2,
  FileText,
  Loader2,
  Share2,
  Printer,
  MapPin,
  Phone,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DiffusionTracker } from '@/components/institutions/diffusion-tracker'
import { toast } from 'sonner'

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
  INFO_REGLEMENTAIRE: 'Info réglementaire',
}

const TYPE_COLORS: Record<string, string> = {
  RAPPEL_LOT: 'bg-red-100 text-red-800 border-red-300',
  CONTREFACON: 'bg-orange-100 text-orange-800 border-orange-300',
  AMM_SUSPENDUE: 'bg-blue-100 text-blue-800 border-blue-300',
  PHARMACOVIGILANCE: 'bg-purple-100 text-purple-800 border-purple-300',
  INFO_REGLEMENTAIRE: 'bg-teal-100 text-teal-800 border-teal-300',
}

const URGENCY_LABELS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'Urgence immédiate',
  URGENT: 'Urgent',
  NORMAL: 'Normal',
  INFORMATIF: 'Informatif',
}

const URGENCY_COLORS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'bg-red-600 text-white',
  URGENT: 'bg-orange-500 text-white',
  NORMAL: 'bg-blue-500 text-white',
  INFORMATIF: 'bg-teal-500 text-white',
}

const STATUT_LABELS: Record<string, string> = {
  EN_DIFFUSION: 'En diffusion',
  DIFFUSEE: 'Diffusée',
  ARCHIVEE: 'Archivée',
}

interface AlertDetail {
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
  signatureNumerique: string
  dateEmissionDPMED: string
  dateReceptionMH: string
  statut: string
  nbOfficinesNotifiees: number
  nbOfficinesAcquittees: number
  nbPatientsNotifies: number
  medicamentSurv?: {
    dci: string
    typeSurveillance: string
    niveauRisque: string
    description: string
  }
  diffusions: Array<{
    id: string
    pharmacieId: string
    lotsConcernes: string[]
    canalEnvoi: string[]
    dateEnvoi: string
    dateAcquittement: string | null
    actionPrise: string | null
    pharmacie?: {
      id: string
      nom: string
      ville: string
      telephone: string
      email: string | null
    }
  }>
}

export default function AlertDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [alert, setAlert] = useState<AlertDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlert = async () => {
      try {
        const res = await fetch(`/api/alertes/dpmed/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setAlert(data)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    if (params.id) fetchAlert()
  }, [params.id])

  const handleArchive = async () => {
    if (!alert) return
    try {
      const res = await fetch(`/api/alertes/dpmed/${alert.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: 'ARCHIVEE' }),
      })
      if (res.ok) {
        toast.success('Alerte archivée')
        router.push('/institutions/dpmed/alertes')
      }
    } catch {
      toast.error('Erreur lors de l\'archivage')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-3 text-muted-foreground">Chargement de l&apos;alerte...</span>
      </div>
    )
  }

  if (!alert) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-muted-foreground">Alerte introuvable</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/institutions/dpmed/alertes')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux alertes
        </Button>
      </div>
    )
  }

  const acquittees = alert.diffusions.filter(d => d.dateAcquittement)
  const enAttente = alert.diffusions.filter(d => !d.dateAcquittement)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/institutions/dpmed/alertes')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-teal-800">Détail de l&apos;alerte</h1>
            <p className="text-sm text-muted-foreground font-mono">{alert.referenceOfficielle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            Imprimer
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: alert.titre,
                text: `${alert.referenceOfficielle} — ${alert.titre}`,
                url: window.location.href,
              }).catch(() => {})
            } else {
              navigator.clipboard.writeText(window.location.href)
              toast.success('Lien copié dans le presse-papier')
            }
          }}>
            <Share2 className="h-4 w-4 mr-1" />
            Partager
          </Button>
          {alert.statut !== 'ARCHIVEE' && (
            <Button variant="outline" size="sm" onClick={handleArchive} className="border-red-300 text-red-600">
              Archiver
            </Button>
          )}
        </div>
      </div>

      {/* Alert Main Info */}
      <Card className="border-teal-200">
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start gap-3">
            <Badge className={`text-xs ${URGENCY_COLORS[alert.niveauUrgence]}`}>
              {URGENCY_LABELS[alert.niveauUrgence]}
            </Badge>
            <Badge variant="outline" className={`text-xs ${TYPE_COLORS[alert.typeAlerte]}`}>
              {TYPE_LABELS[alert.typeAlerte]}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {STATUT_LABELS[alert.statut] || alert.statut}
            </Badge>
          </div>
          <CardTitle className="text-xl text-teal-800 mt-2">{alert.titre}</CardTitle>
          <CardDescription>{alert.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">DCI concernée</p>
              <p className="text-sm font-medium">{alert.dciConcernee || 'Non spécifiée'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Fabricant concerné</p>
              <p className="text-sm font-medium">{alert.fabricantConcerne || 'Non spécifié'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Source d&apos;émission</p>
              <p className="text-sm font-medium">{alert.sourceEmission}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date d&apos;émission DPMED</p>
              <p className="text-sm font-medium">
                {new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date réception MédiHelm</p>
              <p className="text-sm font-medium">
                {new Date(alert.dateReceptionMH).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Signature numérique</p>
              <p className="text-sm font-mono text-xs break-all">{alert.signatureNumerique}</p>
            </div>
          </div>

          {/* Lot numbers */}
          {alert.numerosLotConcernes.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-muted-foreground mb-2">Numéros de lot concernés</p>
              <div className="flex flex-wrap gap-2">
                {alert.numerosLotConcernes.map((lot, i) => (
                  <Badge key={i} variant="outline" className="font-mono text-xs border-red-300 text-red-700">
                    {lot}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Medicament Surveillance link */}
          {alert.medicamentSurv && (
            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
              <p className="text-xs font-semibold text-amber-800">Médicament sous surveillance lié</p>
              <p className="text-sm text-amber-700 mt-1">
                DCI: {alert.medicamentSurv.dci} — {alert.medicamentSurv.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Diffusion Tracking */}
      <div>
        <h2 className="text-lg font-semibold text-teal-800 flex items-center gap-2 mb-4">
          <Share2 className="h-5 w-5" />
          Suivi de diffusion
        </h2>
        <DiffusionTracker
          alerteId={alert.id}
          nbOfficinesNotifiees={alert.nbOfficinesNotifiees}
          nbOfficinesAcquittees={alert.nbOfficinesAcquittees}
        />
      </div>

      {/* Non-responding pharmacies */}
      {enAttente.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-800">
              <Clock className="h-4 w-4" />
              Pharmacies sans réponse ({enAttente.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {enAttente.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2 rounded bg-amber-50 text-sm">
                  <div>
                    <span className="font-medium">{d.pharmacie?.nom || 'Inconnue'}</span>
                    <span className="text-muted-foreground ml-2">({d.pharmacie?.ville || '-'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.pharmacie?.telephone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {d.pharmacie.telephone}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">
                      En attente
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Log / Timeline */}
      <Card className="border-teal-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-teal-600" />
            Journal des actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-teal-600" />
                <div className="w-px h-full bg-teal-200" />
              </div>
              <div>
                <p className="text-sm font-medium">Alerte émise par la DPMED</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.dateEmissionDPMED).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <div className="w-px h-full bg-teal-200" />
              </div>
              <div>
                <p className="text-sm font-medium">Réceptionnée par MédiHelm</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(alert.dateReceptionMH).toLocaleDateString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-teal-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Diffusion à {alert.nbOfficinesNotifiees} pharmacies</p>
                <p className="text-xs text-muted-foreground">
                  Via PUSH et IN_APP — {acquittees.length} acquittées, {enAttente.length} en attente
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
