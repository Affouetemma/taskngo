import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import reportWebVitals from './reportWebVitals';
import { initializeOneSignal } from './OneSignal'; // Import your OneSignal initialization

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize OneSignal after DOM is loaded
const initializeNotifications = () => {
  // Wait for OneSignal to be loaded
  if (window.OneSignal) {
    initializeOneSignal();
  } else {
    // If OneSignal isn't loaded yet, wait for the script to load
    window.addEventListener('load', () => {
      if (window.OneSignal) {
        initializeOneSignal();
      }
    });
  }
};

// Register service worker first
serviceWorkerRegistration.register({
  onSuccess: () => {
    console.log('Service Worker registered successfully');
    initializeNotifications();
  },
  onUpdate: () => {
    console.log('Service Worker updated');
    initializeNotifications();
  },
  onError: (error) => {
    console.error('Service Worker registration failed:', error);
    // Still try to initialize OneSignal even if SW fails
    initializeNotifications();
  }
});

// Performance monitoring
reportWebVitals(console.log);

// Add error boundary for OneSignal initialization
window.addEventListener('error', (event) => {
  if (event.message.includes('OneSignal')) {
    console.error('OneSignal initialization error:', event.error);
    // Attempt to reinitialize after a short delay
    setTimeout(initializeNotifications, 2000);
  }
});

// Add debugging for OneSignal loading
if (process.env.NODE_ENV === 'development') {
  const checkOneSignalLoading = setInterval(() => {
    if (window.OneSignal) {
      console.log('OneSignal loaded successfully');
      clearInterval(checkOneSignalLoading);
    }
  }, 1000);

  // Clear the interval after 10 seconds to prevent infinite checking
  setTimeout(() => clearInterval(checkOneSignalLoading), 10000);
}