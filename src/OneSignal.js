let taskTimeouts = [];

export const initializeOneSignal = () => {
  if (window.OneSignal && window.OneSignalInitialized) {
    console.warn('🔔 OneSignal is already initialized.');
    return;
  }

  if (!window.OneSignal) {
    window.OneSignal = [];
  }

  window.OneSignal.push(() => {
    window.OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
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
        title: "Welcome to Taskngo! 🎉",
        message: "Thanks for subscribing to notifications!",
      }
    });

    window.OneSignal.on('subscriptionChange', async (isSubscribed) => {
      console.log(`🔔 Subscription changed:`, isSubscribed);
      if (isSubscribed) {
        try {
          const userId = await window.OneSignal.getUserId();
          await sendOneSignalNotification(
            userId,
            'Welcome to Taskngo! 🎉',
            'Thanks for subscribing! You will now receive task notifications.'
          );
        } catch (error) {
          console.error('❌ Welcome notification error:', error);
        }
      }
    });
  });

  window.OneSignalInitialized = true;
};

const sendOneSignalNotification = async (userId, title, message, data = {}) => {
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`
    },
    body: JSON.stringify({
      app_id: process.env.REACT_APP_ONESIGNAL_APP_ID,
      include_player_ids: [userId],
      contents: { en: message },
      headings: { en: title },
      data: data
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OneSignal API Error: ${errorData}`);
  }

  return response.json();
};

export const sendTaskNotification = async (task) => {
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

    await sendOneSignalNotification(
      userId,
      'Task Scheduled ⏰',
      `New task scheduled: "${task.text}"`,
      {
        taskId: task.id,
        scheduledTime: task.date,
        type: 'new_task'
      }
    );

    scheduleReminders(userId, task);
    console.log('✅ Task notifications scheduled');
  } catch (error) {
    console.error('❌ Error scheduling task notifications:', error);
    cleanupTimeouts();
    throw error;
  }
};

const scheduleReminders = (userId, task) => {
  const taskTime = new Date(task.date).getTime();
  const currentTime = Date.now();

  if (taskTime > currentTime) {
    if (taskTime - currentTime > 5 * 60 * 1000) {
      taskTimeouts.push(
        setTimeout(() => sendReminder(userId, task, '5 minutes'),
          taskTime - currentTime - 5 * 60 * 1000)
      );
    }

    if (taskTime - currentTime > 60 * 1000) {
      taskTimeouts.push(
        setTimeout(() => sendReminder(userId, task, '1 minute'),
          taskTime - currentTime - 60 * 1000)
      );
    }

    taskTimeouts.push(
      setTimeout(() => sendReminder(userId, task, 'now'),
        taskTime - currentTime)
    );
  }
};

const sendReminder = async (userId, task, timeframe) => {
  try {
    const message = timeframe === 'now'
      ? `Task "${task.text}" is due now!`
      : `Task "${task.text}" is due in ${timeframe}!`;

    await sendOneSignalNotification(
      userId,
      `Task Reminder ${timeframe === 'now' ? '🔔' : '⏰'}`,
      message,
      {
        taskId: task.id,
        timeframe,
        type: 'reminder'
      }
    );

    console.log(`✅ ${timeframe} reminder sent`);
  } catch (error) {
    console.error(`❌ Error sending ${timeframe} reminder:`, error);
  }
};

export const cleanupOneSignal = () => {
  cleanupTimeouts();
  if (window.OneSignal) {
    window.OneSignal.push(() => {
      window.OneSignal.setSubscription(false);
    });
  }
};

const cleanupTimeouts = () => {
  taskTimeouts.forEach(timeout => clearTimeout(timeout));
  taskTimeouts = [];
};