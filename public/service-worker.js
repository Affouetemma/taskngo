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
        '/app.css',
        '/app.js',
        'onesignal.js',
        '/UpdateNotification.js',
        '/firebase.js',
        '/index.js',
        '/reportWebVitals.js',
        '/serviceWorkerRegistration.js',
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
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`Service Worker: Deleting old cache ${cacheName}`);
              return caches.delete(cacheName).catch((err) => {
                console.error(`Error deleting cache ${cacheName}:`, err);
              });
            }
            return Promise.resolve();
          })
        );
      }),
      clients.claim().then(() => {
        notifyClientsOfUpdate();
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Serve from cache if available
      }
      return fetch(event.request).then((response) => {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, response.clone()); // Cache new responses
        });
        return response;
      }).catch(() => caches.match(event.request)); // Fallback to cache if network fails
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // Skip waiting to activate immediately
  }
});

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'New Notification';
  const message = data.message || 'You have a new notification.';
  const icon = data.icon || '/icon-192x192.png';
  const url = data.url || '/';

  const options = {
    body: message,
    icon: icon,
    badge: '/icon-192x192.png',
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', function(event) {
  event.notification.close(); // Close the notification
  const url = event.notification.data.url || '/'; // Default URL
  event.waitUntil(
    clients.openWindow(url) // Open the URL in the browser
  );
});

// Error and unhandled rejection handling
self.addEventListener('error', (event) => {
  console.error('Service Worker error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker unhandled rejection:', event.reason);
});

caches.keys().then((cacheNames) => {
  return Promise.all(
    cacheNames.map((cacheName) => {
      if (!cacheWhitelist.includes(cacheName)) {
        console.log(`Service Worker: Deleting old cache ${cacheName}`);
        return caches.delete(cacheName);
      }
      return Promise.resolve();
    })
  );
});
