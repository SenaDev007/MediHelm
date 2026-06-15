'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Syringe, Calendar, MapPin, QrCode, Clock, Shield,
  Plus, ChevronDown, ChevronUp, AlertCircle, Share2, Download
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import Link from 'next/link'

interface Vaccination {
  id: string
  vaccin: string
  dateVaccin: string
  lot: string | null
  prochaineDose: string | null
  pharmacie: {
    id: string
    nom: string
    adresse: string
    ville: string
  }
}

const vaccinColors: Record<string, string> = {
  'BCG': 'bg-blue-50 text-blue-700',
  'VHB': 'bg-purple-50 text-purple-700',
  'DTCoq': 'bg-amber-50 text-amber-700',
  'Polio': 'bg-green-50 text-green-700',
  'ROR': 'bg-rose-50 text-rose-700',
  'Fièvre jaune': 'bg-yellow-50 text-yellow-800',
  'Méningite': 'bg-orange-50 text-orange-700',
  'COVID-19': 'bg-teal-50 text-teal-800',
  'Grippe': 'bg-indigo-50 text-indigo-700',
  'Choléra': 'bg-red-50 text-red-700',
}

const getVaccinColor = (vaccin: string) => {
  for (const [key, color] of Object.entries(vaccinColors)) {
    if (vaccin.toUpperCase().includes(key.toUpperCase())) return color
  }
  return 'bg-teal-50 text-teal-800'
}

