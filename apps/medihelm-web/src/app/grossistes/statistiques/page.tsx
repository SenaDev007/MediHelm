'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Package,
  Loader2,
  Calendar,
  Trophy,
  Building2,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { formatFCFA, getStatusLabel } from '@/lib/grossiste-utils'

interface TopProduct {
  dci: string
  nomCommercial: string
  totalQuantite: number
  totalMontant: number
  nombreCommandes: number
}

interface StatistiquesData {
  kpis: {
    commandesRecues: number
    commandesEnPreparation: number
    commandesEnvoyees: number
    commandesLivrees: number
    caMois: number
    pharmaciesClientes: number
    catalogueCount: number
    catalogueDisponible: number
  }
  statusDistribution: Record<string, number>
  monthlyTrend: Array<{ mois: string; commandes: number; montant: number }>
  topPharmacies: Array<{
    id: string
    nom: string
    ville: string
    count: number
    montant: number
  }>
  topProducts: TopProduct[]
}

const PIE_COLORS = [
  '#1D9E75',
  '#0F6E56',
  '#EF9F27',
  '#378ADD',
  '#9FE1CB',
  '#E24B4A',
  '#085041',
]

export default function StatistiquesPage() {
  const [data, setData] = useState<StatistiquesData | null>(null)
  const [loading, setLoading] = useState(true)
  const [grossisteId, setGrossisteId] = useState<string>('')
  const [grossistes, setGrossistes] = useState<Array<{ id: string; nom: string }>>([])
  const [period, setPeriod] = useState('6m')

  // ─── Fetch grossistes ────────────────────────────────────────
  useEffect(() => {
    const fetchGrossistes = async () => {
      try {
        const res = await fetch('/api/grossistes?actif=true')
        if (res.ok) {
          const gData = await res.json()
          setGrossistes(gData)
          if (gData.length > 0) setGrossisteId(gData[0].id)
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    fetchGrossistes()
  }, [])

  // ─── Fetch statistics data ───────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      if (!grossisteId) return
      setLoading(true)
      try {
        const res = await fetch(
          `/api/grossistes/dashboard?grossisteId=${grossisteId}`
        )
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
  }, [grossisteId])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible</p>
        </Card>
      </div>
    )
  }

  const { kpis, statusDistribution, monthlyTrend, topPharmacies, topProducts } =
    data

  // Pie chart data
  const pieData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count,
  }))

  // Revenue breakdown with average basket
  const revenueBreakdown = monthlyTrend.map(m => ({
    ...m,
    panierMoyen: m.commandes > 0 ? Math.round(m.montant / m.commandes) : 0,
  }))

  // Delivery rate
  const tauxLivraison =
    kpis.commandesRecues > 0
      ? Math.round((kpis.commandesLivrees / kpis.commandesRecues) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <BarChart3 className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
            <p className="text-sm text-muted-foreground">
              Analytics et performances de votre activité
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={grossisteId} onValueChange={setGrossisteId}>
            <SelectTrigger className="w-48 border-teal-200">
              <SelectValue placeholder="Sélectionner grossiste" />
            </SelectTrigger>
            <SelectContent>
              {grossistes.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-36 border-teal-200">
              <Calendar className="h-4 w-4 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 mois</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
              <SelectItem value="quarterly">Trimestriel</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Chiffre d&apos;affaires
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatFCFA(kpis.caMois)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-teal-50 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-teal-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-teal-600 mt-2">
              <TrendingUp className="h-3 w-3" />
              CA du mois en cours
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Commandes reçues
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {kpis.commandesRecues}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-blue-500" />
              </div>
            </div>
            {kpis.commandesEnvoyees > 0 && (
              <p className="text-xs text-amber-600 mt-2">
                {kpis.commandesEnvoyees} en attente de confirmation
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Taux de livraison
                </p>
                <p className="text-2xl font-bold text-green-700">{tauxLivraison}%</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <Package className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.commandesLivrees} livrées sur {kpis.commandesRecues}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Pharmacies clientes
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {kpis.pharmaciesClientes}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-amber-500" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.catalogueDisponible}/{kpis.catalogueCount} produits disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Évolution du chiffre d&apos;affaires
          </CardTitle>
          <CardDescription>
            Montant des commandes sur la période sélectionnée
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatFCFA(value)}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #9FE1CB',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="montant"
                  stroke="#1D9E75"
                  strokeWidth={3}
                  dot={{ r: 5, fill: '#1D9E75' }}
                  activeDot={{ r: 7 }}
                  name="Montant (FCFA)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Order Volume + Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Volume de commandes</CardTitle>
            <CardDescription>Nombre de commandes par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #9FE1CB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="commandes"
                    fill="#1D9E75"
                    radius={[4, 4, 0, 0]}
                    name="Commandes"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par statut</CardTitle>
            <CardDescription>Distribution actuelle des commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucune donnée
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      backgroundColor: PIE_COLORS[index % PIE_COLORS.length],
                    }}
                  />
                  <span className="text-muted-foreground">
                    {entry.name} ({entry.value})
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Basket + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Panier moyen par mois</CardTitle>
            <CardDescription>Montant moyen par commande</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueBreakdown}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                  <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatFCFA(value)}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #9FE1CB',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar
                    dataKey="panierMoyen"
                    fill="#EF9F27"
                    radius={[4, 4, 0, 0]}
                    name="Panier moyen"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top produits par ventes
            </CardTitle>
            <CardDescription>
              Produits les plus commandés en volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                {topProducts.map((product, index) => (
                  <div
                    key={product.dci + product.nomCommercial}
                    className="flex items-center gap-3"
                  >
                    <div
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                        index === 0
                          ? 'bg-amber-500'
                          : index === 1
                            ? 'bg-teal-600'
                            : index === 2
                              ? 'bg-teal-500'
                              : 'bg-gray-400'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {product.nomCommercial}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {product.dci} · {product.totalQuantite} unités ·{' '}
                        {product.nombreCommandes} commande(s)
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-teal-600">
                      {formatFCFA(product.totalMontant)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm">Aucune donnée produit</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Pharmacies */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-4 w-4 text-teal-600" />
            Meilleures pharmacies clientes
          </CardTitle>
          <CardDescription>
            Par nombre de commandes et chiffre d&apos;affaires
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topPharmacies.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topPharmacies.map((pharma, index) => (
                <div
                  key={pharma.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/20 transition-colors"
                >
                  <div
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                      index === 0
                        ? 'bg-teal-600'
                        : index === 1
                          ? 'bg-teal-500'
                          : index === 2
                            ? 'bg-amber-500'
                            : 'bg-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pharma.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      {pharma.ville} · {pharma.count} commande(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-teal-600">
                      {formatFCFA(pharma.montant)}
                    </p>
                    <div className="flex items-center gap-0.5 text-xs text-teal-500">
                      <ArrowUpRight className="h-3 w-3" />
                      CA
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
              <p className="text-sm">
                Aucune pharmacie cliente pour le moment
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
