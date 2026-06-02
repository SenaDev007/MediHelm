'use client'

import { useState, useEffect, useCallback } from 'react'
import { Lock, Search, Plus, Download, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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

interface RegistreEntry {
  id: string
  numeroPage: number
  dateEntree: string
  dateSortie: string | null
  quantiteEntree: number
  quantiteSortie: number | null
  stockRestant: number
  patientNom: string | null
  prescripteurNom: string | null
  statut: string
  medicament: { nomCommercial: string; dci: string }
  lot: { numeroLot: string; dateExpiration: string }
  pharmacien: { nom: string; prenom: string }
  ordonnance: { prescripteurNom: string } | null
}

interface MedicamentOption {
  id: string
  nomCommercial: string
  dci: string
  lots: { id: string; numeroLot: string; dateExpiration: string; quantite: number }[]
}

export default function StupéfiantsPage() {
  const [registres, setRegistres] = useState<RegistreEntry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formType, setFormType] = useState<'ENTREE' | 'SORTIE'>('ENTREE')
  const [formMedicamentId, setFormMedicamentId] = useState('')
  const [formLotId, setFormLotId] = useState('')
  const [formQuantite, setFormQuantite] = useState('')
  const [formPatientNom, setFormPatientNom] = useState('')
  const [formPrescripteurNom, setFormPrescripteurNom] = useState('')
  const [formOrdonnanceId, setFormOrdonnanceId] = useState('')
  const [medicamentSearch, setMedicamentSearch] = useState('')
  const [medicamentOptions, setMedicamentOptions] = useState<MedicamentOption[]>([])
  const [selectedMedicament, setSelectedMedicament] = useState<MedicamentOption | null>(null)

  const fetchRegistres = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)
      const res = await fetch(`/api/stupefiants?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRegistres(data.data || [])
        setTotal(data.total || 0)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, dateFrom, dateTo])

  useEffect(() => {
    fetchRegistres()
  }, [fetchRegistres])

  const searchMedicaments = useCallback(async (query: string) => {
    if (query.length < 2) {
      setMedicamentOptions([])
      return
    }
    try {
      const res = await fetch(`/api/medicaments?search=${encodeURIComponent(query)}&stup=true&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setMedicamentOptions(data.data || data.medicaments || [])
      }
    } catch {
      // silently fail
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchMedicaments(medicamentSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [medicamentSearch, searchMedicaments])

  const handleMedicamentSelect = (medId: string) => {
    const med = medicamentOptions.find((m) => m.id === medId)
    if (med) {
      setSelectedMedicament(med)
      setFormMedicamentId(med.id)
      setFormLotId('')
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        medicamentId: formMedicamentId,
        lotId: formLotId,
      }
      if (formType === 'ENTREE') {
        payload.quantiteEntree = parseInt(formQuantite) || 0
        payload.quantiteSortie = 0
      } else {
        payload.quantiteEntree = 0
        payload.quantiteSortie = parseInt(formQuantite) || 0
        payload.patientNom = formPatientNom
        payload.prescripteurNom = formPrescripteurNom
        if (formOrdonnanceId) payload.ordonnanceId = formOrdonnanceId
      }

      const res = await fetch('/api/stupefiants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        setDialogOpen(false)
        resetForm()
        fetchRegistres()
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormType('ENTREE')
    setFormMedicamentId('')
    setFormLotId('')
    setFormQuantite('')
    setFormPatientNom('')
    setFormPrescripteurNom('')
    setFormOrdonnanceId('')
    setMedicamentSearch('')
    setSelectedMedicament(null)
    setMedicamentOptions([])
  }

  const totalPages = Math.ceil(total / limit)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ backgroundColor: '#085041' }}>
            <Lock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#085041' }}>
              Registre des Stupéfiants
            </h1>
            <p className="text-sm text-muted-foreground">
              Suivi obligatoire des médicaments stupéfiants
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { /* placeholder export */ }}>
            <Download className="w-4 h-4" />
            Exporter
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 text-white" style={{ backgroundColor: '#1D9E75' }}>
                <Plus className="w-4 h-4" />
                Nouvelle entrée
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[525px]">
              <DialogHeader>
                <DialogTitle style={{ color: '#085041' }}>
                  <Lock className="w-4 h-4 inline mr-2" />
                  Nouvelle entrée — Registre des Stupéfiants
                </DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {/* Type */}
                <div className="grid gap-2">
                  <Label>Type de mouvement</Label>
                  <Select value={formType} onValueChange={(v: 'ENTREE' | 'SORTIE') => setFormType(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ENTREE">Entrée (réception)</SelectItem>
                      <SelectItem value="SORTIE">Sortie (dispensation)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Medicament search */}
                <div className="grid gap-2">
                  <Label>Médicament stupéfiant</Label>
                  <Input
                    placeholder="Rechercher un médicament..."
                    value={selectedMedicament ? `${selectedMedicament.nomCommercial} (${selectedMedicament.dci})` : medicamentSearch}
                    onChange={(e) => {
                      if (selectedMedicament) {
                        setSelectedMedicament(null)
                        setFormMedicamentId('')
                        setFormLotId('')
                      }
                      setMedicamentSearch(e.target.value)
                    }}
                  />
                  {medicamentOptions.length > 0 && !selectedMedicament && (
                    <div className="border rounded-md max-h-40 overflow-y-auto">
                      {medicamentOptions.map((med) => (
                        <button
                          key={med.id}
                          className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                          onClick={() => handleMedicamentSelect(med.id)}
                        >
                          <span className="font-medium">{med.nomCommercial}</span>
                          <span className="text-muted-foreground ml-2">({med.dci})</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lot selection */}
                {selectedMedicament && (selectedMedicament as Record<string, unknown>).lots && (
                  <div className="grid gap-2">
                    <Label>Lot</Label>
                    <Select value={formLotId} onValueChange={setFormLotId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un lot" />
                      </SelectTrigger>
                      <SelectContent>
                        {((selectedMedicament as Record<string, unknown>).lots as Array<{ id: string; numeroLot: string; dateExpiration: string; quantite: number }>).map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            Lot {lot.numeroLot} — Exp: {formatDate(lot.dateExpiration)} — Qté: {lot.quantite}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantité */}
                <div className="grid gap-2">
                  <Label>Quantité</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formQuantite}
                    onChange={(e) => setFormQuantite(e.target.value)}
                    placeholder={formType === 'ENTREE' ? 'Quantité reçue' : 'Quantité dispensée'}
                  />
                </div>

                {/* Sortie-specific fields */}
                {formType === 'SORTIE' && (
                  <>
                    <div className="grid gap-2">
                      <Label>Nom du patient</Label>
                      <Input
                        value={formPatientNom}
                        onChange={(e) => setFormPatientNom(e.target.value)}
                        placeholder="Nom complet du patient"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Nom du prescripteur</Label>
                      <Input
                        value={formPrescripteurNom}
                        onChange={(e) => setFormPrescripteurNom(e.target.value)}
                        placeholder="Nom du médecin prescripteur"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Ordonnance (optionnel)</Label>
                      <Input
                        value={formOrdonnanceId}
                        onChange={(e) => setFormOrdonnanceId(e.target.value)}
                        placeholder="ID ordonnance"
                      />
                    </div>
                  </>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !formMedicamentId || !formLotId || !formQuantite}
                  className="w-full text-white"
                  style={{ backgroundColor: '#1D9E75' }}
                >
                  {submitting ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Alert Banner */}
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-lg border"
        style={{ backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }}
      >
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-sm font-medium text-amber-800">
          Obligation légale — Registre obligatoire selon l&apos;arrêté DPMED du Bénin
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par médicament, DCI, patient..."
                className="pl-10"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
              />
            </div>
            <div className="flex gap-2">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value)
                  setPage(1)
                }}
                className="w-40"
                placeholder="Du"
              />
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => {
                  setDateTo(e.target.value)
                  setPage(1)
                }}
                className="w-40"
                placeholder="Au"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ backgroundColor: '#E1F5EE' }}>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>N° Page</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Date</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Médicament (DCI)</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Lot</TableHead>
                  <TableHead className="font-semibold text-center" style={{ color: '#085041' }}>Qté Entrée</TableHead>
                  <TableHead className="font-semibold text-center" style={{ color: '#085041' }}>Qté Sortie</TableHead>
                  <TableHead className="font-semibold text-center" style={{ color: '#085041' }}>Stock Restant</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Patient</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Prescripteur</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Pharmacien</TableHead>
                  <TableHead className="font-semibold" style={{ color: '#085041' }}>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Chargement...
                    </TableCell>
                  </TableRow>
                ) : registres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Aucune entrée dans le registre des stupéfiants
                    </TableCell>
                  </TableRow>
                ) : (
                  registres.map((r) => (
                    <TableRow
                      key={r.id}
                      className={r.statut === 'SORTIE' ? 'bg-red-50' : 'bg-green-50/50'}
                    >
                      <TableCell className="font-mono text-sm">{r.numeroPage}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(r.dateEntree)}
                        {r.dateSortie && (
                          <span className="text-red-600 text-xs block">
                            → {formatDate(r.dateSortie)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{r.medicament.nomCommercial}</div>
                        <div className="text-xs text-muted-foreground">{r.medicament.dci}</div>
                      </TableCell>
                      <TableCell className="text-sm font-mono">{r.lot.numeroLot}</TableCell>
                      <TableCell className="text-center">
                        {r.quantiteEntree > 0 ? (
                          <span className="font-semibold text-green-700">+{r.quantiteEntree}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {r.quantiteSortie ? (
                          <span className="font-semibold text-red-700">-{r.quantiteSortie}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-semibold">{r.stockRestant}</TableCell>
                      <TableCell className="text-sm">{r.patientNom || '—'}</TableCell>
                      <TableCell className="text-sm">{r.prescripteurNom || r.ordonnance?.prescripteurNom || '—'}</TableCell>
                      <TableCell className="text-sm">
                        {r.pharmacien.prenom} {r.pharmacien.nom}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={r.statut === 'EN_STOCK' ? 'default' : 'destructive'}
                          className={
                            r.statut === 'EN_STOCK'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : 'bg-red-100 text-red-800 hover:bg-red-100'
                          }
                        >
                          {r.statut === 'EN_STOCK' ? 'En stock' : 'Sortie'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {total} entrée{total > 1 ? 's' : ''} au total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm">
              Page {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
