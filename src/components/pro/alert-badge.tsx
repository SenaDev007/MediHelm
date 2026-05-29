'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { NiveauUrgence, NiveauAlerte, NiveauRisque } from '@prisma/client'

type UrgencyLevel = NiveauUrgence | NiveauAlerte | NiveauRisque | string

const urgencyStyles: Record<string, string> = {
  URGENCE_IMMEDIATE: 'bg-red-600 text-white animate-pulse',
  CRITIQUE: 'bg-red-600 text-white animate-pulse',
  URGENT: 'bg-orange-500 text-white',
  ELEVE: 'bg-orange-500 text-white',
  ATTENTION: 'bg-amber-400 text-gray-900',
  MODERE: 'bg-amber-400 text-gray-900',
  NORMAL: 'bg-blue-500 text-white',
  INFORMATIF: 'bg-gray-400 text-white',
  INFO: 'bg-gray-400 text-white',
}

interface AlertBadgeProps {
  level: UrgencyLevel
  label?: string
  className?: string
}

export function AlertBadge({ level, label, className }: AlertBadgeProps) {
  const style = urgencyStyles[level] || 'bg-gray-400 text-white'

  return (
    <Badge className={cn('text-[10px] font-semibold uppercase tracking-wide border-0', style, className)}>
      {label || level.replace(/_/g, ' ')}
    </Badge>
  )
}
