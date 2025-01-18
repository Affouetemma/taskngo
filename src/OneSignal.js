let isOneSignalInitialized = false;

const initializeOneSignal = () => {
  if (isOneSignalInitialized) {
    console.log('OneSignal is already initialized.');
    return; // Prevent re-initialization
  }

  if (!window.OneSignal) {
    console.error('❌ OneSignal is not loaded.');
    return;
  }

  window.OneSignal = window.OneSignal || [];

  const isLocal = window.location.hostname === 'localhost';
  const apiUrl = isLocal
    ? 'http://localhost:3001/api'
    : 'https://taskngo.vercel.app/api';

  window.OneSignal.push(() => {
    window.OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: process.env.NODE_ENV === 'development',
      serviceWorkerParam: {
        scope: '/',
      },
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      autoResubscribe: true,
      notifyButton: {
        enable: true,
        size: 'medium',
        theme: 'default',
        position: 'bottom-right',
        showCredit: false,
        text: {
          'tip.state.unsubscribed': 'Get task notifications',
          'tip.state.subscribed': 'You are subscribed to notifications',
          'tip.state.blocked': 'You have blocked notifications',
          'message.prenotify': 'Click to subscribe to task notifications',
          'message.action.subscribed': 'Thanks for subscribing!',
          'message.action.resubscribed': 'You are now subscribed to notifications',
          'message.action.unsubscribed': 'You will no longer receive notifications',
        },
        prenotify: true,
        colors: {
          'circle.background': '#2196f3',
          'circle.foreground': 'white',
          'badge.background': '#2196f3',
          'badge.foreground': 'white',
          'badge.bordercolor': 'white',
          'pulse.color': 'white',
          'dialog.button.background.hovering': '#2196f3',
          'dialog.button.background.active': '#2196f3',
          'dialog.button.background': '#2196f3',
          'dialog.button.foreground': 'white',
        },
      },
      welcomeNotification: {
        disable: false,
        title: 'Welcome to Taskngo! 🎉',
        message: 'Thanks for subscribing to notifications!',
        url: window.location.origin,
      },
      persistNotification: true,
      webhooks: {
        cors: true,
        'notification.displayed': `${apiUrl}/notification-displayed`,
        'notification.clicked': `${apiUrl}/notification-clicked`,
        'notification.dismissed': `${apiUrl}/notification-dismissed`,
      },
    });

    isOneSignalInitialized = true; // Set the flag to true after initialization
  });
};

const sendTaskNotification = async (task) => {
  if (!window.OneSignal) {
    console.error('❌ OneSignal not loaded');
    return;
  }

  try {
    const userId = await window.OneSignal.getUserId();
    if (!userId) {
      console.error('❌ No OneSignal User ID available');
      return;
    }

    const isLocal = window.location.hostname === 'localhost';
    const apiUrl = isLocal
      ? 'http://localhost:3001/api'
      : 'https://taskngo.vercel.app/api';

    const response = await fetch(`${apiUrl}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: 'Task Scheduled ⏰',
        message: `New task scheduled: "${task.text}"`,
        data: {
          taskId: task.id,
          scheduledTime: task.date,
          type: 'new_task',
        },
        icon: '/logo192.png',
        url: window.location.origin,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send task notification');
    }

    const taskTime = new Date(task.date).getTime();
    const currentTime = Date.now();

    if (taskTime > currentTime) {
      if (taskTime - currentTime > 5 * 60 * 1000) {
        setTimeout(() => sendReminder(userId, task, '5 minutes', apiUrl), 
          taskTime - currentTime - 5 * 60 * 1000);
      }

      if (taskTime - currentTime > 60 * 1000) {
        setTimeout(() => sendReminder(userId, task, '1 minute', apiUrl), 
          taskTime - currentTime - 60 * 1000);
      }

      setTimeout(() => sendReminder(userId, task, 'now', apiUrl), 
        taskTime - currentTime);
    }

    console.log('✅ Task notifications scheduled');
  } catch (error) {
    console.error('❌ Error scheduling task notifications:', error);
  }
};

const sendReminder = async (userId, task, timeframe, apiUrl) => {
  try {
    const message = timeframe === 'now'
      ? `Task "${task.text}" is due now!`
      : `Task "${task.text}" is due in ${timeframe}!`;

    const response = await fetch(`${apiUrl}/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        title: `Task Reminder ${timeframe === 'now' ? '🔔' : '⏰'}`,
        message,
        data: {
          taskId: task.id,
          timeframe,
          type: 'reminder',
        },
        icon: '/logo192.png',
        url: window.location.origin,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send ${timeframe} reminder`);
    }

    console.log(`✅ ${timeframe} reminder sent`);
  } catch (error) {
    console.error(`❌ Error sending ${timeframe} reminder:`, error);
  }
};

const subscribeToNotification = async () => {
  try {
    if (!window.OneSignal) {
      console.error('❌ OneSignal is not initialized');
      return;
    }

    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    if (!isSubscribed) {
      window.OneSignal.showNativePrompt();
    } else {
      console.log('User is already subscribed to notifications');
    }
  } catch (error) {
    console.error('❌ Error subscribing to notifications:', error);
  }
};

export { initializeOneSignal, sendTaskNotification, subscribeToNotification };
