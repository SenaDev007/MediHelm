'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  FileText,
  Eye,
  Send,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { DiffusionTracker } from '@/components/institutions/diffusion-tracker'

interface AlerteDetail {
  id: string
  referenceOfficielle: string
  titre: string
  typeAlerte: string
  niveauUrgence: string
  dciConcernee: string | null
  description: string | null
  signatureNumerique: string
  dateEmissionDPMED: string
  statut: string
  createdAt: string
  updatedAt: string
  diffusions: Array<{
    id: string
    statut: string
    pharmacieId: string
    dateAcquittement: string | null
    commentaire: string | null
    pharmacie: {
      id: string
      nom: string
      ville: string
      telephone: string
      email: string | null
    }
  }>
}

const TYPE_LABELS: Record<string, string> = {
  RAPPEL_LOT: 'Rappel de lot',
  CONTREFACON: 'Contrefaçon',
  AMM_SUSPENDUE: 'AMM Suspendue',
  INTERDICTION: 'Interdiction',
  INFORMATION: 'Information',
  PHARMACOVIGILANCE: 'Pharmacovigilance',
}

const TYPE_COLORS: Record<string, string> = {
  RAPPEL_LOT: 'bg-red-100 text-red-800',
  CONTREFACON: 'bg-orange-100 text-orange-800',
  AMM_SUSPENDUE: 'bg-yellow-100 text-yellow-800',
  INTERDICTION: 'bg-red-100 text-red-800',
  INFORMATION: 'bg-blue-100 text-blue-800',
  PHARMACOVIGILANCE: 'bg-purple-100 text-purple-800',
}

const URGENCY_COLORS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'bg-red-600 text-white',
  URGENT: 'bg-orange-500 text-white',
  ATTENTION: 'bg-amber-500 text-white',
  INFO: 'bg-blue-500 text-white',
}

const URGENCY_LABELS: Record<string, string> = {
  URGENCE_IMMEDIATE: 'Urgence immédiate',
  URGENT: 'Urgent',
  ATTENTION: 'Attention',
  INFO: 'Informatif',
}

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  EN_DIFFUSION: { label: 'En diffusion', color: 'bg-amber-100 text-amber-800', icon: <Clock className="h-3 w-3" /> },
  ACQUITTEE: { label: 'Acquittée', color: 'bg-green-100 text-green-800', icon: <CheckCircle2 className="h-3 w-3" /> },
  EXPIREE: { label: 'Expirée', color: 'bg-gray-100 text-gray-800', icon: <XCircle className="h-3 w-3" /> },
  ANNULEE: { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: <XCircle className="h-3 w-3" /> },
}

export default function AlerteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const alerteId = params.id as string
  const [alerte, setAlerte] = useState<AlerteDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlerte = async () => {
      try {
        const res = await fetch(`/api/alertes/dpmed/${alerteId}`)
        if (res.ok) {
          const data = await res.json()
          setAlerte(data)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    if (alerteId) fetchAlerte()
  }, [alerteId])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Card className="animate-pulse border-teal-200">
          <CardContent className="p-12 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
            <span className="ml-3 text-muted-foreground">Chargement de l&apos;alerte...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!alerte) {
    return (
      <div className="space-y-6 p-6">
        <Card className="border-teal-200 p-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-teal-300 mb-4" />
          <p className="text-muted-foreground">Alerte introuvable</p>
          <Link href="/institutions/dpmed/alertes">
            <Button variant="outline" className="mt-4 border-teal-300 text-teal-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour aux alertes
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const statutConf = STATUT_CONFIG[alerte.statut] || STATUT_CONFIG.EN_DIFFUSION
  const nbNotifiees = alerte.diffusions.length
  const nbAcquittees = alerte.diffusions.filter(d => d.statut === 'ACQUITTEE').length

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/institutions/dpmed/alertes">
            <Button variant="ghost" size="sm" className="text-teal-700">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Retour
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-teal-800">Détail de l&apos;alerte</h1>
              <Badge variant="outline" className={`text-xs ${statutConf.color}`}>
                {statutConf.icon}
                <span className="ml-1">{statutConf.label}</span>
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{alerte.referenceOfficielle}</p>
          </div>
        </div>
      </div>

      {/* Alert Info Card */}
      <Card className="border-teal-200">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg text-teal-800">{alerte.titre}</CardTitle>
              <CardDescription className="mt-1">
                Émise le {new Date(alerte.dateEmissionDPMED).toLocaleDateString('fr-FR', {
                  day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge className={TYPE_COLORS[alerte.typeAlerte] || 'bg-gray-100 text-gray-800'}>
                {TYPE_LABELS[alerte.typeAlerte] || alerte.typeAlerte}
              </Badge>
              <Badge className={URGENCY_COLORS[alerte.niveauUrgence] || 'bg-gray-100 text-gray-800'}>
                {URGENCY_LABELS[alerte.niveauUrgence] || alerte.niveauUrgence}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Key Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-teal-100 bg-teal-50/30">
              <p className="text-xs text-muted-foreground">Type d&apos;alerte</p>
              <p className="text-sm font-medium text-teal-800">{TYPE_LABELS[alerte.typeAlerte] || alerte.typeAlerte}</p>
            </div>
            <div className="p-3 rounded-lg border border-teal-100 bg-teal-50/30">
              <p className="text-xs text-muted-foreground">Niveau d&apos;urgence</p>
              <Badge className={`text-xs ${URGENCY_COLORS[alerte.niveauUrgence] || 'bg-gray-100'}`}>
                {URGENCY_LABELS[alerte.niveauUrgence] || alerte.niveauUrgence}
              </Badge>
            </div>
            <div className="p-3 rounded-lg border border-teal-100 bg-teal-50/30">
              <p className="text-xs text-muted-foreground">DCI concernée</p>
              <p className="text-sm font-medium text-teal-800">{alerte.dciConcernee || 'Non spécifiée'}</p>
            </div>
            <div className="p-3 rounded-lg border border-teal-100 bg-teal-50/30">
              <p className="text-xs text-muted-foreground">Pharmacies notifiées</p>
              <p className="text-sm font-medium text-teal-800">
                <span className="text-green-600">{nbAcquittees}</span>/{nbNotifiees} acquittées
              </p>
            </div>
          </div>

          <Separator className="bg-teal-100" />

          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-teal-800 mb-2">Description</h3>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap">
              {alerte.description || 'Aucune description fournie'}
            </div>
          </div>

          {/* Signature */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            <span>Signature numérique : {alerte.signatureNumerique}</span>
          </div>

          {/* Timeline */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Créée le {new Date(alerte.createdAt).toLocaleDateString('fr-FR')}
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Mis à jour le {new Date(alerte.updatedAt).toLocaleDateString('fr-FR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Diffusion Tracker Component */}
      <DiffusionTracker
        alerteId={alerte.id}
        nbOfficinesNotifiees={nbNotifiees}
        nbOfficinesAcquittees={nbAcquittees}
      />
    </div>
  )
}
