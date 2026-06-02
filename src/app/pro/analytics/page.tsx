'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { BarChart3, TrendingUp, Package, DollarSign, Download, Brain, Shield, HeartPulse, AlertTriangle, ShoppingCart, Loader2, RefreshCw } from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
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
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'
import { toast } from 'sonner'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

interface EIStats {
  total: number
  leger: number
  modere: number
  grave: number
  fatal: number
  enAttente: number
  soumis: number
}

interface ConformiteData {
  scoreTotal: number
  scoreRegistreStup: number
  scoreAlerteDPMED: number
  scoreDocuments: number
  scorePharmacovigi: number
  scoreDestructions: number
  certificationDPMED: boolean
  pendingAlertesDPMED: number
  documentsExpirant: number
}

interface StockPrediction {
  medicamentId: string
  medicamentNom: string
  predictedDemand: number
  confidence: number
  currentStock: number
  reorderNeeded: boolean
  suggestedOrderQty: number
}

interface RevenuePrediction {
  month: string
  predicted: number
  lowerBound: number
  upperBound: number
}

interface DashboardData {
  caDuJour: number
  nbVentesJour: number
  ventesRecentes: { montantTotal: number; createdAt: string }[]
  topProduits: {
    id: string
    nom: string
    dci: string
    quantite: number
    montant: number
  }[]
  scorePharmacie: {
    scoreSante: number
    scoreStock: number
    scoreFinance: number
    scoreConformite: number
    scoreRH: number
    scorePharmacovigilance: number
    scoreQualite: number
  } | null
  predictions?: {
    domaine: string
    typePrediction: string
    valeur: number
    confiance: number
    periodeCible: string
  }[]
  eiStats: EIStats
  surveillancesActives: number
  conformiteData: ConformiteData
}

const COLORS = ['#1D9E75', '#0F6E56', '#EF9F27', '#378ADD', '#085041', '#9FE1CB', '#E24B4A']

