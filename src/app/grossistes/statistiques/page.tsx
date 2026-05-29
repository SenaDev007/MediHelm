"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
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
  AreaChart,
  Area,
} from "recharts"
import {
  TrendingUp,
  Package,
  Building2,
  ShoppingCart,
  MapPin,
} from "lucide-react"
import { formatFCFA, getStatusLabel } from "@/lib/grossiste-utils"

interface StatsData {
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
}

const PIE_COLORS = ["#1D9E75", "#0F6E56", "#EF9F27", "#378ADD", "#9FE1CB", "#E24B4A", "#085041"]

// Simulated product category data
const categoryData = [
  { categorie: "Antalgiques", ventes: 142, montant: 312000 },
  { categorie: "Antibiotiques", ventes: 98, montant: 478000 },
  { categorie: "Antipaludéens", ventes: 87, montant: 385000 },
  { categorie: "Anti-inflammatoires", ventes: 65, montant: 198000 },
  { categorie: "Gastro-entérologie", ventes: 54, montant: 145000 },
  { categorie: "Stupéfiants", ventes: 12, montant: 96000 },
]

// Simulated geographic data
const geographicData = [
  { ville: "Dakar", commandes: 89, montant: 1250000 },
  { ville: "Thiès", commandes: 34, montant: 425000 },
  { ville: "Saint-Louis", commandes: 22, montant: 298000 },
  { ville: "Kaolack", commandes: 18, montant: 185000 },
  { ville: "Ziguinchor", commandes: 12, montant: 142000 },
  { ville: "Tambacounda", commandes: 8, montant: 95000 },
]

// Top products simulated
const topProductsData = [
  { nom: "Doliprane 500mg", dci: "Paracétamol", quantite: 320, montant: 288000 },
  { nom: "Coartem 20/120mg", dci: "Artémether/Luméfantrine", quantite: 245, montant: 784000 },
  { nom: "Clamoxyl 500mg", dci: "Amoxicilline", quantite: 198, montant: 435600 },
  { nom: "Flagyl 250mg", dci: "Métronidazole", quantite: 156, montant: 265200 },
  { nom: "Brufen 400mg", dci: "Ibuprofène", quantite: 142, montant: 185000 },
  { nom: "Ciflox 500mg", dci: "Ciprofloxacine", quantite: 112, montant: 313600 },
  { nom: "Mopral 20mg", dci: "Oméprazole", quantite: 98, montant: 235200 },
  { nom: "Zithromax 250mg", dci: "Azithromycine", quantite: 67, montant: 278800 },
]

