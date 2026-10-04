'use client'

import { useState, useCallback, useEffect, useRef } from 'react'

/**
 * Position de l'utilisateur — acquisition ponctuelle + suivi continu.
 *
 * `request()`    : une lecture ponctuelle (au chargement de la page, refresh).
 * `startWatching()` / `stopWatching()` : suivi continu (mode « en route » vers
 * une pharmacie) — la carte se recentre et le kilométrage restant se met à
 * jour en temps réel, comme sur Google Maps.
 */
export function useUserPosition() {
  const [userLat, setUserLat] = useState<number | undefined>()
  const [userLng, setUserLng] = useState<number | undefined>()
  const [geoError, setGeoError] = useState<string | null>(null)
  const [watching, setWatching] = useState(false)
  const watchIdRef = useRef<number | null>(null)
  /** Dernière position connue (ref — lue par les effets sans re-abonnement) */
  const posRef = useRef<{ lat: number; lng: number } | null>(null)

  const handlePosition = useCallback((lat: number, lng: number) => {
    posRef.current = { lat, lng }
    setUserLat(lat)
    setUserLng(lng)
    setGeoError(null)
  }, [])

  const handleError = useCallback((error: GeolocationPositionError) => {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        setGeoError('Accès à la localisation refusé')
        break
      case error.POSITION_UNAVAILABLE:
        setGeoError('Localisation non disponible')
        break
      case error.TIMEOUT:
        setGeoError('Délai de localisation dépassé')
        break
      default:
        setGeoError('Localisation indisponible')
    }
  }, [])

  const request = useCallback((onPosition?: (lat: number, lng: number) => void) => {
    if (!navigator.geolocation) {
      setGeoError('La géolocalisation n\'est pas supportée par votre navigateur')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        handlePosition(position.coords.latitude, position.coords.longitude)
        onPosition?.(position.coords.latitude, position.coords.longitude)
      },
      handleError,
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    )
  }, [handlePosition, handleError])

  const startWatching = useCallback(() => {
    if (!navigator.geolocation || watchIdRef.current !== null) return
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => handlePosition(position.coords.latitude, position.coords.longitude),
      () => { /* le suivi échoue silencieusement — la dernière position reste */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    )
    setWatching(true)
  }, [handlePosition])

  const stopWatching = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setWatching(false)
  }, [])

  // Nettoyage au démontage
  useEffect(() => () => stopWatching(), [stopWatching])

  return {
    userLat,
    userLng,
    posRef,
    geoError,
    watching,
    request,
    startWatching,
    stopWatching,
  }
}
