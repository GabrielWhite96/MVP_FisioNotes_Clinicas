/// <reference lib="webworker" />
const CACHE = 'fisionotes-shell-v1'
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/logos/logo_semfundo_sem_nome.png']

self.addEventListener('install', (event) => {
  const e = event as ExtendableEvent
  e.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)))
  ;(self as unknown as ServiceWorkerGlobalScope).skipWaiting()
})

self.addEventListener('activate', (event) => {
  const e = event as ExtendableEvent
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
  ;(self as unknown as ServiceWorkerGlobalScope).clients.claim()
})

self.addEventListener('fetch', (event) => {
  const e = event as FetchEvent
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then((cached) => cached ?? fetch(e.request).catch(() => cached as Response))
  )
})
