const CACHE_NAME = 'medihelm-v2'
const OFFLINE_URLS = [
  '/',
  '/patient',
  '/connexion',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(OFFLINE_URLS)
    })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone()
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone)
        })
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((response) => {
          return response || caches.match('/')
        })
      })
  )
})

// Handle offline vente storage
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'STORE_OFFLINE_VENTE') {
    // Store in IndexedDB via the main thread
    event.ports[0].postMessage({ stored: true })
  }
})
