// ═══════════════════════════════════════════════════════════════
// SERVICE WORKER - APOSTA RESTRITA PWA
// Workbox 7 via CDN (importScripts)
// ═══════════════════════════════════════════════════════════════

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });

const { precaching, routing, strategies, expiration, cacheableResponse } = workbox;

// ─── Precache manifest (gerado manualmente - atualizar quando mudar assets) ───
// Estes são os assets críticos que devem estar disponíveis offline
const PRECACHE_ASSETS = [
  { url: '/', revision: '1.0.0' },
  { url: '/manifest.json', revision: '1.0.0' },
  { url: '/icons/icon-192x192.png', revision: '1.0.0' },
  { url: '/icons/icon-512x512.png', revision: '1.0.0' },
];

precaching.precacheAndRoute(PRECACHE_ASSETS);

// ─── Cache de páginas (HTML/navegação) ───
routing.registerRoute(
  ({ request }) => request.mode === 'navigate',
  new strategies.NetworkFirst({
    cacheName: 'pages-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 dias
      }),
    ],
  })
);

// ─── Cache de assets estáticos (JS, CSS) ───
routing.registerRoute(
  ({ request }) =>
    request.destination === 'script' ||
    request.destination === 'style',
  new strategies.StaleWhileRevalidate({
    cacheName: 'assets-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 dias
      }),
    ],
  })
);

// ─── Cache de imagens ───
routing.registerRoute(
  ({ request }) => request.destination === 'image',
  new strategies.CacheFirst({
    cacheName: 'images-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 200,
        maxAgeSeconds: 60 * 24 * 60 * 60, // 60 dias
      }),
      new cacheableResponse.CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  })
);

// ─── Cache de fontes ───
routing.registerRoute(
  ({ request }) => request.destination === 'font',
  new strategies.CacheFirst({
    cacheName: 'fonts-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 30,
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1 ano
      }),
    ],
  })
);

// ─── Cache de API Supabase (dados) ───
routing.registerRoute(
  ({ url }) => url.hostname.includes('supabase.co'),
  new strategies.NetworkFirst({
    cacheName: 'api-cache',
    plugins: [
      new expiration.ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 5 * 60, // 5 minutos
      }),
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
<title>APOSTA RESTRITA — Offline</title>
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

// ─── Skip waiting + Claim clients (update sem reload forçado) ───
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Message handler para comunicação com o app ───
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] APOSTA RESTRITA PWA Service Worker ativo');