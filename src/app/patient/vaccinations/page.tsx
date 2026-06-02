'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Syringe, Plus, Calendar, Clock, QrCode, Share2, AlertCircle, Loader2, Download } from 'lucide-react'
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

export default function VaccinationsPage() {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [expandedQRId, setExpandedQRId] = useState<string | null>(null)
  const [newVaccination, setNewVaccination] = useState({
    vaccin: '',
    numeroLot: '',
    dateVaccination: '',
    centreSante: '',
    dateRappel: '',
  })

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

  const upcomingBoosters = vaccinations
    .filter(v => v.dateRappel && new Date(v.dateRappel) > new Date())
    .map(v => ({
      vaccin: v.vaccin,
      dateRappel: v.dateRappel!,
      daysLeft: Math.ceil((new Date(v.dateRappel!).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft)

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://medihelm.bj/vaccinations')}`

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

      {/* Vaccination records */}
      <div className="space-y-3">
        {vaccinations.map((vaccination) => (
          <motion.div key={vaccination.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-teal-200">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Syringe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{vaccination.vaccin}</p>
                      <p className="text-[10px] text-muted-foreground">Lot : {vaccination.numeroLot}</p>
                    </div>
                  </div>
                  {vaccination.profilNom && (
                    <Badge variant="secondary" className="text-[9px] bg-teal-50 text-teal-800 border-0">{vaccination.profilNom}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(vaccination.dateVaccination).toLocaleDateString('fr-FR')}
                  </span>
                  <span>{vaccination.centreSante}</span>
                </div>
                {vaccination.dateRappel && (
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600">
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
        ))}
        {vaccinations.length === 0 && (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <Syringe className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune vaccination enregistrée</p>
              <p className="text-xs text-muted-foreground">Ajoutez votre première vaccination</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share / QR for full record */}
      <Card className="border-teal-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Partagez votre carnet de vaccination complet</p>
          {showQR && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mb-3">
              <img src={qrCodeUrl} alt="QR Code carnet de vaccination" className="w-32 h-32 mx-auto rounded-lg border border-teal-200" />
              <p className="text-[10px] text-muted-foreground mt-1">Scannez pour accéder au carnet</p>
            </motion.div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary" onClick={() => setShowQR(!showQR)}>
              <QrCode className="h-3 w-3 mr-1" />
              {showQR ? 'Masquer QR' : 'QR Code'}
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
    </div>
  )
}
