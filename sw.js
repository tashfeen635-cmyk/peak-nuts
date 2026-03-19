var CACHE_NAME = 'peaknuts-v1';
var STATIC_ASSETS = [
  '/',
  '/index.html',
  '/shop.html',
  '/account.html',
  '/about.html',
  '/contact.html',
  '/styles.css',
  '/script.js',
  '/account.js',
  '/favicon.svg',
  '/manifest.json'
];

// Install: cache static assets
self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names.filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: network first, cache fallback
self.addEventListener('fetch', function (e) {
  // Skip API requests - always go to network
  if (e.request.url.indexOf('/api/') !== -1) {
    return;
  }

  e.respondWith(
    fetch(e.request).then(function (response) {
      // Cache successful responses
      if (response.status === 200) {
        var responseClone = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(e.request, responseClone);
        });
      }
      return response;
    }).catch(function () {
      return caches.match(e.request);
    })
  );
});
