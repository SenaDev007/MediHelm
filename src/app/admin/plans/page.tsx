'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
  CreditCard,
  AlertTriangle,
  TrendingUp,
  Clock,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface PlanData {
  stats: {
    totalActifs: number
    totalExpires: number
    totalSuspendus: number
    revenuTotal: number
  }
  parPlan: { plan: string; count: number; revenu: number }[]
  revenueByMonth: { mois: string; revenu: number }[]
  expiringSoon: {
    id: string
    plan: string
    montant: number
    dateFin: string
    type: string
    pharmacie: { id: string; nom: string; plan: string; ville: string }
  }[]
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
    year: 'numeric',
  })
}

function getDaysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

const PLAN_COLORS: Record<string, string> = {
  SEED: '#10b981',
  BLOOM: '#3b82f6',
  CROWN: '#f59e0b',
  NETWORK: '#8b5cf6',
}

export default function PlansPage() {
  const [data, setData] = useState<PlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/admin/plans')
      .then(res => {
        if (!res.ok) throw new Error('Erreur lors du chargement')
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-primary" /> Plans & Abonnements
        </h1>
        <p className="text-sm text-muted-foreground">Distribution des plans, revenus et échéances</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Actifs</span>
                <span className="text-2xl font-bold tracking-tight text-green-600">{data?.stats.totalActifs ?? 0}</span>
                <span className="text-xs text-muted-foreground">abonnements actifs</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10 text-green-500">
                <CreditCard className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Expirés</span>
                <span className="text-2xl font-bold tracking-tight text-destructive">{data?.stats.totalExpires ?? 0}</span>
                <span className="text-xs text-muted-foreground">abonnements expirés</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Suspendus</span>
                <span className="text-2xl font-bold tracking-tight text-amber-500">{data?.stats.totalSuspendus ?? 0}</span>
                <span className="text-xs text-muted-foreground">abonnements suspendus</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Revenu total</span>
                <span className="text-2xl font-bold tracking-tight">{formatFCFA(data?.stats.revenuTotal ?? 0)}</span>
                <span className="text-xs text-muted-foreground">abonnements actifs</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Plan Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribution par plan</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.parPlan?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun abonnement actif</p>
            ) : (
              <div className="flex flex-col gap-3">
                {data?.parPlan.map(p => {
                  const total = data?.stats.totalActifs || 1
                  const pct = Math.round((p.count / total) * 100)
                  return (
                    <div key={p.plan} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[p.plan] || '#6b7280' }} />
                          <span className="text-sm font-medium">{p.plan}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{p.count}</span>
                          <span className="text-xs text-muted-foreground">({pct}%)</span>
                          <span className="text-xs text-muted-foreground">· {formatFCFA(p.revenu)}</span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: PLAN_COLORS[p.plan] || '#6b7280',
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Revenus mensuels
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.revenueByMonth?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune donnée</p>
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.revenueByMonth || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #E1F5EE)" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11 }} stroke="#888780" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#888780" />
                    <Tooltip
                      formatter={(value: number) => [formatFCFA(value), 'Revenu']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="revenu" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expiring Soon */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Abonnements expirant bientôt
            <Badge variant="outline" className="text-[10px]">{data?.expiringSoon?.length ?? 0}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            {(data?.expiringSoon?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun abonnement n&apos;expire dans les 30 jours</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Date fin</TableHead>
                    <TableHead>Jours restants</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.expiringSoon.map(a => {
                    const daysLeft = getDaysUntil(a.dateFin)
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium">{a.pharmacie.nom}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]" style={{
                            borderColor: PLAN_COLORS[a.plan] || '#6b7280',
                            color: PLAN_COLORS[a.plan] || '#6b7280',
                          }}>
                            {a.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFCFA(a.montant)}</TableCell>
                        <TableCell>{formatDate(a.dateFin)}</TableCell>
                        <TableCell>
                          <Badge variant={daysLeft <= 7 ? 'destructive' : daysLeft <= 15 ? 'outline' : 'secondary'} className="text-[10px]">
                            {daysLeft}j
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
