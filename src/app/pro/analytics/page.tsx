'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  Brain,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  RefreshCw,
  Loader2,
  ShoppingCart,
  Activity,
  Target,
  Zap,
} from 'lucide-react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { toast } from 'sonner'

// === Types ===

interface RevenueData {
  mois: string
  montant: number
}

interface TopProduct {
  id: string
  nom: string
  quantite: number
  chiffreAffaires: number
}

interface SalesDistribution {
  categorie: string
  pourcentage: number
  montant: number
}

interface Prediction {
  id: string
  domaine: string
  type: string
  prediction: string
  confiance: number
  genereeLe: string
  expireLe: string | null
}

interface AnalyticsRapport {
  id: string
  domaine: string
  periode: string
  genereeLe: string
}

// === Helpers ===

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

const CATEGORIES_COLORS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
  'bg-teal-500',
]

// Simple bar chart component
function SimpleBarChart({ data, maxHeight = 200 }: { data: RevenueData[], maxHeight?: number }) {
  if (data.length === 0) return null
  const max = Math.max(...data.map(d => d.montant), 1)
  return (
    <div className="flex items-end gap-1 h-full" style={{ height: maxHeight }}>
      {data.map((d, i) => {
        const height = max > 0 ? (d.montant / max) * 100 : 0
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {d.montant > 0 ? `${(d.montant / 1000).toFixed(0)}k` : ''}
            </span>
            <div
              className="w-full bg-primary/80 rounded-t-sm min-h-[2px] transition-all hover:bg-primary"
              style={{ height: `${height}%` }}
              title={`${d.mois}: ${formatFCFA(d.montant)}`}
            />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">{d.mois.slice(0, 3)}</span>
          </div>
        )
      })}
    </div>
  )
}

// === Main Component ===

