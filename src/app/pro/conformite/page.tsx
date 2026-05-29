'use client'

import { useAuth } from '@/app/pro/auth-context'
import { ComplianceGauge } from '@/components/pro/compliance-gauge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Shield, Download, Award, FileText, AlertTriangle, HeartPulse, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface ScoreConformite {
  scoreTotal: number
  scoreRegistreStup: number
  scoreAlerteDPMED: number
  scoreDocuments: number
  scorePharmacovigi: number
  scoreDestructions: number
  certificationDPMED: boolean
  dateCertification: string | null
  dateExpirCertification: string | null
  calculatedAt: string
}

interface DocumentReg {
  id: string
  typeDocument: string
  dateEmission: string | null
  dateExpiration: string | null
  statut: string
}

const conformiteComponents = [
  { key: 'scoreRegistreStup', label: 'Registre des stupéfiants', maxPoints: 25, icon: FileText, color: '#1D9E75' },
  { key: 'scoreAlerteDPMED', label: 'Acquittement alertes DPMED', maxPoints: 25, icon: AlertTriangle, color: '#0F6E56' },
  { key: 'scoreDocuments', label: 'Documents réglementaires', maxPoints: 20, icon: Shield, color: '#EF9F27' },
  { key: 'scorePharmacovigi', label: 'Pharmacovigilance', maxPoints: 15, icon: HeartPulse, color: '#378ADD' },
  { key: 'scoreDestructions', label: 'Destructions médicamenteuses', maxPoints: 15, icon: Trash2, color: '#085041' },
] as const

const typeDocLabels: Record<string, string> = {
  LICENCE_EXPLOITATION: 'Licence d\'exploitation',
  DIPLOME_PHARMACIEN: 'Diplôme de pharmacien',
  ASSURANCE: 'Assurance',
  AGREMENT_DPMED: 'Agrément DPMED',
  AUTORISATION_STUPEFIANTS: 'Autorisation stupéfiants',
}

const statutDocStyles: Record<string, string> = {
  VALIDE: 'bg-primary/10 text-primary',
  EXPIRE_BIENTOT: 'bg-amber-400/10 text-amber-600',
  EXPIRE: 'bg-destructive/10 text-destructive',
  SUSPENDU: 'bg-red-600/10 text-red-600',
}

export default function ConformitePage() {
  const { pharmacie } = useAuth()
  const [score, setScore] = useState<ScoreConformite | null>(null)
  const [documents, setDocuments] = useState<DocumentReg[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      Promise.all([
        fetch(`/api/conformite/score?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/conformite/documents?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ]).then(([sc, docs]) => {
        setScore(sc)
        setDocuments(docs)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-2" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Score de Conformité
          </h1>
          <p className="text-sm text-muted-foreground">
            Évaluation réglementaire de votre pharmacie
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast('Export en cours de préparation')}>
            <Download className="w-4 h-4" />
            Exporter stupéfiants
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => toast('Export en cours de préparation')}>
            <Download className="w-4 h-4" />
            Exporter destructions
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Gauge */}
        <Card className="flex flex-col items-center justify-center p-6">
          <div className="relative mb-4">
            <ComplianceGauge score={score?.scoreTotal ?? 0} size={200} />
          </div>
          {score?.certificationDPMED && (
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Certifié DPMED</span>
            </div>
          )}
          {!score?.certificationDPMED && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs mb-2">Non certifié</Badge>
              <p className="text-xs text-muted-foreground">
                Atteignez 80% pour obtenir la certification
              </p>
            </div>
          )}
          {score?.dateCertification && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Certifié le {new Date(score.dateCertification).toLocaleDateString('fr-FR')}
              {score.dateExpirCertification && (
                <> • Expire le {new Date(score.dateExpirCertification).toLocaleDateString('fr-FR')}</>
              )}
            </p>
          )}
        </Card>

        {/* Breakdown */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Détail par composante</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {conformiteComponents.map(comp => {
              const value = score ? (score as Record<string, number>)[comp.key] as number : 0
              const percentage = (value / comp.maxPoints) * 100
              const Icon = comp.icon

              return (
                <div key={comp.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" style={{ color: comp.color }} />
                      <span className="text-sm font-medium">{comp.label}</span>
                    </div>
                    <span className="text-sm font-bold" style={{ color: comp.color }}>
                      {Math.round(value)}/{comp.maxPoints}
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{Math.round(percentage)}% de conformité</span>
                    {percentage < 80 && (
                      <span className="text-amber-600">
                        +{comp.maxPoints - Math.round(value)} pts manquants
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      {/* Documents réglementaires */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Documents réglementaires
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              Aucun document enregistré
              <p className="text-xs mt-1">Ajoutez vos documents réglementaires pour améliorer votre score</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map(doc => (
                <Card key={doc.id} className="border">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-medium">{typeDocLabels[doc.typeDocument] || doc.typeDocument}</span>
                        {doc.dateExpiration && (
                          <span className="text-xs text-muted-foreground block mt-0.5">
                            Expire: {new Date(doc.dateExpiration).toLocaleDateString('fr-FR')}
                          </span>
                        )}
                      </div>
                      <Badge className={`text-[9px] ${statutDocStyles[doc.statut] || 'bg-gray-100 text-gray-600'}`}>
                        {doc.statut}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Recommandations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {score && score.scoreRegistreStup < 25 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm">Mettez à jour le registre des stupéfiants pour gagner jusqu&apos;à {25 - Math.round(score.scoreRegistreStup)} points</span>
              </div>
            )}
            {score && score.scoreAlerteDPMED < 25 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm">Acquittez les alertes DPMED en attente pour gagner jusqu&apos;à {25 - Math.round(score.scoreAlerteDPMED)} points</span>
              </div>
            )}
            {score && score.scoreDocuments < 20 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-sm">Chargez vos documents réglementaires manquants pour gagner jusqu&apos;à {20 - Math.round(score.scoreDocuments)} points</span>
              </div>
            )}
            {score && score.scoreTotal >= 80 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <Award className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">
                  Votre pharmacie est éligible à la certification DPMED ! Contactez la direction pour l&apos;obtention.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
