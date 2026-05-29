"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import {
  Search,
  Plus,
  Download,
  RefreshCw,
  Package,
  PackageX,
  Filter,
} from "lucide-react"
import { ProductRow } from "@/components/grossistes/product-row"
import type { CatalogueItem } from "@/lib/grossiste-utils"

export default function CataloguePage() {
  const [products, setProducts] = useState<CatalogueItem[]>([])
  const [filteredProducts, setFilteredProducts] = useState<CatalogueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [dispoFilter, setDispoFilter] = useState("ALL")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [grossisteId, setGrossisteId] = useState<string | null>(null)

  // New product form state
  const [newProduct, setNewProduct] = useState({
    referenceGros: "",
    dci: "",
    nomCommercial: "",
    forme: "Comprimé",
    dosage: "",
    prixAchat: "",
    disponible: true,
  })

  const fetchCatalogue = useCallback(async () => {
    try {
      setLoading(true)

      // Get grossiste ID first
      if (!grossisteId) {
        const gRes = await fetch("/api/grossistes?actif=true")
        const grossistes = await gRes.json()
        if (grossistes.length > 0) {
          setGrossisteId(grossistes[0].id)
        } else {
          setLoading(false)
          return
        }
      }

      const gid = grossisteId || ""
      const res = await fetch(`/api/grossistes/${gid}/catalogue`)
      const data = await res.json()
      setProducts(data)
    } catch (error) {
      console.error("Erreur chargement catalogue:", error)
      toast.error("Erreur lors du chargement du catalogue")
    } finally {
      setLoading(false)
    }
  }, [grossisteId])

  useEffect(() => {
    fetchCatalogue()
  }, [fetchCatalogue])

  // Apply filters
  useEffect(() => {
    let result = [...products]

    if (dispoFilter === "DISPONIBLE") {
      result = result.filter(p => p.disponible)
    } else if (dispoFilter === "RUPTURE") {
      result = result.filter(p => !p.disponible)
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p =>
        p.dci.toLowerCase().includes(term) ||
        p.nomCommercial.toLowerCase().includes(term) ||
        p.referenceGros.toLowerCase().includes(term)
      )
    }

    setFilteredProducts(result)
  }, [products, dispoFilter, searchTerm])

  const handleSaveProduct = async (id: string, data: Partial<CatalogueItem>) => {
    try {
      const res = await fetch(`/api/grossistes/catalogue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) throw new Error("Erreur lors de la mise à jour")

      const updated = await res.json()
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updated } : p))
      toast.success("Produit mis à jour avec succès")
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de la mise à jour du produit")
    }
  }

  const handleAddProduct = async () => {
    try {
      if (!grossisteId) return

      const res = await fetch(`/api/grossistes/${grossisteId}/catalogue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          prixAchat: parseFloat(newProduct.prixAchat) || 0,
        }),
      })

      if (!res.ok) throw new Error("Erreur lors de l'ajout")

      const created = await res.json()
      setProducts(prev => [created, ...prev])
      setAddDialogOpen(false)
      setNewProduct({
        referenceGros: "",
        dci: "",
        nomCommercial: "",
        forme: "Comprimé",
        dosage: "",
        prixAchat: "",
        disponible: true,
      })
      toast.success("Produit ajouté au catalogue")
    } catch (error) {
      console.error("Erreur:", error)
      toast.error("Erreur lors de l'ajout du produit")
    }
  }

  const handleExport = () => {
    const csv = [
      ["Référence", "DCI", "Nom Commercial", "Forme", "Dosage", "Prix (FCFA)", "Disponible"].join(";"),
      ...filteredProducts.map(p =>
        [p.referenceGros, p.dci, p.nomCommercial, p.forme, p.dosage, p.prixAchat, p.disponible ? "Oui" : "Non"].join(";")
      ),
    ].join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `catalogue_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
    toast.success("Catalogue exporté en CSV")
  }

  const disponibleCount = products.filter(p => p.disponible).length
  const ruptureCount = products.filter(p => !p.disponible).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Catalogue</h1>
          <p className="text-muted-foreground mt-1">
            Gérez votre catalogue de produits et prix ({products.length} produits)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchCatalogue}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exporter
          </Button>
          <Button
            className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[#E1F5EE] flex items-center justify-center">
              <Package className="h-5 w-5 text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-2xl font-bold">{products.length}</p>
              <p className="text-xs text-muted-foreground">Total produits</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDispoFilter(dispoFilter === "DISPONIBLE" ? "ALL" : "DISPONIBLE")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
              <Package className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{disponibleCount}</p>
              <p className="text-xs text-muted-foreground">Disponibles</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setDispoFilter(dispoFilter === "RUPTURE" ? "ALL" : "RUPTURE")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center">
              <PackageX className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-500">{ruptureCount}</p>
              <p className="text-xs text-muted-foreground">En rupture</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par DCI, nom commercial ou référence..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={dispoFilter} onValueChange={setDispoFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Disponibilité" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous</SelectItem>
                <SelectItem value="DISPONIBLE">Disponible</SelectItem>
                <SelectItem value="RUPTURE">En rupture</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-12 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-lg font-medium text-muted-foreground">Aucun produit trouvé</p>
              <p className="text-sm text-muted-foreground mt-1">
                {products.length === 0
                  ? "Votre catalogue est vide. Ajoutez des produits."
                  : "Ajustez vos filtres pour voir plus de résultats"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Réf.</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Produit</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Forme / Dosage</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Prix d&apos;achat</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Disponibilité</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map(product => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      onSave={handleSaveProduct}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un produit au catalogue</DialogTitle>
            <DialogDescription>
              Remplissez les informations du nouveau produit
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="refGros">Référence grossiste</Label>
                <Input
                  id="refGros"
                  value={newProduct.referenceGros}
                  onChange={(e) => setNewProduct({ ...newProduct, referenceGros: e.target.value })}
                  placeholder="REF-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dci">DCI</Label>
                <Input
                  id="dci"
                  value={newProduct.dci}
                  onChange={(e) => setNewProduct({ ...newProduct, dci: e.target.value })}
                  placeholder="Paracétamol"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nomCommercial">Nom commercial</Label>
              <Input
                id="nomCommercial"
                value={newProduct.nomCommercial}
                onChange={(e) => setNewProduct({ ...newProduct, nomCommercial: e.target.value })}
                placeholder="Doliprane 500mg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="forme">Forme</Label>
                <Select
                  value={newProduct.forme}
                  onValueChange={(v) => setNewProduct({ ...newProduct, forme: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Comprimé">Comprimé</SelectItem>
                    <SelectItem value="Gélule">Gélule</SelectItem>
                    <SelectItem value="Sirop">Sirop</SelectItem>
                    <SelectItem value="Injectable">Injectable</SelectItem>
                    <SelectItem value="Pommade">Pommade</SelectItem>
                    <SelectItem value="Suppositoire">Suppositoire</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input
                  id="dosage"
                  value={newProduct.dosage}
                  onChange={(e) => setNewProduct({ ...newProduct, dosage: e.target.value })}
                  placeholder="500mg"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="prix">Prix d&apos;achat (FCFA)</Label>
                <Input
                  id="prix"
                  type="number"
                  value={newProduct.prixAchat}
                  onChange={(e) => setNewProduct({ ...newProduct, prixAchat: e.target.value })}
                  placeholder="900"
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label>Disponible</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch
                    checked={newProduct.disponible}
                    onCheckedChange={(checked) => setNewProduct({ ...newProduct, disponible: checked })}
                  />
                  <span className="text-sm text-muted-foreground">
                    {newProduct.disponible ? "En stock" : "Rupture"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white"
              onClick={handleAddProduct}
              disabled={!newProduct.referenceGros || !newProduct.dci || !newProduct.nomCommercial}
            >
              Ajouter le produit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
