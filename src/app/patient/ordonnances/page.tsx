'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePatientSession } from '@/hooks/use-patient-session'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  FileText, Plus, ChevronDown, ChevronUp, Upload, MapPin,
  Pill, User, Calendar, Clock, Check, AlertCircle, Loader2,
  Camera, ImagePlus, Eye
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface LigneOrdonnance {
  id: string
  dci: string
  posologie: string | null
  quantite: number
  delivree: boolean
}

interface Ordonnance {
  id: string
  prescripteur: string
  dateOrdonnance: string
  imageUrl: string | null
  notes: string | null
  statut: string
  pharmacie: {
    id: string
    nom: string
    adresse: string
    ville: string
  }
  lignes: LigneOrdonnance[]
}

const statutLabels: Record<string, string> = {
  RECUE: 'Reçue',
  EN_VERIFICATION: 'En vérification',
  VALIDEE: 'Validée',
  PARTIELLEMENT_DELIVREE: 'Partiellement délivrée',
  DELIVREE: 'Délivrée',
  REFUSEE: 'Refusée',
}

const statutColors: Record<string, string> = {
  RECUE: 'bg-amber-50 text-amber-700',
  EN_VERIFICATION: 'bg-blue-50 text-blue-700',
  VALIDEE: 'bg-green-50 text-green-700',
  PARTIELLEMENT_DELIVREE: 'bg-orange-50 text-orange-700',
  DELIVREE: 'bg-teal-50 text-teal-800',
  REFUSEE: 'bg-red-50 text-red-700',
}

