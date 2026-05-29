'use client'

import { Check, Clock, Package, ShoppingBag, Truck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'PICKED_UP' | 'CANCELLED'

interface OrderStatusProps {
  status: OrderStatus
  createdAt: string
}

const statusSteps: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'PENDING', label: 'En attente', icon: Clock },
  { key: 'CONFIRMED', label: 'Confirmée', icon: Check },
  { key: 'PREPARING', label: 'En préparation', icon: Package },
  { key: 'READY', label: 'Prête', icon: ShoppingBag },
  { key: 'PICKED_UP', label: 'Récupérée', icon: Truck },
]

const statusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-amber-400',
  CONFIRMED: 'bg-blue-brand',
  PREPARING: 'bg-primary',
  READY: 'bg-green-500',
  PICKED_UP: 'bg-teal-800',
  CANCELLED: 'bg-destructive',
}

const statusLabels: Record<OrderStatus, string> = {
  PENDING: 'En attente',
  CONFIRMED: 'Confirmée',
  PREPARING: 'En préparation',
  READY: 'Prête — venez récupérer',
  PICKED_UP: 'Récupérée',
  CANCELLED: 'Annulée',
}

export function OrderStatusIndicator({ status, createdAt }: OrderStatusProps) {
  if (status === 'CANCELLED') {
    return (
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <span className="text-sm font-medium text-destructive">Annulée</span>
      </div>
    )
  }

  const currentIndex = statusSteps.findIndex((s) => s.key === status)

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {statusSteps.map((step, idx) => {
          const isCompleted = idx <= currentIndex
          const isCurrent = idx === currentIndex
          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-colors',
                  isCompleted ? 'bg-primary text-white' : 'bg-teal-50 text-muted-foreground',
                  isCurrent && 'ring-2 ring-primary ring-offset-2'
                )}
              >
                <step.icon className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'text-[10px] mt-1 text-center leading-tight',
                  isCompleted ? 'text-primary font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div className="relative h-1 bg-teal-50 rounded-full mt-1">
        <div
          className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${(currentIndex / (statusSteps.length - 1)) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Statut : <span className="font-medium text-foreground">{statusLabels[status]}</span>
      </p>
    </div>
  )
}

export function getOrderStatusColor(status: OrderStatus): string {
  return statusColors[status]
}

export function getOrderStatusLabel(status: OrderStatus): string {
  return statusLabels[status]
}
