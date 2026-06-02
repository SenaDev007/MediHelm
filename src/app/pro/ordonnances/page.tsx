'use client'

import { useAuth } from '@/app/pro/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import {
  FileText, Search, CheckCircle2, Clock, AlertCircle, Eye,
  Plus, Upload, XCircle, ShoppingCart, AlertTriangle
} from 'lucide-react'
import { useEffect, useState, useMemo } from 'react'
import { toast } from 'sonner'

interface Ordonnance {
  id: string
  prescripteurNom: string
  prescripteurInami: string | null
  dateOrdonnance: string
  dateReception: string
  statut: string
  estStupefiant: boolean
  numeroRegistre: string | null
  imageOrdonnanceUrl: string | null
  patient: { id: string; nom: string; prenom: string } | null
  lignes: {
    id: string
    medicamentId: string
    posologie: string
    duree: string
    quantite: number
    delivree: boolean
    medicament: { id: string; nomCommercial: string; dci: string; prixVente: number; estStupefiant: boolean }
  }[]
  validations: {
    id: string
    typeValidation: string
    commentaire: string | null
    createdAt: string
  }[]
}

interface Patient {
  id: string
  nom: string
  prenom: string
}

interface Medicament {
  id: string
  nomCommercial: string
  dci: string
  prixVente: number
  estStupefiant: boolean
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatFCFA(amount: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' FCFA'
}

const statutConfig: Record<string, { label: string; color: string }> = {
  RECUE: { label: 'Reçue', color: 'bg-blue-500 text-white' },
  EN_COURS_VALIDATION: { label: 'En validation', color: 'bg-amber-400 text-gray-900' },
  VALIDEE: { label: 'Validée', color: 'bg-primary text-white' },
  PARTIELLEMENT_DELIVREE: { label: 'Partielle', color: 'bg-orange-500 text-white' },
  DELIVREE: { label: 'Délivrée', color: 'bg-green-600 text-white' },
  REFUSEE: { label: 'Refusée', color: 'bg-destructive text-white' },
}

export default function OrdonnancesPage() {
  const { pharmacie } = useAuth()
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([])
  const [patients, setPatients] = useState<Patient[]>([])
  const [medicaments, setMedicaments] = useState<Medicament[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Ordonnance | null>(null)
  const [activeTab, setActiveTab] = useState('ordonnances')

  // Create ordonnance dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [formPatientId, setFormPatientId] = useState('')
  const [formPrescripteur, setFormPrescripteur] = useState('')
  const [formPrescripteurInami, setFormPrescripteurInami] = useState('')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])
  const [formLignes, setFormLignes] = useState<Array<{ medicamentId: string; posologie: string; duree: string; quantite: string }>>([])

  // Validation dialog
  const [validateDialogOpen, setValidateDialogOpen] = useState(false)
  const [validateType, setValidateType] = useState<'VALIDATION' | 'REFUS'>('VALIDATION')
  const [validateCommentaire, setValidateCommentaire] = useState('')

  // Upload image
  const [uploadingImage, setUploadingImage] = useState(false)

  // Create sale from ordonnance
  const [createSaleOpen, setCreateSaleOpen] = useState(false)

  const refreshOrdonnances = async () => {
    if (!pharmacie?.id) return
    const res = await fetch(`/api/ordonnances?pharmacieId=${pharmacie.id}`)
    if (res.ok) setOrdonnances(await res.json())
  }

  useEffect(() => {
    if (pharmacie?.id) {
      setLoading(true)
      Promise.all([
        fetch(`/api/ordonnances?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/patients?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/medicaments?pharmacieId=${pharmacie.id}`).then(r => r.ok ? r.json() : []),
      ]).then(([ordos, pats, meds]) => {
        setOrdonnances(ordos)
        setPatients(pats)
        setMedicaments(meds)
      }).catch(() => {}).finally(() => setLoading(false))
    }
  }, [pharmacie?.id])

  const filtered = useMemo(() => {
    if (!search) return ordonnances
    const q = search.toLowerCase()
    return ordonnances.filter(o =>
      o.prescripteurNom.toLowerCase().includes(q) ||
      (o.patient && `${o.patient.nom} ${o.patient.prenom}`.toLowerCase().includes(q)) ||
      o.numeroRegistre?.includes(q)
    )
  }, [ordonnances, search])