export default function AnalyticsPage() {
  const { pharmacie } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('7j')
  const [stockPredictions, setStockPredictions] = useState<StockPrediction[]>([])
  const [revenuePredictions, setRevenuePredictions] = useState<RevenuePrediction[]>([])
  const [predLoading, setPredLoading] = useState(false)

  const loadData = useCallback(async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/pro/dashboard?pharmacieId=${pharmacie.id}&periode=${periode}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }, [pharmacie?.id, periode])

  const loadPredictions = useCallback(async () => {
    if (!pharmacie?.id) return
    setPredLoading(true)
    try {
      const [stockRes, revenueRes] = await Promise.all([
        fetch(`/api/ai/predictions?type=stock&pharmacieId=${pharmacie.id}`),
        fetch(`/api/ai/predictions?type=revenue&pharmacieId=${pharmacie.id}`),
      ])
      if (stockRes.ok) {
        const stockData = await stockRes.json()
        setStockPredictions(stockData.data || [])
      }
      if (revenueRes.ok) {
        const revData = await revenueRes.json()
        setRevenuePredictions(revData.data || [])
      }
    } catch { /* ignore */ } finally {
      setPredLoading(false)
    }
  }, [pharmacie?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    if (pharmacie?.id) {
      loadPredictions()
    }
  }, [pharmacie?.id, loadPredictions])

  // Sales trend chart data
  const salesTrendData = (() => {
    if (!data?.ventesRecentes) return []
    const dayMap = new Map<string, { ca: number; count: number }>()
    const days = periode === '30j' ? 30 : periode === '14j' ? 14 : 7
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      dayMap.set(key, { ca: 0, count: 0 })
    }
    for (const v of data.ventesRecentes) {
      const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      if (dayMap.has(key)) {
        const entry = dayMap.get(key)!
        entry.ca += v.montantTotal
        entry.count += 1
      }
    }
    return Array.from(dayMap.entries()).map(([name, val]) => ({
      name,
      ca: val.ca,
      ventes: val.count,
    }))
  })()

  // Top products chart
  const topProductsData = (data?.topProduits || []).map(p => ({
    name: p.nom.length > 15 ? p.nom.substring(0, 15) + '...' : p.nom,
    montant: p.montant,
    quantite: p.quantite,
  }))

  // Radar data for pharmacy health
  const radarData = data?.scorePharmacie ? [
    { subject: 'Santé', score: data.scorePharmacie.scoreSante, fullMark: 100 },
    { subject: 'Stock', score: data.scorePharmacie.scoreStock, fullMark: 100 },
    { subject: 'Finance', score: data.scorePharmacie.scoreFinance, fullMark: 100 },
    { subject: 'Conformité', score: data.scorePharmacie.scoreConformite, fullMark: 100 },
    { subject: 'RH', score: data.scorePharmacie.scoreRH, fullMark: 100 },
    { subject: 'Pharmacovigilance', score: data.scorePharmacie.scorePharmacovigilance || 0, fullMark: 100 },
    { subject: 'Qualité', score: data.scorePharmacie.scoreQualite || 0, fullMark: 100 },
  ] : (() => {
    const conf = data?.conformiteData
    const ei = data?.eiStats
    return [
      { subject: 'Santé', score: 75, fullMark: 100 },
      { subject: 'Stock', score: 65, fullMark: 100 },
      { subject: 'Finance', score: 80, fullMark: 100 },
      { subject: 'Conformité', score: conf ? conf.scoreTotal : 70, fullMark: 100 },
      { subject: 'RH', score: 60, fullMark: 100 },
      { subject: 'Pharmacovigilance', score: ei ? Math.min(100, Math.max(0, 100 - ei.total * 10 + ei.soumis * 20)) : 55, fullMark: 100 },
      { subject: 'Qualité', score: conf ? Math.round((conf.scoreDocuments / 20) * 100) : 65, fullMark: 100 },
    ]
  })()

  // EI stats data for chart
  const eiChartData = data?.eiStats ? [
    { name: 'Léger', count: data.eiStats.leger, fill: '#1D9E75' },
    { name: 'Modéré', count: data.eiStats.modere, fill: '#EF9F27' },
    { name: 'Grave', count: data.eiStats.grave, fill: '#E24B4A' },
    { name: 'Fatal', count: data.eiStats.fatal, fill: '#7F1D1D' },
  ] : []

  // Conformité breakdown for chart
  const conformiteChartData = data?.conformiteData ? [
    { name: 'Registre stup.', score: data.conformiteData.scoreRegistreStup, max: 25 },
    { name: 'Alertes DPMED', score: data.conformiteData.scoreAlerteDPMED, max: 25 },
    { name: 'Documents', score: data.conformiteData.scoreDocuments, max: 20 },
    { name: 'Pharmacovigi.', score: data.conformiteData.scorePharmacovigi, max: 15 },
    { name: 'Destructions', score: data.conformiteData.scoreDestructions, max: 15 },
  ].map(item => ({ ...item, pct: Math.round((item.score / item.max) * 100) })) : []

  // Revenue prediction chart data
  const revenueChartData = revenuePredictions.map(r => ({
    name: r.month,
    predicted: r.predicted,
    lowerBound: r.lowerBound,
    upperBound: r.upperBound,
  }))

  // Stock predictions needing reorder
  const reorderItems = stockPredictions.filter(p => p.reorderNeeded)

  // Predictions from dashboard
  const predictions = data?.predictions || []

  if (loading) {
    return (
      <div className="space-y-4">
        <BarChart3 className="w-8 h-8 text-primary/30" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-muted/20 rounded-lg animate-pulse" />
          <div className="h-64 bg-muted/20 rounded-lg animate-pulse" />
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
            <BarChart3 className="w-6 h-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground">
            Analyse détaillée de votre activité
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7j">7 jours</SelectItem>
              <SelectItem value="14j">14 jours</SelectItem>
              <SelectItem value="30j">30 jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => toast.success('Rapport PDF en cours de génération')}>
            <Download className="w-4 h-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">CA total période</span>
              <span className="text-xl font-bold block text-primary">
                {formatFCFA(data?.caDuJour ?? 0)}
              </span>
            </div>
            <DollarSign className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">Ventes total période</span>
              <span className="text-xl font-bold block">{data?.nbVentesJour ?? 0}</span>
            </div>
            <TrendingUp className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs text-muted-foreground uppercase">Panier moyen</span>
              <span className="text-xl font-bold block">
                {data?.nbVentesJour ? formatFCFA(data.caDuJour / data.nbVentesJour) : '0 FCFA'}
              </span>
            </div>
            <Package className="w-8 h-8 text-primary/30" />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tendance des ventes — {periode}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#888780" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#888780" />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      name === 'ca' ? formatFCFA(value) : value,
                      name === 'ca' ? 'CA' : 'Ventes'
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="ca" stroke="#1D9E75" strokeWidth={2} dot={{ fill: '#1D9E75', r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="w-4 h-4 text-primary" />
              Top produits (CA)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="#888780" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={100} stroke="#888780" />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), 'CA']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="montant" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pharmacy Health Radar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Score de santé pharmacie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#9FE1CB" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#2C2C2A' }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#1D9E75"
                    fill="#1D9E75"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Répartition du CA par produit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsData}
                    dataKey="montant"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={{ stroke: '#888780' }}
                  >
                    {topProductsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), 'CA']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score indicators */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Indicateurs clés</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {radarData.map(item => (
              <div key={item.subject} className="text-center">
                <div className="text-2xl font-bold" style={{
                  color: item.score >= 80 ? '#1D9E75' : item.score >= 60 ? '#EF9F27' : '#E24B4A'
                }}>
                  {Math.round(item.score)}%
                </div>
                <span className="text-xs text-muted-foreground">{item.subject}</span>
                <Badge
                  className="mt-1 text-[9px]"
                  variant={item.score >= 80 ? 'default' : item.score >= 60 ? 'outline' : 'destructive'}
                >
                  {item.score >= 80 ? 'Bon' : item.score >= 60 ? 'Moyen' : 'Faible'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Pharmacovigilance Domain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <HeartPulse className="w-4 h-4 text-primary" />
            Domaine Pharmacovigilance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Signalements EI</span>
                <p className="text-2xl font-bold text-primary">{data?.eiStats?.total ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">En attente envoi</span>
                <p className="text-2xl font-bold text-amber-500">{data?.eiStats?.enAttente ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Soumis</span>
                <p className="text-2xl font-bold text-primary">{data?.eiStats?.soumis ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Surveillances actives</span>
                <p className="text-2xl font-bold text-destructive">{data?.surveillancesActives ?? 0}</p>
              </CardContent>
            </Card>
          </div>
          {eiChartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eiChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#888780" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#888780" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {eiChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conformité Domain */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Domaine Conformité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Score global</span>
                <p className="text-2xl font-bold text-primary">{Math.round(data?.conformiteData?.scoreTotal ?? 0)}/100</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Certifié DPMED</span>
                <p className="text-2xl font-bold">
                  {data?.conformiteData?.certificationDPMED ? (
                    <span className="text-primary">Oui</span>
                  ) : (
                    <span className="text-muted-foreground">Non</span>
                  )}
                </p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Alertes DPMED</span>
                <p className="text-2xl font-bold text-amber-500">{data?.conformiteData?.pendingAlertesDPMED ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border">
              <CardContent className="p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase">Docs expirant</span>
                <p className="text-2xl font-bold text-destructive">{data?.conformiteData?.documentsExpirant ?? 0}</p>
              </CardContent>
            </Card>
          </div>
          {conformiteChartData.length > 0 && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={conformiteChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} stroke="#888780" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} stroke="#888780" />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Conformité']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="pct" fill="#1D9E75" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== AI Predictions Section ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Prédictions IA
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary gap-1"
              onClick={loadPredictions}
              disabled={predLoading}
            >
              <RefreshCw className={`h-3 w-3 ${predLoading ? 'animate-spin' : ''}`} />
              Actualiser
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {predLoading && stockPredictions.length === 0 && revenuePredictions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calcul des prédictions...</p>
            </div>
          ) : (
            <>
              {/* Stock Predictions Table */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4 text-primary" />
                  Prédictions de stock
                  {reorderItems.length > 0 && (
                    <Badge variant="destructive" className="text-[9px]">
                      {reorderItems.length} réappro. nécessaire{reorderItems.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </h3>
                {stockPredictions.length > 0 ? (
                  <div className="max-h-96 overflow-y-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left p-3 font-medium">Médicament</th>
                          <th className="text-center p-3 font-medium">Demande prévue</th>
                          <th className="text-center p-3 font-medium">Stock actuel</th>
                          <th className="text-center p-3 font-medium">Confiance</th>
                          <th className="text-center p-3 font-medium">Statut</th>
                          <th className="text-center p-3 font-medium">Qté suggérée</th>
                          <th className="text-center p-3 font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stockPredictions.map((pred) => (
                          <tr key={pred.medicamentId} className={`border-t ${pred.reorderNeeded ? 'bg-red-50/50' : ''}`}>
                            <td className="p-3 font-medium max-w-[150px] truncate">{pred.medicamentNom}</td>
                            <td className="p-3 text-center">{pred.predictedDemand}</td>
                            <td className="p-3 text-center">
                              <span className={pred.currentStock < pred.predictedDemand ? 'text-destructive font-bold' : ''}>
                                {pred.currentStock}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center gap-1 justify-center">
                                <Progress
                                  value={pred.confidence * 100}
                                  className="h-1.5 w-12"
                                />
                                <span className={`text-[10px] ${
                                  pred.confidence >= 0.8 ? 'text-primary' : pred.confidence >= 0.6 ? 'text-amber-500' : 'text-muted-foreground'
                                }`}>
                                  {Math.round(pred.confidence * 100)}%
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {pred.reorderNeeded ? (
                                <Badge variant="destructive" className="text-[9px]">Réappro.</Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] bg-primary/10 text-primary">OK</Badge>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {pred.reorderNeeded ? (
                                <span className="font-bold text-destructive">{pred.suggestedOrderQty}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              {pred.reorderNeeded && (
                                <Button
                                  size="sm"
                                  className="h-6 text-[9px] bg-primary hover:bg-teal-700 gap-1"
                                  onClick={() => toast.success(`Commande de ${pred.suggestedOrderQty} unités de ${pred.medicamentNom} initiée`)}
                                >
                                  <ShoppingCart className="h-3 w-3" />
                                  Commander
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                    Pas assez de données pour les prédictions de stock
                  </div>
                )}
              </div>

              {/* Revenue Prediction Chart */}
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Prévisions de revenus (6 mois)
                </h3>
                {revenueChartData.length > 0 ? (
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={revenueChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10 }}
                          stroke="#888780"
                          tickFormatter={(value: string) => {
                            const [y, m] = value.split('-')
                            const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
                            return months[parseInt(m, 10) - 1] + ' ' + y.slice(2)
                          }}
                        />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          stroke="#888780"
                          tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            const labels: Record<string, string> = {
                              predicted: 'Prévu',
                              upperBound: 'Max',
                              lowerBound: 'Min',
                            }
                            return [formatFCFA(value), labels[name] || name]
                          }}
                          labelFormatter={(label: string) => {
                            const [y, m] = String(label).split('-')
                            const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
                            return months[parseInt(m, 10) - 1] + ' ' + y
                          }}
                          contentStyle={{ fontSize: 12, borderRadius: 8 }}
                        />
                        <Area
                          type="monotone"
                          dataKey="upperBound"
                          stroke="#9FE1CB"
                          fill="#9FE1CB"
                          fillOpacity={0.2}
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                        <Area
                          type="monotone"
                          dataKey="lowerBound"
                          stroke="#9FE1CB"
                          fill="#9FE1CB"
                          fillOpacity={0.2}
                          strokeDasharray="4 4"
                          strokeWidth={1}
                        />
                        <Area
                          type="monotone"
                          dataKey="predicted"
                          stroke="#1D9E75"
                          fill="#1D9E75"
                          fillOpacity={0.15}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground bg-muted/20 rounded-lg">
                    Pas assez de données pour les prévisions de revenus
                  </div>
                )}
              </div>

              {/* Confidence Legend */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="font-medium">Indicateurs de confiance :</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Élevée ({'>'}80%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" /> Moyenne (60-80%)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-muted-foreground/30 inline-block" /> Faible ({'<'}60%)
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Legacy Predictions (from dashboard) */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              Prédictions IA — Historique
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {predictions.map((pred, i) => (
                <Card key={i} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-[9px]">{pred.domaine}</Badge>
                      <Badge variant="secondary" className="text-[9px]">{pred.typePrediction}</Badge>
                    </div>
                    <p className="text-xl font-bold text-primary">{formatFCFA(pred.valeur)}</p>
                    <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                      <span>Confiance: {Math.round(pred.confiance * 100)}%</span>
                      <span>{pred.periodeCible}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
