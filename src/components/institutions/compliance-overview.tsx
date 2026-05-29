'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Loader2,
  Shield
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'

interface ScoreData {
  id: string
  pharmacieId: string
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
  pharmacie?: {
    id: string
    nom: string
    ville: string
    numeroAgrement: string
  }
}

export function ComplianceOverview() {
  const [scores, setScores] = useState<ScoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'below70' | 'certified'>('all')

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const res = await fetch('/api/institutions/conformite/scores')
        if (res.ok) {
          const data = await res.json()
          setScores(data)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchScores()
  }, [])

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((acc, s) => acc + s.scoreTotal, 0) / scores.length)
    : 0

  const below70 = scores.filter(s => s.scoreTotal < 70)
  const certified = scores.filter(s => s.certificationDPMED)

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-700'
    if (score >= 70) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score: number) => {
    if (score >= 85) return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Conforme</Badge>
    if (score >= 70) return <Badge className="bg-amber-100 text-amber-800"><AlertTriangle className="h-3 w-3 mr-1" />Écart</Badge>
    return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Non conforme</Badge>
  }

  const getProgressColor = (score: number) => {
    if (score >= 85) return '[&>div]:bg-green-500'
    if (score >= 70) return '[&>div]:bg-amber-500'
    return '[&>div]:bg-red-500'
  }

  const filtered = filter === 'all'
    ? scores
    : filter === 'below70'
      ? below70
      : certified

  const handleExport = () => {
    toast.info('Export PDF en cours de préparation...')
  }

  if (loading) {
    return (
      <Card className="border-teal-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="ml-2 text-muted-foreground">Chargement des scores de conformité...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-600" />
              <span className="text-2xl font-bold text-teal-800">{avgScore}%</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Score moyen de conformité</p>
            <Progress value={avgScore} className={`mt-2 h-2 ${getProgressColor(avgScore)}`} />
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">{scores.length}</div>
            <p className="text-xs text-muted-foreground">Pharmacies évaluées</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-red-600">{below70.length}</div>
            <p className="text-xs text-muted-foreground">Sous le seuil 70%</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700">{certified.length}</div>
            <p className="text-xs text-muted-foreground">Certifiées DPMED</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[
            { key: 'all' as const, label: 'Toutes', count: scores.length },
            { key: 'below70' as const, label: 'Sous 70%', count: below70.length },
            { key: 'certified' as const, label: 'Certifiées', count: certified.length },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filter === f.key
                  ? 'bg-teal-600 text-white'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="border-teal-300 text-teal-700">
          <Download className="h-4 w-4 mr-1" />
          Exporter rapport
        </Button>
      </div>

      {/* Scores Table */}
      <Card className="border-teal-200">
        <CardContent className="p-0">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pharmacie</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Score Total</TableHead>
                  <TableHead>Registre Stup.</TableHead>
                  <TableHead>Alertes DPMED</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Pharmacovigilance</TableHead>
                  <TableHead>Destructions</TableHead>
                  <TableHead>Certification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Aucun score de conformité trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">
                        {s.pharmacie?.nom || 'Inconnue'}
                        <div className="text-xs text-muted-foreground">{s.pharmacie?.numeroAgrement}</div>
                      </TableCell>
                      <TableCell>{s.pharmacie?.ville || '-'}</TableCell>
                      <TableCell>
                        <span className={`font-bold ${getScoreColor(s.scoreTotal)}`}>
                          {Math.round(s.scoreTotal)}%
                        </span>
                        <Progress value={s.scoreTotal} className={`mt-1 h-1.5 ${getProgressColor(s.scoreTotal)}`} />
                      </TableCell>
                      <TableCell className={getScoreColor(s.scoreRegistreStup)}>{Math.round(s.scoreRegistreStup)}%</TableCell>
                      <TableCell className={getScoreColor(s.scoreAlerteDPMED)}>{Math.round(s.scoreAlerteDPMED)}%</TableCell>
                      <TableCell className={getScoreColor(s.scoreDocuments)}>{Math.round(s.scoreDocuments)}%</TableCell>
                      <TableCell className={getScoreColor(s.scorePharmacovigi)}>{Math.round(s.scorePharmacovigi)}%</TableCell>
                      <TableCell className={getScoreColor(s.scoreDestructions)}>{Math.round(s.scoreDestructions)}%</TableCell>
                      <TableCell>
                        {s.certificationDPMED ? (
                          <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Certifiée</Badge>
                        ) : (
                          getScoreBadge(s.scoreTotal)
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
