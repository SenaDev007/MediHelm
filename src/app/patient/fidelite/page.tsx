'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Star, Gift, Trophy, History, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

const badges = [
  { id: '1', nom: 'Premier achat', description: 'Première commande passée', icon: '🛒', unlocked: true },
  { id: '2', nom: 'Fidèle', description: '5 commandes complétées', icon: '❤️', unlocked: true },
  { id: '3', nom: 'Santé active', description: '10 commandes complétées', icon: '💪', unlocked: false },
  { id: '4', nom: 'Super patient', description: '25 commandes complétées', icon: '🏆', unlocked: false },
  { id: '5', nom: 'Vérificateur', description: 'Vérifié 5 médicaments', icon: '✅', unlocked: true },
]

const rewards = [
  { id: '1', nom: 'Remise 5%', points: 200, description: '5% de remise sur votre prochaine commande' },
  { id: '2', nom: 'Livraison gratuite', points: 300, description: 'Livraison offerte sur une commande' },
  { id: '3', nom: 'Remise 10%', points: 500, description: '10% de remise sur votre prochaine commande' },
  { id: '4', nom: 'Consultation offerte', points: 1000, description: 'Consultation pharmacien offerte' },
]

const history = [
  { id: '1', type: 'EARN', points: 50, description: 'Commande CMD-001', date: '2026-05-28' },
  { id: '2', type: 'EARN', points: 30, description: 'Vérification médicament', date: '2026-05-25' },
  { id: '3', type: 'SPEND', points: -200, description: 'Remise 5% utilisée', date: '2026-05-20' },
  { id: '4', type: 'EARN', points: 75, description: 'Commande CMD-002', date: '2026-05-15' },
]

export default function FidelitePage() {
  const currentPoints = 320
  const nextLevelPoints = 500
  const progressPercent = (currentPoints / nextLevelPoints) * 100

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <h1 className="text-lg font-bold text-teal-800 flex items-center gap-2">
        <Star className="h-5 w-5 text-amber-500" />
        Programme fidélité
      </h1>

      {/* Points Balance */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <Card className="border-amber-400/30 bg-gradient-to-br from-amber-50 to-teal-50">
          <CardContent className="p-5 text-center">
            <p className="text-xs text-muted-foreground mb-1">Vos points</p>
            <p className="text-4xl font-bold text-amber-600">{currentPoints}</p>
            <p className="text-xs text-muted-foreground mt-1">points fidélité</p>
            <div className="mt-4">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Niveau actuel</span>
                <span>Prochain palier : {nextLevelPoints} pts</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Badges */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Badges
        </h2>
        <div className="grid grid-cols-3 gap-2">
          {badges.map((badge) => (
            <Card key={badge.id} className={`border-teal-200 ${!badge.unlocked ? 'opacity-40' : ''}`}>
              <CardContent className="p-3 text-center">
                <div className="text-2xl mb-1">{badge.icon}</div>
                <p className="text-[10px] font-semibold text-gray-900">{badge.nom}</p>
                <p className="text-[9px] text-muted-foreground">{badge.description}</p>
                {badge.unlocked && (
                  <Badge variant="secondary" className="text-[8px] bg-green-50 text-green-700 border-0 mt-1">
                    Débloqué
                  </Badge>
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
                    disabled={!canRedeem}
                    onClick={() => toast('Fonctionnalité d\'échange bientôt disponible')}
                  >
                    {canRedeem ? 'Échanger' : 'Insuffisant'}
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Points History */}
      <div>
        <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          Historique des points
        </h2>
        <Card className="border-teal-200">
          <CardContent className="p-3 space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-1.5 border-b border-teal-50 last:border-0">
                <div className="flex items-center gap-2">
                  {entry.type === 'EARN' ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-destructive rotate-180" />
                  )}
                  <span className="text-xs text-gray-900">{entry.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${entry.points > 0 ? 'text-green-600' : 'text-destructive'}`}>
                    {entry.points > 0 ? '+' : ''}{entry.points}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
