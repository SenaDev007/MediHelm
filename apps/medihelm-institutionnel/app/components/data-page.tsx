'use client'

import { useEffect, useState } from 'react'

type Column = { label: string; key: string }
type Payload = { data?: unknown; meta?: { total?: number }; error?: string }

function getValue(row: unknown, path: string): unknown {
  let value: unknown = row
  for (const part of path.split('.')) {
    if (!value || typeof value !== 'object') return undefined
    value = (value as Record<string, unknown>)[part]
  }
  return value
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (Array.isArray(value)) return value.length ? `${value.length} élément(s)` : '—'
  if (typeof value === 'object') return JSON.stringify(value)
  if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) return new Date(value).toLocaleString('fr-FR')
  return String(value)
}

export function DataPage({ title, eyebrow, description, endpoint, columns, note }: {
  title: string
  eyebrow: string
  description: string
  endpoint: string
  columns: Column[]
  note?: string
}) {
  const [rows, setRows] = useState<unknown[]>([])
  const [total, setTotal] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  async function fetchRows(signal?: AbortSignal) {
    const response = await fetch(endpoint, { cache: 'no-store', signal })
    const payload = await response.json() as Payload
    if (!response.ok) throw new Error(payload.error ?? 'Impossible de charger les données')
    return {
      rows: Array.isArray(payload.data) ? payload.data : [],
      total: payload.meta?.total ?? (Array.isArray(payload.data) ? payload.data.length : 0),
    }
  }

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await fetchRows()
      setRows(result.rows)
      setTotal(result.total)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les données')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    fetchRows(controller.signal).then((result) => {
      if (active) { setRows(result.rows); setTotal(result.total) }
    }).catch((reason: unknown) => {
      if (active && !(reason instanceof DOMException && reason.name === 'AbortError')) {
        setError(reason instanceof Error ? reason.message : 'Impossible de charger les données')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false; controller.abort() }
  }, [endpoint])

  return (
    <>
      <div className="page-heading">
        <div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="lede">{description}</p></div>
        <button className="button secondary" onClick={() => void load()} disabled={loading}>Actualiser</button>
      </div>
      {note && <aside className="note">{note}</aside>}
      {error && <p className="status error" role="alert">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {loading && <tr><td colSpan={columns.length}>Chargement…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={columns.length}>Aucun enregistrement.</td></tr>}
            {!loading && rows.map((row, index) => <tr key={String(getValue(row, 'id') ?? index)}>
              {columns.map((column) => <td key={column.key}>{display(getValue(row, column.key))}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="lede">{total} enregistrement(s) au total. Les données affichées dépendent des autorisations du compte.</p>
    </>
  )
}
