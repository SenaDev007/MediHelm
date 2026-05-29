"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  ShoppingCart,
  PackageCheck,
  DollarSign,
  Building2,
  TrendingUp,
  Clock,
  Package,
} from "lucide-react"
import { formatFCFA, formatDateTimeFR, getStatusColor, getStatusLabel } from "@/lib/grossiste-utils"
import type { CommandeGrossiste } from "@/lib/grossiste-utils"
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
} from "recharts"

interface DashboardData {
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
  topPharmacies: Array<{ id: string; nom: string; ville: string; count: number; montant: number }>
  recentOrders: CommandeGrossiste[]
}

const PIE_COLORS = ["#1D9E75", "#0F6E56", "#EF9F27", "#378ADD", "#9FE1CB", "#E24B4A", "#085041"]

export default function GrossistesDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        // Get the first grossiste (UbiPharm)
        const grossistesRes = await fetch("/api/grossistes?actif=true")
        const grossistes = await grossistesRes.json()

        if (grossistes.length === 0) {
          setLoading(false)
          return
        }

        const grossisteId = grossistes[0].id
        const res = await fetch(`/api/grossistes/dashboard?grossisteId=${grossisteId}`)
        const dashboardData = await res.json()
        setData(dashboardData)
      } catch (error) {
        console.error("Erreur chargement dashboard:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
          <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de votre activité grossiste</p>
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
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">Aucune donnée disponible. Vérifiez la connexion à la base de données.</p>
        </Card>
      </div>
    )
  }

  const { kpis, statusDistribution, monthlyTrend, topPharmacies, recentOrders } = data

  // Prepare pie chart data
  const pieData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d&apos;ensemble de votre activité grossiste</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-[#1D9E75]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Commandes reçues</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.commandesRecues}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                <ShoppingCart className="h-6 w-6 text-[#1D9E75]" />
              </div>
            </div>
            {kpis.commandesEnvoyees > 0 && (
              <p className="text-xs text-amber-500 mt-2 font-medium">
                <Clock className="h-3 w-3 inline mr-1" />
                {kpis.commandesEnvoyees} en attente de confirmation
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#EF9F27]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">En préparation</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.commandesEnPreparation}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                <PackageCheck className="h-6 w-6 text-[#EF9F27]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#0F6E56]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">CA du mois</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatFCFA(kpis.caMois)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-[#0F6E56]" />
              </div>
            </div>
            <div className="flex items-center gap-1 text-xs text-teal-600 mt-2">
              <TrendingUp className="h-3 w-3" />
              Chiffre d&apos;affaires du mois en cours
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-[#085041]">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pharmacies clientes</p>
                <p className="text-3xl font-bold text-foreground mt-1">{kpis.pharmaciesClientes}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                <Building2 className="h-6 w-6 text-[#085041]" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              <Package className="h-3 w-3 inline mr-1" />
              {kpis.catalogueDisponible}/{kpis.catalogueCount} produits en catalogue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Trend */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tendance des commandes</CardTitle>
            <CardDescription>6 derniers mois</CardDescription>
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
                      backgroundColor: "white",
                      border: "1px solid #9FE1CB",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="commandes" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Commandes" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Répartition par statut</CardTitle>
            <CardDescription>État actuel des commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                  Aucune commande
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {pieData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{entry.name} ({entry.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Recent Orders + Top Pharmacies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Commandes récentes</CardTitle>
            <CardDescription>Dernières commandes reçues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto custom-scrollbar">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Référence</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Pharmacie</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Statut</th>
                    <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-2">Montant</th>
                    <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                        Aucune commande pour le moment
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-2 text-sm font-mono font-medium">
                          {order.referenceGrossiste || order.id.substring(0, 8).toUpperCase()}
                        </td>
                        <td className="py-2.5 px-2 text-sm">
                          {order.pharmacie?.nom || "—"}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge className={getStatusColor(order.statut)}>
                            {getStatusLabel(order.statut)}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-sm text-right font-semibold text-teal-600">
                          {formatFCFA(order.montantTotal)}
                        </td>
                        <td className="py-2.5 px-2 text-sm text-muted-foreground">
                          {formatDateTimeFR(order.dateEnvoi)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Pharmacies */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Meilleures pharmacies</CardTitle>
            <CardDescription>Par nombre de commandes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPharmacies.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Aucune pharmacie cliente</p>
              ) : (
                topPharmacies.map((pharma, index) => (
                  <div key={pharma.id} className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      index === 0 ? "bg-[#1D9E75]" : index === 1 ? "bg-[#0F6E56]" : index === 2 ? "bg-[#EF9F27]" : "bg-muted-foreground"
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{pharma.nom}</p>
                      <p className="text-xs text-muted-foreground">{pharma.ville} · {pharma.count} commande(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-teal-600">{formatFCFA(pharma.montant)}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Trend Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Évolution du chiffre d&apos;affaires</CardTitle>
          <CardDescription>Montant des commandes sur 6 mois</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => formatFCFA(value)}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #9FE1CB",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="montant"
                  stroke="#1D9E75"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#1D9E75" }}
                  activeDot={{ r: 7 }}
                  name="Montant"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
