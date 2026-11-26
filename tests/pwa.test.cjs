'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dist = path.join(__dirname, '..', 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
assert.equal(manifest.start_url, './');
assert.equal(manifest.scope, './');
assert.equal(manifest.display, 'standalone');
for (const icon of manifest.icons) {
  const data = fs.readFileSync(path.join(dist, icon.src));
  const size = Number(icon.sizes.split('x')[0]);
  assert.equal(data.readUInt32BE(16), size);
  assert.equal(data.readUInt32BE(20), size);
}
assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
assert.ok(manifest.icons.some(icon => icon.sizes === '512x512' && icon.purpose === 'maskable'));

async function checkScope(scope) {
  const handlers = {};
  const stores = new Map();
  let online = true;
  let claimed = false;
  let skipped = false;
  const cacheFor = name => ({
    async addAll(requests) {
      const store = stores.get(name);
      for (const request of requests) {
        const url = new URL(request.url);
        const relative = decodeURIComponent(url.pathname.slice(new URL(scope).pathname.length));
        const data = fs.readFileSync(path.join(dist, relative));
        store.set(url.href, new Response(data));
      }
    },
    async match(request) {
      const key = typeof request === 'string' ? request : request.url;
      return stores.get(name).get(key)?.clone();
    }
  });
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      return cacheFor(name);
    },
    async keys() { return [...stores.keys()]; },
    async delete(name) { return stores.delete(name); }
  };
  const self = {
    registration: { scope },
    location: new URL(scope),
    clients: { async claim() { claimed = true; } },
    async skipWaiting() { skipped = true; },
    addEventListener(type, fn) { handlers[type] = fn; }
  };
  const sandbox = {
    self, caches, URL, Request, Response, Headers,
    async fetch(request) {
      if (!online) throw Error('offline');
      return new Response('network:' + request.url);
    }
  };
  vm.runInNewContext(fs.readFileSync(path.join(dist, 'sw.js'), 'utf8'), sandbox);
  const runLifecycle = async type => {
    let work;
    handlers[type]({ waitUntil(promise) { work = promise; } });
    await work;
  };
  const runFetch = async request => {
    let work;
    handlers.fetch({ request, respondWith(promise) { work = promise; } });
    return work ? await work : null;
  };
  await runLifecycle('install');
  assert.equal(skipped, true);
  stores.set('scarlet-phantasm-pwa-old', new Map());
  stores.set('unrelated-app', new Map());
  await runLifecycle('activate');
  assert.equal(claimed, true);
  assert.equal(stores.has('scarlet-phantasm-pwa-old'), false);
  assert.equal(stores.has('unrelated-app'), true);

  const navigation = { url: scope, method: 'GET', mode: 'navigate', headers: new Headers() };
  assert.match(await (await runFetch(navigation)).text(), /^network:/);
  online = false;
  const html = await (await runFetch(navigation)).text();
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /game\.js\?v=audio-balance-20261125/);
  const game = await runFetch(new Request(scope + 'game.js?v=audio-balance-20261125'));
  assert.match(await game.text(), /function pickupSound/);
  const sprite = await runFetch(new Request(scope + 'assets/boss3.webp'));
  assert.ok((await sprite.arrayBuffer()).byteLength > 1000);

  const music = fs.readFileSync(path.join(dist, 'music', 'stage1-v5.mp3'));
  const range = await runFetch(new Request(scope + 'music/stage1-v5.mp3', { headers: { Range: 'bytes=10-29' } }));
  assert.equal(range.status, 206);
  assert.equal(range.headers.get('content-range'), `bytes 10-29/${music.length}`);
  assert.deepEqual(Buffer.from(await range.arrayBuffer()), music.subarray(10, 30));
  const suffix = await runFetch(new Request(scope + 'music/stage1-v5.mp3', { headers: { Range: 'bytes=-5' } }));
  assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), music.subarray(-5));
  const invalid = await runFetch(new Request(scope + 'music/stage1-v5.mp3', { headers: { Range: `bytes=${music.length}-` } }));
  assert.equal(invalid.status, 416);
  const outside = await runFetch(new Request('https://unrelated.example/asset.js'));
  assert.equal(outside, null);
}

(async () => {
  await checkScope('https://example.test/');
  await checkScope('https://example.test/scarlet-phantasm/');
  console.log('PASS: PWA manifest, both deployment scopes, offline assets, updates and audio byte ranges');
})().catch(error => { console.error(error); process.exitCode = 1; });
