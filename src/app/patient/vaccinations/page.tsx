'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Syringe, Plus, Calendar, Clock, QrCode, Share2, AlertCircle, Loader2, Download, CheckCircle2, Clock3, XCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

interface VaccinationRecord {
  id: string
  vaccin: string
  numeroLot: string
  dateVaccination: string
  centreSante: string
  dateRappel: string | null
  profilFamille?: { nom: string; prenom: string } | null
  profilNom?: string
}

type VaccinationStatus = 'completed' | 'scheduled' | 'overdue'

function getVaccinationStatus(v: VaccinationRecord): VaccinationStatus {
  if (!v.dateRappel) return 'completed'
  const rappelDate = new Date(v.dateRappel)
  const now = new Date()
  if (rappelDate < now) return 'overdue'
  return 'scheduled'
}

const statusConfig: Record<VaccinationStatus, { label: string; color: string; icon: React.ElementType }> = {
  completed: { label: 'Complétée', color: 'bg-green-50 text-green-700 border-green-200', icon: CheckCircle2 },
  scheduled: { label: 'Rappel prévu', color: 'bg-blue-50 text-blue-700 border-blue-200', icon: Clock3 },
  overdue: { label: 'Rappel en retard', color: 'bg-red-50 text-red-700 border-red-200', icon: XCircle },
}

