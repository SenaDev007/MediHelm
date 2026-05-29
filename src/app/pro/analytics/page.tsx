'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BarChart3, TrendingUp, Package, DollarSign } from 'lucide-react'
import { useEffect, useState } from 'react'
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
} from 'recharts'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
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
  } | null
}

const COLORS = ['#1D9E75', '#0F6E56', '#EF9F27', '#378ADD', '#085041', '#9FE1CB']

export default function AnalyticsPage() {
  const { pharmacie } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [periode, setPeriode] = useState('7j')

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/pro/dashboard?pharmacieId=${pharmacie.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

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
  ] : [
    { subject: 'Santé', score: 75, fullMark: 100 },
    { subject: 'Stock', score: 65, fullMark: 100 },
    { subject: 'Finance', score: 80, fullMark: 100 },
    { subject: 'Conformité', score: 70, fullMark: 100 },
    { subject: 'RH', score: 60, fullMark: 100 },
  ]

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
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
              Tendance des ventes
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
            <CardTitle className="text-sm font-semibold">🏥 Score de santé pharmacie</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#9FE1CB" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#2C2C2A' }} />
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
            <CardTitle className="text-sm font-semibold">📊 Répartition du CA par produit</CardTitle>
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
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
    </div>
  )
}
