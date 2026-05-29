'use client'

import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  Mail,
  Bell,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface DiffusionData {
  id: string
  alerteId: string
  pharmacieId: string
  lotsConcernes: string[]
  canalEnvoi: string[]
  dateEnvoi: string
  dateAcquittement: string | null
  actionPrise: string | null
  pharmacie?: {
    id: string
    nom: string
    ville: string
    telephone: string
    email: string | null
  }
}

interface DiffusionTrackerProps {
  alerteId: string
  nbOfficinesNotifiees: number
  nbOfficinesAcquittees: number
}

export function DiffusionTracker({ alerteId, nbOfficinesNotifiees, nbOfficinesAcquittees }: DiffusionTrackerProps) {
  const [diffusions, setDiffusions] = useState<DiffusionData[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'acquitted' | 'pending'>('all')

  useEffect(() => {
    const fetchDiffusions = async () => {
      try {
        const res = await fetch(`/api/alertes/dpmed/${alerteId}`)
        if (res.ok) {
          const data = await res.json()
          setDiffusions(data.diffusions || [])
        }
      } catch (error) {
        console.error('Erreur:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchDiffusions()
  }, [alerteId])

  const acquittées = diffusions.filter(d => d.dateAcquittement)
  const enAttente = diffusions.filter(d => !d.dateAcquittement)
  const tauxAcquittement = diffusions.length > 0
    ? Math.round((acquittées.length / diffusions.length) * 100)
    : 0

  const filtered = filter === 'all'
    ? diffusions
    : filter === 'acquitted'
      ? acquittées
      : enAttente

  const getCanalIcon = (canal: string) => {
    switch (canal) {
      case 'PUSH': return <Bell className="h-3.5 w-3.5" />
      case 'SMS': return <Phone className="h-3.5 w-3.5" />
      case 'EMAIL': return <Mail className="h-3.5 w-3.5" />
      default: return <Bell className="h-3.5 w-3.5" />
    }
  }

  const getTimeToAck = (dateEnvoi: string, dateAcquittement: string | null) => {
    if (!dateAcquittement) return null
    const diff = new Date(dateAcquittement).getTime() - new Date(dateEnvoi).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}min`
    return `${minutes}min`
  }

  if (loading) {
    return (
      <Card className="border-teal-200">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <span className="ml-2 text-muted-foreground">Chargement des diffusions...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-800">{diffusions.length}</div>
            <p className="text-xs text-muted-foreground">Pharmacies notifiées</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-700">{acquittées.length}</div>
            <p className="text-xs text-muted-foreground">Acquittées</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600">{enAttente.length}</div>
            <p className="text-xs text-muted-foreground">En attente</p>
          </CardContent>
        </Card>
        <Card className="border-teal-200">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-teal-600">{tauxAcquittement}%</div>
            <p className="text-xs text-muted-foreground">Taux d&apos;acquittement</p>
            <Progress value={tauxAcquittement} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {[
          { key: 'all' as const, label: 'Toutes', count: diffusions.length },
          { key: 'acquitted' as const, label: 'Acquittées', count: acquittées.length },
          { key: 'pending' as const, label: 'En attente', count: enAttente.length },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              filter === f.key
                ? 'bg-teal-600 text-white'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Diffusion Table */}
      <Card className="border-teal-200">
        <CardContent className="p-0">
          <ScrollArea className="max-h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pharmacie</TableHead>
                  <TableHead>Ville</TableHead>
                  <TableHead>Canaux</TableHead>
                  <TableHead>Date envoi</TableHead>
                  <TableHead>Acquittement</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Aucune diffusion trouvée
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">
                        {d.pharmacie?.nom || 'Pharmacie inconnue'}
                      </TableCell>
                      <TableCell>{d.pharmacie?.ville || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {d.canalEnvoi.map((c, i) => (
                            <span key={i} title={c}>{getCanalIcon(c)}</span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(d.dateEnvoi).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="text-xs">
                        {d.dateAcquittement
                          ? new Date(d.dateAcquittement).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-xs">
                        {getTimeToAck(d.dateEnvoi, d.dateAcquittement) || '-'}
                      </TableCell>
                      <TableCell>
                        {d.dateAcquittement ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Acquittée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                            <Clock className="h-3 w-3 mr-1" />
                            En attente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
