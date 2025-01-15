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
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerPath: '/OneSignalSDKWorker.js',
        serviceWorkerUpdaterPath: '/OneSignalSDKUpdaterWorker.js',
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
      });
  
      window.OneSignal.getUserId()
        .then(userId => console.log('OneSignal initialized. User ID:', userId))
        .catch(error => console.error('OneSignal initialization error:', error));
    });
  };
  
  // Send Task Notification
  export const sendTaskNotification = async (task) => {
    if (!window.OneSignal) {
      console.error('OneSignal is not loaded');
      return;
    }
  
    try {
      const isSubscribed = await window.OneSignal.isPushNotificationsEnabled();
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
            Authorization: `Bearer ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`, // Replace with your REST API key
          },
          body: JSON.stringify({
            app_id: process.env.REACT_APP_ONESIGNAL_APP_ID, // OneSignal App ID
            headings: { en: title },
            contents: { en: message },
            url: window.location.origin,
            chrome_web_icon: '/logo.png',
            send_after: sendAt.toISOString(),
            data: { taskId: task.id },
          }),
        });
  
        if (!response.ok) {
          console.error('Failed to send notification:', await response.text());
        }
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
  
      console.log('Notifications scheduled successfully');
    } catch (error) {
      console.error('Error scheduling notifications:', error);
    }
  };
  
  