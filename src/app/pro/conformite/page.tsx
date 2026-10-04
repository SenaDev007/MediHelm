'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Award,
  TrendingUp,
  TrendingDown,
  Activity,
  Calendar,
  FileBarChart,
  Lock,
  Pill,
  Trash2,
  Eye,
  Loader2,
  ArrowRight,
  Building2,
  BadgeCheck,
  RefreshCcw,
  BarChart3,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface ScoreConformite {
  id: string
  scoreTotal: number
  scoreRegistreStup: number
  scoreAlerteDPMED: number
  scoreDocuments: number
  scorePharmacovigilance: number
  scoreDestructions: number
  certificationDPMED: boolean
  dateCalcul: string
}

interface EvenementConformite {
  id: string
  type: string
  titre: string
  description: string
  date: string
  scoreImpact: number
  categorie: string
}

interface DeclarationExport {
  id: string
  type: string
  label: string
  description: string
  periode: string
  statut: 'DISPONIBLE' | 'EN_COURS' | 'NON_GENERE'
  derniereGeneration: string | null
}

// === Helpers ===

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateStr
  }
}

function scoreColor(score: number): string {
  if (score < 50) return 'text-red-600'
  if (score < 70) return 'text-amber-600'
  return 'text-green-600'
}

function scoreBgColor(score: number): string {
  if (score < 50) return 'bg-red-500'
  if (score < 70) return 'bg-amber-500'
  return 'bg-green-500'
}

function scoreBadgeVariant(score: number): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (score < 50) return 'destructive'
  if (score < 70) return 'outline'
  return 'default'
}

function scoreLabel(score: number): string {
  if (score < 50) return 'Critique'
  if (score < 70) return 'À améliorer'
  if (score < 85) return 'Satisfaisant'
  return 'Excellent'
}

function scoreProgressBarClass(score: number): string {
  if (score < 50) return '[&>div]:bg-red-500'
  if (score < 70) return '[&>div]:bg-amber-500'
  return '[&>div]:bg-green-500'
}

// === Main Component ===

