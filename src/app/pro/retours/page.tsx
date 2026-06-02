'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent } from '@/components/ui/card'
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
import { RotateCcw, Plus, AlertTriangle, FileWarning, Search } from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA'
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
  estStupefiant: boolean
  lots?: { id: string; numeroLot: string; quantite: number; dateExpiration: string }[]
}

interface Fournisseur {
  id: string
  nom: string
  code: string
}

interface Utilisateur {
  id: string
  nom: string
  prenom: string
}

interface Retour {
  id: string
  medicamentId: string
  lotId: string | null
  typeRetour: string
  quantite: number
  motif: string
  fournisseurId: string | null
  statut: string
  createdAt: string
  medicament: { nomCommercial: string; dci: string; estStupefiant: boolean }
  lot: { numeroLot: string; dateExpiration: string } | null
  fournisseur: { nom: string; code: string } | null
}

interface Destruction {
  id: string
  medicamentId: string
  lotId: string
  quantite: number
  motif: string
  dateDestruction: string
  pharmacienId: string
  temoinId: string | null
  pvUrl: string | null
  statut: string
  createdAt: string
  medicament: { nomCommercial: string; dci: string; estStupefiant: boolean }
  lot: { numeroLot: string; dateExpiration: string }
  pharmacien: { nom: string; prenom: string }
  temoin: { nom: string; prenom: string } | null
}

