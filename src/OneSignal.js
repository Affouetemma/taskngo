let taskTimeouts = [];

const translations = {
  en: {
    welcome: {
      title: "Welcome to Taskngo! 🎉",
      message: "Thanks for subscribing to notifications!"
    },
    notifyButton: {
      'tip.state.unsubscribed': 'Get task notifications',
      'tip.state.subscribed': 'You are subscribed to notifications',
      'tip.state.blocked': 'You have blocked notifications',
      'message.prenotify': 'Click to subscribe to task notifications',
      'message.action.subscribed': 'Thanks for subscribing!',
      'message.action.resubscribed': 'You are now subscribed to notifications',
      'message.action.unsubscribed': 'You will no longer receive notifications'
    },
    taskScheduled: {
      title: "Task Scheduled ⏰",
      message: (taskText, priority, date) => {
        const formattedTime = new Date(date).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `New task scheduled: "${taskText}" (${priority} priority) for ${formattedTime}`;
      }
    },
    reminder: {
      nowTitle: "Task Reminder 🔔",
      futureTitle: "Task Reminder ⏰",
      nowMessage: (taskText, date) => {
        const formattedTime = new Date(date).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `Task "${taskText}" is due now! (${formattedTime})`;
      },
      futureMessage: (taskText, timeframe, date) => {
        const formattedTime = new Date(date).toLocaleString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        return `Task "${taskText}" is due in ${timeframe}! (${formattedTime})`;
      }
    }
  },
  fr: {
    welcome: {
      title: "Bienvenue sur Taskngo! 🎉",
      message: "Merci de vous être abonné aux notifications!"
    },
    notifyButton: {
      'tip.state.unsubscribed': 'Recevoir les notifications des tâches',
      'tip.state.subscribed': 'Vous êtes abonné aux notifications',
      'tip.state.blocked': 'Vous avez bloqué les notifications',
      'message.prenotify': 'Cliquez pour vous abonner aux notifications',
      'message.action.subscribed': 'Merci de vous être abonné!',
      'message.action.resubscribed': 'Vous êtes maintenant abonné aux notifications',
      'message.action.unsubscribed': 'Vous ne recevrez plus de notifications'
    },
    taskScheduled: {
      title: "Tâche Planifiée ⏰",
      message: (taskText, priority, date) => {
        const priorityTranslation = {
          high: 'haute',
          medium: 'moyenne',
          low: 'basse'
        };
        const formattedTime = new Date(date).toLocaleString('fr-FR', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `Nouvelle tâche planifiée: "${taskText}" (priorité ${priorityTranslation[priority]}) pour ${formattedTime}`;
      }
    },
    reminder: {
      nowTitle: "Rappel de Tâche 🔔",
      futureTitle: "Rappel de Tâche ⏰",
      nowMessage: (taskText, date) => {
        const formattedTime = new Date(date).toLocaleString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `La tâche "${taskText}" est à faire maintenant! (${formattedTime})`;
      },
      futureMessage: (taskText, timeframe, date) => {
        const timeTranslation = {
          '5 minutes': '5 minutes',
          '1 minute': '1 minute'
        };
        const formattedTime = new Date(date).toLocaleString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        return `La tâche "${taskText}" est à faire dans ${timeTranslation[timeframe] || timeframe}! (${formattedTime})`;
      }
    }
  }
};

const getCurrentLanguage = () => window.Weglot?.getCurrentLang() || 'en';

export const initializeOneSignal = () => {
  if (window.OneSignal && window.OneSignalInitialized) {
    console.warn('🔔 OneSignal is already initialized.');
    return;
  }

  if (!window.OneSignal) {
    window.OneSignal = [];
  }

  const currentLang = getCurrentLanguage();
  const currentTranslations = translations[currentLang];

  window.OneSignal.push(() => {
    window.OneSignal.init({
      appId: process.env.REACT_APP_ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
      notifyButton: {
        enable: true,
        size: 'medium',
        theme: 'default',
        position: 'bottom-left',
        showCredit: false,
        text: currentTranslations.notifyButton,
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
        disable: true,
        title: currentTranslations.welcome.title,
        message: currentTranslations.welcome.message,
      }
    });

    // Handle notification clicks
    window.OneSignal.on('notificationClick', function(event) {
      try {
        const notificationData = event.notification.data;
        const currentUrl = window.location.href;
        
        if (currentUrl === window.location.origin + '/') {
          window.focus();
          return;
        }

        window.location.href = window.location.origin + '/';

        if (notificationData && notificationData.taskId) {
          console.log('Task ID from notification:', notificationData.taskId);
        }
      } catch (error) {
        console.error('Error handling notification click:', error);
      }
    });

    // Handle subscription changes
    window.OneSignal.on('subscriptionChange', async (isSubscribed) => {
      console.log(`🔔 Subscription changed:`, isSubscribed);
      if (isSubscribed) {
        try {
          const userId = await window.OneSignal.getUserId();
          const currentTranslations = translations[getCurrentLanguage()];
          await sendOneSignalNotification(
            userId,
            currentTranslations.welcome.title,
            currentTranslations.welcome.message
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
      contents: { 
        en: message,
        fr: message 
      },
      headings: { 
        en: title,
        fr: title 
      },
      data: { 
        ...data,
        url: window.location.origin + '/'
      },
      url: window.location.origin + '/'
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

    const currentLang = getCurrentLanguage();
    const currentTranslations = translations[currentLang];

    await sendOneSignalNotification(
      userId,
      currentTranslations.taskScheduled.title,
      currentTranslations.taskScheduled.message(task.text, task.priority, task.date),
      {
        taskId: task.id,
        scheduledTime: task.date,
        type: 'new_task',
        priority: task.priority
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
    const currentLang = getCurrentLanguage();
    const currentTranslations = translations[currentLang];

    const title = timeframe === 'now' 
      ? currentTranslations.reminder.nowTitle 
      : currentTranslations.reminder.futureTitle;

    const message = timeframe === 'now'
      ? currentTranslations.reminder.nowMessage(task.text, task.date)
      : currentTranslations.reminder.futureMessage(task.text, timeframe, task.date);

    await sendOneSignalNotification(
      userId,
      title,
      message,
      {
        taskId: task.id,
        timeframe,
        type: 'reminder',
        priority: task.priority
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