export default function AnalyticsPage() {
  const { pharmacie } = useAuth()
  const pharmacieId = pharmacie?.id

  const [activeTab, setActiveTab] = useState('dashboard')
  const [periode, setPeriode] = useState('6m')

  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [topProducts, setTopProducts] = useState<TopProduct[]>([])
  const [salesDist, setSalesDist] = useState<SalesDistribution[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [rapports, setRapports] = useState<AnalyticsRapport[]>([])
  const [loading, setLoading] = useState(true)
  const [predLoading, setPredLoading] = useState(true)

  // KPI state
  const [kpi, setKpi] = useState({
    chiffreAffaires: 0,
    caTendance: 0,
    ventes: 0,
    ventesTendance: 0,
    panierMoyen: 0,
    panierTendance: 0,
    clientsActifs: 0,
    clientsTendance: 0,
  })

  const fetchAnalytics = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/rapports-analytics?pharmacieId=${pharmacieId}&periode=${periode}`)
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json) ? json : json.data || []

        // Process revenue data
        const revenue: RevenueData[] = data
          .filter((r: Record<string, unknown>) => r.domaine === 'REVENUE')
          .map((r: Record<string, unknown>) => {
            const donnees = typeof r.donnees === 'string' ? JSON.parse(r.donnees) : r.donnees || {}
            return { mois: (donnees.mois || r.periode || '') as string, montant: (donnees.montant || 0) as number }
          })
        setRevenueData(revenue.length > 0 ? revenue : generateMockRevenue())

        // Process top products
        const topProd: TopProduct[] = data
          .filter((r: Record<string, unknown>) => r.domaine === 'TOP_PRODUCTS')
          .map((r: Record<string, unknown>) => {
            const donnees = typeof r.donnees === 'string' ? JSON.parse(r.donnees) : r.donnees || {}
            return { id: r.id as string, nom: (donnees.nom || '') as string, quantite: (donnees.quantite || 0) as number, chiffreAffaires: (donnees.chiffreAffaires || 0) as number }
          })
        setTopProducts(topProd.length > 0 ? topProd : generateMockTopProducts())

        // Sales distribution
        const dist: SalesDistribution[] = data
          .filter((r: Record<string, unknown>) => r.domaine === 'SALES_DISTRIBUTION')
          .map((r: Record<string, unknown>) => {
            const donnees = typeof r.donnees === 'string' ? JSON.parse(r.donnees) : r.donnees || {}
            return { categorie: (donnees.categorie || '') as string, pourcentage: (donnees.pourcentage || 0) as number, montant: (donnees.montant || 0) as number }
          })
        setSalesDist(dist.length > 0 ? dist : generateMockDistribution())

        // KPIs
        const kpiData = data.find((r: Record<string, unknown>) => r.domaine === 'KPI')
        if (kpiData) {
          const donnees = typeof kpiData.donnees === 'string' ? JSON.parse(kpiData.donnees) : kpiData.donnees || {}
          setKpi({
            chiffreAffaires: donnees.chiffreAffaires || 2450000,
            caTendance: donnees.caTendance || 12,
            ventes: donnees.ventes || 342,
            ventesTendance: donnees.ventesTendance || 8,
            panierMoyen: donnees.panierMoyen || 7163,
            panierTendance: donnees.panierTendance || 3,
            clientsActifs: donnees.clientsActifs || 187,
            clientsTendance: donnees.clientsTendance || 15,
          })
        } else {
          setKpi({ chiffreAffaires: 2450000, caTendance: 12, ventes: 342, ventesTendance: 8, panierMoyen: 7163, panierTendance: 3, clientsActifs: 187, clientsTendance: 15 })
        }

        setRapports(data.map((r: Record<string, unknown>) => ({
          id: r.id as string,
          domaine: r.domaine as string,
          periode: r.periode as string,
          genereeLe: r.genereeLe as string,
        })))
      }
    } catch {
      // Use mock data
      setRevenueData(generateMockRevenue())
      setTopProducts(generateMockTopProducts())
      setSalesDist(generateMockDistribution())
    } finally {
      setLoading(false)
    }
  }, [pharmacieId, periode])

  const fetchPredictions = useCallback(async () => {
    if (!pharmacieId) return
    try {
      const res = await fetch(`/api/ai/predictions?pharmacieId=${pharmacieId}`)
      if (res.ok) {
        const json = await res.json()
        setPredictions(Array.isArray(json) ? json : json.data || [])
      }
    } catch {
      // silent
    } finally {
      setPredLoading(false)
    }
  }, [pharmacieId])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])
  useEffect(() => { fetchPredictions() }, [fetchPredictions])

  // Mock data generators
  function generateMockRevenue(): RevenueData[] {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun']
    return months.map(m => ({ mois: m, montant: Math.round(1500000 + Math.random() * 2000000) }))
  }
  function generateMockTopProducts(): TopProduct[] {
    return [
      { id: '1', nom: 'Paracétamol 500mg', quantite: 245, chiffreAffaires: 367500 },
      { id: '2', nom: 'Amoxicilline 250mg', quantite: 189, chiffreAffaires: 567000 },
      { id: '3', nom: 'Oméprazole 20mg', quantite: 156, chiffreAffaires: 234000 },
      { id: '4', nom: 'Ibuprofène 400mg', quantite: 134, chiffreAffaires: 201000 },
      { id: '5', nom: 'Metformine 500mg', quantite: 112, chiffreAffaires: 168000 },
    ]
  }
  function generateMockDistribution(): SalesDistribution[] {
    return [
      { categorie: 'Antibiotiques', pourcentage: 32, montant: 784000 },
      { categorie: 'Antalgiques', pourcentage: 24, montant: 588000 },
      { categorie: 'Anti-ulcéreux', pourcentage: 18, montant: 441000 },
      { categorie: 'Antidiabétiques', pourcentage: 14, montant: 343000 },
      { categorie: 'Autres', pourcentage: 12, montant: 294000 },
    ]
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground text-sm">Tableau de bord analytique et prédictions IA</p>
        </div>
        <div className="flex gap-2 items-center">
          <Select value={periode} onValueChange={setPeriode}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1 mois</SelectItem>
              <SelectItem value="3m">3 mois</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
              <SelectItem value="1y">1 an</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => fetchAnalytics()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={formatFCFA(kpi.chiffreAffaires)}
          icon={DollarSign}
          variant="success"
          trend={{ value: kpi.caTendance, label: 'vs mois préc.' }}
        />
        <KpiCard
          title="Ventes"
          value={kpi.ventes}
          icon={ShoppingCart}
          variant="default"
          trend={{ value: kpi.ventesTendance, label: 'vs mois préc.' }}
        />
        <KpiCard
          title="Panier moyen"
          value={formatFCFA(kpi.panierMoyen)}
          icon={Target}
          variant="default"
          trend={{ value: kpi.panierTendance, label: 'vs mois préc.' }}
        />
        <KpiCard
          title="Clients actifs"
          value={kpi.clientsActifs}
          icon={Users}
          variant="default"
          trend={{ value: kpi.clientsTendance, label: 'vs mois préc.' }}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="dashboard" className="gap-2"><BarChart3 className="w-4 h-4" /> Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="predictions" className="gap-2"><Brain className="w-4 h-4" /> Prédictions IA</TabsTrigger>
          <TabsTrigger value="rapports" className="gap-2"><Activity className="w-4 h-4" /> Rapports</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue chart */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-500" /> Tendance du chiffre d&apos;affaires
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <SimpleBarChart data={revenueData} maxHeight={200} />
                )}
              </CardContent>
            </Card>

            {/* Sales distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-sky-500" /> Répartition des ventes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <div className="space-y-3">
                    {salesDist.map((d, i) => (
                      <div key={d.categorie}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${CATEGORIES_COLORS[i % CATEGORIES_COLORS.length]}`} />
                            <span>{d.categorie}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{formatFCFA(d.montant)}</span>
                            <span className="text-muted-foreground text-xs">({d.pourcentage}%)</span>
                          </div>
                        </div>
                        <Progress value={d.pourcentage} className="h-2" />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top products */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" /> Top produits
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6"><TableSkeleton /></div>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>Produit</TableHead>
                        <TableHead>Quantité vendue</TableHead>
                        <TableHead className="text-right">CA</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p, i) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : i === 2 ? 'bg-amber-700' : 'bg-gray-300'}`}>
                              {i + 1}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{p.nom}</TableCell>
                          <TableCell>{p.quantite}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{formatFCFA(p.chiffreAffaires)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Predictions Tab */}
        <TabsContent value="predictions" className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium">Prédictions ORION IA</h3>
                  <p className="text-sm text-muted-foreground">Intelligence artificielle pour anticiper les tendances de votre pharmacie</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {predLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-4"><Skeleton className="h-32 w-full" /></CardContent></Card>
              ))}
            </div>
          ) : predictions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Aucune prédiction disponible</p>
                <p className="text-sm text-muted-foreground mt-1">Les prédictions sont générées automatiquement par l&apos;IA</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {predictions.map(p => {
                const predData = typeof p.prediction === 'string' ? JSON.parse(p.prediction) : p.prediction || {}
                return (
                  <Card key={p.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          <Badge variant="outline" className="text-xs">{p.domaine}</Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500" />
                          <span className="text-xs font-medium">{Math.round(p.confiance * 100)}%</span>
                        </div>
                      </div>
                      <div className="mt-3">
                        <p className="text-sm font-medium">{p.type}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {typeof predData === 'object' ? JSON.stringify(predData).slice(0, 200) : String(predData).slice(0, 200)}
                        </p>
                      </div>
                      <div className="mt-3 text-xs text-muted-foreground">
                        Générée le {formatDate(p.genereeLe)}
                        {p.expireLe && ` · Expire le ${formatDate(p.expireLe)}`}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Rapports Tab */}
        <TabsContent value="rapports" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              {rapports.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Activity className="w-12 h-12 text-muted-foreground/40 mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Aucun rapport analytique</p>
                  <p className="text-sm text-muted-foreground mt-1">Les rapports sont générés périodiquement</p>
                </div>
              ) : (
                <ScrollArea className="max-h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Domaine</TableHead>
                        <TableHead>Période</TableHead>
                        <TableHead>Généré le</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rapports.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium"><Badge variant="outline" className="text-xs">{r.domaine}</Badge></TableCell>
                          <TableCell>{r.periode}</TableCell>
                          <TableCell>{formatDate(r.genereeLe)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