  // Stupéfiant ordonnances
  const ordoStupfiants = useMemo(() => ordonnances.filter(o => o.estStupefiant), [ordonnances])

  // Create ordonnance
  const handleCreateOrdonnance = async () => {
    if (!pharmacie?.id || !formPrescripteur) return
    try {
      const lignes = formLignes.filter(l => l.medicamentId).map(l => ({
        medicamentId: l.medicamentId,
        posologie: l.posologie,
        duree: l.duree,
        quantite: parseInt(l.quantite) || 1,
      }))

      const hasStupfiant = lignes.some(l => {
        const med = medicaments.find(m => m.id === l.medicamentId)
        return med?.estStupefiant
      })

      const res = await fetch('/api/ordonnances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          patientId: formPatientId || null,
          prescripteurNom: formPrescripteur,
          prescripteurInami: formPrescripteurInami || null,
          dateOrdonnance: formDate,
          dateReception: new Date().toISOString(),
          statut: 'RECUE',
          estStupefiant: hasStupfiant,
          lignes,
        }),
      })

      if (res.ok) {
        toast.success('Ordonnance créée')
        setCreateOpen(false)
        setFormPatientId('')
        setFormPrescripteur('')
        setFormPrescripteurInami('')
        setFormDate(new Date().toISOString().split('T')[0])
        setFormLignes([])
        refreshOrdonnances()
      } else {
        toast.error("Erreur lors de la création")
      }
    } catch {
      toast.error("Erreur lors de la création")
    }
  }

  // Validate/Refuse
  const handleValidate = async () => {
    if (!selected) return
    try {
      const res = await fetch(`/api/ordonnances/${selected.id}/valider`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeValidation: validateType,
          commentaire: validateCommentaire || null,
          utilisateurId: 'demo-admin',
        }),
      })
      if (res.ok) {
        toast.success(validateType === 'VALIDATION' ? 'Ordonnance validée' : 'Ordonnance refusée')
        setValidateDialogOpen(false)
        setValidateCommentaire('')
        refreshOrdonnances()
        // Update selected
        setSelected(null)
      }
    } catch {
      toast.error('Erreur lors de la validation')
    }
  }

  // Toggle line delivered
  const handleToggleDelivered = async (ligneId: string, currentDelivree: boolean) => {
    try {
      const res = await fetch(`/api/ordonnances/lignes/${ligneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivree: !currentDelivree }),
      })
      if (res.ok) {
        toast.success(!currentDelivree ? 'Ligne marquée comme délivrée' : 'Ligne marquée comme non délivrée')
        refreshOrdonnances()
      }
    } catch {
      // Fallback: update locally
      if (selected) {
        const updatedLignes = selected.lignes.map(l =>
          l.id === ligneId ? { ...l, delivree: !currentDelivree } : l
        )
        setSelected({ ...selected, lignes: updatedLignes })
      }
    }
  }

  // Upload image
  const handleUploadImage = async (ordoId: string, file: File) => {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const res = await fetch(`/api/ordonnances/${ordoId}/image`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        toast.success('Image téléchargée')
        refreshOrdonnances()
      }
    } catch {
      toast.error("Erreur lors du téléchargement")
    } finally {
      setUploadingImage(false)
    }
  }

  // Create sale from ordonnance
  const handleCreateSale = async () => {
    if (!selected || !pharmacie?.id) return
    try {
      const lignes = selected.lignes
        .filter(l => !l.delivree)
        .map(l => ({
          medicamentId: l.medicamentId,
          quantite: l.quantite,
          prixUnitaire: l.medicament.prixVente,
          montant: l.medicament.prixVente * l.quantite,
        }))

      if (lignes.length === 0) {
        toast.error('Toutes les lignes sont déjà délivrées')
        return
      }

      const montantTotal = lignes.reduce((s, l) => s + l.montant, 0)

      const res = await fetch('/api/ventes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacieId: pharmacie.id,
          utilisateurId: 'demo-admin',
          patientId: selected.patient?.id || null,
          ordonnanceId: selected.id,
          typeVente: 'ORDONNANCE',
          statut: 'VALIDEE',
          montantTotal,
          montantPaye: montantTotal,
          monnaieRendue: 0,
          lignes,
          paiements: [{ modePaiement: 'ESPECES', montant: montantTotal }],
        }),
      })

      if (res.ok) {
        toast.success('Vente créée à partir de l\'ordonnance')
        setCreateSaleOpen(false)
        refreshOrdonnances()
      }
    } catch {
      toast.error('Erreur lors de la création de la vente')
    }
  }

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary" />
            Ordonnances
          </h1>
          <p className="text-sm text-muted-foreground">{ordonnances.length} ordonnances</p>
        </div>
        <Button className="gap-2" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /> Nouvelle ordonnance
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="ordonnances">Ordonnances</TabsTrigger>
          <TabsTrigger value="registre" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            Registre stupéfiants ({ordoStupfiants.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ordonnances" className="space-y-4 mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Rechercher par prescripteur, patient..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="space-y-3">
            {filtered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune ordonnance trouvée</CardContent></Card>
            ) : (
              filtered.map(ordo => {
                const config = statutConfig[ordo.statut] || statutConfig.RECUE
                const delivreCount = ordo.lignes.filter(l => l.delivree).length

                return (
                  <Card key={ordo.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelected(ordo)}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">Dr. {ordo.prescripteurNom}</span>
                              <Badge className={`text-[9px] ${config.color}`}>{config.label}</Badge>
                              {ordo.estStupefiant && <Badge variant="destructive" className="text-[9px]">Stupéfiant</Badge>}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {ordo.patient ? `${ordo.patient.prenom} ${ordo.patient.nom} • ` : ''}
                              {formatDate(ordo.dateOrdonnance)}
                              {ordo.numeroRegistre && ` • Registre: ${ordo.numeroRegistre}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <div className="text-center">
                            <span className="text-xs text-muted-foreground block">Lignes</span>
                            <span className="font-semibold">{delivreCount}/{ordo.lignes.length}</span>
                          </div>
                          <Button variant="ghost" size="sm" className="gap-1">
                            <Eye className="w-3 h-3" /> Voir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="registre" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Registre des stupéfiants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ordoStupfiants.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground text-sm">Aucune ordonnance stupéfiant</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">N° Registre</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Date</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Prescripteur</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Patient</th>
                        <th className="text-left p-2 text-xs font-medium text-muted-foreground">Médicament</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Qté entrée</th>
                        <th className="text-right p-2 text-xs font-medium text-muted-foreground">Qté sortie</th>
                        <th className="text-center p-2 text-xs font-medium text-muted-foreground">Statut</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ordoStupfiants.map(ordo => (
                        ordo.lignes.map((ligne, i) => (
                          <tr key={`${ordo.id}-${ligne.id}`} className="border-b last:border-0 hover:bg-muted/30">
                            {i === 0 && (
                              <>
                                <td rowSpan={ordo.lignes.length} className="p-2 text-sm align-top">{ordo.numeroRegistre || '—'}</td>
                                <td rowSpan={ordo.lignes.length} className="p-2 text-sm align-top">{formatDate(ordo.dateOrdonnance)}</td>
                                <td rowSpan={ordo.lignes.length} className="p-2 text-sm align-top">Dr. {ordo.prescripteurNom}</td>
                                <td rowSpan={ordo.lignes.length} className="p-2 text-sm align-top">
                                  {ordo.patient ? `${ordo.patient.prenom} ${ordo.patient.nom}` : '—'}
                                </td>
                              </>
                            )}
                            <td className="p-2 text-sm">{ligne.medicament.nomCommercial}</td>
                            <td className="p-2 text-sm text-right">0</td>
                            <td className="p-2 text-sm text-right">{ligne.delivree ? ligne.quantite : 0}</td>
                            {i === 0 && (
                              <td rowSpan={ordo.lignes.length} className="p-2 text-center align-top">
                                <Badge className={`text-[9px] ${statutConfig[ordo.statut]?.color}`}>{statutConfig[ordo.statut]?.label}</Badge>
                              </td>
                            )}
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Dialog */}
      <Dialog open={!!selected && !validateDialogOpen && !createSaleOpen} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>Ordonnance — Dr. {selected.prescripteurNom}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Patient</span><p className="font-medium">{selected.patient ? `${selected.patient.prenom} ${selected.patient.nom}` : '—'}</p></div>
                    <div><span className="text-muted-foreground">Date</span><p className="font-medium">{formatDate(selected.dateOrdonnance)}</p></div>
                    <div><span className="text-muted-foreground">Statut</span><p><Badge className={statutConfig[selected.statut]?.color}>{statutConfig[selected.statut]?.label}</Badge></p></div>
                    <div><span className="text-muted-foreground">Registre</span><p className="font-medium">{selected.numeroRegistre || '—'}</p></div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <Label className="text-sm font-semibold">Image ordonnance</Label>
                    <div className="flex items-center gap-2 mt-1">
                      {selected.imageOrdonnanceUrl ? (
                        <Badge variant="outline" className="text-xs gap-1">
                          <FileText className="w-3 h-3" /> Image attachée
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">Aucune image</span>
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) handleUploadImage(selected.id, file)
                          }}
                        />
                        <Button variant="outline" size="sm" className="gap-1" disabled={uploadingImage} asChild>
                          <span>
                            <Upload className="w-3 h-3" />
                            {uploadingImage ? 'Chargement...' : 'Télécharger'}
                          </span>
                        </Button>
                      </label>
                    </div>
                  </div>

                  {/* Lignes */}
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Médicaments prescrits</h4>
                    {selected.lignes.map(l => (
                      <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0 text-sm">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={l.delivree}
                              onCheckedChange={() => handleToggleDelivered(l.id, l.delivree)}
                            />
                            <span className={l.delivree ? 'line-through text-muted-foreground' : 'font-medium'}>{l.medicament.nomCommercial}</span>
                            {l.medicament.estStupefiant && <AlertTriangle className="w-3 h-3 text-destructive" />}
                          </div>
                          <span className="text-xs text-muted-foreground ml-6">{l.posologie} — {l.duree}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs">×{l.quantite}</span>
                          {l.delivree ? <CheckCircle2 className="w-4 h-4 text-primary" /> : <Clock className="w-4 h-4 text-amber-500" />}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Validations */}
                  {selected.validations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">Validations</h4>
                      {selected.validations.map(v => (
                        <div key={v.id} className="flex items-center gap-2 py-1 text-sm">
                          {v.typeValidation === 'VALIDATION' ? (
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          ) : (
                            <XCircle className="w-4 h-4 text-destructive" />
                          )}
                          <span>{v.typeValidation === 'VALIDATION' ? 'Validée' : 'Refusée'}</span>
                          <span className="text-xs text-muted-foreground">{formatDate(v.createdAt)}</span>
                          {v.commentaire && <span className="text-xs text-muted-foreground">— {v.commentaire}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action buttons */}
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {(selected.statut === 'RECUE' || selected.statut === 'EN_COURS_VALIDATION') && (
                      <>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setValidateType('VALIDATION')
                            setValidateDialogOpen(true)
                          }}
                        >
                          <CheckCircle2 className="w-4 h-4" /> Valider
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          onClick={() => {
                            setValidateType('REFUS')
                            setValidateDialogOpen(true)
                          }}
                        >
                          <XCircle className="w-4 h-4" /> Refuser
                        </Button>
                      </>
                    )}
                    {(selected.statut === 'VALIDEE' || selected.statut === 'PARTIELLEMENT_DELIVREE') && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => setCreateSaleOpen(true)}
                      >
                        <ShoppingCart className="w-4 h-4" /> Créer une vente
                      </Button>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ordonnance Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouvelle ordonnance</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Patient</Label>
                <Select value={formPatientId} onValueChange={setFormPatientId}>
                  <SelectTrigger><SelectValue placeholder="Sélectionner un patient" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun patient</SelectItem>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.prenom} {p.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prescripteur</Label>
                <Input placeholder="Dr. Nom" value={formPrescripteur} onChange={e => setFormPrescripteur(e.target.value)} />
              </div>
              <div>
                <Label>N° INAMI / Ordre</Label>
                <Input placeholder="Numéro" value={formPrescripteurInami} onChange={e => setFormPrescripteurInami(e.target.value)} />
              </div>
            </div>

            {/* Lignes */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="font-semibold">Lignes d&apos;ordonnance</Label>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setFormLignes(prev => [...prev, { medicamentId: '', posologie: '', duree: '', quantite: '1' }])}>
                  <Plus className="w-3 h-3" /> Ajouter
                </Button>
              </div>
              <ScrollArea className="max-h-64">
                <div className="space-y-2">
                  {formLignes.map((ligne, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        {i === 0 && <Label className="text-[10px]">Médicament</Label>}
                        <Select value={ligne.medicamentId} onValueChange={v => {
                          const updated = [...formLignes]
                          updated[i] = { ...updated[i], medicamentId: v }
                          setFormLignes(updated)
                        }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Choisir" /></SelectTrigger>
                          <SelectContent>
                            {medicaments.map(m => (
                              <SelectItem key={m.id} value={m.id}>
                                {m.nomCommercial} {m.estStupefiant && '⚠'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-3">
                        {i === 0 && <Label className="text-[10px]">Posologie</Label>}
                        <Input className="h-8 text-xs" placeholder="1 cp/jour" value={ligne.posologie} onChange={e => {
                          const updated = [...formLignes]
                          updated[i] = { ...updated[i], posologie: e.target.value }
                          setFormLignes(updated)
                        }} />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <Label className="text-[10px]">Durée</Label>}
                        <Input className="h-8 text-xs" placeholder="7j" value={ligne.duree} onChange={e => {
                          const updated = [...formLignes]
                          updated[i] = { ...updated[i], duree: e.target.value }
                          setFormLignes(updated)
                        }} />
                      </div>
                      <div className="col-span-2">
                        {i === 0 && <Label className="text-[10px]">Qté</Label>}
                        <Input type="number" className="h-8 text-xs" value={ligne.quantite} onChange={e => {
                          const updated = [...formLignes]
                          updated[i] = { ...updated[i], quantite: e.target.value }
                          setFormLignes(updated)
                        }} />
                      </div>
                      <div className="col-span-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFormLignes(prev => prev.filter((_, j) => j !== i))}>
                          <XCircle className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Button className="w-full" onClick={handleCreateOrdonnance}>Créer l&apos;ordonnance</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Validate/Refuse Dialog */}
      <Dialog open={validateDialogOpen} onOpenChange={setValidateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={validateType === 'VALIDATION' ? 'text-primary' : 'text-destructive'}>
              {validateType === 'VALIDATION' ? 'Valider l\'ordonnance' : 'Refuser l\'ordonnance'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Commentaire</Label>
              <Textarea
                placeholder={validateType === 'REFUS' ? 'Motif du refus...' : 'Commentaire (optionnel)...'}
                value={validateCommentaire}
                onChange={e => setValidateCommentaire(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setValidateDialogOpen(false)}>Annuler</Button>
              <Button
                className="flex-1"
                variant={validateType === 'REFUS' ? 'destructive' : 'default'}
                onClick={handleValidate}
              >
                {validateType === 'VALIDATION' ? 'Confirmer la validation' : 'Confirmer le refus'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Sale Dialog */}
      <Dialog open={createSaleOpen} onOpenChange={setCreateSaleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Créer une vente
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Créer une vente à partir des lignes non délivrées de cette ordonnance.
              </p>
              <div className="space-y-2">
                {selected.lignes.filter(l => !l.delivree).map(l => (
                  <div key={l.id} className="flex justify-between text-sm p-2 rounded bg-muted/30">
                    <span>{l.medicament.nomCommercial} × {l.quantite}</span>
                    <span className="font-semibold">{formatFCFA(l.medicament.prixVente * l.quantite)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between font-semibold text-sm p-3 rounded-lg bg-primary/5">
                <span>Total</span>
                <span className="text-primary">
                  {formatFCFA(selected.lignes.filter(l => !l.delivree).reduce((s, l) => s + l.medicament.prixVente * l.quantite, 0))}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setCreateSaleOpen(false)}>Annuler</Button>
                <Button className="flex-1" onClick={handleCreateSale}>Créer la vente</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
