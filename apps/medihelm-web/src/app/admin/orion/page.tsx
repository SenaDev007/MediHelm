'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import {
  Brain,
  Activity,
  Play,
  AlertTriangle,
  Clock,
  Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface OrionData {
  status: {
    actif: boolean
    totalPredictions: number
    predictionsRecentes: number
    derniereExecution: string | null
  }
  parDomaine: { domaine: string; count: number; confianceMoyenne: number }[]
  recentPredictions: {
    id: string
    pharmacieId: string | null
    domaine: string
    type: string
    confiance: number
    genereeLe: string
    expireLe: string | null
  }[]
  recentRapports: {
    id: string
    pharmacieNom: string
    domaine: string
    periode: string
    genereeLe: string
  }[]
  cronLogs: {
    id: string
    action: string
    entity: string
    details: string | null
    createdAt: string
  }[]
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function OrionPage() {
  const [data, setData] = useState<OrionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [selectedDomaine, setSelectedDomaine] = useState('STOCK')

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/orion')
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleManualTrigger = async () => {
    setTriggering(true)
    try {
      const res = await fetch('/api/admin/orion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domaine: selectedDomaine }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Erreur')

      toast.success(result.message)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setTriggering(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
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
          <Brain className="w-6 h-6 text-teal-600" /> ORION
        </h1>
        <p className="text-sm text-muted-foreground">Supervision du moteur d&apos;intelligence artificielle</p>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</span>
                <span className="text-2xl font-bold tracking-tight flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${data?.status.actif ? 'bg-green-500' : 'bg-red-500'}`} />
                  {data?.status.actif ? 'Actif' : 'Inactif'}
                </span>
                <span className="text-xs text-muted-foreground">moteur ORION</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-600/10 text-teal-600">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prédictions</span>
                <span className="text-2xl font-bold tracking-tight">{data?.status.totalPredictions ?? 0}</span>
                <span className="text-xs text-muted-foreground">{data?.status.predictionsRecentes ?? 0} dernières 24h</span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                <Zap className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dernière exécution</span>
                <span className="text-lg font-bold tracking-tight">
                  {data?.status.derniereExecution ? formatDate(data.status.derniereExecution) : 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manual Trigger + Domain Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Manual Trigger */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Play className="w-4 h-4 text-teal-600" />
              Déclenchement manuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Déclenchez une prédiction manuellement pour un domaine spécifique.
              </p>
              <div className="flex gap-3">
                <Select value={selectedDomaine} onValueChange={setSelectedDomaine}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STOCK">Stock</SelectItem>
                    <SelectItem value="VENTES">Ventes</SelectItem>
                    <SelectItem value="COMMANDES">Commandes</SelectItem>
                    <SelectItem value="CONFORMITE">Conformité</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleManualTrigger} disabled={triggering} className="bg-teal-600 hover:bg-teal-700">
                  <Play className="w-4 h-4 mr-2" />
                  {triggering ? 'Exécution...' : 'Lancer'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Domain Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Prédictions par domaine</CardTitle>
          </CardHeader>
          <CardContent>
            {(data?.parDomaine?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune prédiction</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data?.parDomaine.map(d => (
                  <div key={d.domaine} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{d.domaine}</Badge>
                      <span className="text-sm">{d.count} prédictions</span>
                    </div>
                    <span className="text-sm font-medium">{d.confianceMoyenne}% confiance</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Predictions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Prédictions récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-96">
            {(data?.recentPredictions?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucune prédiction récente</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domaine</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Confiance</TableHead>
                    <TableHead>Générée le</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.recentPredictions.map(p => (
                    <TableRow key={p.id}>
                      <TableCell><Badge variant="outline" className="text-[10px]">{p.domaine}</Badge></TableCell>
                      <TableCell className="text-sm">{p.type}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.pharmacieId ? p.pharmacieId.slice(0, 8) + '...' : 'Global'}</TableCell>
                      <TableCell>
                        <Badge variant={p.confiance >= 80 ? 'default' : p.confiance >= 50 ? 'secondary' : 'destructive'} className="text-[10px]">
                          {p.confiance}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(p.genereeLe)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Cron Logs */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Journal d&apos;exécution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-64">
            {(data?.cronLogs?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun log d&apos;exécution</p>
            ) : (
              <div className="flex flex-col gap-2">
                {data?.cronLogs.map(l => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-[10px] shrink-0">{l.action}</Badge>
                      <span className="text-xs text-muted-foreground">{l.details}</span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{formatDate(l.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