export default function OrdonnancesPage() {
  const [ordonnances, setOrdonnances] = useState<Ordonnance[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [prescripteur, setPrescripteur] = useState('')
  const [filterStatut, setFilterStatut] = useState<string | null>(null)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [imageDialogUrl, setImageDialogUrl] = useState<string | null>(null)

  const { patientId } = usePatientSession()

  const fetchOrdonnances = useCallback(async () => {
    if (!patientId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/ordonnances?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setOrdonnances(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (patientId) fetchOrdonnances()
  }, [fetchOrdonnances, patientId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Le fichier ne doit pas dépasser 10 Mo')
        return
      }
      setSelectedFile(file)
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !prescripteur.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setUploading(true)
    try {
      // In a real app, we'd upload the file to a storage service first
      // For now, we just create the prescription record
      const res = await fetch('/api/patient/ordonnances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          pharmacieId: ordonnances[0]?.pharmacie?.id || '',
          prescripteur: prescripteur.trim(),
          dateOrdonnance: new Date().toISOString(),
          imageUrl: previewUrl,
        }),
      })

      if (res.ok) {
        toast.success('Ordonnance ajoutée avec succès')
        setUploadDialogOpen(false)
        setSelectedFile(null)
        setPreviewUrl(null)
        setPrescripteur('')
        fetchOrdonnances()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Erreur lors de l\'ajout')
      }
    } catch {
      toast.error('Erreur de connexion')
    } finally {
      setUploading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filteredOrdonnances = ordonnances.filter((o) => {
    if (!filterStatut) return true
    return o.statut === filterStatut
  })

  const statuts = [...new Set(ordonnances.map(o => o.statut))]

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Ordonnances
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {ordonnances.length} ordonnance{ordonnances.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-9 bg-primary hover:bg-teal-700">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-teal-800">Nouvelle ordonnance</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              {/* File upload */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Photo de l&apos;ordonnance</Label>
                <div className="border-2 border-dashed border-teal-200 rounded-xl p-4 text-center hover:border-primary transition-colors">
                  {previewUrl ? (
                    <div className="space-y-2">
                      <img
                        src={previewUrl}
                        alt="Aperçu"
                        className="max-h-40 mx-auto rounded-lg object-contain"
                      />
                      <p className="text-[10px] text-muted-foreground">{selectedFile?.name}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreviewUrl(null)
                        }}
                      >
                        Supprimer
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <ImagePlus className="h-8 w-8 text-teal-300 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Cliquer pour sélectionner</p>
                      <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG — Max 10 Mo</p>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileSelect}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Prescripteur */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Médecin prescripteur *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Dr. Adjovi"
                    value={prescripteur}
                    onChange={(e) => setPrescripteur(e.target.value)}
                    className="pl-10 h-10 border-teal-200"
                  />
                </div>
              </div>

              {/* Upload button */}
              <Button
                className="w-full h-10 bg-primary hover:bg-teal-700"
                onClick={handleUpload}
                disabled={uploading || !selectedFile || !prescripteur.trim()}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Enregistrer l&apos;ordonnance
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter */}
      {statuts.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          <Badge
            variant={filterStatut === null ? 'default' : 'secondary'}
            className={`cursor-pointer text-[11px] ${
              filterStatut === null
                ? 'bg-primary text-white border-0'
                : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
            }`}
            onClick={() => setFilterStatut(null)}
          >
            Toutes
          </Badge>
          {statuts.map((s) => (
            <Badge
              key={s}
              variant={filterStatut === s ? 'default' : 'secondary'}
              className={`cursor-pointer text-[11px] ${
                filterStatut === s
                  ? 'bg-primary text-white border-0'
                  : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
              }`}
              onClick={() => setFilterStatut(s)}
            >
              {statutLabels[s] || s}
            </Badge>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-teal-200">
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Prescriptions list */}
      {!loading && filteredOrdonnances.length > 0 && (
        <div className="space-y-3">
          {filteredOrdonnances.map((ordonnance) => {
            const isExpanded = expandedId === ordonnance.id
            const lignesDelivrees = ordonnance.lignes.filter(l => l.delivree).length
            const totalLignes = ordonnance.lignes.length

            return (
              <motion.div
                key={ordonnance.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-teal-200">
                  <CardContent className="p-4">
                    {/* Header row */}
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : ordonnance.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-gray-900 text-sm">
                            Ordonnance du {formatDate(ordonnance.dateOrdonnance)}
                          </h3>
                        </div>
                        <div className="ml-6 mt-1.5 space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {ordonnance.prescripteur}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {ordonnance.pharmacie.nom}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge className={`text-[10px] border-0 ${statutColors[ordonnance.statut] || 'bg-gray-50 text-gray-700'}`}>
                          {statutLabels[ordonnance.statut] || ordonnance.statut}
                        </Badge>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Progress bar */}
                    {totalLignes > 0 && (
                      <div className="mt-3 ml-6">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Délivrée</span>
                          <span>{lignesDelivrees}/{totalLignes}</span>
                        </div>
                        <div className="h-1.5 bg-teal-50 rounded-full">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${(lignesDelivrees / totalLignes) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 border-t border-teal-100 space-y-3">
                            {/* Lignes */}
                            {ordonnance.lignes.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 mb-2 flex items-center gap-1">
                                  <Pill className="h-3 w-3" />
                                  Médicaments prescrits
                                </p>
                                <div className="space-y-2">
                                  {ordonnance.lignes.map((ligne) => (
                                    <div
                                      key={ligne.id}
                                      className={`flex items-center justify-between p-2 rounded-lg ${
                                        ligne.delivree ? 'bg-green-50' : 'bg-teal-50'
                                      }`}
                                    >
                                      <div className="flex-1">
                                        <p className={`text-xs font-medium ${ligne.delivree ? 'text-green-700' : 'text-gray-900'}`}>
                                          {ligne.dci}
                                        </p>
                                        {ligne.posologie && (
                                          <p className="text-[10px] text-muted-foreground">{ligne.posologie}</p>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-muted-foreground">x{ligne.quantite}</span>
                                        {ligne.delivree ? (
                                          <Check className="h-3 w-3 text-green-500" />
                                        ) : (
                                          <Clock className="h-3 w-3 text-amber-500" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Notes */}
                            {ordonnance.notes && (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 mb-1">Notes</p>
                                <p className="text-xs text-muted-foreground">{ordonnance.notes}</p>
                              </div>
                            )}

                            {/* Image preview */}
                            {ordonnance.imageUrl && (
                              <div>
                                <p className="text-xs font-semibold text-gray-900 mb-1">Image</p>
                                <button
                                  onClick={() => {
                                    setImageDialogUrl(ordonnance.imageUrl)
                                    setImageDialogOpen(true)
                                  }}
                                  className="block"
                                >
                                  <img
                                    src={ordonnance.imageUrl}
                                    alt="Ordonnance"
                                    className="h-24 rounded-lg object-cover border border-teal-200"
                                  />
                                </button>
                              </div>
                            )}

                            {/* Pharmacy info */}
                            <div className="flex items-center justify-between">
                              <div className="text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 inline mr-1" />
                                {ordonnance.pharmacie.adresse}, {ordonnance.pharmacie.ville}
                              </div>
                              <Link href={`/patient/pharmacies`}>
                                <Button variant="outline" size="sm" className="h-7 text-[10px] border-primary text-primary">
                                  Voir pharmacie
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredOrdonnances.length === 0 && (
        <div className="text-center py-8">
          <FileText className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">Aucune ordonnance</p>
          <p className="text-xs text-muted-foreground mt-1">
            Ajoutez une ordonnance pour suivre vos prescriptions
          </p>
          <Button
            size="sm"
            className="mt-3 h-8 text-xs bg-primary hover:bg-teal-700"
            onClick={() => setUploadDialogOpen(true)}
          >
            <Plus className="h-3 w-3 mr-1" />
            Ajouter une ordonnance
          </Button>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-teal-800">Aperçu de l&apos;ordonnance</DialogTitle>
          </DialogHeader>
          {imageDialogUrl && (
            <img
              src={imageDialogUrl}
              alt="Ordonnance"
              className="w-full rounded-lg object-contain max-h-[60vh]"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
