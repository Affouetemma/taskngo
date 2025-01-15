const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.[0-9]+){0,2}\.[0-9]+$/)
);

export function register(config) {
  if ('serviceWorker' in navigator) {
    const publicUrl = process.env.PUBLIC_URL || '/';
    const updaterWorkerUrl = `${publicUrl}OneSignalSDKUpdaterWorker.js`;
    const mainWorkerUrl = `${publicUrl}OneSignalSDKWorker.js`;

    window.addEventListener('load', () => {
      if (isLocalhost) {
        // Validate and register both service workers in local environment
        console.log('Running in localhost. Validating service workers...');
        checkValidServiceWorker(updaterWorkerUrl, config);
        checkValidServiceWorker(mainWorkerUrl, config);
      } else {
        // Register both service workers in production
        registerValidSW(updaterWorkerUrl, config, '/');
        registerValidSW(mainWorkerUrl, config, '/');
      }
    });
  } else {
    console.warn('Service Worker is not supported in this browser.');
  }
}


function registerValidSW(swUrl, config, scope) {
  navigator.serviceWorker
    .register(swUrl, { scope })
    .then((registration) => {
      console.log(`Service Worker registered successfully with scope: ${registration.scope}`);

      // Handle updates
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
      console.error(`Error registering Service Worker (${swUrl}):`, error);
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
        registerValidSW(swUrl, config, '/');
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
