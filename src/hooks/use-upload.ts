'use client'
import { useState, useCallback } from 'react'

export function useUpload() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<{ url: string; filename: string; size: number } | null> => {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/upload', { method: 'POST', body: formData })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erreur upload')
      }
      return await response.json()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur upload'
      setError(message)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  return { upload, uploading, error }
}
