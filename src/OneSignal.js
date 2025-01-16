// Initialize OneSignal
export const initializeOneSignal = () => {
  if (!window.OneSignal) {
    console.error('OneSignal is not loaded');
    return;
  }

  window.OneSignal = window.OneSignal || [];

  window.OneSignal.push(function () {
    window.OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: false, // Changed for production 
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      serviceWorkerParam: { scope: '/' },
      serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
      path: '/',
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
        title: 'Taskngo',
        message: 'Thanks for subscribing to task notifications!',
      },
      persistNotification: false,
      webhooks: {
        cors: true,
        'notification.displayed': 'https://taskngo.vercel.app/api/notification-displayed',
        'notification.clicked': 'https://taskngo.vercel.app/api/notification-clicked',
        'notification.dismissed': 'https://taskngo.vercel.app/api/notification-dismissed'
      },
      promptOptions: {
        slidedown: {
          prompts: [
            {
              type: "push",
              autoPrompt: true,
              text: {
                actionMessage: "Would you like to receive task notifications?",
                acceptButton: "Allow",
                cancelButton: "No thanks"
              }
            }
          ]
        }
      }
    });

    // Debug logs for testing
    const debugOneSignalState = async () => {
      try {
        const isEnabled = await window.OneSignal.isPushNotificationsEnabled();
        console.log('🔔 Push notifications enabled:', isEnabled);

        const subscription = await window.OneSignal.getSubscription();
        console.log('🔔 Current subscription state:', subscription);

        const userId = await window.OneSignal.getUserId();
        console.log('🔔 OneSignal User ID:', userId);

        const permission = await window.OneSignal.getNotificationPermission();
        console.log('🔔 Notification permission:', permission);
      } catch (error) {
        console.error('Error checking OneSignal state:', error);
      }
    };

    // Run debug checks immediately
    debugOneSignalState();

    // Permission change handler
    window.OneSignal.on('notificationPermissionChange', function(permissionChange) {
      console.log('🔔 Permission state changed:', permissionChange.to);
      debugOneSignalState(); // Check state after permission change
    });

    // Subscription change handler
    window.OneSignal.on('subscriptionChange', function(isSubscribed) {
      console.log('🔔 Subscription state changed:', isSubscribed);
      if (isSubscribed) {
        window.OneSignal.getUserId().then(function(userId) {
          console.log('🔔 New subscription - User ID:', userId);
        });
      }
      debugOneSignalState(); // Check state after subscription change
    });

    // Notification handlers for testing
    window.OneSignal.on('notification.displayed', function(notification) {
      console.log('🔔 Notification displayed:', notification);
    });

    window.OneSignal.on('notification.clicked', function(notification) {
      console.log('🔔 Notification clicked:', notification);
    });

    window.OneSignal.on('notification.dismissed', function(notification) {
      console.log('🔔 Notification dismissed:', notification);
    });

    // Initialize promise chain
    window.OneSignal.getUserId()
      .then(userId => {
        console.log('🔔 OneSignal initialized. User ID:', userId);
        if (!userId) {
          console.warn('🔔 OneSignal initialization complete but no user ID obtained');
          return window.OneSignal.showSlidedownPrompt();
        }
        return window.OneSignal.getNotificationPermission();
      })
      .then(permission => {
        console.log('🔔 Initial permission status:', permission);
        if (permission === 'default') {
          return window.OneSignal.showSlidedownPrompt();
        }
      })
      .catch(error => {
        console.error('🔔 OneSignal initialization error:', error);
        window.OneSignal.showSlidedownPrompt();
      });
  });
};

