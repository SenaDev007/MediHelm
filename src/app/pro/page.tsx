'use client'

import { useAuth } from '@/app/pro/auth-context'
import { KpiCard } from '@/components/pro/kpi-card'
import { AlertBadge } from '@/components/pro/alert-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Shield,
  Plus,
  ClipboardList,
  Package,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
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
} from 'recharts'

interface DashboardData {
  caDuJour: number
  nbVentesJour: number
  stockAlerte: number
  scoreConformite: number
  ventesRecentes: { montantTotal: number; createdAt: string }[]
  alertesRecentes: {
    id: string
    type: string
    niveau: string
    message: string
    createdAt: string
  }[]
  alertesDPMED: {
    id: string
    dateAcquittement: string | null
    alerte: {
      titre: string
      typeAlerte: string
      niveauUrgence: string
      dateEmissionDPMED: string
    }
  }[]
  alertesExpiration: {
    id: string
    joursRestants: number
    lot: {
      medicament: { nomCommercial: string }
      numeroLot: string
    }
  }[]
  topProduits: {
    id: string
    nom: string
    dci: string
    quantite: number
    montant: number
  }[]
  scoreConf: {
    scoreTotal: number
    scoreRegistreStup: number
    scoreAlerteDPMED: number
    scoreDocuments: number
    scorePharmacovigi: number
    scoreDestructions: number
    certificationDPMED: boolean
  } | null
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount) + ' FCFA'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProDashboard() {
  const { pharmacie } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pharmacie?.id) {
      fetch(`/api/pro/dashboard?pharmacieId=${pharmacie.id}`)
        .then(res => res.ok ? res.json() : null)
        .then(d => setData(d))
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  // Prepare chart data: sales per day for last 7 days
  const salesChartData = (() => {
    if (!data?.ventesRecentes) return []
    const dayMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      dayMap.set(key, 0)
    }
    for (const v of data.ventesRecentes) {
      const key = new Date(v.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
      if (dayMap.has(key)) {
        dayMap.set(key, (dayMap.get(key) || 0) + v.montantTotal)
      }
    }
    return Array.from(dayMap.entries()).map(([name, ca]) => ({ name, ca }))
  })()

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Bonjour, {pharmacie?.nom || 'Pharmacie'} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Voici un aperçu de votre activité aujourd&apos;hui
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="CA du jour"
          value={formatFCFA(data?.caDuJour ?? 0)}
          icon={DollarSign}
          variant="success"
          trend={{ value: 12, label: 'vs hier' }}
        />
        <KpiCard
          title="Ventes du jour"
          value={data?.nbVentesJour ?? 0}
          icon={ShoppingCart}
          variant="default"
          subtitle="ventes réalisées"
        />
        <KpiCard
          title="Stock en alerte"
          value={data?.stockAlerte ?? 0}
          icon={AlertTriangle}
          variant={(data?.stockAlerte ?? 0) > 5 ? 'danger' : 'warning'}
          subtitle="produits sous seuil"
        />
        <KpiCard
          title="Score conformité"
          value={`${Math.round(data?.scoreConformite ?? 0)}%`}
          icon={Shield}
          variant={(data?.scoreConformite ?? 0) >= 80 ? 'success' : 'warning'}
          subtitle={data?.scoreConf?.certificationDPMED ? 'Certifié DPMED ✓' : 'Non certifié'}
        />
      </div>

      {/* Charts + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Sales Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Chiffre d&apos;affaires — 7 derniers jours
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E1F5EE" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#888780" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#888780" />
                  <Tooltip
                    formatter={(value: number) => [formatFCFA(value), 'CA']}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="ca" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Actions rapides</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link href="/pro/ventes">
              <Button className="w-full justify-start gap-2 bg-primary hover:bg-primary/90" size="sm">
                <Plus className="w-4 h-4" />
                Nouvelle vente
              </Button>
            </Link>
            <Link href="/pro/commandes">
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <ClipboardList className="w-4 h-4" />
                Nouvelle commande
              </Button>
            </Link>
            <Link href="/pro/stock">
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <Package className="w-4 h-4" />
                Ajuster le stock
              </Button>
            </Link>
            <Link href="/pro/alertes">
              <Button variant="outline" className="w-full justify-start gap-2" size="sm">
                <AlertTriangle className="w-4 h-4" />
                Voir les alertes
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Top Products + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">🏆 Top produits</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              {(data?.topProduits?.length ?? 0) === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune donnée de vente disponible
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {data?.topProduits?.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {i + 1}
                        </span>
                        <div>
                          <span className="text-sm font-medium">{p.nom}</span>
                          <span className="text-xs text-muted-foreground ml-2">{p.dci}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-semibold">{formatFCFA(p.montant)}</span>
                        <span className="text-xs text-muted-foreground ml-1">×{p.quantite}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🔔 Alertes récentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-64">
              {/* DPMED Alerts */}
              {(data?.alertesDPMED?.length ?? 0) > 0 && (
                <div className="mb-3">
                  <span className="text-[10px] font-semibold uppercase text-destructive tracking-wide">DPMED</span>
                  {data?.alertesDPMED?.map((a) => (
                    <div key={a.id} className="flex items-start gap-2 py-2 border-b last:border-0">
                      <AlertBadge level={a.alerte.niveauUrgence} />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">{a.alerte.titre}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(a.alerte.dateEmissionDPMED)}</span>
                      </div>
                      {!a.dateAcquittement && (
                        <Badge variant="outline" className="text-[10px] shrink-0 text-destructive border-destructive/30">
                          Non acquittée
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Expiration Alerts */}
              {(data?.alertesExpiration?.length ?? 0) > 0 && (
                <div>
                  <span className="text-[10px] font-semibold uppercase text-amber-500 tracking-wide">Expiration</span>
                  {data?.alertesExpiration?.map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div>
                        <span className="text-sm">{a.lot.medicament.nomCommercial}</span>
                        <span className="text-xs text-muted-foreground ml-2">Lot {a.lot.numeroLot}</span>
                      </div>
                      <Badge
                        variant={a.joursRestants <= 30 ? 'destructive' : 'outline'}
                        className="text-[10px]"
                      >
                        {a.joursRestants}j
                      </Badge>
                    </div>
                  ))}
                </div>
              )}

              {(data?.alertesDPMED?.length ?? 0) === 0 && (data?.alertesExpiration?.length ?? 0) === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucune alerte active ✅
                </p>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
