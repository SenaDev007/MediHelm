'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  Save,
  Send,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

const TYPE_ALERTE_OPTIONS = [
  { value: 'RAPPEL_LOT', label: 'Rappel de lot', color: 'bg-red-100 text-red-800' },
  { value: 'CONTREFACON', label: 'Contrefaçon', color: 'bg-orange-100 text-orange-800' },
  { value: 'AMM_SUSPENDUE', label: 'AMM Suspendue', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'PHARMACOVIGILANCE', label: 'Pharmacovigilance', color: 'bg-purple-100 text-purple-800' },
  { value: 'INFO_REGLEMENTAIRE', label: 'Info Réglementaire', color: 'bg-blue-100 text-blue-800' },
]

const NIVEAU_URGENCE_OPTIONS = [
  { value: 'URGENCE_IMMEDIATE', label: 'Urgence immédiate', color: 'bg-red-600 text-white' },
  { value: 'URGENT', label: 'Urgent', color: 'bg-orange-500 text-white' },
  { value: 'NORMAL', label: 'Normal', color: 'bg-yellow-500 text-white' },
  { value: 'INFORMATIF', label: 'Informatif', color: 'bg-blue-500 text-white' },
]

interface AlertFormProps {
  initialData?: {
    id?: string
    titre?: string
    description?: string
    typeAlerte?: string
    niveauUrgence?: string
    dciConcernee?: string
    numerosLotConcernes?: string[]
    fabricantConcerne?: string
    sourceEmission?: string
  }
  mode?: 'create' | 'edit'
}

