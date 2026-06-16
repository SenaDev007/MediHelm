'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Truck,
  Search,
  Ban,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'

interface Grossiste {
  id: string
  nom: string
  slug: string
  contact: string | null
  telephone: string | null
  email: string | null
  actif: boolean
  nbProduits: number
  nbCommandes: number
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function GrossistesPage() {
  const [grossistes, setGrossistes] = useState<Grossiste[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [actionDialog, setActionDialog] = useState<{ type: string; grossiste: Grossiste } | null>(null)
  const [processing, setProcessing] = useState(false)

  const fetchGrossistes = useCallback(async (page = 1) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/grossistes?${params}`)
      if (!res.ok) throw new Error('Erreur lors du chargement')
      const data = await res.json()
      setGrossistes(data.data)
      setPagination(data.pagination)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    fetchGrossistes(1)
  }, [fetchGrossistes])

  const handleAction = async (type: string, grossiste: Grossiste) => {
    setProcessing(true)
    try {
      const res = await fetch('/api/admin/grossistes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: grossiste.id, action: type }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')

      toast.success(data.message)
      setActionDialog(null)
      fetchGrossistes(pagination.page)
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
          <Truck className="w-6 h-6 text-amber-500" /> Grossistes
        </h1>
        <p className="text-sm text-muted-foreground">Gestion des grossistes partenaires</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, slug, contact..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            {pagination.total} grossiste{pagination.total !== 1 ? 's' : ''}
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
                    <TableHead>Statut</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Produits</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grossistes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        Aucun grossiste trouvé
                      </TableCell>
                    </TableRow>
                  ) : (
                    grossistes.map(g => (
                      <TableRow key={g.id}>
                        <TableCell className="font-medium">{g.nom}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{g.slug}</TableCell>
                        <TableCell>
                          <Badge variant={g.actif ? 'default' : 'destructive'} className="text-[10px]">
                            {g.actif ? 'Actif' : 'Désactivé'}
                          </Badge>
                        </TableCell>
                        <TableCell>{g.contact || '-'}</TableCell>
                        <TableCell>{g.telephone || '-'}</TableCell>
                        <TableCell>{g.nbProduits}</TableCell>
                        <TableCell>{g.nbCommandes}</TableCell>
                        <TableCell className="text-right">
                          {g.actif ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActionDialog({ type: 'suspend', grossiste: g })}
                              className="text-destructive hover:text-destructive"
                            >
                              <Ban className="w-3 h-3 mr-1" /> Désactiver
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActionDialog({ type: 'reactivate', grossiste: g })}
                              className="text-green-600 hover:text-green-600"
                            >
                              <CheckCircle className="w-3 h-3 mr-1" /> Activer
                            </Button>
                          )}
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
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => fetchGrossistes(pagination.page - 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => fetchGrossistes(pagination.page + 1)}>
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
              {actionDialog?.type === 'suspend' ? 'Désactiver le grossiste' : 'Activer le grossiste'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog?.type === 'suspend'
                ? `Voulez-vous vraiment désactiver "${actionDialog?.grossiste.nom}" ? Ses produits ne seront plus visibles.`
                : `Voulez-vous réactiver "${actionDialog?.grossiste.nom}" ?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>Annuler</Button>
            <Button disabled={processing} onClick={() => actionDialog && handleAction(actionDialog.type, actionDialog.grossiste)}>
              {processing ? 'Traitement...' : 'Confirmer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
