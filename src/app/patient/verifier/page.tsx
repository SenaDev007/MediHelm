'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShieldCheck, Search, QrCode, AlertTriangle, Check, X,
  Loader2, Pill, Calendar, Package, Eye, ScanLine,
  ChevronDown, ChevronUp, Info, Barcode, Clock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'

// Legacy verification result (lot-based)
interface VerificationResult {
  valide: boolean
  raisons?: string[]
  lot: {
    id: string
    numeroLot: string
    quantite: number
    dateExpiration: string
    dateReception: string
  }
  medicament: {
    id: string
    nomCommercial: string
    dci: string
    dosage: string
    forme: string
  }
  estExpire: boolean
  aStock: boolean
  surveillanceActive: boolean
  rappelEnCours: boolean
  alertesDPMED: Array<{
    id: string
    titre: string
    typeAlerte: string
    niveauUrgence: string
    referenceOfficielle: string | null
  }>
  surveillances: Array<{
    id: string
    typeSurveillance: string
    description: string | null
    niveauRisque: string | null
  }>
}

// GS1 Scan result
interface ScanResult {
  status: 'CONFORME' | 'ALERTE' | 'NON_REFERENCE'
  message: string
  medicament?: {
    id: string
    nomCommercial: string
    dci: string
    forme: string
    dosage: string
  }
  lot?: {
    id: string
    numeroLot: string
    quantite: number
    dateExpiration: string
  }
  alertes?: Array<{
    type: string
    titre: string
    description: string
    niveauUrgence: string
  }>
  surveillances?: Array<{
    type: string
    description: string
    niveauRisque: string
  }>
  tempsReponse?: number
}

const raisonLabels: Record<string, string> = {
  LOT_INTROUVABLE: 'Lot introuvable dans la base de données',
  LOT_EXPIRE: 'Lot expiré',
  STOCK_EPUISE: 'Stock épuisé',
  SURVEILLANCE_DPMED: 'Sous surveillance DPMED',
  RAPPEL_DPMED: 'Fait l\'objet d\'un rappel DPMED',
}

const raisonColors: Record<string, string> = {
  LOT_INTROUVABLE: 'bg-gray-50 text-gray-700',
  LOT_EXPIRE: 'bg-red-50 text-red-700',
  STOCK_EPUISE: 'bg-orange-50 text-orange-700',
  SURVEILLANCE_DPMED: 'bg-amber-50 text-amber-700',
  RAPPEL_DPMED: 'bg-red-50 text-red-700',
}

const statusConfig: Record<string, { bg: string; border: string; icon: typeof Check; iconColor: string; titleColor: string; label: string }> = {
  CONFORME: { bg: 'from-green-50 to-white', border: 'border-green-300', icon: Check, iconColor: 'text-green-600', titleColor: 'text-green-800', label: 'Conforme' },
  ALERTE: { bg: 'from-amber-50 to-white', border: 'border-amber-300', icon: AlertTriangle, iconColor: 'text-amber-600', titleColor: 'text-amber-800', label: 'Alerte' },
  NON_REFERENCE: { bg: 'from-red-50 to-white', border: 'border-red-300', icon: X, iconColor: 'text-red-600', titleColor: 'text-red-800', label: 'Non référencé' },
}

