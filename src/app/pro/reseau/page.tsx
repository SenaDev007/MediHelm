'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import {
  Network,
  ArrowLeftRight,
  Plus,
  Building2,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// === Types ===

interface OfficineReseau {
  id: string
  pharmacieId: string
  plan: string
  pharmacie: { id: string; nom: string; ville: string }
}

interface Reseau {
  id: string
  nom: string
  nbOfficines: number
  coefficient: number
  promoteur: { id: string; nom: string }
  officines: OfficineReseau[]
  transfertsStock: TransfertStock[]
}

interface TransfertStock {
  id: string
  reseauId: string
  pharmacieSourceId: string
  pharmacieDestId: string
  medicamentId: string
  quantite: number
  statut: string
  dateDemande: string
  dateEffectuee: string | null
  pharmacieSource: { id: string; nom: string }
  pharmacieDest: { id: string; nom: string }
  medicament: { id: string; nomCommercial: string; dci: string }
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
}

const statutTransfertConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  DEMANDE: { label: 'Demandé', color: 'bg-amber-100 text-amber-800', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Truck },
  EFFECTUE: { label: 'Effectué', color: 'bg-[#E1F5EE] text-[#085041]', icon: CheckCircle2 },
  ANNULE: { label: 'Annulé', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function ReseauPage() {
  const { pharmacie } = useAuth()
  const [reseau, setReseau] = useState<Reseau | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Create reseau dialog
  const [createReseauOpen, setCreateReseauOpen] = useState(false)
  const [reseauNom, setReseauNom] = useState('')
  const [reseauNbOfficines, setReseauNbOfficines] = useState('3')

  // Create transfer dialog
  const [addTransfertOpen, setAddTransfertOpen] = useState(false)
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [transfSourceId, setTransfSourceId] = useState('')
  const [transfDestId, setTransfDestId] = useState('')
  const [transfMedicamentId, setTransfMedicamentId] = useState('')
  const [transfQuantite, setTransfQuantite] = useState('')

  const fetchData = async () => {
    if (!pharmacie?.id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/reseaux?pharmacieId=${pharmacie.id}`)
      if (res.ok) {
        const data = await res.json()
        setReseau(data)
      }
    } catch {
      setReseau(null)
    } finally {
      setLoading(false)
    }
  }

  const fetchMedicaments = async () => {
    if (!pharmacie?.id) return
    try {
      const res = await fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`)
      if (res.ok) setMedicaments(await res.json())
    } catch { /* empty */ }
  }

  useEffect(() => {
    fetchData()
    fetchMedicaments()
  }, [pharmacie?.id])

  const handleCreateReseau = async () => {
    if (!pharmacie?.id || !reseauNom) {
      toast.error('Le nom du réseau est requis')
      return
    }
    try {
      const res = await fetch('/api/reseaux', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promoteurId: pharmacie.id,
          nom: reseauNom,
          nbOfficines: parseInt(reseauNbOfficines) || 3,
          coefficient: 1.0,
        }),
      })
      if (res.ok) {
        toast.success('Réseau créé avec succès')
        setCreateReseauOpen(false)
        setReseauNom('')
        setReseauNbOfficines('3')
        fetchData()
      } else {
        toast.error('Erreur lors de la création du réseau')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleCreateTransfert = async () => {
    if (!reseau || !transfSourceId || !transfDestId || !transfMedicamentId || !transfQuantite) {
      toast.error('Tous les champs sont requis')
      return
    }
    if (transfSourceId === transfDestId) {
      toast.error('La pharmacie source et destination doivent être différentes')
      return
    }
    try {
      const res = await fetch('/api/transferts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reseauId: reseau.id,
          pharmacieSourceId: transfSourceId,
          pharmacieDestId: transfDestId,
          medicamentId: transfMedicamentId,
          quantite: transfQuantite,
        }),
      })
      if (res.ok) {
        toast.success('Demande de transfert créée')
        setAddTransfertOpen(false)
        setTransfSourceId('')
        setTransfDestId('')
        setTransfMedicamentId('')
        setTransfQuantite('')
        fetchData()
      } else {
        toast.error('Erreur lors de la création du transfert')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  const handleUpdateStatut = async (transfertId: string, newStatut: string) => {
    try {
      const res = await fetch(`/api/transferts?id=${transfertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statut: newStatut }),
      })
      if (res.ok) {
        toast.success('Statut du transfert mis à jour')
        fetchData()
      } else {
        toast.error('Erreur lors de la mise à jour')
      }
    } catch {
      toast.error('Erreur de connexion')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  // No network yet
  if (!reseau) {
    const isNetworkPlan = pharmacie?.plan === 'NETWORK' || pharmacie?.plan === 'LEAD'
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Network className="w-6 h-6 text-[#1D9E75]" />
              Réseau
            </h1>
            <p className="text-sm text-muted-foreground">Gestion de votre réseau multi-officines</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-16 flex flex-col items-center justify-center text-center">
            <Network className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun réseau configuré</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              {isNetworkPlan
                ? 'Votre plan NETWORK vous permet de créer un réseau multi-officines pour gérer les transferts de stock entre vos pharmacies.'
                : 'La fonctionnalité Réseau est disponible à partir du plan LEAD. Upgradez votre abonnement pour y accéder.'}
            </p>
            {isNetworkPlan && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => setCreateReseauOpen(true)}>
                <Plus className="w-4 h-4" /> Créer un réseau
              </Button>
            )}
            {!isNetworkPlan && (
              <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => window.location.href = '/pro/abonnement'}>
                Voir les offres
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Create Reseau Dialog */}
        <Dialog open={createReseauOpen} onOpenChange={setCreateReseauOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#1D9E75]" />
                Créer un réseau
              </DialogTitle>
              <DialogDescription>Créez votre réseau multi-officines</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Nom du réseau *</Label>
                <Input placeholder="Mon Réseau Pharma" value={reseauNom} onChange={e => setReseauNom(e.target.value)} />
              </div>
              <div>
                <Label>Nombre d&apos;officines prévues</Label>
                <Input type="number" value={reseauNbOfficines} onChange={e => setReseauNbOfficines(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateReseauOpen(false)}>Annuler</Button>
              <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleCreateReseau} disabled={!reseauNom}>
                Créer le réseau
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // Network exists
  const officines = reseau.officines || []
  const transferts = reseau.transfertsStock || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Network className="w-6 h-6 text-[#1D9E75]" />
            {reseau.nom}
          </h1>
          <p className="text-sm text-muted-foreground">
            Promoteur: {reseau.promoteur.nom} • {officines.length} officines
          </p>
        </div>
        <Button className="gap-2 bg-[#1D9E75] hover:bg-[#085041]" onClick={() => { fetchMedicaments(); setAddTransfertOpen(true) }}>
          <Plus className="w-4 h-4" /> Nouveau transfert
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Officines</span>
                <span className="text-xl font-bold block">{officines.length}</span>
              </div>
              <Building2 className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Transferts</span>
                <span className="text-xl font-bold block">{transferts.length}</span>
              </div>
              <ArrowLeftRight className="w-8 h-8 text-blue-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">En attente</span>
                <span className="text-xl font-bold block text-amber-600">
                  {transferts.filter(t => t.statut === 'DEMANDE').length}
                </span>
              </div>
              <Clock className="w-8 h-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground uppercase">Effectués</span>
                <span className="text-xl font-bold block text-[#1D9E75]">
                  {transferts.filter(t => t.statut === 'EFFECTUE').length}
                </span>
              </div>
              <CheckCircle2 className="w-8 h-8 text-[#1D9E75]/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5">
            <Building2 className="w-3.5 h-3.5" /> Officines
          </TabsTrigger>
          <TabsTrigger value="transferts" className="gap-1.5">
            <ArrowLeftRight className="w-3.5 h-3.5" /> Transferts
          </TabsTrigger>
        </TabsList>

        {/* Officines Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#1D9E75]" />
                Liste des officines
              </CardTitle>
              <CardDescription>
                {officines.length} officine{officines.length !== 1 ? 's' : ''} dans le réseau
              </CardDescription>
            </CardHeader>
            <CardContent>
              {officines.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>Aucune officine dans le réseau</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {officines.map(o => (
                    <div key={o.id} className="p-4 bg-muted/50 rounded-lg flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1D9E75]/10 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-[#1D9E75]" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{o.pharmacie.nom}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-muted-foreground">{o.pharmacie.ville}</p>
                          <Badge variant="secondary" className="text-[8px]">{o.plan}</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transferts Tab */}
        <TabsContent value="transferts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#1D9E75]" />
                Transferts de stock
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Médicament</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Destination</TableHead>
                      <TableHead className="text-center">Quantité</TableHead>
                      <TableHead className="text-center">Statut</TableHead>
                      <TableHead>Date demande</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transferts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun transfert enregistré
                        </TableCell>
                      </TableRow>
                    ) : (
                      transferts.map(t => {
                        const config = statutTransfertConfig[t.statut] || statutTransfertConfig.DEMANDE
                        const StatutIcon = config.icon
                        return (
                          <TableRow key={t.id} className="hover:bg-muted/30">
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{t.medicament.nomCommercial}</p>
                                <p className="text-xs text-muted-foreground">{t.medicament.dci}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{t.pharmacieSource.nom}</TableCell>
                            <TableCell className="text-sm">{t.pharmacieDest.nom}</TableCell>
                            <TableCell className="text-center font-medium">{t.quantite}</TableCell>
                            <TableCell className="text-center">
                              <Badge className={`text-[9px] border-0 gap-1 ${config.color}`}>
                                <StatutIcon className="w-3 h-3" />
                                {config.label}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {new Date(t.dateDemande).toLocaleDateString('fr-FR')}
                            </TableCell>
                            <TableCell className="text-right">
                              {t.statut === 'DEMANDE' && (
                                <div className="flex gap-1 justify-end">
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleUpdateStatut(t.id, 'EN_COURS')}>
                                    <Truck className="w-3 h-3" /> Valider
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-600 hover:text-red-700" onClick={() => handleUpdateStatut(t.id, 'ANNULE')}>
                                    <XCircle className="w-3 h-3" /> Annuler
                                  </Button>
                                </div>
                              )}
                              {t.statut === 'EN_COURS' && (
                                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1" onClick={() => handleUpdateStatut(t.id, 'EFFECTUE')}>
                                  <CheckCircle2 className="w-3 h-3" /> Effectué
                                </Button>
                              )}
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
        </TabsContent>
      </Tabs>

      {/* Create Transfer Dialog */}
      <Dialog open={addTransfertOpen} onOpenChange={setAddTransfertOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#1D9E75]" />
              Nouveau transfert de stock
            </DialogTitle>
            <DialogDescription>Créer une demande de transfert entre officines</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Pharmacie source *</Label>
                <Select value={transfSourceId} onValueChange={setTransfSourceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {officines.map(o => (
                      <SelectItem key={o.pharmacie.id} value={o.pharmacie.id}>{o.pharmacie.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Pharmacie destination *</Label>
                <Select value={transfDestId} onValueChange={setTransfDestId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Destination" />
                  </SelectTrigger>
                  <SelectContent>
                    {officines.map(o => (
                      <SelectItem key={o.pharmacie.id} value={o.pharmacie.id}>{o.pharmacie.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Médicament *</Label>
              <Select value={transfMedicamentId} onValueChange={setTransfMedicamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un médicament" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {medicaments.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.nomCommercial} ({m.dci})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Quantité *</Label>
              <Input type="number" placeholder="10" value={transfQuantite} onChange={e => setTransfQuantite(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTransfertOpen(false)}>Annuler</Button>
            <Button className="bg-[#1D9E75] hover:bg-[#085041]" onClick={handleCreateTransfert} disabled={!transfSourceId || !transfDestId || !transfMedicamentId || !transfQuantite}>
              Créer le transfert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
