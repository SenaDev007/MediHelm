'use client'

import { useEffect, useState } from 'react'

type Metric = { label: string; key: string; suffix?: string }

export function MetricDashboard({ title, eyebrow, description, endpoint, metrics, notes = [] }: {
  title: string
  eyebrow: string
  description: string
  endpoint: string
  metrics: Metric[]
  notes?: string[]
}) {
  const [data, setData] = useState<Record<string, unknown> | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch(endpoint, { cache: 'no-store' }).then(async (response) => {
      const payload = await response.json() as { data?: Record<string, unknown>; error?: string }
      if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger le tableau de bord')
      if (active) setData(payload.data ?? {})
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'API indisponible')
    })
    return () => { active = false }
  }, [endpoint])
  return (
    <>
      <div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div></div>
      {error && <p className="status error" role="alert">{error}</p>}
      <div className="metric-grid">
        {metrics.map((metric) => {
          const value = data?.[metric.key]
          return <article className="metric" key={metric.key}><span>{metric.label}</span><strong>{value === null || value === undefined ? '—' : `${String(value)}${metric.suffix ?? ''}`}</strong></article>
        })}
      </div>
      {notes.map((note) => <aside className="note" key={note}>{note}</aside>)}
    </>
  )
}
