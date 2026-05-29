'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { QrCode, ScanLine, CheckCircle2, AlertTriangle, XCircle, Shield, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type VerificationResult = 'CONFORME' | 'ALERTE' | 'NON_REFERENCIE' | null

export default function VerifierPage() {
  const [barcode, setBarcode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<VerificationResult>(null)
  const [medicamentInfo, setMedicamentInfo] = useState<{
    nom: string; dci: string; fabricant: string; lot: string
  } | null>(null)
  const [verificationTime, setVerificationTime] = useState(0)

  const handleVerify = async () => {
    if (!barcode.trim()) return
    setVerifying(true)
    setResult(null)
    setMedicamentInfo(null)

    const startTime = Date.now()

    try {
      const res = await fetch(`/api/patient/verifier?code=${encodeURIComponent(barcode)}`)
      const data = await res.json()
      const elapsed = Date.now() - startTime
      setVerificationTime(elapsed > 3000 ? elapsed : 3000)

      // Wait minimum 3 seconds for dramatic effect
      await new Promise(resolve => setTimeout(resolve, Math.max(0, 3000 - (Date.now() - startTime))))

      setResult(data.statut || 'NON_REFERENCIE')
      if (data.medicament) {
        setMedicamentInfo(data.medicament)
      }
    } catch {
      await new Promise(resolve => setTimeout(resolve, 3000))
      setResult('NON_REFERENCIE')
    } finally {
      setVerifying(false)
    }
  }

  const resultConfig: Record<string, { icon: React.ElementType; color: string; bg: string; title: string; description: string }> = {
    CONFORME: {
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-200',
      title: 'CONFORME',
      description: 'Ce médicament est authentique et référencé dans la base MédiHelm.',
    },
    ALERTE: {
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-200',
      title: 'ALERTE',
      description: 'Ce médicament fait l\'objet d\'une alerte. Contactez votre pharmacien.',
    },
    NON_REFERENCIE: {
      icon: XCircle,
      color: 'text-destructive',
      bg: 'bg-red-50 border-red-200',
      title: 'NON RÉFÉRENCÉ',
      description: 'Ce code n\'est pas référencé dans notre base. Vérifiez le code ou consultez votre pharmacien.',
    },
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      <div className="text-center">
        <h1 className="text-lg font-bold text-teal-800 flex items-center justify-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Vérifier un médicament
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Scannez ou saisissez le code-barres / QR code pour vérifier l&apos;authenticité
        </p>
        <Badge variant="secondary" className="text-[10px] bg-teal-50 text-teal-800 border-0 mt-2">
          Fonctionnalité publique — Aucun compte requis
        </Badge>
      </div>

      {/* Input */}
      <Card className="border-teal-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Code-barres ou QR code"
                className="pl-10 h-11 border-teal-200"
                onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
              />
            </div>
            <Button
              className="h-11 bg-primary hover:bg-teal-700"
              onClick={handleVerify}
              disabled={!barcode.trim() || verifying}
            >
              {verifying ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Camera placeholder */}
          <Button
            variant="outline"
            className="w-full h-10 border-dashed border-teal-200 text-xs text-muted-foreground"
            disabled
          >
            <ScanLine className="h-4 w-4 mr-2" />
            Scanner avec la caméra (bientôt disponible)
          </Button>
        </CardContent>
      </Card>

      {/* Verification Result */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          >
            <Card className={`border-2 ${resultConfig[result].bg}`}>
              <CardContent className="p-6 text-center">
                <div className={`w-16 h-16 rounded-full ${resultConfig[result].bg} flex items-center justify-center mx-auto mb-3`}>
                  {(() => {
                    const Icon = resultConfig[result].icon
                    return <Icon className={`h-8 w-8 ${resultConfig[result].color}`} />
                  })()}
                </div>
                <h2 className={`text-xl font-bold ${resultConfig[result].color}`}>
                  {resultConfig[result].title}
                </h2>
                <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
                  {resultConfig[result].description}
                </p>
                {medicamentInfo && (
                  <div className="mt-4 text-left space-y-1.5 bg-white/50 rounded-lg p-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Médicament</span>
                      <span className="font-medium">{medicamentInfo.nom}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">DCI</span>
                      <span className="font-medium">{medicamentInfo.dci}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Fabricant</span>
                      <span className="font-medium">{medicamentInfo.fabricant}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">N° Lot</span>
                      <span className="font-medium font-mono">{medicamentInfo.lot}</span>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground mt-3">
                  Vérification effectuée en {Math.round(verificationTime / 1000)}s
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <Card className="border-teal-200">
        <CardContent className="p-4">
          <h3 className="text-xs font-semibold text-gray-900 mb-2">Comment ça marche ?</h3>
          <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>Scannez ou saisissez le code-barres / QR code du médicament</li>
            <li>Le système vérifie dans la base de données MédiHelm</li>
            <li>Résultat en 3 secondes : CONFORME, ALERTE ou NON RÉFÉRENCÉ</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
