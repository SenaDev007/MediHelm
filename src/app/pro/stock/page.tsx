'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Search, Plus, Package, AlertTriangle, Filter } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface MedicamentWithLots {
  id: string
  dci: string
  nomCommercial: string
  codeCIP: string | null
  forme: string
  dosage: string
  unite: string
  prixVente: number
  prixAchat: number | null
  tva: number
  stockMin: number
  stockMax: number | null
  estStupefiant: boolean
  estGenerique: boolean
  estRemboursable: boolean
  actif: boolean
  lots: {
    id: string
    numeroLot: string
    quantite: number
    dateExpiration: string
    prixAchat: number
    fournisseur: string | null
  }[]
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

export default function StockPage() {
  const { pharmacie } = useAuth()
  const [medicaments, setMedicaments] = useState<MedicamentWithLots[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterAlert, setFilterAlert] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('nom')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [formNom, setFormNom] = useState('')
  const [formDci, setFormDci] = useState('')
  const [formDosage, setFormDosage] = useState('')
  const [formForme, setFormForme] = useState('')
  const [formPrixVente, setFormPrixVente] = useState('')
  const [formPrixAchat, setFormPrixAchat] = useState('')
  const [formStockMin, setFormStockMin] = useState('')
  const [formUnite, setFormUnite] = useState('')

  const handleAddMedication = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/medicaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nomCommercial: formNom,
          dci: formDci,
          dosage: formDosage,
          forme: formForme,
          prixVente: parseFloat(formPrixVente) || 0,
          prixAchat: parseFloat(formPrixAchat) || null,
          stockMin: parseInt(formStockMin) || 0,
          unite: formUnite || 'Boîte',
          tva: 0,
          estStupefiant: false,
          estGenerique: false,
          estRemboursable: false,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Médicament ajouté avec succès')
        setAddDialogOpen(false)
        setFormNom('')
        setFormDci('')
        setFormDosage('')
        setFormForme('')
        setFormPrixVente('')
        setFormPrixAchat('')
        setFormStockMin('')
        setFormUnite('')
        // Refresh
        const data = await fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : [])
        setMedicaments(data)
      } else {
        toast.error("Erreur lors de l'ajout du médicament")
      }
    } catch {
      toast.error("Erreur lors de l'ajout du médicament")
    }
  }

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setMedicaments(data))
        .catch(() => setMedicaments([]))
        .finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filteredMedicaments = useMemo(() => {
    let result = [...medicaments]

    // Search
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(m =>
        m.nomCommercial.toLowerCase().includes(q) ||
        m.dci.toLowerCase().includes(q) ||
        (m.codeCIP && m.codeCIP.includes(q))
      )
    }

    // Filter by alert status
    if (filterAlert === 'low-stock') {
      result = result.filter(m => {
        const totalStock = m.lots.reduce((s, l) => s + l.quantite, 0)
        return totalStock <= m.stockMin
      })
    } else if (filterAlert === 'expiring') {
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 90)
      result = result.filter(m =>
        m.lots.some(l => new Date(l.dateExpiration) <= thirtyDays)
      )
    } else if (filterAlert === 'stupefiant') {
      result = result.filter(m => m.estStupefiant)
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'nom') return a.nomCommercial.localeCompare(b.nomCommercial)
      if (sortBy === 'stock') {
        const stockA = a.lots.reduce((s, l) => s + l.quantite, 0)
        const stockB = b.lots.reduce((s, l) => s + l.quantite, 0)
        return stockA - stockB
      }
      if (sortBy === 'prix') return b.prixVente - a.prixVente
      return 0
    })

    return result
  }, [medicaments, search, filterAlert, sortBy])

  const totalStockValue = useMemo(() => {
    return medicaments.reduce((total, m) => {
      const stockTotal = m.lots.reduce((s, l) => s + l.quantite, 0)
      const cmup = m.lots.length > 0
        ? m.lots.reduce((s, l) => s + l.prixAchat * l.quantite, 0) / Math.max(m.lots.reduce((s, l) => s + l.quantite, 0), 1)
        : (m.prixAchat || 0)
      return total + stockTotal * cmup
    }, 0)
  }, [medicaments])

  const stockAlertCount = useMemo(() => {
    return medicaments.filter(m => {
      const totalStock = m.lots.reduce((s, l) => s + l.quantite, 0)
      return totalStock <= m.stockMin
    }).length
  }, [medicaments])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" />
            Gestion du Stock
          </h1>
          <p className="text-sm text-muted-foreground">
            {medicaments.length} médicaments référencés
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter un médicament
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau médicament</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>DCI</Label>
                  <Input placeholder="Dénomination commune" value={formDci} onChange={e => setFormDci(e.target.value)} />
                </div>
                <div>
                  <Label>Nom commercial</Label>
                  <Input placeholder="Nom du produit" value={formNom} onChange={e => setFormNom(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Forme</Label>
                  <Input placeholder="Comprimé, sirop..." value={formForme} onChange={e => setFormForme(e.target.value)} />
                </div>
                <div>
                  <Label>Dosage</Label>
                  <Input placeholder="500mg, 5ml..." value={formDosage} onChange={e => setFormDosage(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Prix de vente (FCFA)</Label>
                  <Input type="number" placeholder="0" value={formPrixVente} onChange={e => setFormPrixVente(e.target.value)} />
                </div>
                <div>
                  <Label>Prix d&apos;achat (FCFA)</Label>
                  <Input type="number" placeholder="0" value={formPrixAchat} onChange={e => setFormPrixAchat(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stock minimum</Label>
                  <Input type="number" placeholder="0" value={formStockMin} onChange={e => setFormStockMin(e.target.value)} />
                </div>
                <div>
                  <Label>Unité</Label>
                  <Input placeholder="Boîte, flacon..." value={formUnite} onChange={e => setFormUnite(e.target.value)} />
                </div>
              </div>
              <Button className="w-full mt-2" onClick={handleAddMedication}>Enregistrer le médicament</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Valeur totale stock</span>
                <span className="text-xl font-bold block">{formatFCFA(totalStockValue)}</span>
              </div>
              <Package className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Produits en alerte</span>
                <span className="text-xl font-bold block text-destructive">{stockAlertCount}</span>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total médicaments</span>
                <span className="text-xl font-bold block">{medicaments.length}</span>
              </div>
              <Package className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, DCI, code CIP..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterAlert} onValueChange={setFilterAlert}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="low-stock">Stock bas</SelectItem>
                <SelectItem value="expiring">Expiration proche</SelectItem>
                <SelectItem value="stupefiant">Stupéfiants</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nom">Par nom</SelectItem>
                <SelectItem value="stock">Par stock</SelectItem>
                <SelectItem value="prix">Par prix</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produit</TableHead>
                  <TableHead>DCI</TableHead>
                  <TableHead>Forme</TableHead>
                  <TableHead className="text-right">Prix vente</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-center">CMUP</TableHead>
                  <TableHead className="text-center">Lots</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMedicaments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun médicament trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMedicaments.map(med => {
                    const totalStock = med.lots.reduce((s, l) => s + l.quantite, 0)
                    const cmup = med.lots.length > 0
                      ? med.lots.reduce((s, l) => s + l.prixAchat * l.quantite, 0) / Math.max(totalStock, 1)
                      : (med.prixAchat || 0)
                    const isLowStock = totalStock <= med.stockMin
                    const hasExpiring = med.lots.some(l => {
                      const daysToExp = Math.ceil((new Date(l.dateExpiration).getTime() - Date.now()) / 86400000)
                      return daysToExp <= 90
                    })

                    return (
                      <TableRow key={med.id} className="hover:bg-muted/30">
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{med.nomCommercial}</span>
                            {med.codeCIP && (
                              <span className="text-[10px] text-muted-foreground">CIP: {med.codeCIP}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{med.dci}</TableCell>
                        <TableCell className="text-sm">{med.dosage} {med.forme}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatFCFA(med.prixVente)}</TableCell>
                        <TableCell className="text-center">
                          <span className={`font-semibold ${isLowStock ? 'text-destructive' : ''}`}>
                            {totalStock}
                          </span>
                          <span className="text-xs text-muted-foreground"> / {med.unite}</span>
                        </TableCell>
                        <TableCell className="text-center text-sm">{formatFCFA(Math.round(cmup))}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-0.5">
                            {med.lots.slice(0, 2).map(lot => (
                              <span key={lot.id} className="text-[10px] text-muted-foreground">
                                {lot.numeroLot} ({lot.quantite})
                              </span>
                            ))}
                            {med.lots.length > 2 && (
                              <span className="text-[10px] text-primary">
                                +{med.lots.length - 2} autres
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-wrap gap-1 justify-center">
                            {isLowStock && (
                              <Badge variant="destructive" className="text-[9px]">Stock bas</Badge>
                            )}
                            {hasExpiring && (
                              <Badge className="text-[9px] bg-amber-400 text-gray-900 border-0">Expiration</Badge>
                            )}
                            {med.estStupefiant && (
                              <Badge className="text-[9px] bg-purple-500 text-white border-0">Stupéfiant</Badge>
                            )}
                            {!isLowStock && !hasExpiring && (
                              <Badge className="text-[9px] bg-primary/10 text-primary border-0">OK</Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
