'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FileText, Upload, Clock, CheckCircle, XCircle, RefreshCw, ChevronDown, ChevronUp, Loader2, RotateCcw } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Prescription {
  id: string
  prescripteurNom: string
  dateOrdonnance: string
  statut: string
  estStupefiant: boolean
  imageUrl?: string
  lignes?: Array<{
    id: string
    medicament: { nomCommercial: string; dci: string; dosage: string }
    posologie: string
    duree: string
    quantite: number
    delivree: boolean
  }>
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  RECUE: { label: 'Reçue', color: 'bg-blue-50 text-blue-700', icon: Clock },
  EN_COURS_VALIDATION: { label: 'En validation', color: 'bg-amber-50 text-amber-700', icon: Clock },
  VALIDEE: { label: 'Validée', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  PARTIELLEMENT_DELIVREE: { label: 'Partiellement délivrée', color: 'bg-amber-50 text-amber-700', icon: Clock },
  DELIVREE: { label: 'Délivrée', color: 'bg-green-50 text-green-700', icon: CheckCircle },
  REFUSEE: { label: 'Refusée', color: 'bg-red-50 text-red-700', icon: XCircle },
}

export default function OrdonnancesPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const router = useRouter()

  const fetchPrescriptions = useCallback(async () => {
    try {
      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const ordRes = await fetch(`/api/patient/ordonnances?patientId=${patients[0].id}`)
          if (ordRes.ok) {
            const data = await ordRes.json()
            if (Array.isArray(data) && data.length > 0) {
              setPrescriptions(data.map((o: Prescription) => ({
                id: o.id,
                prescripteurNom: o.prescripteurNom,
                dateOrdonnance: o.dateOrdonnance,
                statut: o.statut,
                estStupefiant: o.estStupefiant,
                imageUrl: o.imageUrl,
                lignes: o.lignes?.map((l: NonNullable<Prescription['lignes']>[number]) => ({
                  id: l.id,
                  medicament: l.medicament,
                  posologie: l.posologie,
                  duree: l.duree,
                  quantite: l.quantite,
                  delivree: l.delivree,
                })),
              })))
              setLoading(false)
              return
            }
          }
        }
      }
    } catch {
      // fallback
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPrescriptions()
  }, [fetchPrescriptions])

  const handleUpload = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)

        const patientRes = await fetch('/api/patients')
        if (patientRes.ok) {
          const patients = await patientRes.json()
          if (Array.isArray(patients) && patients.length > 0) {
            const patient = patients[0]
            const res = await fetch('/api/patient/ordonnances', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                patientId: patient.id,
                pharmacieId: patient.pharmacieId,
                prescripteurNom: 'À identifier',
                dateOrdonnance: new Date().toISOString(),
                imageOrdonnanceUrl: file.name,
              }),
            })
            if (res.ok) {
              const created = await res.json()
              setPrescriptions([{
                id: created.id,
                prescripteurNom: created.prescripteurNom,
                dateOrdonnance: created.dateOrdonnance,
                statut: created.statut,
                estStupefiant: created.estStupefiant,
                imageUrl: created.imageOrdonnanceUrl,
              }, ...prescriptions])
              toast.success('Ordonnance soumise avec succès')
            }
          }
        }
      } catch {
        toast.error('Erreur lors de l\'envoi')
      } finally {
        setUploading(false)
      }
    }
    input.click()
  }

  const handleRenewal = async (prescriptionId: string) => {
    setRenewingId(prescriptionId)
    try {
      await fetch('/api/patient/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titre: 'Demande de renouvellement',
          message: `Renouvellement demandé pour l'ordonnance de ${prescriptions.find(p => p.id === prescriptionId)?.prescripteurNom}`,
          type: 'RAPPEL',
        }),
      })
      toast.success('Demande de renouvellement envoyée')
    } catch {
      toast.error('Erreur lors de la demande')
    } finally {
      setRenewingId(null)
    }
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
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        Mes ordonnances
      </h1>

      {/* Upload button */}
      <Button className="w-full h-12 bg-primary hover:bg-teal-700" onClick={handleUpload} disabled={uploading}>
        {uploading ? (
          <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Envoi en cours...</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Soumettre une ordonnance</>
        )}
      </Button>

      {/* Prescription list */}
      <div className="space-y-3">
        {prescriptions.map((prescription) => {
          const config = statusConfig[prescription.statut] || statusConfig.RECUE
          return (
            <motion.div key={prescription.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-teal-200">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{prescription.prescripteurNom}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(prescription.dateOrdonnance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge variant="secondary" className={`text-[10px] border-0 ${config.color}`}>
                        {config.label}
                      </Badge>
                      {prescription.estStupefiant && (
                        <Badge variant="secondary" className="text-[10px] bg-red-50 text-red-700 border-0">Stupéfiant</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1 h-8 text-xs border-primary text-primary" onClick={() => setExpandedId(expandedId === prescription.id ? null : prescription.id)}>
                      {expandedId === prescription.id ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                      Détails
                    </Button>
                    {(prescription.statut === 'VALIDEE' || prescription.statut === 'PARTIELLEMENT_DELIVREE') && (
                      <Button size="sm" className="flex-1 h-8 text-xs bg-primary" onClick={() => {
                        toast.info('Redirection vers la recherche de médicaments...')
                        router.push(`/patient/recherche?ordonnanceId=${prescription.id}`)
                      }}>
                        Commander
                      </Button>
                    )}
                  </div>
                  {expandedId === prescription.id && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-teal-100 space-y-2">
                      <p className="text-xs text-muted-foreground">Prescription par {prescription.prescripteurNom}</p>
                      <p className="text-xs text-muted-foreground">Date : {new Date(prescription.dateOrdonnance).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">Statut : {statusConfig[prescription.statut]?.label || prescription.statut}</p>
                      {prescription.estStupefiant && <p className="text-xs text-red-600 font-medium">⚠ Médicament stupéfiant</p>}
                      {prescription.lignes && prescription.lignes.length > 0 && (
                        <div className="space-y-1 mt-2">
                          <p className="text-xs font-semibold text-gray-800">Médicaments prescrits :</p>
                          {prescription.lignes.map((l) => (
                            <div key={l.id} className="text-xs text-gray-700 flex items-center gap-1">
                              <span className={l.delivree ? 'line-through text-muted-foreground' : ''}>{l.medicament.nomCommercial}</span>
                              <span className="text-muted-foreground">— {l.posologie}, {l.duree}</span>
                              {l.delivree && <CheckCircle className="h-3 w-3 text-green-600" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
        {prescriptions.length === 0 && (
          <Card className="border-teal-200">
            <CardContent className="p-6 text-center">
              <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Aucune ordonnance</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Renewal tracking */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-primary" />
            Renouvellement
          </h2>
          <p className="text-xs text-muted-foreground mb-3">
            Demandez le renouvellement de vos ordonnances régulières.
          </p>
          {prescriptions.filter(p => ['VALIDEE', 'DELIVREE'].includes(p.statut)).length > 0 ? (
            <div className="space-y-2">
              {prescriptions.filter(p => ['VALIDEE', 'DELIVREE'].includes(p.statut)).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-teal-50 last:border-0">
                  <div>
                    <p className="text-xs text-gray-900">{p.prescripteurNom}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(p.dateOrdonnance).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[10px] border-primary text-primary"
                    disabled={renewingId === p.id}
                    onClick={() => handleRenewal(p.id)}
                  >
                    {renewingId === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                    Demander renouvellement
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune ordonnance éligible au renouvellement</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
