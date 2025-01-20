const CACHE_NAME = 'my-cache-v2'; // Incremented version
const cacheWhitelist = [CACHE_NAME];

// Function to notify clients of updates
const notifyClientsOfUpdate = () => {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'UPDATE_AVAILABLE'
      });
    });
  });
};

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  self.skipWaiting(); // Force immediate activation
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching initial assets');
      return cache.addAll([
        '/', 
        '/index.html',
        '/manifest.json',
        '/logo.png',
        '/logo192.png',
        '/logo512.png',
        '/favicon.ico',
        '/icon-16.png',
        '/icon-32.png',
        '/icon-64.png',
        '/icon-72.png',
        '/icon-96.png',
        '/icon-144.png',
        '/message-alert.mp3',
        '/static/js/main.js',
        '/static/css/main.css'
      ]);
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`Service Worker: Deleting old cache ${cacheName}`);
              return caches.delete(cacheName);
            }
            return Promise.resolve();
          })
        );
      }),
      // Tell clients about the update
      clients.claim().then(() => {
        notifyClientsOfUpdate();
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Handle errors
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});