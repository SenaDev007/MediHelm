'use client'

interface ComplianceGaugeProps {
  score: number
  maxScore?: number
  size?: number
  label?: string
}

export function ComplianceGauge({ score, maxScore = 100, size = 180, label }: ComplianceGaugeProps) {
  const strokeWidth = 12
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(score / maxScore, 1)
  const offset = circumference * (1 - progress)

  const getColor = (s: number) => {
    if (s >= 80) return '#1D9E75'
    if (s >= 60) return '#EF9F27'
    if (s >= 40) return '#F97316'
    return '#E24B4A'
  }

  const color = getColor(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E1F5EE"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-3xl font-bold" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs text-muted-foreground">/ {maxScore}</span>
      </div>
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
    </div>
  )
}
