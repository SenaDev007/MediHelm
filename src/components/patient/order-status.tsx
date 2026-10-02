'use client'

import { Check, Clock, Package, ShoppingBag, Truck, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Statuts alignés sur l'enum Prisma StatutCommandePatient
type OrderStatus = 'RECUE' | 'EN_PREPARATION' | 'PRETE' | 'RECUPEREE' | 'ANNULEE'

interface OrderStatusProps {
  status: OrderStatus
  createdAt: string
}

const statusSteps: { key: OrderStatus; label: string; icon: React.ElementType }[] = [
  { key: 'RECUE', label: 'Reçue', icon: Clock },
  { key: 'EN_PREPARATION', label: 'En préparation', icon: Package },
  { key: 'PRETE', label: 'Prête', icon: ShoppingBag },
  { key: 'RECUPEREE', label: 'Récupérée', icon: Truck },
]

const statusColors: Record<OrderStatus, string> = {
  RECUE: 'bg-amber-400',
  EN_PREPARATION: 'bg-primary',
  PRETE: 'bg-green-500',
  RECUPEREE: 'bg-teal-800',
  ANNULEE: 'bg-destructive',
}

const statusLabels: Record<OrderStatus, string> = {
  RECUE: 'Reçue par la pharmacie',
  EN_PREPARATION: 'En préparation',
  PRETE: 'Prête — venez récupérer',
  RECUPEREE: 'Récupérée',
  ANNULEE: 'Annulée',
}

export function OrderStatusIndicator({ status, createdAt }: OrderStatusProps) {
  if (status === 'ANNULEE') {
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