export function AlertForm({ initialData, mode = 'create' }: AlertFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [lotInput, setLotInput] = useState('')
  const [lots, setLots] = useState<string[]>(initialData?.numerosLotConcernes || [])
  const [formData, setFormData] = useState({
    titre: initialData?.titre || '',
    description: initialData?.description || '',
    typeAlerte: initialData?.typeAlerte || '',
    niveauUrgence: initialData?.niveauUrgence || '',
    dciConcernee: initialData?.dciConcernee || '',
    fabricantConcerne: initialData?.fabricantConcerne || '',
    sourceEmission: initialData?.sourceEmission || 'DPMED Bénin',
  })

  const addLot = () => {
    if (lotInput.trim() && !lots.includes(lotInput.trim())) {
      setLots([...lots, lotInput.trim()])
      setLotInput('')
    }
  }

  const removeLot = (lot: string) => {
    setLots(lots.filter(l => l !== lot))
  }

  const handleSubmit = async (publish: boolean) => {
    if (!formData.titre || !formData.description || !formData.typeAlerte || !formData.niveauUrgence) {
      toast.error('Veuillez remplir tous les champs obligatoires')
      return
    }

    setLoading(true)
    try {
      const referenceOfficielle = `DPMED-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`
      const signatureNumerique = `SIG-DPMED-${Date.now()}`

      const payload = {
        ...formData,
        referenceOfficielle,
        numerosLotConcernes: lots,
        signatureNumerique,
        dateEmissionDPMED: new Date().toISOString(),
        statut: publish ? 'EN_DIFFUSION' : 'EN_DIFFUSION',
        nbOfficinesNotifiees: 0,
        nbOfficinesAcquittees: 0,
        nbPatientsNotifies: 0,
      }

      let url = '/api/portail/dpmed/alertes'
      let method = 'POST'
      if (mode === 'edit' && initialData?.id) {
        url = `/api/alertes/dpmed/${initialData.id}`
        method = 'PUT'
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Erreur lors de l\'enregistrement')

      const data = await res.json()
      toast.success(publish ? 'Alerte publiée et diffusée' : 'Alerte enregistrée')
      router.push(`/institutions/dpmed/alertes/${data.id}`)
      router.refresh()
    } catch (error) {
      console.error(error)
      toast.error('Erreur lors de l\'enregistrement de l\'alerte')
    } finally {
      setLoading(false)
    }
  }

  const selectedUrgence = NIVEAU_URGENCE_OPTIONS.find(o => o.value === formData.niveauUrgence)
  const selectedType = TYPE_ALERTE_OPTIONS.find(o => o.value === formData.typeAlerte)

  return (
    <div className="space-y-6">
      {/* Alert Type & Urgency Selection */}
      <Card className="border-teal-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-teal-600" />
            Classification de l&apos;alerte
          </CardTitle>
          <CardDescription>Définissez le type et le niveau d&apos;urgence de l&apos;alerte</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type d&apos;alerte *</Label>
              <Select
                value={formData.typeAlerte}
                onValueChange={(v) => setFormData({ ...formData, typeAlerte: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_ALERTE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedType && (
                <Badge variant="outline" className={selectedType.color}>{selectedType.label}</Badge>
              )}
            </div>
            <div className="space-y-2">
              <Label>Niveau d&apos;urgence *</Label>
              <Select
                value={formData.niveauUrgence}
                onValueChange={(v) => setFormData({ ...formData, niveauUrgence: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {NIVEAU_URGENCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedUrgence && (
                <Badge className={selectedUrgence.color}>{selectedUrgence.label}</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Content */}
      <Card className="border-teal-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Contenu de l&apos;alerte</CardTitle>
          <CardDescription>Rédigez le titre et la description détaillée</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Titre *</Label>
            <Input
              value={formData.titre}
              onChange={(e) => setFormData({ ...formData, titre: e.target.value })}
              placeholder="Ex: Rappel du lot AB1234 du médicament X"
              className="border-teal-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Description détaillée *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Décrivez en détail la raison de l'alerte, les risques identifiés, et les actions recommandées..."
              rows={6}
              className="border-teal-200"
            />
          </div>
          <div className="space-y-2">
            <Label>Source d&apos;émission</Label>
            <Input
              value={formData.sourceEmission}
              onChange={(e) => setFormData({ ...formData, sourceEmission: e.target.value })}
              placeholder="Ex: DPMED Bénin, OMS, ANSM"
              className="border-teal-200"
            />
          </div>
        </CardContent>
      </Card>

      {/* Medication & Lot Info */}
      <Card className="border-teal-200">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Médicaments et lots concernés</CardTitle>
          <CardDescription>Identifiez les DCI et numéros de lot impactés</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>DCI concernée</Label>
              <Input
                value={formData.dciConcernee}
                onChange={(e) => setFormData({ ...formData, dciConcernee: e.target.value })}
                placeholder="Ex: Paracétamol, Amoxicilline"
                className="border-teal-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Fabricant concerné</Label>
              <Input
                value={formData.fabricantConcerne}
                onChange={(e) => setFormData({ ...formData, fabricantConcerne: e.target.value })}
                placeholder="Ex: Laboratoire X"
                className="border-teal-200"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Numéros de lot</Label>
            <div className="flex gap-2">
              <Input
                value={lotInput}
                onChange={(e) => setLotInput(e.target.value)}
                placeholder="Entrez un n° de lot"
                className="border-teal-200"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addLot()
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addLot} className="border-teal-300 text-teal-700">
                Ajouter
              </Button>
            </div>
            {lots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {lots.map((lot) => (
                  <Badge key={lot} variant="secondary" className="gap-1 pr-1">
                    {lot}
                    <button onClick={() => removeLot(lot)} className="ml-1 hover:text-red-600">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Digital Signature Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Signature numérique</p>
              <p className="text-xs text-amber-700 mt-1">
                La publication de cette alerte engage la responsabilité de la DPMED.
                Une signature numérique sera automatiquement apposée lors de la diffusion.
                Toute alerte publiée sera diffusée à l&apos;ensemble des pharmacies connectées au réseau MédiHelm.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="border-teal-300 text-teal-700"
        >
          Annuler
        </Button>
        <Button
          variant="outline"
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="border-teal-300 text-teal-700"
        >
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
        <Button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700"
        >
          <Send className="h-4 w-4 mr-2" />
          Publier et diffuser
        </Button>
      </div>
    </div>
  )
}
