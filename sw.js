// Service worker: deja la app disponible sin conexión (cache de los archivos propios) y se actualiza sola.
const VERSION = "chispa-v1";
const ARCHIVOS = ["./", "index.html", "manifest.webmanifest", "css/app.css", "js/app.js", "js/rezos.js", "js/store.js",
                  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((claves) => Promise.all(claves.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (siempre la versión más nueva si hay conexión); si no hay, lo guardado.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
      return res;
    }).catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
