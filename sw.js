/* ÜSTAD TELEPROMPTER — çevrimdışı servis çalışanı
   İlk açılıştan sonra uygulama internet olmadan da çalışır. */
const ONBELLEK = "ustad-teleprompter-v2.5";
const DOSYALAR = [
  "./", "./index.html", "./manifest.json",
  "./assets/stil.css", "./assets/uygulama.js", "./assets/fontlar.css",
  "./img/madalyon.jpg", "./img/ikon-180.png", "./img/ikon-192.png", "./img/ikon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(ONBELLEK).then(c => c.addAll(DOSYALAR).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(adlar => Promise.all(adlar.filter(a => a !== ONBELLEK).map(a => caches.delete(a))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const istek = e.request;
  if (istek.method !== "GET") return;
  const yol = new URL(istek.url);
  /* telefon kumandası uçları (varsa) önbelleğe girmesin */
  if (yol.pathname.indexOf("/komut") === 0 || yol.pathname.indexOf("/nabiz") === 0 ||
      yol.pathname.indexOf("/gonder") === 0 || yol.pathname.indexOf("/kumanda") === 0) return;
  e.respondWith(
    caches.match(istek).then(yanit => yanit || fetch(istek).then(yeni => {
      if (yeni && yeni.status === 200 && yol.origin === location.origin) {
        const kopya = yeni.clone();
        caches.open(ONBELLEK).then(c => c.put(istek, kopya)).catch(() => {});
      }
      return yeni;
    }).catch(() => caches.match("./index.html")))
  );
});
