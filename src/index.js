import React from 'react';
import ReactDOM from 'react-dom/client'; 
import App from './App.js';
import * as serviceWorkerRegistration from './serviceWorkerRegistration.js';
import reportWebVitals from './reportWebVitals.js';
import './OneSignal.js';

// Initialize the root using createRoot from react-dom/client
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Function to initialize OneSignal
const initializeOneSignal = () => {
  if (window.OneSignal) {
    console.log('Initializing OneSignal...');
    window.OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
    });
  } else {
    console.error('OneSignal is not available on the window object.');
  }
};

// Function to handle service worker registration and notifications
const setupServiceWorkerAndNotifications = () => {
  serviceWorkerRegistration.register({
    onSuccess: () => {
      console.log('Service Worker registered successfully');
      initializeOneSignal();
    },
    onUpdate: () => {
      console.log('Service Worker updated');
      initializeOneSignal();
    },
    onError: (error) => {
      console.error('Service Worker registration failed:', error);
      // Attempt to initialize OneSignal even if service worker registration fails
      initializeOneSignal();
    },
  });
};

// Listen for the DOM to load before initializing notifications
document.addEventListener('DOMContentLoaded', () => {
  setupServiceWorkerAndNotifications();
});

// Performance monitoring
reportWebVitals(console.log);

// Debugging OneSignal loading in development
if (process.env.NODE_ENV === 'development') {
  const checkOneSignalLoading = setInterval(() => {
    if (window.OneSignal) {
      console.log('OneSignal loaded successfully');
      clearInterval(checkOneSignalLoading);
    }
  }, 1000);

  setTimeout(() => clearInterval(checkOneSignalLoading), 10000); // Stop checking after 10 seconds
}

// Set up API URL based on the environment
const apiUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:3001/api/send-notification' : 'https://taskngo.vercel.app/api/send-notification';

// Ensure API calls are using the correct URL based on environment
const sendNotification = async () => {
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({
        // Notification data here
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to send notification:', await response.text());
    } else {
      console.log('Notification sent successfully');
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

// Example: Trigger sendNotification when a button is clicked
const sendNotificationButton = document.getElementById('send-notification-button');
if (sendNotificationButton) {
  sendNotificationButton.addEventListener('click', () => {
    sendNotification(); // Call sendNotification when button is clicked
  });
}