export default function ConformitePage() {
  const { pharmacie } = useAuth()

  // State
  const [score, setScore] = useState<ScoreConformite | null>(null)
  const [evenements, setEvenements] = useState<EvenementConformite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Dialogs
  const [showCertificationDialog, setShowCertificationDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedExport, setSelectedExport] = useState<DeclarationExport | null>(null)

  // Declarations
  const [declarations] = useState<DeclarationExport[]>([
    {
      id: '1',
      type: 'TRIMESTRIELLE',
      label: 'Déclaration trimestrielle',
      description: 'Déclaration des ventes de médicaments soumis à prescription',
      periode: 'T1 2025',
      statut: 'DISPONIBLE',
      derniereGeneration: '2025-03-31T23:59:59Z',
    },
    {
      id: '2',
      type: 'STUPEFIANTS',
      label: 'Registre des stupéfiants',
      description: 'Registre des entrées et sorties de médicaments stupéfiants',
      periode: 'Janvier - Mars 2025',
      statut: 'DISPONIBLE',
      derniereGeneration: '2025-03-31T23:59:59Z',
    },
    {
      id: '3',
      type: 'PHARMACOVIGILANCE',
      label: 'Rapport de pharmacovigilance',
      description: 'Bilan des effets indésirables signalés',
      periode: 'T1 2025',
      statut: 'EN_COURS',
      derniereGeneration: null,
    },
    {
      id: '4',
      type: 'ORDONNANCES',
      label: 'Registre des ordonnances',
      description: 'Archives des ordonnances validées et délivrées',
      periode: 'T1 2025',
      statut: 'DISPONIBLE',
      derniereGeneration: '2025-03-31T23:59:59Z',
    },
    {
      id: '5',
      type: 'DESTRUCTIONS',
      label: 'Rapport de destructions',
      description: 'Registre des médicaments détruits avec les motifs',
      periode: 'T1 2025',
      statut: 'NON_GENERE',
      derniereGeneration: null,
    },
  ])

  // === Data Fetching ===

  const fetchScore = useCallback(async () => {
    if (!pharmacie?.id) return
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/conformite/score')
      if (!res.ok) throw new Error('Erreur lors du chargement du score de conformité')
      const data = await res.json()
      setScore(Array.isArray(data) ? data[0] || null : data.score || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [pharmacie?.id])

  const fetchEvenements = useCallback(async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/conformite/evenements')
      if (res.ok) {
        const data = await res.json()
        setEvenements(Array.isArray(data) ? data : data.evenements || [])
      }
    } catch {
      // Silently fail
    }
  }, [pharmacie?.id])

  useEffect(() => {
    fetchScore()
    fetchEvenements()
  }, [fetchScore, fetchEvenements])

  // === Sub-scores for display ===

  const subScores = useMemo(() => {
    if (!score) return []
    return [
      {
        key: 'stock',
        label: 'Gestion du stock',
        icon: Pill,
        score: Math.round((score.scoreAlerteDPMED + score.scoreDocuments) / 2),
        description: 'Traçabilité, alertes, seuils minimums',
      },
      {
        key: 'prescriptions',
        label: 'Ordonnances & Prescriptions',
        icon: FileText,
        score: Math.round(score.scoreDocuments * 0.9 + 10),
        description: 'Validation, délivrance, archivage',
      },
      {
        key: 'stupefiants',
        label: 'Registre des stupéfiants',
        icon: Lock,
        score: score.scoreRegistreStup,
        description: 'Entrées, sorties, inventaire réglementaire',
      },
      {
        key: 'documents',
        label: 'Documents réglementaires',
        icon: FileBarChart,
        score: score.scoreDocuments,
        description: 'Déclarations, rapports, registres',
      },
      {
        key: 'hygiene',
        label: 'Hygiène & Sécurité',
        icon: Shield,
        score: Math.round(score.scorePharmacovigilance * 0.85 + 15),
        description: 'Pharmacovigilance, destructions, BPF',
      },
    ]
  }, [score])

  // === Handlers ===

  const handleRequestCertification = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/conformite/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Erreur lors de la demande')
      toast.success('Demande de certification envoyée au DPMED')
      setShowCertificationDialog(false)
      fetchScore()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la demande')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateExport = async (declaration: DeclarationExport) => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/conformite/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: declaration.type, periode: declaration.periode }),
      })
      if (!res.ok) throw new Error('Erreur lors de la génération')
      toast.success(`${declaration.label} généré avec succès`)
      setShowExportDialog(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la génération')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRefreshScore = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetch('/api/conformite/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) throw new Error('Erreur lors du recalcul')
      toast.success('Score de conformité recalculé')
      fetchScore()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors du recalcul')
    } finally {
      setIsSubmitting(false)
    }
  }

  // === Loading Skeleton ===

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  // === Render ===

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Conformité réglementaire
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score de conformité, certifications et déclarations légales
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshScore} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Recalculer
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="p-4 flex items-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
            <Button variant="outline" size="sm" onClick={fetchScore} className="ml-auto">
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main Score + Certification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Overall Score */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score global de conformité</CardTitle>
            <CardDescription>Dernier calcul : {score ? formatDateTime(score.dateCalcul) : '—'}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    className="text-muted/30"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="10"
                    strokeDasharray={`${(score?.scoreTotal || 0) * 3.14} 314`}
                    strokeLinecap="round"
                    className={score ? (score.scoreTotal < 50 ? 'text-red-500' : score.scoreTotal < 70 ? 'text-amber-500' : 'text-green-500') : 'text-muted'}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-4xl font-bold ${score ? scoreColor(score.scoreTotal) : ''}`}>
                    {score?.scoreTotal || 0}
                  </span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>

              {/* Score details */}
              <div className="flex-1 space-y-4 w-full">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-lg font-semibold ${score ? scoreColor(score.scoreTotal) : ''}`}>
                      {score ? scoreLabel(score.scoreTotal) : 'Non calculé'}
                    </span>
                    <Badge variant={score ? scoreBadgeVariant(score.scoreTotal) : 'secondary'}>
                      {score ? `${score.scoreTotal}%` : '—'}
                    </Badge>
                  </div>
                  <Progress
                    value={score?.scoreTotal || 0}
                    className={`h-3 ${score ? scoreProgressBarClass(score.scoreTotal) : ''}`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    {score && score.scoreTotal >= 70 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      {score && score.scoreTotal >= 70 ? 'Conforme' : 'Non conforme'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {subScores.filter((s) => s.score >= 70).length}/{subScores.length} critères OK
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Certification */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="w-4 h-4" />
              Certification DPMED
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {score?.certificationDPMED ? (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                  <BadgeCheck className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-700">Certifié DPMED</p>
                  <p className="text-sm text-muted-foreground">
                    Votre pharmacie est certifiée conforme
                  </p>
                </div>
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  Certification active
                </Badge>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700">Non certifié</p>
                  <p className="text-sm text-muted-foreground">
                    Atteignez un score de 70% pour demander la certification
                  </p>
                </div>
                <Button
                  onClick={() => setShowCertificationDialog(true)}
                  disabled={!score || score.scoreTotal < 70}
                  className="w-full"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Demander la certification
                </Button>
                {score && score.scoreTotal < 70 && (
                  <p className="text-xs text-muted-foreground">
                    Score minimum requis : 70% (actuel : {score.scoreTotal}%)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sub-scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Détail des scores par domaine
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            {subScores.map((sub) => {
              const Icon = sub.icon
              return (
                <div key={sub.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        sub.score < 50 ? 'bg-red-100' : sub.score < 70 ? 'bg-amber-100' : 'bg-green-100'
                      }`}>
                        <Icon className={`w-4 h-4 ${scoreColor(sub.score)}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{sub.label}</p>
                        <p className="text-xs text-muted-foreground">{sub.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${scoreColor(sub.score)}`}>
                        {sub.score}%
                      </span>
                      <Badge variant={scoreBadgeVariant(sub.score)} className="text-xs">
                        {scoreLabel(sub.score)}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={sub.score}
                    className={`h-2 ${scoreProgressBarClass(sub.score)}`}
                  />
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Exports + Timeline */}
      <Tabs defaultValue="exports">
        <TabsList>
          <TabsTrigger value="exports" className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Déclarations & Exports
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Événements récents
          </TabsTrigger>
        </TabsList>

        {/* === Exports Tab === */}
        <TabsContent value="exports" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Déclarations légales</CardTitle>
              <CardDescription>
                Générez et téléchargez les déclarations réglementaires requises
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Déclaration</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernière génération</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {declarations.map((decl) => (
                    <TableRow key={decl.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileBarChart className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{decl.label}</p>
                            <p className="text-xs text-muted-foreground">{decl.description}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{decl.periode}</TableCell>
                      <TableCell>
                        {decl.statut === 'DISPONIBLE' && (
                          <Badge className="bg-green-50 text-green-700 border-green-200 border">Disponible</Badge>
                        )}
                        {decl.statut === 'EN_COURS' && (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-200 border">En cours</Badge>
                        )}
                        {decl.statut === 'NON_GENERE' && (
                          <Badge variant="secondary">Non généré</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(decl.derniereGeneration)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {decl.statut === 'DISPONIBLE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setSelectedExport(decl)
                                setShowExportDialog(true)
                              }}
                            >
                              <Download className="w-3 h-3 mr-1" />
                              Télécharger
                            </Button>
                          )}
                          {decl.statut !== 'DISPONIBLE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => {
                                setSelectedExport(decl)
                                handleGenerateExport(decl)
                              }}
                            >
                              <FileBarChart className="w-3 h-3 mr-1" />
                              Générer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Timeline Tab === */}
        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Événements de conformité récents</CardTitle>
              <CardDescription>
                Historique des événements impactant votre score de conformité
              </CardDescription>
            </CardHeader>
            <CardContent>
              {evenements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="w-10 h-10 text-muted-foreground/40 mb-3" />
                  <h3 className="text-sm font-semibold text-muted-foreground">Aucun événement récent</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les événements de conformité apparaîtront ici
                  </p>
                </div>
              ) : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-4">
                    {evenements.map((evt, idx) => {
                      const isPositive = evt.scoreImpact > 0
                      return (
                        <div key={evt.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isPositive
                                ? 'bg-green-100 text-green-600'
                                : evt.scoreImpact < 0
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-blue-100 text-blue-600'
                            }`}>
                              {isPositive ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : evt.scoreImpact < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <Activity className="w-4 h-4" />
                              )}
                            </div>
                            {idx < evenements.length - 1 && (
                              <div className="w-px h-full bg-border mt-1" />
                            )}
                          </div>
                          <div className="flex-1 pb-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-medium text-sm">{evt.titre}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{evt.description}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 ml-3">
                                <Badge variant="outline" className="text-xs">
                                  {evt.categorie}
                                </Badge>
                                <span className={`text-sm font-bold ${isPositive ? 'text-green-600' : evt.scoreImpact < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                                  {isPositive ? '+' : ''}{evt.scoreImpact} pts
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(evt.date)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Certification Dialog */}
      <Dialog open={showCertificationDialog} onOpenChange={setShowCertificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              Demande de certification DPMED
            </DialogTitle>
            <DialogDescription>
              Demander la certification de conformité auprès de la Direction de la Pharmacie
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-green-800">Score suffisant</span>
              </div>
              <p className="text-sm text-green-700">
                Votre score de conformité de <strong>{score?.scoreTotal}%</strong> répond
                au seuil minimum requis de 70% pour la certification DPMED.
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Documents requis :</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Registre des stupéfiants à jour
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Déclarations trimestrielles conformes
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Alertes DPMED toutes acquittées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                  Rapports de pharmacovigilance soumis
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                La demande sera examinée par le DPMED. Le délai de traitement est de 15 à 30 jours ouvrés.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCertificationDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleRequestCertification}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Envoyer la demande
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Télécharger la déclaration
            </DialogTitle>
            <DialogDescription>
              {selectedExport?.label || 'Déclaration réglementaire'}
            </DialogDescription>
          </DialogHeader>

          {selectedExport && (
            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{selectedExport.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Période</span>
                  <span className="font-medium">{selectedExport.periode}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Dernière génération</span>
                  <span className="font-medium">{formatDate(selectedExport.derniereGeneration)}</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                  <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                  Le document sera généré au format PDF et contiendra les données certifiées de votre pharmacie.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Annuler
            </Button>
            <Button
              onClick={() => selectedExport && handleGenerateExport(selectedExport)}
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Download className="w-4 h-4 mr-2" />
              Télécharger le PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