export default function VerifierPage() {
  const [activeTab, setActiveTab] = useState<string>('lot')
  const [numeroLot, setNumeroLot] = useState('')
  const [gs1Code, setGs1Code] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [scanMode, setScanMode] = useState(false)

  // Lot-based verification
  const handleVerify = async () => {
    if (!numeroLot.trim()) {
      toast.error('Veuillez saisir un numéro de lot')
      return
    }

    setLoading(true)
    setResult(null)
    setScanResult(null)
    setError(null)
    setShowDetails(false)

    try {
      const res = await fetch('/api/patient/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numeroLot: numeroLot.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la vérification')
        return
      }

      setResult(data)
    } catch {
      setError('Erreur de connexion au serveur')
    } finally {
      setLoading(false)
    }
  }

  // GS1 DataMatrix scan
  const handleGS1Scan = async () => {
    if (!gs1Code.trim()) {
      toast.error('Veuillez saisir ou scanner un code GS1 DataMatrix')
      return
    }

    setLoading(true)
    setResult(null)
    setScanResult(null)
    setError(null)
    setShowDetails(false)

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: gs1Code.trim(), contexte: 'PATIENT' }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors du scan GS1')
        return
      }

      setScanResult(data)
    } catch {
      // If auth required or server error, try offline parse
      setError('Erreur de connexion au serveur. Vérifiez que vous êtes connecté.')
    } finally {
      setLoading(false)
    }
  }

  const handleScan = () => {
    setScanMode(true)
    // In a real implementation, this would open a camera scanner
    toast.info('Scan GS1 DataMatrix — Pointez la caméra vers le code')
    setTimeout(() => setScanMode(false), 2000)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const reset = () => {
    setNumeroLot('')
    setGs1Code('')
    setResult(null)
    setScanResult(null)
    setError(null)
    setShowDetails(false)
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Vérifier un médicament
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Vérifiez l&apos;authenticité et la validité d&apos;un médicament par numéro de lot ou code GS1
        </p>
      </div>

      {/* Tabs: Lot / GS1 */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setError(null); setResult(null); setScanResult(null); }}>
        <TabsList className="w-full bg-teal-50 h-10">
          <TabsTrigger value="lot" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <Search className="h-3.5 w-3.5 mr-1.5" />
            Par lot
          </TabsTrigger>
          <TabsTrigger value="gs1" className="flex-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-white">
            <Barcode className="h-3.5 w-3.5 mr-1.5" />
            GS1 DataMatrix
          </TabsTrigger>
        </TabsList>

        {/* Tab: Lot number verification */}
        <TabsContent value="lot" className="mt-3">
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-900">Numéro de lot</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: LOT2025-001"
                    value={numeroLot}
                    onChange={(e) => setNumeroLot(e.target.value.toUpperCase())}
                    className="pl-10 h-11 border-teal-200 focus:border-primary focus:ring-primary font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 h-10 bg-primary hover:bg-teal-700 text-sm font-semibold"
                  onClick={handleVerify}
                  disabled={loading || !numeroLot.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Vérification...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4 mr-2" />
                      Vérifier
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-teal-200 text-primary hover:bg-teal-50"
                  onClick={handleScan}
                  disabled={scanMode}
                >
                  {scanMode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: GS1 DataMatrix scan */}
        <TabsContent value="gs1" className="mt-3">
          <Card className="border-teal-200">
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-gray-900">Code GS1 DataMatrix</Label>
                <div className="relative">
                  <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Ex: 0154112345678901\u00310LOT123\u00317251231"
                    value={gs1Code}
                    onChange={(e) => setGs1Code(e.target.value)}
                    className="pl-10 h-11 border-teal-200 focus:border-primary focus:ring-primary font-mono text-xs"
                    onKeyDown={(e) => e.key === 'Enter' && handleGS1Scan()}
                    disabled={loading}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Scannez ou collez le code brut du DataMatrix (AI 01=GTIN, 10=Lot, 17=Expiration, 21=N° série)
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 h-10 bg-primary hover:bg-teal-700 text-sm font-semibold"
                  onClick={handleGS1Scan}
                  disabled={loading || !gs1Code.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyse...
                    </>
                  ) : (
                    <>
                      <ScanLine className="h-4 w-4 mr-2" />
                      Analyser le code
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  className="h-10 border-teal-200 text-primary hover:bg-teal-50"
                  onClick={handleScan}
                  disabled={scanMode}
                >
                  {scanMode ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2"
        >
          <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700">{error}</p>
        </motion.div>
      )}

      {/* Result: Lot-based verification */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Valid result */}
            {result.valide && (
              <Card className="border-green-300 bg-gradient-to-br from-green-50 to-white">
                <CardContent className="p-5 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-green-100 mx-auto flex items-center justify-center mb-3"
                  >
                    <Check className="h-8 w-8 text-green-600" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-green-800">Médicament valide</h2>
                  <p className="text-xs text-green-700 mt-1">
                    Ce lot a été vérifié et est conforme
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Invalid result - no lot found */}
            {!result.valide && !result.lot && (
              <Card className="border-gray-300 bg-gradient-to-br from-gray-50 to-white">
                <CardContent className="p-5 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-3"
                  >
                    <X className="h-8 w-8 text-gray-500" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-gray-800">Lot introuvable</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    Aucun lot trouvé avec ce numéro. Vérifiez le numéro saisi.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Invalid result - with lot found but issues */}
            {!result.valide && result.lot && (
              <Card className="border-red-300 bg-gradient-to-br from-red-50 to-white">
                <CardContent className="p-5 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-16 h-16 rounded-full bg-red-100 mx-auto flex items-center justify-center mb-3"
                  >
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </motion.div>
                  <h2 className="text-lg font-bold text-red-800">Attention — Problème détecté</h2>
                  <p className="text-xs text-red-700 mt-1">
                    Ce médicament présente un ou plusieurs problèmes
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Medicament info */}
            {result.lot && (
              <Card className="border-teal-200 mt-3">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-gray-900 text-sm">Informations du médicament</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nom commercial</p>
                      <p className="text-xs font-medium text-gray-900">{result.medicament.nomCommercial}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">DCI</p>
                      <p className="text-xs font-medium text-gray-900">{result.medicament.dci}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Dosage</p>
                      <p className="text-xs font-medium text-gray-900">{result.medicament.dosage}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Forme</p>
                      <p className="text-xs font-medium text-gray-900">{result.medicament.forme}</p>
                    </div>
                  </div>

                  <Separator className="bg-teal-100" />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">N° de lot</p>
                      <p className="text-xs font-mono font-medium text-gray-900">{result.lot.numeroLot}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Date d&apos;expiration</p>
                      <p className={`text-xs font-medium ${result.estExpire ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDate(result.lot.dateExpiration)}
                      </p>
                    </div>
                  </div>

                  {/* Status indicators */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={`text-[10px] border-0 ${result.estExpire ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {result.estExpire ? <X className="h-3 w-3 mr-0.5" /> : <Check className="h-3 w-3 mr-0.5" />}
                      {result.estExpire ? 'Expiré' : 'Non expiré'}
                    </Badge>
                    <Badge className={`text-[10px] border-0 ${result.aStock ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                      {result.aStock ? <Check className="h-3 w-3 mr-0.5" /> : <X className="h-3 w-3 mr-0.5" />}
                      {result.aStock ? 'En stock' : 'Stock épuisé'}
                    </Badge>
                    <Badge className={`text-[10px] border-0 ${result.surveillanceActive ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
                      {result.surveillanceActive ? <AlertTriangle className="h-3 w-3 mr-0.5" /> : <Check className="h-3 w-3 mr-0.5" />}
                      {result.surveillanceActive ? 'Surveillé' : 'Non surveillé'}
                    </Badge>
                    <Badge className={`text-[10px] border-0 ${result.rappelEnCours ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                      {result.rappelEnCours ? <AlertTriangle className="h-3 w-3 mr-0.5" /> : <Check className="h-3 w-3 mr-0.5" />}
                      {result.rappelEnCours ? 'Rappelé' : 'Non rappelé'}
                    </Badge>
                  </div>

                  {/* Reasons */}
                  {result.raisons && result.raisons.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-gray-900">Problèmes détectés</p>
                      {result.raisons.map((raison) => (
                        <div
                          key={raison}
                          className={`flex items-center gap-2 p-2 rounded-lg ${raisonColors[raison] || 'bg-gray-50'}`}
                        >
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="text-xs">{raisonLabels[raison] || raison}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* DPMED Alerts */}
                  {result.alertesDPMED && result.alertesDPMED.length > 0 && (
                    <div>
                      <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="flex items-center gap-1 text-xs font-semibold text-destructive hover:underline"
                      >
                        Alertes DPMED ({result.alertesDPMED.length})
                        {showDetails ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>
                      <AnimatePresence>
                        {showDetails && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 mt-2">
                              {result.alertesDPMED.map((alerte) => (
                                <div key={alerte.id} className="p-2 bg-red-50 border border-red-200 rounded-lg">
                                  <p className="text-xs font-medium text-red-800">{alerte.titre}</p>
                                  <p className="text-[10px] text-red-600 mt-0.5">
                                    Type: {alerte.typeAlerte} — Urgence: {alerte.niveauUrgence}
                                  </p>
                                  {alerte.referenceOfficielle && (
                                    <p className="text-[10px] text-red-600 mt-0.5">
                                      Réf: {alerte.referenceOfficielle}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Reset button */}
            <Button
              variant="outline"
              className="w-full h-10 mt-3 border-teal-200 text-primary hover:bg-teal-50"
              onClick={reset}
            >
              Vérifier un autre médicament
            </Button>
          </motion.div>
        )}

        {/* Result: GS1 Scan */}
        {scanResult && (
          <motion.div
            key="scan-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Status card */}
            {(() => {
              const config = statusConfig[scanResult.status]
              const StatusIcon = config.icon
              return (
                <Card className={`${config.border} bg-gradient-to-br ${config.bg}`}>
                  <CardContent className="p-5 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="w-16 h-16 rounded-full bg-white/80 mx-auto flex items-center justify-center mb-3"
                    >
                      <StatusIcon className={`h-8 w-8 ${config.iconColor}`} />
                    </motion.div>
                    <h2 className={`text-lg font-bold ${config.titleColor}`}>
                      {config.label}
                    </h2>
                    <p className="text-xs text-gray-700 mt-1 max-w-xs mx-auto">
                      {scanResult.message}
                    </p>
                    {scanResult.tempsReponse && (
                      <p className="text-[10px] text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <Clock className="h-3 w-3" />
                        Résolution en {scanResult.tempsReponse}ms
                      </p>
                    )}
                  </CardContent>
                </Card>
              )
            })()}

            {/* Medicament details from scan */}
            {scanResult.medicament && (
              <Card className="border-teal-200 mt-3">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-gray-900 text-sm">Informations du médicament</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Nom commercial</p>
                      <p className="text-xs font-medium text-gray-900">{scanResult.medicament.nomCommercial}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">DCI</p>
                      <p className="text-xs font-medium text-gray-900">{scanResult.medicament.dci}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Dosage</p>
                      <p className="text-xs font-medium text-gray-900">{scanResult.medicament.dosage}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Forme</p>
                      <p className="text-xs font-medium text-gray-900">{scanResult.medicament.forme}</p>
                    </div>
                  </div>

                  {/* Lot details from scan */}
                  {scanResult.lot && (
                    <>
                      <Separator className="bg-teal-100" />
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-gray-900 text-sm">Détails du lot</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">N° de lot</p>
                          <p className="text-xs font-mono font-medium text-gray-900">{scanResult.lot.numeroLot}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Quantité</p>
                          <p className="text-xs font-medium text-gray-900">{scanResult.lot.quantite} unités</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-[10px] text-muted-foreground">Date d&apos;expiration</p>
                          <p className={`text-xs font-medium ${new Date(scanResult.lot.dateExpiration) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatDate(scanResult.lot.dateExpiration)}
                          </p>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Alerts from scan */}
            {scanResult.alertes && scanResult.alertes.length > 0 && (
              <Card className="border-red-200 mt-3">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <h3 className="font-semibold text-red-800 text-sm">Alertes DPMED</h3>
                  </div>
                  <div className="space-y-2">
                    {scanResult.alertes.map((alerte, idx) => (
                      <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[9px] border-0 bg-red-100 text-red-700">
                            {alerte.niveauUrgence}
                          </Badge>
                          <Badge className="text-[9px] border-0 bg-red-100 text-red-700">
                            {alerte.type}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-red-800 mt-1">{alerte.titre}</p>
                        {alerte.description && (
                          <p className="text-[10px] text-red-600 mt-0.5">{alerte.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Surveillances from scan */}
            {scanResult.surveillances && scanResult.surveillances.length > 0 && (
              <Card className="border-amber-200 mt-3">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-amber-600" />
                    <h3 className="font-semibold text-amber-800 text-sm">Sous surveillance</h3>
                  </div>
                  <div className="space-y-2">
                    {scanResult.surveillances.map((surv, idx) => (
                      <div key={idx} className="p-2 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700">
                            {surv.niveauRisque}
                          </Badge>
                          <Badge className="text-[9px] border-0 bg-amber-100 text-amber-700">
                            {surv.type}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-amber-800 mt-1">{surv.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reset button */}
            <Button
              variant="outline"
              className="w-full h-10 mt-3 border-teal-200 text-primary hover:bg-teal-50"
              onClick={reset}
            >
              Vérifier un autre médicament
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Help section */}
      {!result && !scanResult && !loading && (
        <Card className="border-teal-200 bg-teal-50">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h3 className="text-xs font-semibold text-teal-800">Comment vérifier ?</h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                <p className="text-xs text-teal-800">Trouvez le numéro de lot ou le code GS1 DataMatrix sur l&apos;emballage</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                <p className="text-xs text-teal-800">Saisissez le numéro ou scannez le code avec votre caméra</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                <p className="text-xs text-teal-800">Consultez le résultat : Conforme, Alerte ou Non référencé</p>
              </div>
            </div>
            <div className="pt-2 border-t border-teal-200">
              <p className="text-[10px] text-teal-700">
                🔒 Vérification basée sur les données DPMED du Bénin. Protégez-vous contre les contrefaçons.
              </p>
              <p className="text-[10px] text-teal-600 mt-1">
                📦 Le code GS1 DataMatrix contient : GTIN (AI 01), N° de lot (AI 10), Date d&apos;expiration (AI 17), N° de série (AI 21)
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
