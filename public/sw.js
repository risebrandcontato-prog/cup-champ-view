// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER — APOSTA RESTRITA PWA v1.0.2
// Workbox 7 + Push VAPID + Forced Update
// ═══════════════════════════════════════════════════════════════

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

const { precaching, routing, strategies, expiration, cacheableResponse } = workbox;

const SW_VERSION = '1.0.2';

// ─── Precache manifest ───
const PRECACHE_ASSETS = [
  { url: '/', revision: SW_VERSION },
  { url: '/manifest.json', revision: SW_VERSION },
  { url: '/icons/icon-192x192.png', revision: SW_VERSION },
  { url: '/icons/icon-512x512.png', revision: SW_VERSION },
];

precaching.precacheAndRoute(PRECACHE_ASSETS);

// ─── Cache de páginas ───
routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Cache de assets estáticos ───
routing.registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new strategies.StaleWhileRevalidate({
    cacheName: 'assets-cache',
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Cache de imagens ───
routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new strategies.CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 24 * 60 * 60 }),
      new cacheableResponse.CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// ─── Cache de fontes ───
routing.registerRoute(
  ({ request }) => request.destination === 'font',
  new strategies.CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 30, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

// ─── Cache de API Supabase ───
routing.registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new expiration.ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

// ─── Offline fallback ───
routing.setCatchHandler(async ({ event }) => {
  if (event.request.destination === 'document') {
    return new Response(
      `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>ANÁLISE RESTRITA — Offline</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#0A0A0A;color:#fff;font-family:system-ui,-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center}
.container{max-width:400px}
.icon{width:80px;height:80px;margin:0 auto 24px;background:#1a1a1a;border-radius:24px;display:flex;align-items:center;justify-content:center;font-size:40px}
h1{font-size:24px;font-weight:900;margin-bottom:12px;color:#00C853}
p{color:#888;font-size:14px;line-height:1.6;margin-bottom:24px}
button{background:#00C853;color:#000;border:none;padding:14px 32px;border-radius:12px;font-weight:800;font-size:14px;cursor:pointer}
</style>
</head>
<body>
<div class="container">
<div class="icon">📡</div>
<h1>Você está offline</h1>
<p>Verifique sua conexão com a internet e tente novamente. As análises ficarão disponíveis assim que a conexão for restabelecida.</p>
<button onclick="location.reload()">Tentar Novamente</button>
</div>
</body>
</html>`,
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
  return Response.error();
});

// ═══════════════════════════════════════════════════════════════
// INSTALL / ACTIVATE — Forced update para PWA
// ═══════════════════════════════════════════════════════════════

self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${SW_VERSION}`);
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log(`[SW] Activated v${SW_VERSION}`);
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !name.startsWith('workbox-'))
          .map((name) => {
            console.log(`[SW] Clearing old cache: ${name}`);
            return caches.delete(name);
          })
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Message handler ───
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0].postMessage(SW_VERSION);
  }
});

// ═══════════════════════════════════════════════════════════════
// NOTIFICAÇÕES PUSH VAPID
// ═══════════════════════════════════════════════════════════════

self.addEventListener('push', (event) => {
  console.log('[SW] Push received', event);

  let data = {
    title: 'Nova Análise Disponível',
    body: 'O admin publicou uma nova análise!',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'new-analysis',
    requireInteraction: false,
    data: { url: '/', type: 'analysis' },
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data', e);
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-72x72.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction ?? false,
    // @ts-ignore
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' },
    // @ts-ignore
    actions: data.actions || [
      { action: 'open', title: 'Ver Agora', icon: '/icons/icon-72x72.png' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked', event);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  if (event.action === 'open') {
    event.waitUntil(self.clients.openWindow(urlToOpen));
    return;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log(`[SW] APOSTA RESTRITA PWA Service Worker v${SW_VERSION} ativo`);