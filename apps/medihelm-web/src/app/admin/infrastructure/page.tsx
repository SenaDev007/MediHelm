'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Server,
  Database,
  HardDrive,
  Activity,
  RefreshCw,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface InfraData {
  timestamp: string
  api: {
    status: string
    uptime: number | null
  }
  db: {
    status: string
    latency: number
    totalPharmacies: number
    totalUtilisateurs: number
    totalMedicaments: number
    totalVentes: number
  }
  storage: {
    status: string
  }
  activity: {
    recentLogs: number
    dailyLogs: number
    activeUsers: number
  }
}

function formatUptime(seconds: number | null): string {
  if (seconds === null) return 'N/A'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}j ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'OPÉRATIONNEL' || status === 'CONNECTÉ' || status === 'NORMAL') {
    return <CheckCircle2 className="w-5 h-5 text-green-500" />
  }
  return <XCircle className="w-5 h-5 text-destructive" />
}

export default function InfrastructurePage() {
  const [data, setData] = useState<InfraData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/infrastructure')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const json = await res.json()
      setData(json)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    )
  }

  if (error && !data) {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Server className="w-6 h-6 text-teal-600" /> Infrastructure
          </h1>
          <p className="text-sm text-muted-foreground">Surveillance de l&apos;état du système en temps réel</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
          </span>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" /> Actualiser
          </Button>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Actualisation automatique toutes les 30 secondes
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* API */}
        <Card className={data?.api.status === 'OPÉRATIONNEL' ? 'border-green-200 dark:border-green-900' : 'border-destructive'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Server className="w-4 h-4 text-primary" /> API
              </span>
              <StatusIcon status={data?.api.status || ''} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={data?.api.status === 'OPÉRATIONNEL' ? 'default' : 'destructive'} className="text-[10px]">
                  {data?.api.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Uptime</span>
                <span className="text-sm font-medium">{formatUptime(data?.api.uptime ?? null)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dernière vérification</span>
                <span className="text-xs text-muted-foreground">{data?.timestamp ? formatDate(data.timestamp) : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Database */}
        <Card className={data?.db.status === 'CONNECTÉ' ? 'border-green-200 dark:border-green-900' : 'border-destructive'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="w-4 h-4 text-primary" /> Base de données
              </span>
              <StatusIcon status={data?.db.status || ''} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={data?.db.status === 'CONNECTÉ' ? 'default' : 'destructive'} className="text-[10px]">
                  {data?.db.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Latence</span>
                <span className="text-sm font-medium">{data?.db.latency ?? 0}ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pharmacies</span>
                <span className="text-sm font-medium">{data?.db.totalPharmacies ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Utilisateurs</span>
                <span className="text-sm font-medium">{data?.db.totalUtilisateurs ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Médicaments</span>
                <span className="text-sm font-medium">{data?.db.totalMedicaments ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Ventes</span>
                <span className="text-sm font-medium">{data?.db.totalVentes ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Storage */}
        <Card className={data?.storage.status === 'NORMAL' ? 'border-green-200 dark:border-green-900' : 'border-amber-200'}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-primary" /> Stockage
              </span>
              <StatusIcon status={data?.storage.status || ''} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Statut</span>
                <Badge variant={data?.storage.status === 'NORMAL' ? 'default' : 'destructive'} className="text-[10px]">
                  {data?.storage.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Type</span>
                <span className="text-sm font-medium">PostgreSQL (Neon)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" /> Activité récente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex flex-col items-center p-4 rounded-lg bg-primary/5">
              <Activity className="w-6 h-6 text-primary mb-2" />
              <span className="text-2xl font-bold">{data?.activity.recentLogs ?? 0}</span>
              <span className="text-xs text-muted-foreground">Logs (1h)</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-amber-500/5">
              <Clock className="w-6 h-6 text-amber-500 mb-2" />
              <span className="text-2xl font-bold">{data?.activity.dailyLogs ?? 0}</span>
              <span className="text-xs text-muted-foreground">Logs (24h)</span>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-green-500/5">
              <Users className="w-6 h-6 text-green-500 mb-2" />
              <span className="text-2xl font-bold">{data?.activity.activeUsers ?? 0}</span>
              <span className="text-xs text-muted-foreground">Utilisateurs actifs (24h)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
