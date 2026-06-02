'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Plus, Truck, Star, Filter, Eye, StarOff } from 'lucide-react'
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
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [evalDialogOpen, setEvalDialogOpen] = useState(false)
  const [selectedFournisseur, setSelectedFournisseur] = useState<Fournisseur | null>(null)
  const [detailData, setDetailData] = useState<Fournisseur | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  // Add form
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
    return result
  }, [fournisseurs, search, filterType])

  const handleAddFournisseur = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/fournisseurs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          nom: formNom,
          code: formCode,
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

  const activeCount = fournisseurs.filter(f => f.actif).length
  const grossisteCount = fournisseurs.filter(f => f.estGrossisteAPI).length
  const avgNote = fournisseurs.length > 0
    ? fournisseurs.reduce((s, f) => s + (f.noteEvaluation || 0), 0) / fournisseurs.filter(f => f.noteEvaluation).length
    : 0

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
            <Truck className="w-6 h-6 text-[#1D9E75]" />
            Fournisseurs
          </h1>
          <p className="text-sm text-muted-foreground">
            {fournisseurs.length} fournisseurs référencés
          </p>
        </div>
        <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Ajouter un fournisseur
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Fournisseurs actifs</span>
                <span className="text-xl font-bold block">{activeCount}</span>
              </div>
              <Truck className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Grossistes API</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{grossisteCount}</span>
              </div>
              <Truck className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Note moyenne</span>
                <span className="text-xl font-bold block">{avgNote > 0 ? avgNote.toFixed(1) + ' / 5' : 'N/A'}</span>
              </div>
              <Star className="w-8 h-8 text-amber-400/30" />
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
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-center">Délai livraison</TableHead>
                  <TableHead className="text-center">Note</TableHead>
                  <TableHead className="text-center">Commandes</TableHead>
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
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{f.nom}</span>
                          <span className="text-[10px] text-muted-foreground">Code: {f.code}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs">
                          {f.telephone && <span>{f.telephone}</span>}
                          {f.email && <span className="text-muted-foreground">{f.email}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {f.estGrossisteAPI ? (
                          <Badge className="text-[9px] bg-[#1D9E75] text-white border-0">Grossiste API</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Classique</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {f.delaiLivraison ? `${f.delaiLivraison} jours` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.noteEvaluation ? (
                          <div className="flex items-center justify-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">{f.noteEvaluation.toFixed(1)}</span>
                          </div>
                        ) : (
                          <StarOff className="w-3.5 h-3.5 text-gray-300 mx-auto" />
                        )}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        {f._count?.commandes || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {f.actif ? (
                          <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Actif</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px]">Inactif</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleViewDetail(f)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleOpenEval(f)}>
                            <Star className="w-4 h-4" />
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
            <DialogTitle>Nouveau fournisseur</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nom *</Label>
                <Input placeholder="Nom du fournisseur" value={formNom} onChange={e => setFormNom(e.target.value)} />
              </div>
              <div>
                <Label>Code *</Label>
                <Input placeholder="Code unique" value={formCode} onChange={e => setFormCode(e.target.value)} />
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
              <div className="flex items-end gap-2">
                <Label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formGrossiste}
                    onChange={e => setFormGrossiste(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Grossiste API
                </Label>
              </div>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddFournisseur}>
              Enregistrer le fournisseur
            </Button>
          </div>
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
            </DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-32" />
            </div>
          ) : detailData ? (
            <Tabs defaultValue="info" className="py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="info">Informations</TabsTrigger>
                <TabsTrigger value="conditions">Conditions</TabsTrigger>
                <TabsTrigger value="evaluations">Évaluations</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <span className="text-xs text-muted-foreground">Code</span>
                    <p className="font-medium text-sm">{detailData.code}</p>
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
              </TabsContent>

              <TabsContent value="conditions" className="mt-4">
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
                  <div className="text-center py-8 text-muted-foreground">
                    Aucune condition d&apos;achat enregistrée
                  </div>
                )}
              </TabsContent>

              <TabsContent value="evaluations" className="mt-4">
                {detailData.evaluations && detailData.evaluations.length > 0 ? (
                  <div className="space-y-3">
                    {detailData.evaluations.map(ev => (
                      <div key={ev.id} className="bg-muted/50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-muted-foreground">
                            {new Date(ev.dateEvaluation).toLocaleDateString('fr-FR')}
                          </span>
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
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        setTimeout(() => handleOpenEval(selectedFournisseur!), 200)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Ajouter une évaluation
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <StarOff className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">Aucune évaluation</p>
                    <Button
                      variant="outline"
                      className="mt-4 gap-2"
                      onClick={() => {
                        setDetailDialogOpen(false)
                        setTimeout(() => handleOpenEval(selectedFournisseur!), 200)
                      }}
                    >
                      <Plus className="w-4 h-4" />
                      Évaluer ce fournisseur
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
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
            <DialogTitle>Évaluer — {selectedFournisseur?.nom}</DialogTitle>
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
              <Input
                placeholder="Votre commentaire..."
                value={evalCommentaire}
                onChange={e => setEvalCommentaire(e.target.value)}
              />
            </div>
            <Button className="w-full bg-[#1D9E75] hover:bg-[#085041]" onClick={handleSubmitEval}>
              Enregistrer l&apos;évaluation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
