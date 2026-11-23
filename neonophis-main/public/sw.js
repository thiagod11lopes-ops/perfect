/* NEON OPHIS — service worker. Hand-rolled, zero deps (CLAUDE.md §2).
 *
 * Strategy (runtime cache-first, see DECISION_LOG 2026-05-17):
 *   - __api/*            network-only, never cached. Scores stay live;
 *                        offline, highscores.ts falls back to localStorage.
 *   - navigation (HTML)  network-first with a short timeout, falling back
 *                        to the cached shell. A redeploy is picked up the
 *                        next time the player is online — no version bump
 *                        needed for content updates.
 *   - /assets/*          cache-first. Vite content-hashes these, so they
 *                        are immutable: a new build emits new filenames,
 *                        the old cache entries are simply orphaned.
 *   - everything else    cache-first (icons, manifest).
 *
 * Closing the runtime-cache gap: the hashed JS/CSS bundle is requested on
 * the very first page load *before* this SW controls the page, so lazy
 * caching alone would never store it. On install we therefore fetch the
 * shell HTML, scrape the Vite-injected hashed asset URLs out of it and
 * precache them — true offline after a single online visit, with no build
 * plugin (the Option-A promise).
 *
 * Bump VERSION only when this file's logic changes (it wipes old caches on
 * activate). Content updates do NOT need a bump — network-first navigation
 * already serves the fresh HTML, and its new hashed assets cache on first
 * online fetch.
 *
 * All URLs are resolved relative to the SW location so it works unchanged
 * under a sub-path deploy (e.g. /neonophis/).
 */

const VERSION = 'v1';
const CACHE = 'neonophis-' + VERSION;
const ROOT = new URL('./', self.location).href;
const NAV_TIMEOUT_MS = 3500;

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(precacheShell());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names.filter((n) => n !== CACHE).map((n) => caches.delete(n)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Scores endpoint: never our concern. Let it hit the network untouched
  // so the file-backed ranking stays authoritative; offline failure is
  // handled by storage/highscores.ts (localStorage fallback). POSTs bypass
  // this listener naturally (checked above), but we keep the exclusion here.
  if (url.pathname.includes('__api/')) return;

  // Foreign origins (none expected — fonts are inlined): stay out of it.
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(navigationStrategy(req));
    return;
  }

  event.respondWith(cacheFirst(req));
});

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const assets = new Set([ROOT, 'manifest.webmanifest']);
  try {
    const res = await fetch(ROOT, { cache: 'no-store' });
    if (res.ok) {
      const html = await res.text();
      const re = /(?:src|href)\s*=\s*["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(html))) {
        const ref = m[1];
        if (/^(https?:|data:|#|mailto:)/i.test(ref)) continue;
        // Vite emits the hashed bundle/CSS under assets/.
        if (ref.includes('assets/') || /\.(js|css)(\?|$)/i.test(ref)) {
          assets.add(new URL(ref, ROOT).href);
        }
      }
      await cache.put(ROOT, res.clone());
    }
  } catch {
    /* offline at install is impossible (install follows a live load);
       tolerate anything and let runtime caching fill in. */
  }
  // Tolerate individual failures — one bad URL must not abort the rest.
  await Promise.all(
    [...assets].map((u) =>
      cache
        .add(u)
        .catch(() => undefined),
    ),
  );
}

async function navigationStrategy(req) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await withTimeout(fetch(req), NAV_TIMEOUT_MS);
    if (fresh && fresh.ok) {
      cache.put(ROOT, fresh.clone());
      return fresh;
    }
    if (fresh) return fresh;
    throw new Error('no response');
  } catch {
    const cached = (await cache.match(req)) || (await cache.match(ROOT));
    if (cached) return cached;
    return new Response(
      '<!doctype html><meta charset=utf-8><title>NEON OPHIS</title>' +
        '<body style="background:#05030f">',
      { status: 503, headers: { 'Content-Type': 'text/html' } },
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res && res.ok && res.type === 'basic') cache.put(req, res.clone());
  return res;
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}
