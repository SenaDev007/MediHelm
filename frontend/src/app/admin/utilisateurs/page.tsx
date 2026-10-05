'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Users,
  Search,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Shield,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface Utilisateur {
  id: string
  nom: string
  prenom: string
  email: string
  role: string
  actif: boolean
  telephone: string | null
  dernierLogin: string | null
  pharmacie: { id: string; nom: string; ville: string } | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const ROLES = [
  'PLATFORM_ADMIN', 'OWNER', 'DIRECTEUR', 'PHARMACIEN',
  'CAISSIER', 'MAGASINIER', 'COMPTABLE', 'STAGIAIRE',
  'PROMOTEUR', 'DPMED_ADMIN', 'GROSSISTE_PARTNER', 'PATIENT',
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UtilisateursPage() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [actionDialog, setActionDialog] = useState<{ type: string; utilisateur: Utilisateur } | null>(null)
  const [newRole, setNewRole] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchUtilisateurs = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (roleFilter) params.set('role', roleFilter)
      if (statutFilter) params.set('statut', statutFilter)

      const res = await fetch(`/api/admin/utilisateurs?${params}`)
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setUtilisateurs(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statutFilter])

  useEffect(() => {
    fetchUtilisateurs(1)
  }, [fetchUtilisateurs])

  const handleAction = async (type: string, utilisateur: Utilisateur) => {
    setProcessing(true)
    try {
      const body: Record<string, string> = { id: utilisateur.id, action: type }
      if (type === 'change_role' && newRole) {
        body.role = newRole
      }

      const res = await fetch('/api/admin/utilisateurs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      toast.success(data.message)
      setActionDialog(null)
      setNewRole('')
      fetchUtilisateurs(pagination.page)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Utilisateurs
        </h1>
        <p className="text-sm text-muted-foreground">Gestion des comptes utilisateurs de la plateforme</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, prénom, email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Tous les rôles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les rôles</SelectItem>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statutFilter} onValueChange={setStatutFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actif</SelectItem>
                <SelectItem value="inactif">Inactif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {pagination.total} utilisateur{pagination.total !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <AlertTriangle className="w-8 h-8 text-destructive mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
            </div>
          ) : (
            <ScrollArea className="max-h-[600px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Pharmacie</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Dernier login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {utilisateurs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucun utilisateur trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    utilisateurs.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.prenom} {u.nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                        <TableCell>
                          <Badge
                            variant={u.role === 'PLATFORM_ADMIN' ? 'default' : 'outline'}
                            className="text-[10px]"
                          >
                            {u.role === 'PLATFORM_ADMIN' && <Shield className="w-3 h-3 mr-1" />}
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{u.pharmacie?.nom || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={u.actif ? 'default' : 'destructive'} className="text-[10px]">
                            {u.actif ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatDate(u.dernierLogin)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {u.actif ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActionDialog({ type: 'deactivate', utilisateur: u })}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserX className="w-3 h-3 mr-1" /> Désactiver
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setActionDialog({ type: 'activate', utilisateur: u })}
                                className="text-green-600 hover:text-green-600"
                              >
                                <UserCheck className="w-3 h-3 mr-1" /> Activer
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setNewRole(''); setActionDialog({ type: 'change_role', utilisateur: u }) }}
                            >
                              Changer rôle
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-xs text-muted-foreground">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchUtilisateurs(pagination.page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchUtilisateurs(pagination.page + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog?.type === 'deactivate' && 'Désactiver l\'utilisateur'}
              {actionDialog?.type === 'activate' && 'Activer l\'utilisateur'}
              {actionDialog?.type === 'change_role' && 'Changer le rôle'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'deactivate' && `Voulez-vous vraiment désactiver "${actionDialog?.utilisateur.prenom} ${actionDialog?.utilisateur.nom}" ?`}
              {actionDialog?.type === 'activate' && `Voulez-vous activer "${actionDialog?.utilisateur.prenom} ${actionDialog?.utilisateur.nom}" ?`}
              {actionDialog?.type === 'change_role' && `Sélectionnez le nouveau rôle pour "${actionDialog?.utilisateur.prenom} ${actionDialog?.utilisateur.nom}" (actuel: ${actionDialog?.utilisateur.role})`}
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === 'change_role' && (
            <Select onValueChange={setNewRole}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un rôle" />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
            <Button
              disabled={processing || (actionDialog?.type === 'change_role' && !newRole)}
              onClick={() => actionDialog && handleAction(actionDialog.type, actionDialog.utilisateur)}
            >
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