export default function VaccinationsPage() {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatus, setFilterStatus] = useState<VaccinationStatus | 'all'>('all')
  const [newVaccination, setNewVaccination] = useState({
    vaccin: '',
    numeroLot: '',
    dateVaccination: '',
    centreSante: '',
    dateRappel: '',
  })

  // QR Dialog
  const [showQRDialog, setShowQRDialog] = useState(false)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  // Per-vaccination QR expand
  const [expandedQRId, setExpandedQRId] = useState<string | null>(null)

  const fetchVaccinations = useCallback(async () => {
    try {
      const res = await fetch('/api/patient/vaccinations')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data) && data.length > 0) {
          setVaccinations(data.map((v: VaccinationRecord & { profilFamille?: { nom: string; prenom: string } | null }) => ({
            ...v,
            dateRappel: v.dateRappel || null,
            profilNom: v.profilFamille ? `${v.profilFamille.prenom} ${v.profilFamille.nom}` : undefined,
          })))
          setLoading(false)
          return
        }
      }
    } catch {
      // fallback
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchVaccinations()
  }, [fetchVaccinations])

  const handleAddVaccination = async () => {
    if (!newVaccination.vaccin || !newVaccination.dateVaccination || !newVaccination.centreSante) {
      toast.error('Veuillez remplir les champs obligatoires')
      return
    }
    setSaving(true)
    try {
      const comptesRes = await fetch('/api/patient/comptes')
      let comptePatientId = ''
      if (comptesRes.ok) {
        const comptes = await comptesRes.json()
        if (Array.isArray(comptes) && comptes.length > 0) {
          comptePatientId = comptes[0].id
        }
      }

      const res = await fetch('/api/patient/vaccinations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comptePatientId,
          vaccin: newVaccination.vaccin,
          numeroLot: newVaccination.numeroLot || 'N/A',
          dateVaccination: newVaccination.dateVaccination,
          centreSante: newVaccination.centreSante,
          dateRappel: newVaccination.dateRappel || null,
        }),
      })

      if (res.ok) {
        const created = await res.json()
        setVaccinations([{
          ...created,
          dateRappel: created.dateRappel || null,
        }, ...vaccinations])
        toast.success('Vaccination enregistrée')
      } else {
        toast.error('Erreur lors de l\'enregistrement')
      }
    } catch {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setSaving(false)
      setShowAddDialog(false)
      setNewVaccination({ vaccin: '', numeroLot: '', dateVaccination: '', centreSante: '', dateRappel: '' })
    }
  }

  // Fetch QR from API
  const handleFetchQR = async () => {
    setQrLoading(true)
    try {
      const comptesRes = await fetch('/api/patient/comptes')
      if (comptesRes.ok) {
        const comptes = await comptesRes.json()
        if (Array.isArray(comptes) && comptes.length > 0) {
          const qrRes = await fetch(`/api/patient/vaccination-qr?comptePatientId=${comptes[0].id}`)
          if (qrRes.ok) {
            const qrData = await qrRes.json()
            setQrDataUrl(qrData.qr)
            setShowQRDialog(true)
          } else {
            toast.error('Erreur lors de la génération du QR code')
          }
        }
      }
    } catch {
      toast.error('Erreur lors de la génération du QR code')
    } finally {
      setQrLoading(false)
    }
  }

  const upcomingBoosters = vaccinations
    .filter(v => v.dateRappel && new Date(v.dateRappel) > new Date())
    .map(v => ({
      vaccin: v.vaccin,
      dateRappel: v.dateRappel!,
      daysLeft: Math.ceil((new Date(v.dateRappel!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const filteredVaccinations = filterStatus === 'all'
    ? vaccinations
    : vaccinations.filter(v => getVaccinationStatus(v) === filterStatus)

  const statusCounts = {
    completed: vaccinations.filter(v => getVaccinationStatus(v) === 'completed').length,
    scheduled: vaccinations.filter(v => getVaccinationStatus(v) === 'scheduled').length,
    overdue: vaccinations.filter(v => getVaccinationStatus(v) === 'overdue').length,
  }

  const getVaccinationQRUrl = (v: VaccinationRecord) => {
    const data = encodeURIComponent(`MédiHelm Vaccination|${v.vaccin}|Lot:${v.numeroLot}|${new Date(v.dateVaccination).toISOString().split('T')[0]}|${v.centreSante}`)
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data}`
  }

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <Syringe className="h-5 w-5 text-primary" />
          Carnet de vaccination
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-primary text-primary"
            onClick={handleFetchQR}
            disabled={qrLoading}
          >
            {qrLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <QrCode className="h-3 w-3 mr-1" />}
            Vaccination QR
          </Button>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8 text-xs bg-primary hover:bg-teal-700">
                <Plus className="h-3 w-3 mr-1" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajouter une vaccination</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Vaccin *</Label>
                  <Input value={newVaccination.vaccin} onChange={(e) => setNewVaccination({ ...newVaccination, vaccin: e.target.value })} placeholder="Nom du vaccin" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">N° de lot</Label>
                  <Input value={newVaccination.numeroLot} onChange={(e) => setNewVaccination({ ...newVaccination, numeroLot: e.target.value })} placeholder="Numéro de lot" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Date de vaccination *</Label>
                  <Input type="date" value={newVaccination.dateVaccination} onChange={(e) => setNewVaccination({ ...newVaccination, dateVaccination: e.target.value })} className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Centre de santé *</Label>
                  <Input value={newVaccination.centreSante} onChange={(e) => setNewVaccination({ ...newVaccination, centreSante: e.target.value })} placeholder="Centre de vaccination" className="h-9 text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Date de rappel (optionnel)</Label>
                  <Input type="date" value={newVaccination.dateRappel} onChange={(e) => setNewVaccination({ ...newVaccination, dateRappel: e.target.value })} className="h-9 text-sm" />
                </div>
                <Button className="w-full bg-primary hover:bg-teal-700" onClick={handleAddVaccination} disabled={saving}>
                  {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Enregistrement...</> : 'Enregistrer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-2">
        {([['completed', 'Complétées'], ['scheduled', 'Planifiées'], ['overdue', 'En retard']] as const).map(([status, label]) => {
          const config = statusConfig[status]
          const count = statusCounts[status]
          return (
            <Card
              key={status}
              className={`cursor-pointer transition-all ${filterStatus === status ? 'ring-2 ring-primary' : ''} ${config.color} border`}
              onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
            >
              <CardContent className="p-3 text-center">
                <config.icon className="h-4 w-4 mx-auto mb-1" />
                <p className="text-xs font-semibold">{count}</p>
                <p className="text-[9px]">{label}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Upcoming Boosters */}
      {upcomingBoosters.length > 0 && (
        <Card className="border-amber-400/30 bg-amber-50">
          <CardContent className="p-3">
            <h2 className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <AlertCircle className="h-3 w-3" />
              Rappels vaccination
            </h2>
            {upcomingBoosters.map((booster) => (
              <div key={booster.vaccin} className="flex items-center justify-between py-1.5 border-b border-amber-100 last:border-0">
                <div>
                  <p className="text-xs font-medium text-amber-900">{booster.vaccin}</p>
                  <p className="text-[10px] text-amber-700">
                    Rappel le {new Date(booster.dateRappel).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <Badge className="bg-amber-200 text-amber-800 border-0 text-[10px]">J-{booster.daysLeft}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vaccination Timeline */}
      <div className="space-y-3">
        {filteredVaccinations.length === 0 && (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {filterStatus === 'all' ? 'Aucune vaccination enregistrée' : `Aucune vaccination ${statusConfig[filterStatus].label.toLowerCase()}`}
              </p>
              <p className="text-xs text-muted-foreground">Ajoutez votre première vaccination</p>
            </CardContent>
          </Card>
        )}
        {filteredVaccinations.map((vaccination, idx) => {
          const status = getVaccinationStatus(vaccination)
          const statusConf = statusConfig[status]
          return (
            <motion.div key={vaccination.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}>
              <Card className={`border-teal-200 relative overflow-hidden`}>
                {/* Status indicator bar */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  status === 'completed' ? 'bg-green-500' : status === 'scheduled' ? 'bg-blue-500' : 'bg-red-500'
                }`} />
                <CardContent className="p-4 pl-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        status === 'completed' ? 'bg-green-50' : status === 'scheduled' ? 'bg-blue-50' : 'bg-red-50'
                      }`}>
                        <Syringe className={`h-5 w-5 ${
                          status === 'completed' ? 'text-green-600' : status === 'scheduled' ? 'text-blue-600' : 'text-red-600'
                        }`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{vaccination.vaccin}</p>
                        <p className="text-[10px] text-muted-foreground">Lot : {vaccination.numeroLot}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={`text-[9px] border ${statusConf.color}`}>{statusConf.label}</Badge>
                      {vaccination.profilNom && (
                        <Badge variant="secondary" className="text-[9px] bg-teal-50 text-teal-800 border-0">{vaccination.profilNom}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(vaccination.dateVaccination).toLocaleDateString('fr-FR')}
                    </span>
                    <span>{vaccination.centreSante}</span>
                  </div>
                  {vaccination.dateRappel && (
                    <div className={`flex items-center gap-1 mt-1.5 text-xs ${
                      status === 'overdue' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      <Clock className="h-3 w-3" />
                      Rappel : {new Date(vaccination.dateRappel).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  )}

                  {/* Per-vaccination QR code */}
                  <div className="mt-3 pt-3 border-t border-teal-100">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[10px] text-primary p-0 hover:bg-transparent"
                      onClick={() => setExpandedQRId(expandedQRId === vaccination.id ? null : vaccination.id)}
                    >
                      <QrCode className="h-3 w-3 mr-1" />
                      {expandedQRId === vaccination.id ? 'Masquer QR' : 'Voir QR code'}
                    </Button>
                    <AnimatePresence>
                      {expandedQRId === vaccination.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 text-center"
                        >
                          <div className="inline-block p-3 bg-white rounded-xl border-2 border-dashed border-teal-200">
                            <img
                              src={getVaccinationQRUrl(vaccination)}
                              alt={`QR Code ${vaccination.vaccin}`}
                              className="w-28 h-28 mx-auto"
                            />
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">
                            QR code — Attestation de vaccination {vaccination.vaccin}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] border-primary text-primary mt-1"
                            onClick={() => {
                              const link = document.createElement('a')
                              link.href = getVaccinationQRUrl(vaccination)
                              link.target = '_blank'
                              link.click()
                              toast.success('QR code ouvert')
                            }}
                          >
                            <Download className="h-3 w-3 mr-1" />
                            Télécharger
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Share / QR for full record */}
      <Card className="border-teal-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Partagez votre carnet de vaccination complet</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-8 text-xs border-primary text-primary"
              onClick={handleFetchQR}
              disabled={qrLoading}
            >
              {qrLoading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <QrCode className="h-3 w-3 mr-1" />}
              QR Code complet
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary" onClick={async () => {
              const shareData = { title: 'Carnet de vaccination MédiHelm', text: 'Mon carnet de vaccination sur MédiHelm', url: window.location.href }
              if (navigator.share) {
                try { await navigator.share(shareData) } catch { /* user cancelled */ }
              } else {
                await navigator.clipboard.writeText(window.location.href)
                toast.success('Lien copié dans le presse-papiers')
              }
            }}>
              <Share2 className="h-3 w-3 mr-1" />
              Partager
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Vaccination QR Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              QR Code Vaccination
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            {qrDataUrl ? (
              <div className="inline-block p-4 bg-white rounded-xl border-2 border-dashed border-teal-200">
                <img
                  src={qrDataUrl}
                  alt="QR Code carnet de vaccination"
                  className="w-48 h-48 mx-auto"
                />
              </div>
            ) : (
              <div className="py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-xs text-muted-foreground mt-2">Génération du QR code...</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Scannez ce QR code pour accéder à votre carnet de vaccination complet
            </p>
            <Button
              variant="outline"
              className="border-primary text-primary"
              onClick={() => {
                if (qrDataUrl) {
                  const link = document.createElement('a')
                  link.href = qrDataUrl
                  link.download = 'medihelm-vaccination-qr.png'
                  link.click()
                  toast.success('QR code téléchargé')
                }
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              Télécharger
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
