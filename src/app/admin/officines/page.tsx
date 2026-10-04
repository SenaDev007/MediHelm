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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Building2,
  Search,
  MoreHorizontal,
  Ban,
  CheckCircle,
  ArrowRightLeft,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface Pharmacie {
  id: string
  nom: string
  slug: string
  plan: string
  actif: boolean
  ville: string
  numeroAgrement: string
  nbUtilisateurs: number
  nbMedicaments: number
  abonnementActif: { id: string; plan: string; statut: string; montant: number } | null
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function OfficinesPage() {
  const [pharmacies, setPharmacies] = useState<Pharmacie[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [statutFilter, setStatutFilter] = useState('')
  const [actionDialog, setActionDialog] = useState<{ type: string; pharmacie: Pharmacie } | null>(null)
  const [planChangeDialog, setPlanChangeDialog] = useState<{ pharmacie: Pharmacie; newPlan: string } | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchPharmacies = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)
      if (planFilter) params.set('plan', planFilter)
      if (statutFilter) params.set('statut', statutFilter)

      const res = await fetch(`/api/admin/officines?${params}`)
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setPharmacies(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [search, planFilter, statutFilter])

  useEffect(() => {
    fetchPharmacies(1)
  }, [fetchPharmacies])

  const handleAction = async (type: string, pharmacie: Pharmacie) => {
    setProcessing(true)
    try {
      const body: Record<string, string> = { id: pharmacie.id, action: type }
      if (type === 'change_plan' && planChangeDialog?.newPlan) {
        body.plan = planChangeDialog.newPlan
      }

      const res = await fetch('/api/admin/officines', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      toast.success(data.message)
      if (data.tempPassword) {
        toast.info(`Mot de passe temporaire: ${data.tempPassword}`)
      }
      setActionDialog(null)
      setPlanChangeDialog(null)
      fetchPharmacies(pagination.page)
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
          <Building2 className="w-6 h-6 text-teal-600" /> Officines
        </h1>
        <p className="text-sm text-muted-foreground">Gestion des pharmacies inscrites sur la plateforme</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, slug, ville, agrément..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tous les plans" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les plans</SelectItem>
                <SelectItem value="SEED">SEED</SelectItem>
                <SelectItem value="BLOOM">BLOOM</SelectItem>
                <SelectItem value="CROWN">CROWN</SelectItem>
                <SelectItem value="NETWORK">NETWORK</SelectItem>
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
            {pagination.total} officine{pagination.total !== 1 ? 's' : ''}
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
                    <TableHead>Slug</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Ville</TableHead>
                    <TableHead>Agrément</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pharmacies.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Aucune officine trouvée
                      </TableCell>
                    </TableRow>
                  ) : (
                    pharmacies.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{p.slug}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={{
                              borderColor: p.plan === 'CROWN' ? '#f59e0b' : p.plan === 'BLOOM' ? '#3b82f6' : p.plan === 'NETWORK' ? '#8b5cf6' : '#10b981',
                              color: p.plan === 'CROWN' ? '#f59e0b' : p.plan === 'BLOOM' ? '#3b82f6' : p.plan === 'NETWORK' ? '#8b5cf6' : '#10b981',
                            }}
                          >
                            {p.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.actif ? 'default' : 'destructive'} className="text-[10px]">
                            {p.actif ? 'Actif' : 'Suspendu'}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.ville}</TableCell>
                        <TableCell className="text-xs">{p.numeroAgrement}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {p.actif ? (
                                <DropdownMenuItem onClick={() => setActionDialog({ type: 'suspend', pharmacie: p })}>
                                  <Ban className="w-4 h-4 mr-2 text-destructive" /> Suspendre
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => setActionDialog({ type: 'reactivate', pharmacie: p })}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Réactiver
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setActionDialog({ type: 'change_plan', pharmacie: p })}>
                                <ArrowRightLeft className="w-4 h-4 mr-2" /> Changer plan
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setActionDialog({ type: 'reset_password', pharmacie: p })}>
                                <KeyRound className="w-4 h-4 mr-2" /> Reset MDP
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => fetchPharmacies(pagination.page - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchPharmacies(pagination.page + 1)}
                >
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
              {actionDialog?.type === 'suspend' && 'Suspendre l\'officine'}
              {actionDialog?.type === 'reactivate' && 'Réactiver l\'officine'}
              {actionDialog?.type === 'change_plan' && 'Changer le plan'}
              {actionDialog?.type === 'reset_password' && 'Réinitialiser le mot de passe'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'suspend' && `Voulez-vous vraiment suspendre "${actionDialog?.pharmacie.nom}" ? Les utilisateurs ne pourront plus se connecter.`}
              {actionDialog?.type === 'reactivate' && `Voulez-vous réactiver "${actionDialog?.pharmacie.nom}" ?`}
              {actionDialog?.type === 'change_plan' && `Sélectionnez le nouveau plan pour "${actionDialog?.pharmacie.nom}"`}
              {actionDialog?.type === 'reset_password' && `Un nouveau mot de passe temporaire sera généré pour le propriétaire de "${actionDialog?.pharmacie.nom}"`}
            </DialogDescription>
          </DialogHeader>
          {actionDialog?.type === 'change_plan' && (
            <Select onValueChange={(value) => setPlanChangeDialog({ pharmacie: actionDialog.pharmacie, newPlan: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEED">SEED</SelectItem>
                <SelectItem value="BLOOM">BLOOM</SelectItem>
                <SelectItem value="CROWN">CROWN</SelectItem>
                <SelectItem value="NETWORK">NETWORK</SelectItem>
              </SelectContent>
            </Select>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
            <Button
              disabled={processing || (actionDialog?.type === 'change_plan' && !planChangeDialog?.newPlan)}
              onClick={() => actionDialog && handleAction(actionDialog.type, actionDialog.pharmacie)}
            >
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
