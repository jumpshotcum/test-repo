// Offline-first service worker. Bump VERSION whenever any cached file changes.
const VERSION = "kasku-v1";
const ASSETS = [
  "./", "./index.html", "./app.css", "./manifest.webmanifest", "./icon.svg", "./icon-192.png",
  "./js/main.js", "./js/i18n.js", "./js/format.js", "./js/wa.js", "./js/store.js", "./js/backup.js",
  "./locales/id.js", "./locales/en.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first for our own files; never touches other origins (wa.me links open outside the app).
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((hit) =>
      hit || fetch(event.request).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(event.request, copy)); }
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
