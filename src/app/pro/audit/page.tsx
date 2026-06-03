'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  FileText,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Download,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'

interface AuditLogEntry {
  id: string
  action: string
  entite: string
  entiteId: string | null
  details: Record<string, unknown> | null
  adresseIP: string | null
  createdAt: string
  utilisateur: {
    id: string
    nom: string
    prenom: string
    email: string
  } | null
}

interface AuditLogResponse {
  data: AuditLogEntry[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

const actionLabels: Record<string, string> = {
  CREATE: 'Création',
  UPDATE: 'Modification',
  DELETE: 'Suppression',
  LOGIN: 'Connexion',
  LOGOUT: 'Déconnexion',
  VALIDATE: 'Validation',
  CANCEL: 'Annulation',
  EXPORT: 'Export',
  ACQUITTEMENT: 'Acquittement',
  APPROBATION: 'Approbation',
  REFUS: 'Refus',
}

const entiteLabels: Record<string, string> = {
  Vente: 'Vente',
  Medicament: 'Médicament',
  Lot: 'Lot',
  Ordonnance: 'Ordonnance',
  Patient: 'Patient',
  Employe: 'Employé',
  Conge: 'Congé',
  Commande: 'Commande',
  Fournisseur: 'Fournisseur',
  Utilisateur: 'Utilisateur',
  AlerteDPMED: 'Alerte DPMED',
  Stupefiant: 'Stupéfiant',
  Destruction: 'Destruction',
  CreditPatient: 'Crédit patient',
  SessionCaisse: 'Session caisse',
}

const actionColors: Record<string, string> = {
  CREATE: 'bg-primary/10 text-primary',
  UPDATE: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400',
  DELETE: 'bg-destructive/10 text-destructive',
  LOGIN: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400',
  LOGOUT: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  VALIDATE: 'bg-primary/10 text-primary',
  CANCEL: 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400',
  EXPORT: 'bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400',
  ACQUITTEMENT: 'bg-primary/10 text-primary',
  APPROBATION: 'bg-primary/10 text-primary',
  REFUS: 'bg-destructive/10 text-destructive',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details) return '-'
  return Object.entries(details)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(', ')
}

export default function AuditPage() {
  const { pharmacie } = useAuth()
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [entiteFilter, setEntiteFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')

  const fetchLogs = useCallback(async () => {
    if (!pharmacie?.id) return
    setLoading(true)

    const params = new URLSearchParams({
      pharmacieId: pharmacie.id,
      page: String(page),
      limit: '20',
    })
    if (actionFilter) params.set('action', actionFilter)
    if (entiteFilter) params.set('entite', entiteFilter)
    if (dateDebut) params.set('dateDebut', dateDebut)
    if (dateFin) params.set('dateFin', dateFin)

    try {
      const res = await fetch(`/api/audit-logs?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [pharmacie?.id, page, actionFilter, entiteFilter, dateDebut, dateFin])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExport = async () => {
    if (!pharmacie?.id) return
    const params = new URLSearchParams({
      pharmacieId: pharmacie.id,
      limit: '1000',
    })
    if (actionFilter) params.set('action', actionFilter)
    if (entiteFilter) params.set('entite', entiteFilter)

    try {
      const res = await fetch(`/api/audit-logs?${params}`)
      if (res.ok) {
        const json = await res.json()
        const csvRows = [
          ['Date', 'Utilisateur', 'Action', 'Entité', 'ID Entité', 'Détails', 'Adresse IP'].join(','),
          ...(json.data as AuditLogEntry[]).map((log: AuditLogEntry) =>
            [
              new Date(log.createdAt).toISOString(),
              log.utilisateur ? `${log.utilisateur.prenom} ${log.utilisateur.nom}` : 'Système',
              log.action,
              log.entite,
              log.entiteId || '',
              log.details ? JSON.stringify(log.details) : '',
              log.adresseIP || '',
            ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
          ),
        ].join('\n')

        const blob = new Blob([csvRows], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // silently fail
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Journal d&apos;audit
          </h1>
          <p className="text-sm text-muted-foreground">
            Historique des actions effectuées sur la pharmacie
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="w-4 h-4" />
          Exporter CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Action</label>
              <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes les actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes les actions</SelectItem>
                  {Object.entries(actionLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Entité</label>
              <Select value={entiteFilter} onValueChange={(v) => { setEntiteFilter(v === 'ALL' ? '' : v); setPage(1) }}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Toutes les entités" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Toutes les entités</SelectItem>
                  {Object.entries(entiteLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date début</label>
              <Input
                type="date"
                className="h-9"
                value={dateDebut}
                onChange={(e) => { setDateDebut(e.target.value); setPage(1) }}
              />
            </div>
            <div className="flex-1 w-full">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Date fin</label>
              <Input
                type="date"
                className="h-9"
                value={dateFin}
                onChange={(e) => { setDateFin(e.target.value); setPage(1) }}
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-9"
              onClick={() => {
                setActionFilter('')
                setEntiteFilter('')
                setDateDebut('')
                setDateFin('')
                setSearchQuery('')
                setPage(1)
              }}
            >
              Réinitialiser
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            {data?.pagination.total ?? 0} entrée(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              {/* Desktop table */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Utilisateur</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Entité</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          Aucune entrée d&apos;audit trouvée
                        </td>
                      </tr>
                    ) : (
                      data?.data.map((log) => (
                        <tr key={log.id} className="border-b hover:bg-muted/30 transition-colors">
                          <td className="p-3 text-xs whitespace-nowrap">{formatDate(log.createdAt)}</td>
                          <td className="p-3">
                            {log.utilisateur ? (
                              <span className="text-sm font-medium">
                                {log.utilisateur.prenom} {log.utilisateur.nom}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Système</span>
                            )}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}
                            >
                              {actionLabels[log.action] || log.action}
                            </Badge>
                          </td>
                          <td className="p-3">
                            <span className="text-sm">{entiteLabels[log.entite] || log.entite}</span>
                            {log.entiteId && (
                              <span className="text-[10px] text-muted-foreground ml-1">({log.entiteId.slice(0, 8)}…)</span>
                            )}
                          </td>
                          <td className="p-3 text-xs text-muted-foreground max-w-48 truncate">
                            {formatDetails(log.details)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden flex flex-col">
                {data?.data.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Aucune entrée d&apos;audit trouvée
                  </div>
                ) : (
                  data?.data.map((log) => (
                    <div key={log.id} className="p-4 border-b hover:bg-muted/30">
                      <div className="flex items-center justify-between mb-1">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${actionColors[log.action] || 'bg-gray-100 text-gray-600'}`}
                        >
                          {actionLabels[log.action] || log.action}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDate(log.createdAt)}</span>
                      </div>
                      <div className="text-sm font-medium">
                        {entiteLabels[log.entite] || log.entite}
                        {log.entiteId && <span className="text-[10px] text-muted-foreground ml-1">({log.entiteId.slice(0, 8)}…)</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Par {log.utilisateur ? `${log.utilisateur.prenom} ${log.utilisateur.nom}` : 'Système'}
                      </div>
                      {log.details && (
                        <div className="text-xs text-muted-foreground mt-1 truncate">
                          {formatDetails(log.details)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Page {data.pagination.page} sur {data.pagination.totalPages} ({data.pagination.total} entrées)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page >= data.pagination.totalPages}
            >
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
