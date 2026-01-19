// Service Worker (offline cache only)

const CACHE_NAME = "sherdor-mebel-v1"
const urlsToCache = ["/", "/manifest.json", "/icon-192.jpg", "/icon-512.jpg"]

self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...")
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[SW] Cache opened")
        return cache.addAll(urlsToCache).catch((err) => {
          console.warn("[SW] Some files failed to cache:", err)
          return Promise.resolve()
        })
      })
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const cache = caches.open(CACHE_NAME)
          cache.then((c) => c.put(event.request, response.clone()))
        }
        return response
      })
      .catch(() => {
        return caches.match(event.request).then((response) => response || new Response("Offline"))
      }),
  )
})

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...")
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("[SW] Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => self.clients.claim()),
  )
})

// --- Push notifications (Android Chrome + iOS 16.4+ installed PWA) ---

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : "" }
  }

  const title = data.title || "Mebel Sherdor"
  const options = {
    body: data.body || "",
    icon: "/icon-192.jpg",
    badge: "/icon-192.jpg",
    data: { url: data.url || "/" },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification?.data?.url || "/"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.focus()
          if ("navigate" in client) {
            try {
              client.navigate(url)
            } catch {}
          }
          return
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url)
      }
    }),
  )
})
