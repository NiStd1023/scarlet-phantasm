'use strict';

// Bump this version whenever any precached file changes.
const CACHE_PREFIX = 'scarlet-phantasm-pwa-';
const CACHE_NAME = CACHE_PREFIX + 'v2';
const FILES = [
  'index.html', 'manifest.webmanifest',
  'style.css?v=pwa-20261126', 'game.js?v=audio-balance-20261125',
  'pwa.js?v=pwa-20261126', 'key-art.png',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png',
  ...['player', 'player_cast', 'enemy', 'enemy_cast', 'midboss', 'boss1', 'boss2', 'boss3', 'boss3_rage'].map(name => `assets/${name}.webp`),
  ...['stage1', 'stage2', 'stage3', 'boss1', 'boss2', 'boss3'].map(name => `music/${name}-v5.mp3`)
];
const scoped = path => new URL(path, self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // All game assets are needed for a complete offline session. If any fail,
    // keep the previous worker rather than activating an incomplete cache.
    await cache.addAll(FILES.map(path => new Request(scoped(path), { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

// Audio elements may request a byte range when seeking or looping. A cached
// full MP3 needs a matching partial response so music also works offline.
async function rangeResponse(request, response) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') || '');
  if (!match || (!match[1] && !match[2])) return response;
  const blob = await response.blob();
  const size = blob.size;
  let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  let end = match[1] && match[2] ? Number(match[2]) : size - 1;
  if (start >= size || end < start || (!match[1] && Number(match[2]) === 0)) {
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  end = Math.min(end, size - 1);
  const headers = new Headers(response.headers);
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  return new Response(blob.slice(start, end + 1), { status: 206, headers });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (request.mode === 'navigate') {
      // Online visitors see updates immediately; offline launches use the
      // complete bundle saved by the currently active worker.
      try {
        const response = await fetch(request);
        if (response.ok) return response;
      } catch (_) {}
      return (await cache.match(scoped('index.html'))) || Response.error();
    }
    const cached = await cache.match(request);
    if (!cached) return fetch(request);
    if (request.headers.has('range') && url.pathname.endsWith('.mp3')) return rangeResponse(request, cached);
    return cached;
  })());
});
