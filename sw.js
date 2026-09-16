const CACHE = "plan-traka-v2";
const PREFIX = "plan-traka-";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
});
// Solo toca cachés de esta app (el dominio lo comparten plan-oman y plan-traka).
// Si había una versión anterior, recarga las pestañas abiertas para enseñar la nueva.
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const old = (await caches.keys()).filter((k) => k.startsWith(PREFIX) && k !== CACHE);
    await Promise.all(old.map((k) => caches.delete(k)));
    await self.clients.claim();
    if (!old.length) return;
    const wins = await self.clients.matchAll({ type: "window" });
    wins.forEach((w) => Promise.resolve().then(() => w.navigate(w.url)).catch(() => {}));
  })());
});
// Página: primero red (con 3,5 s de margen) y si no hay cobertura, la copia guardada.
// Resto de archivos: desde caché y actualizando en segundo plano.
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    const cached = () => caches.match("./index.html").then((r) => r || caches.match(req, { ignoreSearch: true }));
    const net = fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put("./index.html", copy)); }
      return res;
    });
    e.respondWith(new Promise((resolve) => {
      let done = false;
      const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
      const timer = setTimeout(() => cached().then(finish), 3500);
      net.then((res) => { clearTimeout(timer); finish(res); })
        .catch(() => { clearTimeout(timer); cached().then((r) => finish(r || Response.error())); });
    }));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