// Test notification sender
export const testNotification = async () => {
  try {
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    if (!isSubscribed) {
      console.log('🔔 User is not subscribed to notifications');
      return;
    }

    // Send test notification
    const notification = {
      title: "Test Notification",
      message: "This is a test notification from Taskngo",
      icon: '/logo.png',
      url: window.location.origin
    };

    console.log('🔔 Sending test notification:', notification);
    await window.OneSignal.sendSelfNotification(
      notification.title,
      notification.message,
      notification.url,
      notification.icon
    );
    console.log('🔔 Test notification sent successfully');
  } catch (error) {
    console.error('🔔 Error sending test notification:', error);
  }
};
// Send Task Notification
export const sendTaskNotification = async (task) => {
  if (!window.OneSignal) {
    console.error('OneSignal is not loaded');
    return;
  }

  try {
    const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
    const permission = await window.OneSignal.getNotificationPermission();
    
    console.log('Notification Status Check:', {
      isSubscribed,
      permission,
      task: task.text,
      scheduledTime: new Date(task.date).toISOString()
    });

    if (!isSubscribed) {
      console.log('User is not subscribed to notifications');
      return;
    }

    const taskTime = new Date(task.date).getTime();
    const currentTime = Date.now();

    const fiveMinBefore = new Date(taskTime - 5 * 60000);
    const oneMinuteBefore = new Date(taskTime - 60000);
    const dueTime = new Date(taskTime);

    // Skip the 5-minute notification if the task is due in less than 5 minutes
    if (fiveMinBefore <= currentTime) {
      console.log("Skipping 5-minute notification: Task is too close.");
    }

    // Skip the 1-minute notification if the task is already due
    if (oneMinuteBefore <= currentTime) {
      console.log("Skipping 1-minute notification: Task is too close or past due.");
    }

    // Skip the due time notification if the task is already past due
    if (dueTime <= currentTime) {
      console.log("Skipping due time notification: Task is past due.");
    }

    // For localhost testing
    if (window.location.hostname === 'localhost') {
      if ('Notification' in window) {
        // Simulate notifications only if they are valid
        if (fiveMinBefore > currentTime) {
          setTimeout(() => {
            new Notification('5-minute Reminder', {
              body: `⏰ Task "${task.text}" is coming up in 5 minutes!`,
              icon: '/logo.png',
            });
          }, fiveMinBefore - currentTime);
        }

        if (oneMinuteBefore > currentTime) {
          setTimeout(() => {
            new Notification('1-minute Reminder', {
              body: `⚠️ Task "${task.text}" is due in 1 minute!`,
              icon: '/logo.png',
            });
          }, oneMinuteBefore - currentTime);
        }

        if (dueTime > currentTime) {
          setTimeout(() => {
            new Notification('Task Due', {
              body: `🔔 Task "${task.text}" is now due!`,
              icon: '/logo.png',
            });
          }, dueTime - currentTime);
        }
      } else {
        console.error('Browser does not support notifications');
      }
      return;
    }
    
    // For production: Use OneSignal REST API for notifications
    const sendNotificationViaRest = async (title, message, sendAt) => {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify({
          app_id: process.env.REACT_APP_ONESIGNAL_APP_ID,
          headings: { en: title },
          contents: { en: message },
          url: window.location.origin,
          chrome_web_icon: '/logo.png',
          send_after: sendAt.toISOString(),
          data: { 
            taskId: task.id,
            taskText: task.text,
            scheduledTime: task.date 
          },
          web_buttons: [{
            id: "view-task",
            text: "View Task",
            url: window.location.origin
          }]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send notification: ${errorText}`);
      }

      const result = await response.json();
      console.log('Notification scheduled successfully:', {
        title,
        scheduledTime: sendAt.toISOString(),
        response: result
      });

      return result;
    };

    // Schedule notifications
    const promises = [];
    if (fiveMinBefore > currentTime) {
      promises.push(
        sendNotificationViaRest(
          '5-minute Reminder',
          `⏰ Task "${task.text}" is coming up in 5 minutes!`,
          fiveMinBefore
        )
      );
    }

    if (oneMinuteBefore > currentTime) {
      promises.push(
        sendNotificationViaRest(
          '1-minute Reminder',
          `⚠️ Task "${task.text}" is due in 1 minute!`,
          oneMinuteBefore
        )
      );
    }

    if (dueTime > currentTime) {
      promises.push(
        sendNotificationViaRest(
          'Task Due',
          `🔔 Task "${task.text}" is now due!`,
          dueTime
        )
      );
    }
    
    await Promise.all(promises);
    console.log('All notifications scheduled successfully for task:', task.text);

  } catch (error) {
    console.error('Error scheduling notifications:', error);
    throw error;
  }
};