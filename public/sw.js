// Pdfer service worker. Hand-written (no Serwist) to keep zero new deps.
//
// Strategy:
//   - Immutable hashed assets (_next/static, workers, icons) -> cache-first.
//   - Page navigations -> network-first with a 4s timeout, falling back to the
//     precached /offline page when the network is unavailable.
//   - Everything else (API routes, RSC, manifest, generated icons) -> not
//     intercepted (default network-only behavior).

const CACHE_VERSION = "pdfer-v1";
const OFFLINE_URL = "/offline";
const NAVIGATION_TIMEOUT_MS = 4000;

const CACHE_FIRST_PREFIXES = ["/_next/static/", "/workers/", "/icons/"];
const CACHE_FIRST_EXACT = ["/pdf.worker.min.mjs"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.add(OFFLINE_URL))
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
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isCacheFirst(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithOffline(request));
  }
  // Otherwise: don't intercept — let the browser handle it (network-only).
});

function isCacheFirst(url) {
  return (
    CACHE_FIRST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) ||
    CACHE_FIRST_EXACT.includes(url.pathname)
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // No cached copy and the network failed.
    return Response.error();
  }
}

async function networkFirstWithOffline(request) {
  try {
    return await fetchWithTimeout(request, NAVIGATION_TIMEOUT_MS);
  } catch {
    const cache = await caches.open(CACHE_VERSION);
    const offline = await cache.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Network timeout")), timeoutMs);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
