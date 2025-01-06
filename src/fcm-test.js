import { messaging, requestFirebaseToken } from './firebase';
import { getMessaging, onMessage } from 'firebase/messaging';

export async function testFCMSetup() {
  try {
    // Test token generation
    console.log('Testing FCM token generation...');
    const token = await requestFirebaseToken();
    console.log('FCM Token:', token ? 'Successfully generated' : 'Failed to generate');
    if (token) {
      console.log('Full token for testing:', token);
    }

    return token;
  } catch (error) {
    console.error('FCM Test Failed:', error);
    return null;
  }
}

export async function sendTestNotification(taskText = "Test Task") {
  if (!('Notification' in window)) {
    console.error('Notifications not supported');
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('Notification permission denied');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification('TaskNGo Test Notification', {
      body: `Test notification for task: "${taskText}"`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      tag: 'test-notification',
      requireInteraction: true,
      vibrate: [200, 100, 200]
    });
    
    console.log('Test notification sent successfully');
  } catch (error) {
    console.error('Error sending test notification:', error);
  }
}