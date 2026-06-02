'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Star, Gift, Trophy, History, TrendingUp, Loader2, Shield, Crown, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Transaction {
  id: string
  type: string
  points: number
  description: string
  createdAt: string
}

interface FideliteData {
  points: number
  estFidele: boolean
  transactions: Transaction[]
  prochainPalier: number
}

// Task spec: Bronze <500, Silver 500-1500, Gold 1500+
const tierConfig = [
  { name: 'Bronze', minPoints: 0, color: 'bg-amber-700', textColor: 'text-amber-700', icon: Shield, bgGradient: 'from-amber-100 to-amber-50' },
  { name: 'Silver', minPoints: 500, color: 'bg-gray-400', textColor: 'text-gray-600', icon: Award, bgGradient: 'from-gray-100 to-gray-50' },
  { name: 'Gold', minPoints: 1500, color: 'bg-yellow-500', textColor: 'text-yellow-600', icon: Crown, bgGradient: 'from-yellow-100 to-yellow-50' },
]

function getTier(points: number) {
  for (let i = tierConfig.length - 1; i >= 0; i--) {
    if (points >= tierConfig[i].minPoints) return { ...tierConfig[i], index: i }
  }
  return { ...tierConfig[0], index: 0 }
}

function getNextTier(points: number) {
  const current = getTier(points)
  if (current.index >= tierConfig.length - 1) return null
  return tierConfig[current.index + 1]
}

const rewards = [
  { id: '1', nom: 'Remise 5%', points: 200, description: '5% de remise sur votre prochaine commande' },
  { id: '2', nom: 'Livraison gratuite', points: 300, description: 'Livraison offerte sur une commande' },
  { id: '3', nom: 'Remise 10%', points: 500, description: '10% de remise sur votre prochaine commande' },
  { id: '4', nom: 'Consultation offerte', points: 1000, description: 'Consultation pharmacien offerte' },
]

