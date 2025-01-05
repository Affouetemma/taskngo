// sendNotification.js
import { messaging } from './firebase';
import { getToken } from 'firebase/messaging';

class NotificationService {
  constructor() {
    this.vapidKey = process.env.REACT_APP_FIREBASE_VAPID_PUBLIC_KEY; // Changed to specifically use public key
    this.hasPermission = false;
    this.initialize();
  }

  async initialize() {
    try {
      const permission = await Notification.requestPermission();
      this.hasPermission = permission === 'granted';
      if (this.hasPermission) {
        await this.setupFCM();
      }
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }

  async setupFCM() {
    try {
      const token = await getToken(messaging, { vapidKey: this.vapidKey });
      if (token) {
        console.log('FCM Token:', token);
        return token;
      }
    } catch (error) {
      console.error('Error setting up FCM:', error);
    }
  }

  async scheduleNotification(task) {
    if (!this.hasPermission) return;

    const notificationTime = new Date(task.date);
    notificationTime.setMinutes(notificationTime.getMinutes() - 1); // 1 minute before task

    const timeUntilNotification = notificationTime.getTime() - Date.now();
    if (timeUntilNotification <= 0) return;

    // Store the scheduled notification
    const notificationId = `task-${task.id}`;
    localStorage.setItem(notificationId, JSON.stringify({
      title: 'Task Reminder',
      body: `Task "${task.text}" is due in 1 minute!`,
      timestamp: notificationTime.getTime()
    }));

    // Schedule the notification
    setTimeout(async () => {
      try {
        // Check if the task still exists and isn't completed
        const storedNotification = localStorage.getItem(notificationId);
        if (!storedNotification) return;

        await this.showNotification(
          'Task Reminder',
          `Task "${task.text}" is due in 1 minute!`,
          {
            icon: '/logo192.png',
            badge: '/logo192.png',
            tag: notificationId,
            renotify: true,
            requireInteraction: true,
            actions: [
              { action: 'complete', title: 'Mark Complete' },
              { action: 'dismiss', title: 'Dismiss' }
            ]
          }
        );
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }, timeUntilNotification);
  }

  async showNotification(title, body, options = {}) {
    if (!this.hasPermission) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        body,
        ...options
      });
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  cancelNotification(taskId) {
    const notificationId = `task-${taskId}`;
    localStorage.removeItem(notificationId);
  }
}

const notificationService = new NotificationService();
export default notificationService;
