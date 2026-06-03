'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Search, Plus, Truck, Star, Filter, Eye, StarOff, Pencil, Trash2, Package, Users, TrendingUp } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface ConditionAchat {
  id: string
  prixAchat: number
  remise: number | null
  delaiPaiement: number | null
  minCommande: number | null
  medicament?: { nomCommercial: string; dci: string }
}

interface EvaluationFournisseur {
  id: string
  delaiRespecte: number
  qualiteProduit: number
  communication: number
  commentaire: string | null
  dateEvaluation: string
}

interface Commande {
  id: string
  reference: string
  dateCommande: string
  statut: string
  montantTotal: number
}

interface Fournisseur {
  id: string
  nom: string
  code: string
  adresse: string | null
  telephone: string | null
  email: string | null
  estGrossisteAPI: boolean
  delaiLivraison: number | null
  noteEvaluation: number | null
  actif: boolean
  conditions?: ConditionAchat[]
  evaluations?: EvaluationFournisseur[]
  commandes?: Commande[]
  _count?: { commandes: number }
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < value ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
        />
      ))}
    </div>
  )
}

export default function FournisseursPage() {
  const { pharmacie } = useAuth()
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null)
  const [detailData, setDetailData] = useState<Fournisseur | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Add/Edit form
  const [formNom, setFormNom] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formAdresse, setFormAdresse] = useState('')
  const [formTel, setFormTel] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formDelai, setFormDelai] = useState('')
  const [formGrossiste, setFormGrossiste] = useState(false)

  // Eval form
  const [evalDelai, setEvalDelai] = useState('3')
  const [evalQualite, setEvalQualite] = useState('3')
  const [evalCommunication, setEvalCommunication] = useState('3')
  const [evalCommentaire, setEvalCommentaire] = useState('')

  const fetchData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/fournisseurs?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        setFournisseurs(data)
      }
    } catch {
      setFournisseurs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [pharmacie?.id])

  const filteredFournisseurs = useMemo(() => {
    let result = [...fournisseurs]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(f =>
        f.nom.toLowerCase().includes(q) || f.code.toLowerCase().includes(q)
      )
    }
    if (filterType === 'grossiste') {
      result = result.filter(f => f.estGrossisteAPI)
    } else if (filterType === 'regular') {
      result = result.filter(f => !f.estGrossisteAPI)
    }
    if (filterStatus === 'actif') {
      result = result.filter(f => f.actif)
    } else if (filterStatus === 'inactif') {
      result = result.filter(f => !f.actif)
    }
    return result
  }, [fournisseurs, search, filterType, filterStatus])

  const handleAddFournisseur = async () => {
    if (!pharmacie?.id || !formNom) {
      toast.error('Le nom du fournisseur est requis')
      return
    }
    try {
      const res = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: formNom,
          code: formCode || `FOUR-${Date.now().toString(36).toUpperCase()}`,
          adresse: formAdresse || null,
          telephone: formTel || null,
          email: formEmail || null,
          delaiLivraison: formDelai ? parseInt(formDelai) : null,
          estGrossisteAPI: formGrossiste,
          actif: true,
        }),
      })
      if (res.ok) {
        toast.success('Fournisseur ajouté avec succès')
        setAddDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast.error('Erreur lors de l\'ajout du fournisseur')
      }
    } catch {
      toast.error('Erreur lors de l\'ajout du fournisseur')
    }
  }

  const handleEditFournisseur = async () => {
    if (!selectedFournisseur) return
    try {
      const res = await fetch(`/api/fournisseurs/${selectedFournisseur.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nom: formNom,
          code: formCode,
          adresse: formAdresse || null,
          telephone: formTel || null,
          email: formEmail || null,
          delaiLivraison: formDelai ? parseInt(formDelai) : null,
          estGrossisteAPI: formGrossiste,
        }),
      })
      if (res.ok) {
        toast.success('Fournisseur modifié avec succès')
        setEditDialogOpen(false)
        resetForm()
        fetchData()
      } else {
        toast.error('Erreur lors de la modification du fournisseur')
      }
    } catch {
      toast.error('Erreur lors de la modification du fournisseur')
    }
  }

  const handleDeleteFournisseur = async () => {
    if (!selectedFournisseur) return
    try {
      const res = await fetch(`/api/fournisseurs/${selectedFournisseur.id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        toast.success('Fournisseur désactivé avec succès')
        setDeleteDialogOpen(false)
        setSelectedFournisseur(null)
        fetchData()
      } else {
        toast.error('Erreur lors de la désactivation du fournisseur')
      }
    } catch {
      toast.error('Erreur lors de la désactivation du fournisseur')
    }
  }

  const handleViewDetail = async (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur)
    setDetailDialogOpen(true)
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/fournisseurs/${fournisseur.id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailData(data)
      }
    } catch {
      setDetailData(fournisseur)
    } finally {
      setDetailLoading(false)
    }
  }

  const handleOpenEdit = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur)
    setFormNom(fournisseur.nom)
    setFormCode(fournisseur.code)
    setFormAdresse(fournisseur.adresse || '')
    setFormTel(fournisseur.telephone || '')
    setFormEmail(fournisseur.email || '')
    setFormDelai(fournisseur.delaiLivraison?.toString() || '')
    setFormGrossiste(fournisseur.estGrossisteAPI)
    setEditDialogOpen(true)
  }

  const handleOpenDelete = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur)
    setDeleteDialogOpen(true)
  }

  const handleOpenEval = (fournisseur: Fournisseur) => {
    setSelectedFournisseur(fournisseur)
    setEvalDelai('3')
    setEvalQualite('3')
    setEvalCommunication('3')
    setEvalCommentaire('')
    setEvalDialogOpen(true)
  }

  const handleSubmitEval = async () => {
    if (!pharmacie?.id || !selectedFournisseur) return
    try {
      const res = await fetch(`/api/fournisseurs/${selectedFournisseur.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          delaiRespecte: parseInt(evalDelai),
          qualiteProduit: parseInt(evalQualite),
          communication: parseInt(evalCommunication),
          commentaire: evalCommentaire || null,
        }),
      })
      if (res.ok) {
        toast.success('Évaluation enregistrée avec succès')
        setEvalDialogOpen(false)
        fetchData()
      } else {
        toast.error('Erreur lors de l\'enregistrement de l\'évaluation')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement de l\'évaluation')
    }
  }

  const resetForm = () => {
    setFormNom('')
    setFormCode('')
    setFormAdresse('')
    setFormTel('')
    setFormEmail('')
    setFormDelai('')
    setFormGrossiste(false)
  }

  // KPI Calculations
  const totalCount = fournisseurs.length
  const activeCount = fournisseurs.filter(f => f.actif).length
  const commandesEnCours = fournisseurs.reduce((sum, f) => sum + (f._count?.commandes || 0), 0)
  const avgNote = fournisseurs.length > 0
    ? fournisseurs.filter(f => f.noteEvaluation).length > 0
      ? fournisseurs.reduce((s, f) => s + (f.noteEvaluation || 0), 0) / fournisseurs.filter(f => f.noteEvaluation).length
      : 0
    : 0

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-12" />
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
            <Truck className="w-6 h-6 text-[#1D9E75]" />
            Gestion des Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalCount} fournisseurs référencés • {activeCount} actifs
          </p>
        </div>
        <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => { resetForm(); setAddDialogOpen(true) }}>
          <Plus className="w-4 h-4" />
          Ajouter un fournisseur
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Total Fournisseurs</span>
                <span className="text-xl font-bold block">{totalCount}</span>
              </div>
              <Truck className="w-8 h-8 text-gray-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Fournisseurs Actifs</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{activeCount}</span>
              </div>
              <Users className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Note Moyenne</span>
                <span className="text-xl font-bold block">{avgNote > 0 ? avgNote.toFixed(1) + ' / 5' : 'N/A'}</span>
              </div>
              <Star className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Commandes en cours</span>
                <span className="text-xl font-bold block text-amber-600">{commandesEnCours}</span>
              </div>
              <Package className="w-8 h-8 text-amber-400/30" />
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
                placeholder="Rechercher par nom, code..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="actif">Actifs</SelectItem>
                <SelectItem value="inactif">Inactifs</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="grossiste">Grossistes API</SelectItem>
                <SelectItem value="regular">Fournisseurs classiques</SelectItem>
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
                  <TableHead>Code</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-center">Délai Livraison</TableHead>
                  <TableHead className="text-center">Note</TableHead>
                  <TableHead className="text-center">Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFournisseurs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Aucun fournisseur trouvé
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFournisseurs.map(f => (
                    <TableRow key={f.id} className="hover:bg-muted/30">
                      <TableCell>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">{f.code}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{f.nom}</span>
                          {f.estGrossisteAPI && (
                            <Badge className="text-[8px] bg-[#1D9E75] text-white border-0 w-fit mt-0.5">Grossiste API</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{f.telephone || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{f.email || '—'}</TableCell>
                      <TableCell className="text-center text-sm">
                        {f.delaiLivraison ? `${f.delaiLivraison} jours` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.noteEvaluation ? (
                          <div className="flex items-center justify-center gap-1">
                            <StarRating value={Math.round(f.noteEvaluation)} />
                            <span className="text-xs font-medium ml-1">{f.noteEvaluation.toFixed(1)}</span>
                          </div>
                        ) : (
                          <StarOff className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.actif ? (
                          <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
                        ) : (
                          <Badge className="text-[9px] bg-red-100 text-red-800 border-0">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleViewDetail(f)} title="Voir les détails">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(f)} title="Modifier">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenEval(f)} title="Évaluer">
                            <Star className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500 hover:text-red-700" onClick={() => handleOpenDelete(f)} title="Désactiver">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Supplier Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Nouveau fournisseur
            </DialogTitle>
            <DialogDescription>Ajoutez un nouveau fournisseur à votre pharmacie</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input placeholder="Nom du fournisseur" value={formNom} onChange={e => setFormNom(e.target.value)} />
              </div>
              <div>
                <Label>Code</Label>
                <Input placeholder="Auto-généré si vide" value={formCode} onChange={e => setFormCode(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input placeholder="Adresse du fournisseur" value={formAdresse} onChange={e => setFormAdresse(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input placeholder="+229 97 00 00 00" value={formTel} onChange={e => setFormTel(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input placeholder="email@fournisseur.bj" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Délai livraison (jours)</Label>
                <Input type="number" placeholder="7" value={formDelai} onChange={e => setFormDelai(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={formGrossiste} onCheckedChange={setFormGrossiste} />
                <Label>Grossiste API</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddFournisseur} disabled={!formNom}>
              Enregistrer le fournisseur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Supplier Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[#1D9E75]" />
              Modifier le fournisseur
            </DialogTitle>
            <DialogDescription>Modifiez les informations de {selectedFournisseur?.nom}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input value={formNom} onChange={e => setFormNom(e.target.value)} />
              </div>
              <div>
                <Label>Code</Label>
                <Input value={formCode} onChange={e => setFormCode(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Adresse</Label>
              <Input value={formAdresse} onChange={e => setFormAdresse(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Téléphone</Label>
                <Input value={formTel} onChange={e => setFormTel(e.target.value)} />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={formEmail} onChange={e => setFormEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Délai livraison (jours)</Label>
                <Input type="number" value={formDelai} onChange={e => setFormDelai(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={formGrossiste} onCheckedChange={setFormGrossiste} />
                <Label>Grossiste API</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleEditFournisseur}>
              Enregistrer les modifications
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Désactiver le fournisseur
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver <strong>{selectedFournisseur?.nom}</strong> ?
              Le fournisseur ne sera pas supprimé mais marqué comme inactif.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDeleteFournisseur}>
              Désactiver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#1D9E75]" />
              {selectedFournisseur?.nom}
              {selectedFournisseur?.estGrossisteAPI && (
                <Badge className="text-[9px] bg-[#1D9E75] text-white border-0">Grossiste API</Badge>
              )}
              {selectedFournisseur?.actif ? (
                <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
              ) : (
                <Badge className="text-[9px] bg-red-100 text-red-800 border-0">Inactif</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-32" />
            </div>
          ) : detailData ? (
            <div className="py-4 space-y-4">
              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Code</span>
                  <p className="font-mono text-sm font-medium">{detailData.code}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Téléphone</span>
                  <p className="font-medium text-sm">{detailData.telephone || '—'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Email</span>
                  <p className="font-medium text-sm">{detailData.email || '—'}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Délai livraison</span>
                  <p className="font-medium text-sm">{detailData.delaiLivraison ? `${detailData.delaiLivraison} jours` : '—'}</p>
                </div>
              </div>
              {detailData.adresse && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <span className="text-xs text-muted-foreground">Adresse</span>
                  <p className="font-medium text-sm">{detailData.adresse}</p>
                </div>
              )}
              <div className="bg-muted/50 rounded-lg p-3">
                <span className="text-xs text-muted-foreground">Note d&apos;évaluation</span>
                <div className="flex items-center gap-2 mt-1">
                  {detailData.noteEvaluation ? (
                    <>
                      <StarRating value={Math.round(detailData.noteEvaluation)} />
                      <span className="text-sm font-medium">{detailData.noteEvaluation.toFixed(1)} / 5</span>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">Non évalué</span>
                  )}
                </div>
              </div>

              {/* Conditions d'achat */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-[#1D9E75]" />
                  Conditions d&apos;achat
                </h3>
                {detailData.conditions && detailData.conditions.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.conditions.map(c => (
                      <div key={c.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-medium text-sm">{c.medicament?.nomCommercial || 'Général'}</span>
                            {c.medicament && (
                              <span className="text-xs text-muted-foreground ml-2">({c.medicament.dci})</span>
                            )}
                          </div>
                          <span className="font-semibold text-sm text-[#1D9E75]">{formatFCFA(c.prixAchat)}</span>
                        </div>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                          {c.remise && <span>Remise: {c.remise}%</span>}
                          {c.delaiPaiement && <span>Paiement: {c.delaiPaiement} jours</span>}
                          {c.minCommande && <span>Min: {c.minCommande} unités</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Aucune condition d&apos;achat enregistrée
                  </div>
                )}
              </div>

              {/* Evaluations */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-400" />
                    Évaluations
                  </h3>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => {
                    setDetailDialogOpen(false)
                    setTimeout(() => handleOpenEval(selectedFournisseur!), 200)
                  }}>
                    <Plus className="w-3.5 h-3.5" /> Évaluer
                  </Button>
                </div>
                {detailData.evaluations && detailData.evaluations.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.evaluations.map(ev => (
                      <div key={ev.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.dateEvaluation).toLocaleDateString('fr-FR')}
                          </span>
                          <div className="text-right">
                            <span className="text-xs font-medium text-[#1D9E75]">
                              {((ev.delaiRespecte + ev.qualiteProduit + ev.communication) / 3).toFixed(1)} / 5
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center">
                            <span className="text-[10px] text-muted-foreground">Délai</span>
                            <StarRating value={ev.delaiRespecte} />
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-muted-foreground">Qualité</span>
                            <StarRating value={ev.qualiteProduit} />
                          </div>
                          <div className="text-center">
                            <span className="text-[10px] text-muted-foreground">Communication</span>
                            <StarRating value={ev.communication} />
                          </div>
                        </div>
                        {ev.commentaire && (
                          <p className="text-xs text-muted-foreground mt-2 italic">&quot;{ev.commentaire}&quot;</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <StarOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Aucune évaluation</p>
                  </div>
                )}
              </div>

              {/* Commandes History */}
              <div>
                <h3 className="text-sm font-semibold mb-2 flex items-center gap-1">
                  <Package className="w-4 h-4 text-[#1D9E75]" />
                  Historique des commandes
                </h3>
                {detailData.commandes && detailData.commandes.length > 0 ? (
                  <div className="space-y-2">
                    {detailData.commandes.slice(0, 5).map(cmd => (
                      <div key={cmd.id} className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                        <div>
                          <span className="font-mono text-xs text-muted-foreground">{cmd.reference}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            {new Date(cmd.dateCommande).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{formatFCFA(cmd.montantTotal)}</span>
                          <Badge className="text-[8px] bg-blue-100 text-blue-800 border-0">{cmd.statut}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    Aucune commande enregistrée
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Impossible de charger les détails
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evalDialogOpen} onOpenChange={setEvalDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400" />
              Évaluer — {selectedFournisseur?.nom}
            </DialogTitle>
            <DialogDescription>Notez ce fournisseur sur 3 critères</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Respect des délais (1-5)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Select value={evalDelai} onValueChange={setEvalDelai}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StarRating value={parseInt(evalDelai)} />
              </div>
            </div>
            <div>
              <Label>Qualité des produits (1-5)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Select value={evalQualite} onValueChange={setEvalQualite}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StarRating value={parseInt(evalQualite)} />
              </div>
            </div>
            <div>
              <Label>Communication (1-5)</Label>
              <div className="flex items-center gap-3 mt-1">
                <Select value={evalCommunication} onValueChange={setEvalCommunication}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(v => (
                      <SelectItem key={v} value={String(v)}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <StarRating value={parseInt(evalCommunication)} />
              </div>
            </div>
            <div>
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                placeholder="Votre commentaire..."
                value={evalCommentaire}
                onChange={e => setEvalCommentaire(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEvalDialogOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleSubmitEval}>
              Enregistrer l&apos;évaluation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