export default function RetoursPage() {
  const { pharmacie, user } = useAuth()
  const [activeTab, setActiveTab] = useState('retours')

  const [retours, setRetours] = useState<Retour[]>([])
  const [destructions, setDestructions] = useState<Destruction[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([])
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [addRetourDialogOpen, setAddRetourDialogOpen] = useState(false)
  const [addDestructionDialogOpen, setAddDestructionDialogOpen] = useState(false)

  // Retour form
  const [retMedicamentId, setRetMedicamentId] = useState('')
  const [retLotId, setRetLotId] = useState('')
  const [retType, setRetType] = useState('PERIME')
  const [retQuantite, setRetQuantite] = useState('')
  const [retMotif, setRetMotif] = useState('')
  const [retFournisseurId, setRetFournisseurId] = useState('')

  // Destruction form
  const [destMedicamentId, setDestMedicamentId] = useState('')
  const [destLotId, setDestLotId] = useState('')
  const [destQuantite, setDestQuantite] = useState('')
  const [destMotif, setDestMotif] = useState('')
  const [destDate, setDestDate] = useState(new Date().toISOString().slice(0, 10))
  const [destPharmacienId, setDestPharmacienId] = useState('')
  const [destTemoinId, setDestTemoinId] = useState('')

  const fetchAllData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const [retRes, destRes, medRes, fourRes] = await Promise.all([
        fetch(`/api/retours?pharmacieId=${pharmacie.id}`),
        fetch(`/api/destructions?pharmacieId=${pharmacie.id}`),
        fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`),
        fetch(`/api/fournisseurs?pharmacieId=${pharmacie.id}`),
      ])
      if (retRes.ok) setRetours(await retRes.json())
      if (destRes.ok) setDestructions(await destRes.json())
      if (medRes.ok) setMedicaments(await medRes.json())
      if (fourRes.ok) setFournisseurs(await fourRes.json())

      // Set demo utilisateur
      if (user) {
        setUtilisateurs([{ id: user.id, nom: user.nom, prenom: user.prenom }])
        setDestPharmacienId(user.id)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [pharmacie?.id])

  // Selected medicament lots
  const selectedRetMed = useMemo(() => medicaments.find(m => m.id === retMedicamentId), [medicaments, retMedicamentId])
  const selectedDestMed = useMemo(() => medicaments.find(m => m.id === destMedicamentId), [medicaments, destMedicamentId])

  const filteredRetours = useMemo(() => {
    if (!search) return retours
    const q = search.toLowerCase()
    return retours.filter(r =>
      r.medicament.nomCommercial.toLowerCase().includes(q) ||
      r.motif.toLowerCase().includes(q) ||
      (r.lot?.numeroLot || '').toLowerCase().includes(q)
    )
  }, [retours, search])

  const filteredDestructions = useMemo(() => {
    if (!search) return destructions
    const q = search.toLowerCase()
    return destructions.filter(d =>
      d.medicament.nomCommercial.toLowerCase().includes(q) ||
      d.motif.toLowerCase().includes(q) ||
      d.lot.numeroLot.toLowerCase().includes(q)
    )
  }, [destructions, search])

  const getTypeRetourBadge = (type: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PERIME: { label: 'Périmé', className: 'bg-red-100 text-red-800 border-0' },
      ENDOMMAGE: { label: 'Endommagé', className: 'bg-orange-100 text-orange-800 border-0' },
      ERREUR_LIVRAISON: { label: 'Erreur livraison', className: 'bg-blue-100 text-blue-800 border-0' },
      RAPPEL_LOT: { label: 'Rappel de lot', className: 'bg-purple-100 text-purple-800 border-0' },
    }
    const info = map[type] || { label: type, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const getStatutDestructionBadge = (statut: string) => {
    const map: Record<string, { label: string; className: string }> = {
      PLANIFIEE: { label: 'Planifiée', className: 'bg-blue-100 text-blue-800 border-0' },
      EN_COURS: { label: 'En cours', className: 'bg-amber-100 text-amber-800 border-0' },
      EFFECTUEE: { label: 'Effectuée', className: 'bg-[#E1F5EE] text-[#085041] border-0' },
      PV_SIGNE: { label: 'PV signé', className: 'bg-[#1D9E75] text-white border-0' },
    }
    const info = map[statut] || { label: statut, className: 'bg-gray-100 text-gray-800 border-0' }
    return <Badge className={`text-[9px] ${info.className}`}>{info.label}</Badge>
  }

  const handleAddRetour = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/retours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          medicamentId: retMedicamentId,
          lotId: retLotId || null,
          typeRetour: retType,
          quantite: parseInt(retQuantite) || 0,
          motif: retMotif,
          fournisseurId: retFournisseurId || null,
          statut: 'EN_COURS',
        }),
      })
      if (res.ok) {
        toast.success('Retour enregistré avec succès')
        setAddRetourDialogOpen(false)
        resetRetourForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de l'enregistrement du retour")
      }
    } catch {
      toast.error("Erreur lors de l'enregistrement du retour")
    }
  }

  const handleAddDestruction = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch('/api/destructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          medicamentId: destMedicamentId,
          lotId: destLotId,
          quantite: parseInt(destQuantite) || 0,
          motif: destMotif,
          dateDestruction: destDate,
          pharmacienId: destPharmacienId,
          temoinId: destTemoinId || null,
          statut: 'PLANIFIEE',
        }),
      })
      if (res.ok) {
        toast.success('Destruction planifiée avec succès')
        setAddDestructionDialogOpen(false)
        resetDestructionForm()
        fetchAllData()
      } else {
        toast.error("Erreur lors de la planification de la destruction")
      }
    } catch {
      toast.error("Erreur lors de la planification de la destruction")
    }
  }

  const resetRetourForm = () => {
    setRetMedicamentId(''); setRetLotId(''); setRetType('PERIME'); setRetQuantite(''); setRetMotif(''); setRetFournisseurId('')
  }
  const resetDestructionForm = () => {
    setDestMedicamentId(''); setDestLotId(''); setDestQuantite(''); setDestMotif(''); setDestDate(new Date().toISOString().slice(0, 10)); setDestTemoinId('')
  }

  const retoursEnCours = retours.filter(r => r.statut === 'EN_COURS').length
  const destructionsPlanifiees = destructions.filter(d => d.statut === 'PLANIFIEE').length
  const stupDestructions = destructions.filter(d => d.medicament.estStupefiant).length

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
            <RotateCcw className="w-6 h-6 text-[#1D9E75]" />
            Retours & Destructions
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestion des retours fournisseurs et destructions de médicaments
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Retours en cours</span>
                <span className="text-xl font-bold block text-amber-600">{retoursEnCours}</span>
              </div>
              <RotateCcw className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Destructions planifiées</span>
                <span className="text-xl font-bold block text-[#1D9E75]">{destructionsPlanifiees}</span>
              </div>
              <AlertTriangle className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Stupéfiants détruits</span>
                <span className="text-xl font-bold block text-purple-600">{stupDestructions}</span>
              </div>
              <FileWarning className="w-8 h-8 text-purple-400/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="retours">Retours</TabsTrigger>
            <TabsTrigger value="destructions">Destructions</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-9"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            {activeTab === 'retours' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddRetourDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Retour
              </Button>
            )}
            {activeTab === 'destructions' && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setAddDestructionDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Destruction
              </Button>
            )}
          </div>
        </div>

        {/* Retours Tab */}
        <TabsContent value="retours" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Fournisseur</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRetours.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucun retour trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRetours.map(r => (
                        <TableRow key={r.id} className="hover:bg-muted/30">
                          <TableCell>{getTypeRetourBadge(r.typeRetour)}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{r.medicament.nomCommercial}</span>
                              <span className="text-[10px] text-muted-foreground">{r.medicament.dci}</span>
                              {r.medicament.estStupefiant && (
                                <Badge className="text-[8px] bg-purple-500 text-white border-0 w-fit mt-0.5">Stupéfiant</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {r.lot?.numeroLot || '—'}
                          </TableCell>
                          <TableCell className="text-center font-semibold text-sm">{r.quantite}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{r.motif}</TableCell>
                          <TableCell className="text-sm">{r.fournisseur?.nom || '—'}</TableCell>
                          <TableCell className="text-center">
                            {r.statut === 'EN_COURS' ? (
                              <Badge className="text-[9px] bg-amber-100 text-amber-800 border-0">En cours</Badge>
                            ) : r.statut === 'TRAITE' ? (
                              <Badge className="text-[9px] bg-[#E1F5EE] text-[#085041] border-0">Traité</Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[9px]">{r.statut}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(r.createdAt).toLocaleDateString('fr-FR')}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Destructions Tab */}
        <TabsContent value="destructions" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Lot</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead>Motif</TableHead>
                      <TableHead>Date destruction</TableHead>
                      <TableHead>Pharmacien</TableHead>
                      <TableHead>Témoin</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDestructions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          Aucune destruction trouvée
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDestructions.map(d => (
                        <TableRow key={d.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{d.medicament.nomCommercial}</span>
                              <span className="text-[10px] text-muted-foreground">{d.medicament.dci}</span>
                              {d.medicament.estStupefiant && (
                                <Badge className="text-[8px] bg-purple-500 text-white border-0 w-fit mt-0.5">Stupéfiant</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{d.lot.numeroLot}</TableCell>
                          <TableCell className="text-center font-semibold text-sm">{d.quantite}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{d.motif}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(d.dateDestruction).toLocaleDateString('fr-FR')}
                          </TableCell>
                          <TableCell className="text-sm">
                            {d.pharmacien.nom} {d.pharmacien.prenom}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {d.temoin ? `${d.temoin.nom} ${d.temoin.prenom}` : '—'}
                          </TableCell>
                          <TableCell className="text-center">{getStatutDestructionBadge(d.statut)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Retour Dialog */}
      <Dialog open={addRetourDialogOpen} onOpenChange={setAddRetourDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau retour</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type de retour *</Label>
                <Select value={retType} onValueChange={setRetType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERIME">Périmé</SelectItem>
                    <SelectItem value="ENDOMMAGE">Endommagé</SelectItem>
                    <SelectItem value="ERREUR_LIVRAISON">Erreur de livraison</SelectItem>
                    <SelectItem value="RAPPEL_LOT">Rappel de lot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantité *</Label>
                <Input type="number" placeholder="0" value={retQuantite} onChange={e => setRetQuantite(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Médicament *</Label>
              <Select value={retMedicamentId} onValueChange={setRetMedicamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un médicament" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nomCommercial} {m.estStupefiant ? '⚠️' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedRetMed?.lots && selectedRetMed.lots.length > 0 && (
              <div>
                <Label>Lot</Label>
                <Select value={retLotId} onValueChange={setRetLotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedRetMed.lots.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numeroLot} (qté: {l.quantite}, exp: {new Date(l.dateExpiration).toLocaleDateString('fr-FR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>Motif *</Label>
              <Input placeholder="Raison du retour" value={retMotif} onChange={e => setRetMotif(e.target.value)} />
            </div>
            <div>
              <Label>Fournisseur</Label>
              <Select value={retFournisseurId} onValueChange={setRetFournisseurId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un fournisseur" />
                </SelectTrigger>
                <SelectContent>
                  {fournisseurs.map(f => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.nom} ({f.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddRetour}>
              Enregistrer le retour
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Destruction Dialog */}
      <Dialog open={addDestructionDialogOpen} onOpenChange={setAddDestructionDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Planifier une destruction</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label>Médicament *</Label>
              <Select value={destMedicamentId} onValueChange={setDestMedicamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un médicament" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.nomCommercial} {m.estStupefiant ? '⚠️' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDestMed?.lots && selectedDestMed.lots.length > 0 && (
              <div>
                <Label>Lot *</Label>
                <Select value={destLotId} onValueChange={setDestLotId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDestMed.lots.map(l => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.numeroLot} (qté: {l.quantite}, exp: {new Date(l.dateExpiration).toLocaleDateString('fr-FR')})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Quantité *</Label>
                <Input type="number" placeholder="0" value={destQuantite} onChange={e => setDestQuantite(e.target.value)} />
              </div>
              <div>
                <Label>Date destruction *</Label>
                <Input type="date" value={destDate} onChange={e => setDestDate(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Motif *</Label>
              <Input placeholder="Raison de la destruction" value={destMotif} onChange={e => setDestMotif(e.target.value)} />
            </div>
            <div>
              <Label>Pharmacien responsable</Label>
              <Select value={destPharmacienId} onValueChange={setDestPharmacienId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un pharmacien" />
                </SelectTrigger>
                <SelectContent>
                  {utilisateurs.map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.prenom} {u.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Témoin</Label>
              <Select value={destTemoinId} onValueChange={setDestTemoinId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un témoin (optionnel)" />
                </SelectTrigger>
                <SelectContent>
                  {utilisateurs.filter(u => u.id !== destPharmacienId).map(u => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.prenom} {u.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full mt-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={handleAddDestruction}>
              Planifier la destruction
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
