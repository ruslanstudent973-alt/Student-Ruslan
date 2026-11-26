/* YuYu Shop Service Worker — PWA Installability & Live Web Push Notifications */

const SW_VERSION = "yuyu-sw-v1";
const STATIC_CACHE = `${SW_VERSION}-static`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        cache.addAll([
          "/manifest.json",
          "/icon.svg",
          "/apple-touch-icon.png",
          "/icons/icon-192x192.png",
          "/icons/icon-512x512.png",
        ])
      )
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("yuyu-sw-") && k !== STATIC_CACHE)
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Lightweight network-first fetch handler for installability without breaking API or R2 streams
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/_next/")) {
    return;
  }

  if (
    url.pathname === "/manifest.json" ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/apple-touch-icon.png" ||
    url.pathname.startsWith("/icons/")
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return response;
        });
      })
    );
  }
});

// Listen for incoming Web Push messages from /api/push/send, Cargo updates, and Live Auctions
self.addEventListener("push", (event) => {
  let payload = {
    title: "YuYu Shop",
    body: "Sizda yangi bildirishnoma bor",
    icon: "/icons/icon-192x192.png",
    badge: "/icons/icon-192x192.png",
    url: "/",
    tag: "yuyu-notification",
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      if (parsed && typeof parsed === "object") {
        payload = {
          title: typeof parsed.title === "string" && parsed.title.trim() ? parsed.title : payload.title,
          body: typeof parsed.body === "string" && parsed.body.trim() ? parsed.body : payload.body,
          icon: typeof parsed.icon === "string" && parsed.icon.trim() ? parsed.icon : payload.icon,
          badge: typeof parsed.badge === "string" && parsed.badge.trim() ? parsed.badge : payload.badge,
          url: typeof parsed.url === "string" && parsed.url.startsWith("/") ? parsed.url : "/",
          tag: typeof parsed.tag === "string" && parsed.tag.trim() ? parsed.tag : payload.tag,
        };
      }
    } catch {
      const text = event.data.text();
      if (text) payload.body = text;
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: payload.icon,
      badge: payload.badge,
      tag: payload.tag,
      renotify: true,
      vibrate: [160, 80, 160],
      data: {
        url: payload.url,
      },
    })
  );
});

// Open or focus the exact target page (orders cargo tracker, live auction, etc.) on click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawUrl =
    event.notification &&
    event.notification.data &&
    typeof event.notification.data.url === "string"
      ? event.notification.data.url
      : "/";
  const safePath = rawUrl.startsWith("/") ? rawUrl : "/";
  const targetUrl = new URL(safePath, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(self.location.origin) && "focus" in client) {
            return client
              .navigate(targetUrl)
              .catch(() => {})
              .then(() => client.focus());
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return undefined;
      })
  );
});
