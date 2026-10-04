'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Package,
  Search,
  Plus,
  Loader2,
  Filter,
  X,
  Trash2,
  CheckSquare,
  Square,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { ProductRow } from '@/components/grossistes/product-row'
import type { CatalogueItem } from '@/lib/grossiste-utils'
import { toast } from 'sonner'

interface ProduitGrossiste {
  id: string
  grossisteId: string
  dci: string
  nomCommercial: string
  forme: string
  dosage: string
  prixUnitaire: number
  quantiteDispo: number | null
  actif: boolean
  referenceGros?: string
  createdAt: string
  updatedAt: string
}

export default function CataloguePage() {
  const [produits, setProduits] = useState<ProduitGrossiste[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDispo, setFilterDispo] = useState<string>('all')
  const [filterForme, setFilterForme] = useState<string>('all')
  const [grossisteId, setGrossisteId] = useState<string>('')
  const [grossistes, setGrossistes] = useState<Array<{ id: string; nom: string }>>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<string | null>(null)

  // Bulk edit state
  const [bulkMode, setBulkMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkPrix, setBulkPrix] = useState('')
  const [bulkDispo, setBulkDispo] = useState<string>('')

  // New product form
  const [newProduct, setNewProduct] = useState({
    dci: '',
    nomCommercial: '',
    forme: 'COMPRIME',
    dosage: '',
    prixUnitaire: '',
    quantiteDispo: '',
  })

  // ─── Fetch grossistes ────────────────────────────────────────
  useEffect(() => {
    const fetchGrossistes = async () => {
      try {
        const res = await fetch('/api/grossistes?actif=true')
        if (res.ok) {
          const data = await res.json()
          setGrossistes(data)
          if (data.length > 0) setGrossisteId(data[0].id)
        }
      } catch (error) {
        console.error('Erreur:', error)
      }
    }
    fetchGrossistes()
  }, [])

  // ─── Fetch catalogue ─────────────────────────────────────────
  const fetchCatalogue = useCallback(async () => {
    if (!grossisteId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/grossistes/${grossisteId}/catalogue`)
      if (res.ok) {
        const data = await res.json()
        setProduits(data.produits || data)
      }
    } catch (error) {
      console.error('Erreur:', error)
    } finally {
      setLoading(false)
    }
  }, [grossisteId])

  useEffect(() => {
    fetchCatalogue()
  }, [fetchCatalogue])

  // ─── Unique formes for filter ────────────────────────────────
  const uniqueFormes = Array.from(new Set(produits.map(p => p.forme))).sort()

  // ─── Filter products ─────────────────────────────────────────
  const filteredProduits = produits.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      if (
        !p.dci.toLowerCase().includes(term) &&
        !p.nomCommercial.toLowerCase().includes(term) &&
        !p.dosage.toLowerCase().includes(term)
      )
        return false
    }
    if (filterDispo === 'disponible' && (!p.actif || (p.quantiteDispo !== null && p.quantiteDispo <= 0)))
      return false
    if (filterDispo === 'rupture' && p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0))
      return false
    if (filterForme !== 'all' && p.forme !== filterForme) return false
    return true
  })

  // ─── Map to CatalogueItem for ProductRow ─────────────────────
  const catalogueItems: CatalogueItem[] = filteredProduits.map(p => ({
    id: p.id,
    grossisteId: p.grossisteId,
    referenceGros: p.referenceGros || p.id.substring(0, 8).toUpperCase(),
    dci: p.dci,
    nomCommercial: p.nomCommercial,
    forme: p.forme,
    dosage: p.dosage,
    prixAchat: p.prixUnitaire,
    disponible: p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0),
    updatedAt: p.updatedAt,
  }))

  // ─── Handle save from ProductRow ─────────────────────────────
  const handleSave = async (id: string, data: Partial<CatalogueItem>) => {
    try {
      const res = await fetch(`/api/grossistes/catalogue/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prixUnitaire: data.prixAchat,
          actif: data.disponible,
        }),
      })
      if (res.ok) {
        toast.success('Produit mis à jour')
        fetchCatalogue()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur de connexion')
    }
  }

  // ─── Add new product ─────────────────────────────────────────
  const handleAddProduct = async () => {
    if (!newProduct.dci || !newProduct.nomCommercial || !newProduct.prixUnitaire) {
      toast.error('Veuillez remplir les champs obligatoires (DCI, Nom commercial, Prix)')
      return
    }
    try {
      const res = await fetch(`/api/grossistes/${grossisteId}/catalogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dci: newProduct.dci,
          nomCommercial: newProduct.nomCommercial,
          forme: newProduct.forme || 'COMPRIME',
          dosage: newProduct.dosage || '',
          prixUnitaire: parseFloat(newProduct.prixUnitaire),
          quantiteDispo: newProduct.quantiteDispo ? parseInt(newProduct.quantiteDispo) : null,
        }),
      })
      if (res.ok) {
        toast.success('Produit ajouté au catalogue')
        setDialogOpen(false)
        setNewProduct({
          dci: '',
          nomCommercial: '',
          forme: 'COMPRIME',
          dosage: '',
          prixUnitaire: '',
          quantiteDispo: '',
        })
        fetchCatalogue()
      } else {
        const err = await res.json()
        toast.error(err.error || "Erreur lors de l'ajout")
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur de connexion')
    }
  }

  // ─── Delete product ──────────────────────────────────────────
  const handleDeleteProduct = async () => {
    if (!productToDelete) return
    try {
      const res = await fetch(`/api/grossistes/catalogue/${productToDelete}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Produit supprimé du catalogue')
        setDeleteDialogOpen(false)
        setProductToDelete(null)
        fetchCatalogue()
      } else {
        toast.error('Erreur lors de la suppression')
      }
    } catch (error) {
      console.error(error)
      toast.error('Erreur de connexion')
    }
  }

  // ─── Bulk edit handlers ──────────────────────────────────────
  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredProduits.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredProduits.map(p => p.id)))
    }
  }

  const handleBulkSave = async () => {
    if (selectedIds.size === 0) {
      toast.error('Aucun produit sélectionné')
      return
    }
    try {
      const updates = Array.from(selectedIds).map(id => {
        const bodyData: Record<string, unknown> = {}
        if (bulkPrix) bodyData.prixUnitaire = parseFloat(bulkPrix)
        if (bulkDispo === 'disponible') bodyData.actif = true
        if (bulkDispo === 'rupture') bodyData.actif = false
        return fetch(`/api/grossistes/catalogue/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyData),
        })
      })
      await Promise.all(updates)
      toast.success(`${selectedIds.size} produit(s) mis à jour`)
      setSelectedIds(new Set())
      setBulkPrix('')
      setBulkDispo('')
      setBulkMode(false)
      fetchCatalogue()
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de la mise à jour en masse')
    }
  }

  // ─── Stats ───────────────────────────────────────────────────
  const totalProducts = produits.length
  const disponibles = produits.filter(
    p => p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0)
  ).length
  const enRupture = produits.filter(
    p => !p.actif || (p.quantiteDispo !== null && p.quantiteDispo <= 0)
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100">
            <Package className="h-5 w-5 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Catalogue</h1>
            <p className="text-sm text-muted-foreground">
              Gestion de votre catalogue de produits
            </p>
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={grossisteId} onValueChange={setGrossisteId}>
            <SelectTrigger className="w-48 border-teal-200">
              <SelectValue placeholder="Sélectionner grossiste" />
            </SelectTrigger>
            <SelectContent>
              {grossistes.map(g => (
                <SelectItem key={g.id} value={g.id}>
                  {g.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant={bulkMode ? 'default' : 'outline'}
            size="sm"
            className={bulkMode ? 'bg-teal-600 hover:bg-teal-700' : 'border-teal-300 text-teal-700'}
            onClick={() => {
              setBulkMode(!bulkMode)
              setSelectedIds(new Set())
              setBulkPrix('')
              setBulkDispo('')
            }}
          >
            {bulkMode ? 'Terminer' : 'Édition en masse'}
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            onClick={() => setDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-teal-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{totalProducts}</p>
            <p className="text-xs text-muted-foreground">Total produits</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-700">{disponibles}</p>
            <p className="text-xs text-muted-foreground">Disponibles</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{enRupture}</p>
            <p className="text-xs text-muted-foreground">En rupture</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Rechercher par DCI, nom commercial, dosage..."
                className="pl-8 border-teal-200"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1 h-7 w-7 p-0"
                  onClick={() => setSearchTerm('')}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Select value={filterDispo} onValueChange={setFilterDispo}>
              <SelectTrigger className="w-40 border-teal-200">
                <Filter className="h-4 w-4 mr-1" />
                <SelectValue placeholder="Disponibilité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="disponible">Disponible</SelectItem>
                <SelectItem value="rupture">En rupture</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterForme} onValueChange={setFilterForme}>
              <SelectTrigger className="w-44 border-teal-200">
                <SelectValue placeholder="Forme galénique" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les formes</SelectItem>
                {uniqueFormes.map(f => (
                  <SelectItem key={f} value={f}>
                    {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Edit Bar */}
      {bulkMode && (
        <Card className="border-teal-300 bg-teal-50/50">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <span className="text-sm font-medium text-teal-800">
                {selectedIds.size} produit(s) sélectionné(s)
              </span>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Label className="text-xs text-teal-700">Prix :</Label>
                <Input
                  type="number"
                  value={bulkPrix}
                  onChange={e => setBulkPrix(e.target.value)}
                  placeholder="Nouveau prix"
                  className="w-28 h-8 text-sm border-teal-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-teal-700">Dispo :</Label>
                <Select value={bulkDispo} onValueChange={setBulkDispo}>
                  <SelectTrigger className="w-32 h-8 text-sm border-teal-300">
                    <SelectValue placeholder="Changer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponible">Disponible</SelectItem>
                    <SelectItem value="rupture">Indisponible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                onClick={handleBulkSave}
                disabled={selectedIds.size === 0}
              >
                Appliquer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
            <span className="ml-2 text-muted-foreground">Chargement du catalogue...</span>
          </CardContent>
        </Card>
      ) : filteredProduits.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">Aucun produit trouvé</p>
            <p className="text-xs text-muted-foreground mt-1">
              {searchTerm || filterDispo !== 'all' || filterForme !== 'all'
                ? 'Modifiez vos filtres pour afficher des résultats'
                : 'Ajoutez votre premier produit au catalogue'}
            </p>
            {!searchTerm && filterDispo === 'all' && filterForme === 'all' && (
              <Button
                variant="outline"
                size="sm"
                className="mt-3 border-teal-300 text-teal-700"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Ajouter un produit
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">
              {filteredProduits.length} produit(s) affiché(s)
              {filteredProduits.length !== produits.length && (
                <span className="text-muted-foreground font-normal"> sur {produits.length}</span>
              )}
            </CardTitle>
            <CardDescription>
              Cliquez sur l&apos;icône ✏️ pour modifier le prix ou la disponibilité en ligne
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[600px]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/50">
                    {bulkMode && (
                      <th className="w-10 px-3 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={toggleSelectAll}
                        >
                          {selectedIds.size === filteredProduits.length ? (
                            <CheckSquare className="h-4 w-4 text-teal-600" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </th>
                    )}
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Réf.</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Produit</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Forme — Dosage</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Prix d&apos;achat</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Disponibilité</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkMode && filteredProduits.map((p) => (
                    <tr key={p.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="px-3 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => toggleSelect(p.id)}
                        >
                          {selectedIds.has(p.id) ? (
                            <CheckSquare className="h-4 w-4 text-teal-600" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-muted-foreground">
                        {p.referenceGros || p.id.substring(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{p.nomCommercial}</div>
                        <div className="text-xs text-muted-foreground">{p.dci}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {p.forme} — {p.dosage}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-teal-600">
                        {new Intl.NumberFormat('fr-FR').format(p.prixUnitaire)} FCFA
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0) ? 'default' : 'destructive'}
                          className={p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0) ? 'bg-teal-600' : ''}
                        >
                          {p.actif && (p.quantiteDispo === null || p.quantiteDispo > 0) ? 'En stock' : 'Rupture'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive/80"
                          onClick={() => {
                            setProductToDelete(p.id)
                            setDeleteDialogOpen(true)
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!bulkMode && catalogueItems.map(item => (
                    <ProductRow key={item.id} product={item} onSave={handleSave} />
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajouter un produit au catalogue</DialogTitle>
            <DialogDescription>
              Remplissez les informations du nouveau produit. Les champs marqués * sont obligatoires.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="dci">DCI *</Label>
                <Input
                  id="dci"
                  value={newProduct.dci}
                  onChange={e => setNewProduct({ ...newProduct, dci: e.target.value })}
                  placeholder="Ex : Paracétamol"
                  className="border-teal-200"
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="nomCommercial">Nom commercial *</Label>
                <Input
                  id="nomCommercial"
                  value={newProduct.nomCommercial}
                  onChange={e =>
                    setNewProduct({ ...newProduct, nomCommercial: e.target.value })
                  }
                  placeholder="Ex : Doliprane 1000mg"
                  className="border-teal-200"
                />
              </div>
              <div>
                <Label htmlFor="forme">Forme galénique</Label>
                <Select
                  value={newProduct.forme}
                  onValueChange={v => setNewProduct({ ...newProduct, forme: v })}
                >
                  <SelectTrigger className="border-teal-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPRIME">Comprimé</SelectItem>
                    <SelectItem value="GELULE">Gélule</SelectItem>
                    <SelectItem value="SIROP">Sirop</SelectItem>
                    <SelectItem value="INJECTION">Injection</SelectItem>
                    <SelectItem value="POMMADE">Pommade</SelectItem>
                    <SelectItem value="GOUTTES">Gouttes</SelectItem>
                    <SelectItem value="SUPPOSITOIRE">Suppositoire</SelectItem>
                    <SelectItem value="INHALATEUR">Inhalateur</SelectItem>
                    <SelectItem value="SOLUTION">Solution</SelectItem>
                    <SelectItem value="POUDRE">Poudre</SelectItem>
                    <SelectItem value="AUTRE">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={newProduct.dosage}
                  onChange={e => setNewProduct({ ...newProduct, dosage: e.target.value })}
                  placeholder="Ex : 1000mg"
                  className="border-teal-200"
                />
              </div>
              <div>
                <Label htmlFor="prixUnitaire">Prix unitaire (FCFA) *</Label>
                <Input
                  id="prixUnitaire"
                  type="number"
                  value={newProduct.prixUnitaire}
                  onChange={e =>
                    setNewProduct({ ...newProduct, prixUnitaire: e.target.value })
                  }
                  placeholder="0"
                  min={0}
                  className="border-teal-200"
                />
              </div>
              <div>
                <Label htmlFor="quantiteDispo">Quantité disponible</Label>
                <Input
                  id="quantiteDispo"
                  type="number"
                  value={newProduct.quantiteDispo}
                  onChange={e =>
                    setNewProduct({ ...newProduct, quantiteDispo: e.target.value })
                  }
                  placeholder="Illimitée si vide"
                  min={0}
                  className="border-teal-200"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleAddProduct}
            >
              <Plus className="h-4 w-4 mr-1" />
              Ajouter au catalogue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le produit</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce produit du catalogue ? Cette action est
              irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteProduct}>
              <Trash2 className="h-4 w-4 mr-1" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