export default function VaccinationsPage() {
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showQrDialog, setShowQrDialog] = useState(false)
  const [qrVaccinationId, setQrVaccinationId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'toutes' | 'prochaines'>('toutes')

  const patientId = 'demo-patient'

  const fetchVaccinations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/patient/vaccinations?patientId=${patientId}`)
      if (res.ok) {
        const data = await res.json()
        setVaccinations(data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchVaccinations()
  }, [fetchVaccinations])

  const prochainesVaccinations = vaccinations.filter(v => {
    if (!v.prochaineDose) return false
    return new Date(v.prochaineDose) > new Date()
  })

  const filteredVaccinations = filter === 'prochaines' ? prochainesVaccinations : vaccinations

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatShortDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    })
  }

  const isUpcoming = (dateStr: string | null) => {
    if (!dateStr) return false
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diffDays > 0 && diffDays <= 30
  }

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false
    return new Date(dateStr) < new Date()
  }

  const handleShareQr = (id: string) => {
    setQrVaccinationId(id)
    setShowQrDialog(true)
    toast.info('QR code de partage — Fonctionnalité à venir')
  }

  const handleExportCarnet = () => {
    toast.info('Export du carnet de vaccination — Fonctionnalité à venir')
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
            <Syringe className="h-5 w-5 text-primary" />
            Carnet de vaccination
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vaccinations.length} vaccination{vaccinations.length !== 1 ? 's' : ''} enregistrée{vaccinations.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs border-primary text-primary hover:bg-teal-50"
          onClick={handleExportCarnet}
        >
          <Download className="h-3 w-3 mr-1" />
          Exporter
        </Button>
      </div>

      {/* Upcoming alerts */}
      {prochainesVaccinations.length > 0 && (
        <Card className="border-amber-300 bg-gradient-to-r from-amber-50 to-white">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-semibold text-amber-800">
                Prochaines doses ({prochainesVaccinations.length})
              </p>
            </div>
            <div className="space-y-1.5">
              {prochainesVaccinations.slice(0, 3).map((v) => (
                <div key={v.id} className="flex items-center justify-between">
                  <span className="text-xs text-amber-700">{v.vaccin}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-amber-600">
                      {formatShortDate(v.prochaineDose!)}
                    </span>
                    {isUpcoming(v.prochaineDose) && (
                      <Badge className="text-[9px] bg-amber-500 text-white border-0">Bientôt</Badge>
                    )}
                    {isOverdue(v.prochaineDose) && (
                      <Badge className="text-[9px] bg-red-500 text-white border-0">En retard</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        <Badge
          variant={filter === 'toutes' ? 'default' : 'secondary'}
          className={`cursor-pointer text-xs ${
            filter === 'toutes'
              ? 'bg-primary text-white border-0'
              : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
          }`}
          onClick={() => setFilter('toutes')}
        >
          Toutes ({vaccinations.length})
        </Badge>
        <Badge
          variant={filter === 'prochaines' ? 'default' : 'secondary'}
          className={`cursor-pointer text-xs ${
            filter === 'prochaines'
              ? 'bg-primary text-white border-0'
              : 'bg-teal-50 text-teal-800 border-0 hover:bg-teal-100'
          }`}
          onClick={() => setFilter('prochaines')}
        >
          Prochaines doses ({prochainesVaccinations.length})
        </Badge>
      </div>

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

      {/* Vaccination list */}
      {!loading && filteredVaccinations.length > 0 && (
        <div className="space-y-3">
          {filteredVaccinations.map((vaccination, idx) => {
            const isExpanded = expandedId === vaccination.id
            const colorClass = getVaccinColor(vaccination.vaccin)

            return (
              <motion.div
                key={vaccination.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className={`border-teal-200 ${isOverdue(vaccination.prochaineDose) ? 'border-red-200' : ''}`}>
                  <CardContent className="p-4">
                    <div
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : vaccination.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Syringe className="h-4 w-4 text-primary flex-shrink-0" />
                          <h3 className="font-semibold text-gray-900 text-sm">{vaccination.vaccin}</h3>
                          <Badge className={`text-[10px] border-0 ${colorClass}`}>
                            {vaccination.vaccin.split(' ')[0]}
                          </Badge>
                        </div>
                        <div className="ml-6 mt-1.5 space-y-0.5">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(vaccination.dateVaccin)}
                          </p>
                          {vaccination.lot && (
                            <p className="text-[11px] text-muted-foreground font-mono">
                              Lot: {vaccination.lot}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vaccination.prochaineDose && (
                          <Badge
                            className={`text-[10px] border-0 ${
                              isOverdue(vaccination.prochaineDose)
                                ? 'bg-red-50 text-red-700'
                                : isUpcoming(vaccination.prochaineDose)
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-green-50 text-green-700'
                            }`}
                          >
                            {formatShortDate(vaccination.prochaineDose)}
                          </Badge>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Expanded details */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 pt-3 border-t border-teal-100 space-y-3">
                            {/* Full details */}
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[10px] text-muted-foreground">Vaccin</p>
                                <p className="text-xs font-medium text-gray-900">{vaccination.vaccin}</p>
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Date</p>
                                <p className="text-xs font-medium text-gray-900">{formatDate(vaccination.dateVaccin)}</p>
                              </div>
                              {vaccination.lot && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground">N° de lot</p>
                                  <p className="text-xs font-mono font-medium text-gray-900">{vaccination.lot}</p>
                                </div>
                              )}
                              {vaccination.prochaineDose && (
                                <div>
                                  <p className="text-[10px] text-muted-foreground">Prochaine dose</p>
                                  <p className={`text-xs font-medium ${isOverdue(vaccination.prochaineDose) ? 'text-red-600' : 'text-gray-900'}`}>
                                    {formatDate(vaccination.prochaineDose)}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Pharmacy */}
                            <div>
                              <p className="text-[10px] text-muted-foreground mb-1">Lieu de vaccination</p>
                              <p className="text-xs font-medium text-gray-900 flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-primary" />
                                {vaccination.pharmacie.nom}
                              </p>
                              <p className="text-[10px] text-muted-foreground ml-4">
                                {vaccination.pharmacie.adresse}, {vaccination.pharmacie.ville}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-8 text-xs border-primary text-primary"
                                onClick={() => handleShareQr(vaccination.id)}
                              >
                                <QrCode className="h-3 w-3 mr-1" />
                                Partager en QR
                              </Button>
                              <Link href="/patient/pharmacies" className="flex-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full h-8 text-xs border-teal-200 text-muted-foreground"
                                >
                                  <MapPin className="h-3 w-3 mr-1" />
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
      {!loading && filteredVaccinations.length === 0 && (
        <div className="text-center py-8">
          <Syringe className="h-12 w-12 text-teal-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-900">
            {filter === 'prochaines'
              ? 'Aucune prochaine dose prévue'
              : 'Aucune vaccination enregistrée'}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Vos vaccinations seront enregistrées lors de vos visites en pharmacie
          </p>
        </div>
      )}

      {/* Info banner */}
      <Card className="border-teal-200 bg-teal-50">
        <CardContent className="p-3 flex items-start gap-2">
          <Shield className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-teal-800">Carnet numérique sécurisé</p>
            <p className="text-[10px] text-teal-700 mt-0.5">
              Vos données de vaccination sont stockées de manière sécurisée et peuvent être partagées
              via QR code avec les professionnels de santé.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
