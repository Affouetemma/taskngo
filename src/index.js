import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { initializeOneSignal } from './OneSignal.js';
import * as serviceWorkerRegistration from './serviceWorkerRegistration.js';
import reportWebVitals from './reportWebVitals.js';

// Initialize OneSignal using the recommended pattern
window.OneSignal = window.OneSignal || [];

// Load OneSignal script
const script = document.createElement('script');
script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
script.async = true;
script.onload = () => {
  initializeOneSignal();
};
document.head.appendChild(script);

// Initialize the root using createRoot
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker after OneSignal is initialized
setTimeout(() => {
  serviceWorkerRegistration.register();
}, 2000);

reportWebVitals(console.log);