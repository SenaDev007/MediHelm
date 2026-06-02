'use client'
import { useState, useCallback } from 'react'

type Locale = 'fr' | 'en'

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>(
    (typeof window !== 'undefined' && localStorage.getItem('medihelm-locale') as Locale) || 'fr'
  )

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem('medihelm-locale', newLocale)
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    window.location.reload()
  }, [])

  return { locale, setLocale }
}
