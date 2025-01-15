const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.[0-9]+){0,2}\.[0-9]+$/
  )
);

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      // Register both service workers
      const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;
      const oneSignalUrl = `${process.env.PUBLIC_URL}/OneSignalSDK.js`;

      if (isLocalhost) {
        // Register both service workers for localhost
        checkValidServiceWorker(swUrl, config);
        checkValidServiceWorker(oneSignalUrl, config);
        
        navigator.serviceWorker.ready.then(() => {
          console.log('This web app is being served cache-first by a service worker.');
        });
      } else {
        registerValidSW(swUrl, config);
        registerValidSW(oneSignalUrl, config);
      }
    });
  }
}

function registerValidSW(swUrl, config) {
  navigator.serviceWorker
    .register(swUrl, {
      // Set scope for OneSignal service worker
      scope: swUrl.includes('OneSignalSDK') ? '/taskngo/public/' : '/'
    })
    .then((registration) => {
      console.log('Service Worker registered:', registration);

      // Only register push notifications for the main service worker
      if (!swUrl.includes('OneSignalSDK')) {
        registerPushNotifications(registration);
      }

      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
                if (config && config.onUpdate) {
                  config.onUpdate(registration);
                }
              } else {
                console.log('Content is cached for offline use.');
                if (config && config.onSuccess) {
                  config.onSuccess(registration);
                }
              }
            }
          };
        }
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
}

function checkValidServiceWorker(swUrl, config) {
  fetch(swUrl)
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (
        response.status === 404 ||
        (contentType != null && contentType.indexOf('javascript') === -1)
      ) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl, config);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.unregister();
    });
  }
}

// Register push notifications
function registerPushNotifications(registration) {
  if ('PushManager' in window) {
    Notification.requestPermission()
      .then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted.');

          // Replace with your VAPID public key
          const applicationServerKey = urlBase64ToUint8Array('BB4eF13fhG9b7HybGb2o80xY52n7vnCN9AbD9kbbgh9zQj20gtiFfpeipqrbni18Hz7V52ckFbzQaYj3kTxZXjE');
          registration.pushManager
            .subscribe({
              userVisibleOnly: true,
              applicationServerKey,
            })
            .then((subscription) => {
              console.log('User is subscribed:', subscription);

              // Send subscription to your server (adjust the API endpoint as needed)
              fetch('/subscribe', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(subscription),
              });
            })
            .catch((error) => {
              console.error('Failed to subscribe the user:', error);
            });
        } else {
          console.warn('Notification permission denied.');
        }
      })
      .catch((error) => {
        console.error('Error requesting notification permission:', error);
      });
  }
}

// Helper to convert VAPID public key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Update existing service worker
export function update() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(registration => {
      registration.update().then(() => {
        console.log('Service Worker updated');
      }).catch(error => {
        console.error('Error updating Service Worker:', error);
      });
    });
  }
}