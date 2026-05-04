// Incrémente ce numéro à chaque déploiement pour forcer la mise à jour
const CACHE_VERSION = 'soc-v' + Date.now();

self.addEventListener('install', e => {
  // Force activation immédiate sans attendre
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  // Supprime TOUS les anciens caches
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first TOUJOURS — pas de cache
  // Le SW sert juste à l'installation PWA sur mobile
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
