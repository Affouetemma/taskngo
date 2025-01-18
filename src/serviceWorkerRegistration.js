const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(/^127(?:\.[0-9]+){0,2}\.[0-9]+$/)
);

// Store service worker registration globally
let swRegistration = null;

export function register(config) {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    const publicUrl = new URL(process.env.PUBLIC_URL, window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      // First, unregister any existing service workers
      unregisterAll().then(() => {
        // Do not register a new service worker - let OneSignal handle it
        if (isLocalhost) {
          navigator.serviceWorker.ready.then(() => {
            console.log('OneSignal service worker is ready');
          });
        }
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
        registrations.map(registration => registration.unregister())
      );
      console.log('All service workers unregistered');
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