'use client'

import { useAuth } from '@/app/pro/auth-context'
import { ComplianceGauge } from '@/components/pro/compliance-gauge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Shield, Download, Award, FileText, AlertTriangle, HeartPulse, Trash2, Upload, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
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
  LICENCE_EXPLOITATION: "Licence d'exploitation",
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

  // Upload document dialog
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadType, setUploadType] = useState('LICENCE_EXPLOITATION')
  const [uploadDateEmission, setUploadDateEmission] = useState('')
  const [uploadDateExpiration, setUploadDateExpiration] = useState('')

  const loadData = useCallback(async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [sc, docs] = await Promise.all([
        fetch(`/api/conformite/score?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : null),
        fetch(`/api/conformite/documents?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ])
      setScore(sc)
      setDocuments(docs)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Export functions with actual file download
  const downloadJsonAsFile = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportStupfiants = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch(`/api/conformite/exports/stupefiants?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        downloadJsonAsFile(data, `registre-stupefiants-${pharmacie.id}.json`)
        toast.success(`Export stupéfiants: ${data.total || 0} entrées exportées`)
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleExportDestructions = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch(`/api/conformite/exports/destructions?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        downloadJsonAsFile(data, `pv-destructions-${pharmacie.id}.json`)
        toast.success(`Export destructions: ${data.total || 0} PVs exportés`)
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  const handleExportOrdonnances = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch(`/api/conformite/exports/ordonnances?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        downloadJsonAsFile(data, `registre-ordonnances-${pharmacie.id}.json`)
        toast.success(`Export ordonnances: ${data.total || 0} ordonnances exportées`)
      } else {
        toast.error('Erreur lors de l\'export')
      }
    } catch {
      toast.error('Erreur lors de l\'export')
    }
  }

  // Upload document réglementaire
  const handleUploadDocument = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/conformite/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          typeDocument: uploadType,
          dateEmission: uploadDateEmission || null,
          dateExpiration: uploadDateExpiration || null,
          statut: 'VALIDE',
        }),
      })
      if (res.ok) {
        toast.success('Document réglementaire ajouté')
        setUploadDialogOpen(false)
        setUploadType('LICENCE_EXPLOITATION')
        setUploadDateEmission('')
        setUploadDateExpiration('')
        loadData()
      }
    } catch {
      toast.error('Erreur lors de l\'ajout')
    }
  }

  // Recalculate score
  const handleRecalculateScore = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch(`/api/conformite/score?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        setScore(data)
        toast.success('Score recalculé')
      }
    } catch {
      toast.error('Erreur lors du recalcul')
    }
  }

  // Request certification
  const handleRequestCertification = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/conformite/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          certificationDPMED: true,
          dateCertification: new Date().toISOString(),
          dateExpirCertification: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        }),
      })
      if (res.ok) {
        toast.success('Demande de certification envoyée')
        loadData()
      }
    } catch {
      toast.error('Erreur lors de la demande')
    }
  }

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
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportStupfiants}>
            <Download className="w-4 h-4" />
            Stupéfiants
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportDestructions}>
            <Download className="w-4 h-4" />
            Destructions
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportOrdonnances}>
            <Download className="w-4 h-4" />
            Ordonnances
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleRecalculateScore}>
            <RefreshCw className="w-4 h-4" />
            Recalculer
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
          {score?.certificationDPMED ? (
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="text-sm font-semibold text-primary">Certifié DPMED</span>
            </div>
          ) : (
            <div className="text-center">
              <Badge variant="outline" className="text-xs mb-2">Non certifié</Badge>
              <p className="text-xs text-muted-foreground">
                Atteignez 80% pour obtenir la certification
              </p>
              {(score?.scoreTotal ?? 0) >= 80 && (
                <Button size="sm" className="mt-2 gap-1" onClick={handleRequestCertification}>
                  <Award className="w-3 h-3" /> Demander la certification
                </Button>
              )}
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Documents réglementaires
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setUploadDialogOpen(true)}>
              <Upload className="w-3 h-3" /> Ajouter
            </Button>
          </div>
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
            {score && score.scoreTotal >= 80 && !score.certificationDPMED && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                <Award className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">
                  Votre pharmacie est éligible à la certification DPMED ! Cliquez sur &quot;Demander la certification&quot; ci-dessus.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Upload Document Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Ajouter un document réglementaire</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Type de document</Label>
              <Select value={uploadType} onValueChange={setUploadType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LICENCE_EXPLOITATION">Licence d&apos;exploitation</SelectItem>
                  <SelectItem value="DIPLOME_PHARMACIEN">Diplôme de pharmacien</SelectItem>
                  <SelectItem value="ASSURANCE">Assurance</SelectItem>
                  <SelectItem value="AGREMENT_DPMED">Agrément DPMED</SelectItem>
                  <SelectItem value="AUTORISATION_STUPEFIANTS">Autorisation stupéfiants</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date d&apos;émission</Label><Input type="date" value={uploadDateEmission} onChange={e => setUploadDateEmission(e.target.value)} /></div>
              <div><Label>Date d&apos;expiration</Label><Input type="date" value={uploadDateExpiration} onChange={e => setUploadDateExpiration(e.target.value)} /></div>
            </div>
            <Button className="w-full" onClick={handleUploadDocument}>Enregistrer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
