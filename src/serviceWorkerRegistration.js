// Store service worker registration globally
let swRegistration = null;

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      // Wait for any existing service workers to be unregistered
      unregisterAll().then(() => {
        // Service worker registration
        const swUrl = `${process.env.PUBLIC_URL}/service-worker.js`;

        navigator.serviceWorker
          .register(swUrl)
          .then(registration => {
            swRegistration = registration;
            console.log('Service worker registered with scope:', registration.scope);

            // Check for updates
            registration.addEventListener('updatefound', () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('New content is available; please refresh.');
                    if (config && config.onUpdate) {
                      config.onUpdate(registration); // Callback when update is found
                    }
                  }
                };
              }
            });

            // Ensure updates are handled properly
            if (navigator.serviceWorker.controller) {
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                console.log('Service worker updated. Refreshing page.');
                if (config && config.onSuccess) {
                  config.onSuccess(registration); // Callback on successful installation
                }
              });
            }
          })
          .catch(error => {
            console.error('Service worker registration failed:', error);
          });
      });
    });
  }
}

// Function to unregister all service workers
export async function unregisterAll() {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        registrations.map(registration => {
          // Don't unregister OneSignal's service workers
          if (!registration.scope.includes('OneSignal')) {
            return registration.unregister();
          }
          return Promise.resolve();
        })
      );
      console.log('Non-OneSignal service workers unregistered');
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }
}

// Function to unregister specific service worker
export function unregister() {
  if (swRegistration) {
    swRegistration.unregister()
      .then(() => {
        console.log('Service worker unregistered');
        swRegistration = null;
      })
      .catch(error => {
        console.error('Error unregistering service worker:', error);
      });
  }
}
