'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  BarChart3,
  AlertTriangle,
  TrendingUp,
  Shield,
  Loader2,
  Map,
  Eye,
  EyeOff,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'

interface ABRPData {
  kpis: {
    totalPharmacies: number
    alertesRupture: number
    alertesSeuilMin: number
    avgScoreConformite: number
    signalementsTotal: number
  }
  pharmaciesParVille: Array<{ ville: string; count: number }>
  tensionsDCI: Array<{ dci: string; count: number; niveau: string }>
  monthlyTrend: Array<{ mois: string; commandes: number; montant: number }>
  signalementsParGravite: Array<{ gravite: string; count: number }>
}

const GRAVITE_CONFIG: Record<string, { label: string; color: string }> = {
  MINEUR: { label: 'Mineur', color: 'bg-green-100 text-green-800' },
  MODERE: { label: 'Modéré', color: 'bg-amber-100 text-amber-800' },
  GRAVE: { label: 'Grave', color: 'bg-orange-100 text-orange-800' },
  VITAL: { label: 'Vital', color: 'bg-red-100 text-red-800' },
}

const NIVEAU_CONFIG: Record<string, { label: string; color: string }> = {
  CRITIQUE: { label: 'Critique', color: 'bg-red-100 text-red-800' },
  ELEVE: { label: 'Élevé', color: 'bg-orange-100 text-orange-800' },
  MODERE: { label: 'Modéré', color: 'bg-amber-100 text-amber-800' },
}

export default function ABRPDashboard() {
  const [data, setData] = useState<ABRPData | null>(null)
  const [loading, setLoading] = useState(true)
  const [anonymized, setAnonymized] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portail/abrp/dashboard')
        if (res.ok) {
          const d = await res.json()
          setData(d)
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-teal-800">Tableau de bord ABRP</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse border-teal-200">
              <CardContent className="p-6"><div className="h-20 bg-teal-50 rounded" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-6">
        <Card className="border-teal-200 p-8 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible.</p>
        </Card>
      </div>
    )
  }

  const { kpis, pharmaciesParVille, tensionsDCI, monthlyTrend, signalementsParGravite } = data

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-teal-800">Tableau de bord ABRP</h1>
            <p className="text-sm text-muted-foreground">Association Béninoise des Pharmaciens — Données anonymisées</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href="/institutions/abrp/carte">
            <Button variant="outline" className="border-teal-300 text-teal-700">
              <Map className="h-4 w-4 mr-2" />
              Carte approvisionnement
            </Button>
          </Link>
        </div>
      </div>

      {/* Anonymization Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              {anonymized ? <EyeOff className="h-5 w-5 text-amber-600 mt-0.5" /> : <Eye className="h-5 w-5 text-amber-600 mt-0.5" />}
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {anonymized ? 'Mode anonymisé' : 'Mode détaillé'}
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  {anonymized
                    ? 'Les données individuelles des pharmacies ne sont pas accessibles. Seules les statistiques agrégées sont affichées.'
                    : 'Attention : certaines données nominatives pourraient être visibles.'
                  }
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAnonymized(!anonymized)}
              className="border-amber-300 text-amber-700"
            >
              {anonymized ? <Eye className="h-4 w-4 mr-1" /> : <EyeOff className="h-4 w-4 mr-1" />}
              {anonymized ? 'Voir détail' : 'Anonymiser'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-teal-200 border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pharmacies connectées</p>
                <p className="text-3xl font-bold text-teal-800">{kpis.totalPharmacies}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                <Shield className="h-6 w-6 text-teal-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-red-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Ruptures de stock</p>
                <p className="text-3xl font-bold text-red-600">{kpis.alertesRupture}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">+ {kpis.alertesSeuilMin} seuils minimum</p>
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Conformité moyenne</p>
                <p className="text-3xl font-bold text-green-700">{kpis.avgScoreConformite}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <Progress value={kpis.avgScoreConformite} className="mt-2 h-2 [&>div]:bg-green-500" />
          </CardContent>
        </Card>

        <Card className="border-teal-200 border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Signalements EI</p>
                <p className="text-3xl font-bold text-amber-600">{kpis.signalementsTotal}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Supply Tension Indicators */}
      <Card className="border-teal-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-teal-800">Indicateurs de tension d&apos;approvisionnement</CardTitle>
          <CardDescription>DCI les plus fréquemment en rupture ou en seuil minimum</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DCI</TableHead>
                  <TableHead>Nombre d&apos;alertes</TableHead>
                  <TableHead>Niveau de tension</TableHead>
                  <TableHead>Tendance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tensionsDCI.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      Aucune tension détectée
                    </TableCell>
                  </TableRow>
                ) : (
                  tensionsDCI.map((t, i) => {
                    const niveauConf = NIVEAU_CONFIG[t.niveau] || NIVEAU_CONFIG.MODERE
                    return (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-teal-800">{t.dci}</TableCell>
                        <TableCell>
                          <span className="font-semibold">{t.count}</span>
                          <span className="text-muted-foreground text-xs ml-1">alertes</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={niveauConf.color}>{niveauConf.label}</Badge>
                        </TableCell>
                        <TableCell>
                          <Progress
                            value={Math.min(100, t.count * 10)}
                            className="h-2 w-24 [&>div]:bg-red-500"
                          />
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pharmacies par ville */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Pharmacies par ville</CardTitle>
            <CardDescription>Répartition géographique (anonymisée)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={pharmaciesParVille.slice(0, 10)}
                  layout="vertical"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="ville" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #9FE1CB', borderRadius: '8px' }} />
                  <Bar dataKey="count" fill="#1D9E75" radius={[0, 4, 4, 0]} name="Pharmacies" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Order Trend */}
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Tendance des commandes</CardTitle>
            <CardDescription>Volume mensuel (anonymisé)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: 'white', border: '1px solid #9FE1CB', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="commandes" stroke="#1D9E75" strokeWidth={3} dot={{ r: 5, fill: '#1D9E75' }} name="Commandes" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signalements par gravité */}
      {signalementsParGravite.length > 0 && (
        <Card className="border-teal-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-teal-800">Signalements d&apos;effets indésirables</CardTitle>
            <CardDescription>Répartition par gravité (données agrégées)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {signalementsParGravite.map((s) => {
                const conf = GRAVITE_CONFIG[s.gravite] || GRAVITE_CONFIG.MODERE
                return (
                  <div key={s.gravite} className="flex items-center gap-2 p-3 rounded-lg border border-teal-100 bg-white">
                    <Badge className={conf.color}>{conf.label}</Badge>
                    <span className="text-lg font-bold text-teal-800">{s.count}</span>
                    <span className="text-xs text-muted-foreground">signalement(s)</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
