// School of Champions — Service Worker
// Stratégie : network-first.
// L'app essaie toujours de charger la dernière version depuis le réseau.
// Le cache ne sert que de secours quand l'athlète est hors-ligne.
// → Chaque déploiement est récupéré automatiquement au prochain chargement,
//   sans que l'athlète ait à vider son cache.

// IMPORTANT : à chaque déploiement important, incrémente ce numéro de version.
// Ça force la suppression des vieux caches.
const CACHE_VERSION = 'soc-v3';
const CACHE_NAME = CACHE_VERSION;

// Fichiers de base mis en cache pour le mode hors-ligne
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALL : pré-cache les fichiers de base, et s'active immédiatement ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting()) // n'attend pas la fermeture des onglets
  );
});

// ── ACTIVATE : supprime les anciens caches et prend le contrôle direct ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim()) // prend le contrôle des pages ouvertes
  );
});

// ── FETCH : network-first ──
// 1. On tente le réseau (= toujours la dernière version).
// 2. Si ça réussit, on met à jour le cache au passage.
// 3. Si le réseau échoue (hors-ligne), on sert la version en cache.
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // On ne gère que les requêtes GET (pas les POST/PATCH vers Supabase)
  if (req.method !== 'GET') return;

  // On ne touche pas aux appels API (Supabase, etc.) : ils doivent toujours
  // aller au réseau et ne jamais être servis depuis le cache.
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Mise à jour silencieuse du cache avec la version fraîche
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        // Hors-ligne : on sert ce qu'on a en cache
        return caches.match(req).then((cached) => {
          if (cached) return cached;
          // En dernier recours, pour une navigation, on renvoie l'index
          if (req.mode === 'navigate') return caches.match('/index.html');
          return new Response('', { status: 503, statusText: 'Hors-ligne' });
        });
      })
  );
});

// ── MESSAGE : permet à la page de forcer l'activation immédiate ──
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