export default function FidelitePage() {
  const [data, setData] = useState<FideliteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [redeeming, setRedeeming] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const patientId = patients[0].id
          const res = await fetch(`/api/patient/fidelite?patientId=${patientId}`)
          if (res.ok) {
            const fideliteData = await res.json()
            setData(fideliteData)
            return
          }
        }
      }
    } catch {
      // Fallback
    }
    setData({
      points: 0,
      estFidele: false,
      transactions: [],
      prochainPalier: 500,
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (data) setLoading(false)
  }, [data])

  const currentPoints = data?.points || 0
  const currentTier = getTier(currentPoints)
  const nextTier = getNextTier(currentPoints)
  const nextTierPoints = nextTier?.minPoints || currentTier.minPoints
  const progressPercent = nextTier
    ? Math.min(((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100, 100)
    : 100
  const transactions = data?.transactions || []
  const badges = [
    { id: '1', nom: 'Premier achat', description: 'Première commande passée', icon: '🛒', unlocked: currentPoints >= 0 },
    { id: '2', nom: 'Fidèle', description: 'Niveau Silver atteint', icon: '❤️', unlocked: currentTier.index >= 1 },
    { id: '3', nom: 'Santé active', description: 'Niveau Gold atteint', icon: '💪', unlocked: currentTier.index >= 2 },
    { id: '4', nom: 'Vérificateur', description: 'Vérifié 5 médicaments', icon: '✅', unlocked: true },
  ]

  const handleRedeem = async (reward: typeof rewards[0]) => {
    if (currentPoints < reward.points) return
    setRedeeming(reward.id)
    try {
      const patientRes = await fetch('/api/patients')
      if (patientRes.ok) {
        const patients = await patientRes.json()
        if (Array.isArray(patients) && patients.length > 0) {
          const patientId = patients[0].id
          const res = await fetch('/api/patient/fidelite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId,
              type: 'SPEND',
              points: -reward.points,
              description: `Échange : ${reward.nom}`,
            }),
          })
          if (res.ok) {
            toast.success(`${reward.nom} échangé avec succès !`)
            fetchData()
          } else {
            toast.error('Erreur lors de l\'échange')
          }
        }
      }
    } catch {
      toast.error('Erreur lors de l\'échange')
    } finally {
      setRedeeming(null)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    )
  }

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" />
        Programme fidélité
      </h1>

      {/* Points Balance & Tier */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
        <Card className={`border-amber-400/30 bg-gradient-to-br ${currentTier.bgGradient}`}>
          <CardContent className="p-5 text-center">
            <div className="flex justify-center mb-2">
              <div className={`w-12 h-12 rounded-full ${currentTier.color} flex items-center justify-center`}>
                <currentTier.icon className="h-6 w-6 text-white" />
              </div>
            </div>
            <Badge className={`${currentTier.color} text-white border-0 mb-2`}>{currentTier.name}</Badge>
            <p className="text-4xl font-bold text-amber-600">{currentPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">points fidélité</p>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span className={currentTier.textColor}>{currentTier.name}</span>
                {nextTier ? (
                  <span>{nextTier.name} : {nextTier.minPoints} pts</span>
                ) : (
                  <span>Niveau maximum atteint !</span>
                )}
              </div>
              <Progress value={progressPercent} className="h-2" />
              {nextTier && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  Plus que <span className="font-semibold">{nextTier.minPoints - currentPoints} points</span> pour atteindre le niveau {nextTier.name}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tier progression */}
      <div className="flex items-center gap-1 px-2">
        {tierConfig.map((tier, idx) => (
          <div key={tier.name} className="flex-1 flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${
              idx <= currentTier.index ? tier.color + ' text-white' : 'bg-gray-100 text-gray-400'
            }`}>
              <tier.icon className="h-4 w-4" />
            </div>
            <p className="text-[9px] mt-0.5 text-center">{tier.name}</p>
            <p className="text-[8px] text-muted-foreground">{tier.minPoints} pts</p>
          </div>
        ))}
      </div>

      {/* Badges */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Badges
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((badge) => (
            <Card key={badge.id} className={`border-teal-200 ${!badge.unlocked ? 'opacity-40' : ''}`}>
              <CardContent className="p-2 text-center">
                <div className="text-lg mb-0.5">{badge.icon}</div>
                <p className="text-[9px] font-semibold text-gray-900">{badge.nom}</p>
                {badge.unlocked && (
                  <Badge variant="secondary" className="text-[7px] bg-green-50 text-green-700 border-0 mt-0.5">Débloqué</Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Rewards Catalog */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Gift className="h-4 w-4 text-primary" />
          Récompenses
        </h2>
        <div className="space-y-2">
          {rewards.map((reward) => {
            const canRedeem = currentPoints >= reward.points
            return (
              <Card key={reward.id} className="border-teal-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                    <Gift className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900">{reward.nom}</p>
                    <p className="text-[10px] text-muted-foreground">{reward.description}</p>
                    <p className="text-[10px] font-semibold text-amber-600 mt-0.5">{reward.points} points</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-[10px] bg-primary hover:bg-teal-700"
                    disabled={!canRedeem || redeeming === reward.id}
                    onClick={() => handleRedeem(reward)}
                  >
                    {redeeming === reward.id ? <Loader2 className="h-3 w-3 animate-spin" /> : canRedeem ? 'Échanger' : 'Insuffisant'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Points History Table */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historique des points
        </h2>
        <Card className="border-teal-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-teal-100">
                    <th className="text-left p-3 text-[10px] font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 text-[10px] font-medium text-muted-foreground">Type</th>
                    <th className="text-right p-3 text-[10px] font-medium text-muted-foreground">Points</th>
                    <th className="text-left p-3 text-[10px] font-medium text-muted-foreground">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.length > 0 ? transactions.map((entry) => (
                    <tr key={entry.id} className="border-b border-teal-50 last:border-0 hover:bg-teal-50/30">
                      <td className="p-3 text-xs text-gray-700">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="p-3">
                        <Badge className={`text-[8px] border-0 ${
                          entry.type === 'EARN' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {entry.type === 'EARN' ? 'Gain' : 'Utilisation'}
                        </Badge>
                      </td>
                      <td className={`p-3 text-xs text-right font-semibold ${entry.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.points > 0 ? '+' : ''}{entry.points}
                      </td>
                      <td className="p-3 text-xs text-gray-700 max-w-[140px] truncate">{entry.description}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">Aucune transaction pour le moment</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
