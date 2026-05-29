'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Syringe, Plus, Calendar, Clock, QrCode, Share2, AlertCircle, Check } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface VaccinationRecord {
  id: string
  vaccin: string
  numeroLot: string
  dateVaccination: string
  centreSante: string
  dateRappel: string | null
  profilNom?: string
}

const mockVaccinations: VaccinationRecord[] = [
  {
    id: '1',
    vaccin: 'COVID-19 (Pfizer)',
    numeroLot: 'PFZ2026A',
    dateVaccination: '2026-01-15',
    centreSante: 'Centre de vaccination Cotonou',
    dateRappel: '2027-01-15',
    profilNom: 'Jean Doe',
  },
  {
    id: '2',
    vaccin: 'Hépatite B',
    numeroLot: 'HBP2026B',
    dateVaccination: '2026-03-20',
    centreSante: 'Pharmacie Centrale',
    dateRappel: '2026-09-20',
    profilNom: 'Jean Doe',
  },
  {
    id: '3',
    vaccin: 'Fièvre jaune',
    numeroLot: 'YF2025C',
    dateVaccination: '2025-06-10',
    centreSante: 'Hôpital de Zone Cotonou',
    dateRappel: null,
    profilNom: 'Jean Doe',
  },
  {
    id: '4',
    vaccin: 'Tétanos',
    numeroLot: 'TT2026D',
    dateVaccination: '2026-02-28',
    centreSante: 'Clinique Akpakpa',
    dateRappel: '2036-02-28',
    profilNom: 'Marie Doe',
  },
]

const upcomingBoosters = [
  { vaccin: 'Hépatite B', dateRappel: '2026-09-20', daysLeft: 115 },
  { vaccin: 'COVID-19 (Pfizer)', dateRappel: '2027-01-15', daysLeft: 232 },
]

export default function VaccinationsPage() {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>(mockVaccinations)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newVaccination, setNewVaccination] = useState({
    vaccin: '',
    numeroLot: '',
    dateVaccination: '',
    centreSante: '',
    dateRappel: '',
  })

  const handleAddVaccination = () => {
    const newRecord: VaccinationRecord = {
      id: Date.now().toString(),
      ...newVaccination,
      dateRappel: newVaccination.dateRappel || null,
      profilNom: 'Jean Doe',
    }
    setVaccinations([newRecord, ...vaccinations])
    setShowAddDialog(false)
    setNewVaccination({ vaccin: '', numeroLot: '', dateVaccination: '', centreSante: '', dateRappel: '' })
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
                <Label className="text-xs">Vaccin</Label>
                <Input
                  value={newVaccination.vaccin}
                  onChange={(e) => setNewVaccination({ ...newVaccination, vaccin: e.target.value })}
                  placeholder="Nom du vaccin"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">N° de lot</Label>
                <Input
                  value={newVaccination.numeroLot}
                  onChange={(e) => setNewVaccination({ ...newVaccination, numeroLot: e.target.value })}
                  placeholder="Numéro de lot"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date de vaccination</Label>
                <Input
                  type="date"
                  value={newVaccination.dateVaccination}
                  onChange={(e) => setNewVaccination({ ...newVaccination, dateVaccination: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Centre de santé</Label>
                <Input
                  value={newVaccination.centreSante}
                  onChange={(e) => setNewVaccination({ ...newVaccination, centreSante: e.target.value })}
                  placeholder="Centre de vaccination"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Date de rappel (optionnel)</Label>
                <Input
                  type="date"
                  value={newVaccination.dateRappel}
                  onChange={(e) => setNewVaccination({ ...newVaccination, dateRappel: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
              <Button className="w-full bg-primary hover:bg-teal-700" onClick={handleAddVaccination}>
                Enregistrer
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
                <Badge className="bg-amber-200 text-amber-800 border-0 text-[10px]">
                  J-{booster.daysLeft}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Vaccination records */}
      <div className="space-y-3">
        {vaccinations.map((vaccination) => (
          <motion.div
            key={vaccination.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
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
                    <Badge variant="secondary" className="text-[9px] bg-teal-50 text-teal-800 border-0">
                      {vaccination.profilNom}
                    </Badge>
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
                    Rappel : {new Date(vaccination.dateRappel).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Share / QR */}
      <Card className="border-teal-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-3">Partagez votre carnet de vaccination</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary" onClick={() => toast('Fonctionnalité QR Code bientôt disponible')}>
              <QrCode className="h-3 w-3 mr-1" />
              QR Code
            </Button>
            <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary" onClick={async () => {
              const shareData = { title: 'Carnet de vaccination MédiHelm', text: 'Mon carnet de vaccination sur MédiHelm', url: window.location.href }
              if (navigator.share) {
                try { await navigator.share(shareData) } catch { /* user cancelled */ }
              } else {
                await navigator.clipboard.writeText(window.location.href)
                toast('Lien copié dans le presse-papiers')
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
