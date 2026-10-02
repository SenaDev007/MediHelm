'use client'

import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: {
    value: number
    label: string
  }
  variant?: 'default' | 'success' | 'warning' | 'danger'
  className?: string
}

const variantStyles = {
  default: 'border-border',
  success: 'border-primary/30 bg-primary/5',
  warning: 'border-amber-400/30 bg-amber-400/5',
  danger: 'border-destructive/30 bg-destructive/5',
}

const iconStyles = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-primary/10 text-primary',
  warning: 'bg-amber-400/10 text-amber-500',
  danger: 'bg-destructive/10 text-destructive',
}

export function KpiCard({ title, value, subtitle, icon: Icon, trend, variant = 'default', className }: KpiCardProps) {
  return (
    <Card className={cn('transition-shadow hover:shadow-md', variantStyles[variant], className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </span>
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            {subtitle && (
              <span className="text-xs text-muted-foreground">{subtitle}</span>
            )}
            {trend && (
              <span className={cn(
                'text-xs font-medium',
                trend.value >= 0 ? 'text-primary' : 'text-destructive'
              )}>
                {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
              </span>
            )}
          </div>
          <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg', iconStyles[variant])}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