export default function StatistiquesPage() {
  const [data, setData] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const gRes = await fetch("/api/grossistes?actif=true")
        const grossistes = await gRes.json()
        if (grossistes.length === 0) {
          setLoading(false)
          return
        }

        const res = await fetch(`/api/grossistes/dashboard?grossisteId=${grossistes[0].id}`)
        const statsData = await res.json()
        setData(statsData)
      } catch (error) {
        console.error("Erreur chargement stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const statusDistribution = data?.statusDistribution || {}
  const monthlyTrend = data?.monthlyTrend || []
  const topPharmacies = data?.topPharmacies || []
  const kpis = data?.kpis

  // Prepare pie chart data
  const pieData = Object.entries(statusDistribution).map(([status, count]) => ({
    name: getStatusLabel(status),
    value: count,
  }))

  // Prepare pharmacy chart data
  const pharmacyChartData = topPharmacies.map(p => ({
    nom: p.nom.length > 15 ? p.nom.substring(0, 15) + "…" : p.nom,
    commandes: p.count,
    montant: p.montant,
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statistiques</h1>
        <p className="text-muted-foreground mt-1">Analyse détaillée de votre activité</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
              <ShoppingCart className="h-5 w-5 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis?.commandesRecues || 0}</p>
              <p className="text-xs text-muted-foreground">Commandes totales</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{kpis?.commandesLivrees || 0}</p>
              <p className="text-xs text-muted-foreground">Commandes livrées</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#E1F5EE] flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-[#0F6E56]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis?.pharmaciesClientes || 0}</p>
              <p className="text-xs text-muted-foreground">Pharmacies clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
              <Package className="h-5 w-5 text-[#EF9F27]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{kpis?.catalogueCount || 0}</p>
              <p className="text-xs text-muted-foreground">Produits en catalogue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="ventes" className="space-y-6">
        <TabsList className="bg-muted/50">
          <TabsTrigger value="ventes">Ventes</TabsTrigger>
          <TabsTrigger value="produits">Produits</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="geographie">Géographie</TabsTrigger>
        </TabsList>

        {/* Ventes Tab */}
        <TabsContent value="ventes" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Revenue Trend */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Chiffre d&apos;affaires mensuel</CardTitle>
                <CardDescription>Évolution sur 6 mois</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="colorMontant" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatFCFA(value)}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }}
                      />
                      <Area
                        type="monotone"
                        dataKey="montant"
                        stroke="#1D9E75"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorMontant)"
                        name="Montant"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Orders per Month */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Commandes par mois</CardTitle>
                <CardDescription>Volume mensuel</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                      <XAxis dataKey="mois" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }} />
                      <Bar dataKey="commandes" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Commandes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Répartition des statuts</CardTitle>
                <CardDescription>État des commandes</CardDescription>
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
                          innerRadius={55}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
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
                      Aucune donnée disponible
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Category Revenue */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ventes par catégorie</CardTitle>
                <CardDescription>Répartition par famille thérapeutique</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <YAxis dataKey="categorie" type="category" tick={{ fontSize: 11 }} width={120} />
                      <Tooltip
                        formatter={(value: number, name: string) => name === "montant" ? formatFCFA(value) : value}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }}
                      />
                      <Bar dataKey="montant" fill="#1D9E75" radius={[0, 4, 4, 0]} name="montant" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="produits" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Top produits</CardTitle>
              <CardDescription>Produits les plus commandés</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">#</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">Produit</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">DCI</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Quantité</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProductsData.map((product, index) => (
                      <tr key={product.nom} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                            index === 0 ? "bg-[#1D9E75]" : index === 1 ? "bg-[#0F6E56]" : index === 2 ? "bg-[#EF9F27]" : "bg-muted-foreground/40"
                          }`}>
                            {index + 1}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-sm font-medium">{product.nom}</td>
                        <td className="py-3 px-3 text-sm text-muted-foreground">{product.dci}</td>
                        <td className="py-3 px-3 text-sm text-right">{product.quantite}</td>
                        <td className="py-3 px-3 text-sm text-right font-semibold text-teal-600">{formatFCFA(product.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Quantités par catégorie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                    <XAxis dataKey="categorie" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }} />
                    <Bar dataKey="ventes" fill="#EF9F27" radius={[4, 4, 0, 0]} name="Ventes" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Clients Tab */}
        <TabsContent value="clients" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pharmacies les plus actives</CardTitle>
                <CardDescription>Par nombre de commandes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {pharmacyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pharmacyChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                        <XAxis type="number" tick={{ fontSize: 12 }} />
                        <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={130} />
                        <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }} />
                        <Bar dataKey="commandes" fill="#1D9E75" radius={[0, 4, 4, 0]} name="Commandes" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Aucune donnée client
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">CA par pharmacie</CardTitle>
                <CardDescription>Montant des commandes par client</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {pharmacyChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={pharmacyChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                        <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <YAxis dataKey="nom" type="category" tick={{ fontSize: 11 }} width={130} />
                        <Tooltip
                          formatter={(value: number) => formatFCFA(value)}
                          contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }}
                        />
                        <Bar dataKey="montant" fill="#0F6E56" radius={[0, 4, 4, 0]} name="Montant" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Aucune donnée client
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pharmacy List */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Détail par pharmacie</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 overflow-y-auto custom-scrollbar">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">Pharmacie</th>
                      <th className="text-left text-xs font-medium text-muted-foreground pb-2 px-3">Ville</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">Commandes</th>
                      <th className="text-right text-xs font-medium text-muted-foreground pb-2 px-3">CA Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topPharmacies.map(p => (
                      <tr key={p.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                        <td className="py-2.5 px-3 text-sm font-medium">{p.nom}</td>
                        <td className="py-2.5 px-3 text-sm text-muted-foreground">{p.ville}</td>
                        <td className="py-2.5 px-3 text-sm text-right">{p.count}</td>
                        <td className="py-2.5 px-3 text-sm text-right font-semibold text-teal-600">{formatFCFA(p.montant)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Geography Tab */}
        <TabsContent value="geographie" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Commandes par ville</CardTitle>
                <CardDescription>Distribution géographique</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geographicData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                      <XAxis dataKey="ville" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }} />
                      <Bar dataKey="commandes" fill="#1D9E75" radius={[4, 4, 0, 0]} name="Commandes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">CA par région</CardTitle>
                <CardDescription>Chiffre d&apos;affaires géographique</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={geographicData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#9FE1CB" />
                      <XAxis dataKey="ville" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        formatter={(value: number) => formatFCFA(value)}
                        contentStyle={{ backgroundColor: "white", border: "1px solid #9FE1CB", borderRadius: "8px" }}
                      />
                      <Bar dataKey="montant" fill="#0F6E56" radius={[4, 4, 0, 0]} name="Montant" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Geographic Detail */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Détail géographique</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {geographicData.map((geo, index) => {
                  const maxMontant = Math.max(...geographicData.map(g => g.montant))
                  const percentage = (geo.montant / maxMontant) * 100
                  return (
                    <div key={geo.ville} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 w-32 shrink-0">
                        <MapPin className="h-4 w-4 text-[#1D9E75]" />
                        <span className="text-sm font-medium">{geo.ville}</span>
                      </div>
                      <div className="flex-1">
                        <div className="h-6 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#1D9E75] rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right w-28 shrink-0">
                        <span className="text-sm font-semibold">{geo.commandes} cmd.</span>
                      </div>
                      <div className="text-right w-32 shrink-0">
                        <span className="text-sm font-semibold text-teal-600">{formatFCFA(geo.montant)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
