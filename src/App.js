import React, { useState, useEffect, useRef } from 'react';
import OneSignal from 'react-onesignal';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture, startOfWeek, differenceInMilliseconds } from 'date-fns';
import './App.css';
import { addUserRating, updateAverageRating, fetchAverageRating } from './firebase';
import { Analytics } from "@vercel/analytics/react";
import TagManager from 'react-gtm-module';

// Constants
const ALERT_SOUND = '/message-alert.mp3';

// Initialize GTM
const tagManagerArgs = {
  gtmId: 'GTM-NPK8MNRQ',
};
TagManager.initialize(tagManagerArgs);

function App() {
  // State declarations
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [completionPopup, setCompletionPopup] = useState({ show: false, taskId: null });
  const [scheduleAlert, setScheduleAlert] = useState({ show: false, taskId: null });
  const [widgetRating, setWidgetRating] = useState(0);
  const alertAudio = useRef(new Audio(ALERT_SOUND));

  useEffect(() => {
    const verifyNotificationSetup = async () => {
      try {
        // Check OneSignal permission
        const permission = await OneSignal.Notifications.permission;
        console.log('OneSignal permission status:', permission);
        
        // Get subscription state
        const isPushEnabled = await OneSignal.Notifications.isPushEnabled();
        console.log('Push notifications enabled:', isPushEnabled);
        
        // Get device ID
        const deviceId = await OneSignal.User.PushSubscription.id;
        console.log('Device ID:', deviceId);
        
        // Check if running in development
        console.log('Environment:', process.env.NODE_ENV);
        
        // Log browser info
        console.log('Browser:', navigator.userAgent);
        
        // Check service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          console.log('Service Worker:', registration ? 'Registered' : 'Not registered');
        }
      } catch (error) {
        console.error('Error verifying notification setup:', error);
      }
    };
  
    verifyNotificationSetup();
  }, []);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        // Check if OneSignal is loaded
        if (!window.OneSignal) {
          console.error('OneSignal not loaded');
          return;
        }
  
        // Check if initialized
        console.log('OneSignal initialized:', window.OneSignal?.initialized);
  
        // Check service worker registration
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          console.log('Service Worker registrations:', registrations);
          
          // Look for OneSignal service worker
          const osWorker = registrations.find(reg => 
            reg.scope.includes('taskngo') && 
            reg.active?.scriptURL.includes('OneSignalSDKWorker')
          );
          console.log('OneSignal Service Worker:', osWorker ? 'Found' : 'Not found');
        }
      } catch (error) {
        console.error('Setup check error:', error);
      }
    };
  
    checkSetup();
  }, []);

  // Add this at the top of your App component
useEffect(() => {
  // Preload audio
  alertAudio.current = new Audio(ALERT_SOUND);
  alertAudio.current.load();
  
  // Test audio
  alertAudio.current.addEventListener('canplaythrough', () => {
    console.log('Audio can play through');
  });
  
  alertAudio.current.addEventListener('error', (e) => {
    console.error('Audio error:', e);
  });
}, []);

  // Schedule notification function
  const scheduleNotification = async (task) => {
    try {
      // Verify OneSignal is initialized
      if (!window.OneSignal?.initialized) {
        console.error('OneSignal not initialized');
        return false;
      }
  
      // Check push support
      const isPushSupported = await OneSignal.Notifications.isPushSupported();
      console.log('Push notifications supported:', isPushSupported);
      
      if (!isPushSupported) {
        console.error('Push notifications not supported');
        return false;
      }
  
      // Check/request permission
      const permission = await OneSignal.Notifications.permission;
      console.log('Current permission:', permission);
      
      if (permission !== 'granted') {
        console.log('Requesting permission...');
        await OneSignal.Notifications.requestPermission();
      }
  
      // Get device ID
      const deviceId = await OneSignal.User.PushSubscription.id;
      console.log('Device ID:', deviceId);
  
      if (!deviceId) {
        console.error('No device ID found');
        return false;
      }
  
      // Common notification settings
      const notificationSettings = {
        app_id: "9761ebe7-8f05-40d9-a3e5-858e0f16ee69", // Your app ID
        include_player_ids: [deviceId],
        priority: 10,
        ttl: 300,
        web_push_type: 'Notification',
        isAnyWeb: true,
        chrome_web_icon: "/taskngo/logo.png", // Updated path
        firefox_icon: "/taskngo/logo.png", // Updated path
        safari_icon: "/taskngo/logo.png", // Updated path
        require_interaction: true,
        web_push_notification_target: 'tab',
        safari_web_push_notification: true,
      };
  
      // Schedule 5-minute notification
      const fiveMinNotificationTime = new Date(task.date.getTime() - 5 * 60000);
      console.log('Scheduling 5-minute notification for:', fiveMinNotificationTime);
  
      const fiveMinResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          ...notificationSettings,
          contents: { 
            en: `Your task "${task.text}" is due in 5 minutes! 💪` 
          },
          headings: { 
            en: "⏰ Time to Focus!" 
          },
          send_after: fiveMinNotificationTime.toISOString(),
          data: { 
            taskId: task.id,
            timeRemaining: "5min",
            url: window.location.origin + '/taskngo/' // Updated URL
          },
          url: window.location.origin + '/taskngo/', // Updated URL
          collapse_id: `task-${task.id}-5min`
        })
      });
  
      // Schedule 1-minute notification
      const oneMinNotificationTime = new Date(task.date.getTime() - 60000);
      console.log('Scheduling 1-minute notification for:', oneMinNotificationTime);
  
      const oneMinResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`
        },
        body: JSON.stringify({
          ...notificationSettings,
          contents: { 
            en: `⚠️ URGENT: "${task.text}" is due in 1 minute! ⚠️` 
          },
          headings: { 
            en: "⏰ Final Reminder!" 
          },
          send_after: oneMinNotificationTime.toISOString(),
          data: { 
            taskId: task.id,
            timeRemaining: "1min",
            url: window.location.origin + '/taskngo/' // Updated URL
          },
          url: window.location.origin + '/taskngo/', // Updated URL
          collapse_id: `task-${task.id}-1min`
        })
      });
  
      const fiveMinResult = await fiveMinResponse.json();
      const oneMinResult = await oneMinResponse.json();
  
      console.log('5-minute notification result:', fiveMinResult);
      console.log('1-minute notification result:', oneMinResult);
  
      if (fiveMinResult.errors || oneMinResult.errors) {
        console.error('Notification errors:', {
          fiveMin: fiveMinResult.errors,
          oneMin: oneMinResult.errors
        });
        throw new Error('Error scheduling notifications');
      }
      
      return true;
    } catch (error) {
      console.error('Error scheduling notifications:', error);
      return false;
    }
  };

  // Handle schedule click
  const handleScheduleClick = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      try {
        const isScheduled = await scheduleNotification(task);
        if (isScheduled) {
          setScheduleAlert({ show: true, taskId });
        }
      } catch (error) {
        console.error('Failed to schedule notification:', error);
      }
    }
  };
  // Task management functions
  const addTask = () => {
    if (newTask.trim() && taskDate) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        date: new Date(taskDate),
        archived: false,
        completed: false,
        isShaking: false,
        alertPlayed: false,
      };
      setTasks((prevTasks) => [...prevTasks, task]);
      setNewTask('');
      setTaskDate('');
    } else {
      alert("Please provide both a task and a date.");
    }
  };

  const deleteTask = async (id) => {
    try {
      await OneSignal.Notifications.remove(id);
      setTasks(tasks.filter((task) => task.id !== id));
    } catch (error) {
      console.error('Error deleting task:', error);
      setTasks(tasks.filter((task) => task.id !== id));
    }
  };

  const archiveTask = (id) => {
    setTasks(tasks.map((task) =>
      task.id === id ? { ...task, archived: true } : task
    ));
  };

  const completeTask = (id) => {
    setCompletionPopup({ show: true, taskId: id });
  };

  const resetTasks = () => {
    setTasks([]);
    setAlertVisible(true);
  };

  const handleCompletionResponse = (response) => {
    if (completionPopup.taskId) {
      setTasks(prevTasks => {
        return prevTasks.map((task) => {
          if (task.id === completionPopup.taskId) {
            if (response === 'yes') {
              return { ...task, completed: true };
            } else if (response === 'no') {
              return { ...task, alertPlayed: true };
            }
          }
          return task;
        });
      });
    }
    setCompletionPopup({ show: false, taskId: null });
  };

  const handleWidgetRating = async (ratingValue) => {
    setWidgetRating(ratingValue);
    const userId = Date.now().toString();
    await addUserRating(userId, ratingValue);
    await updateAverageRating();
  };
  // Effect for weekly task reset
  useEffect(() => {
    const now = new Date();
    const nextSundayMidnight = startOfWeek(now, { weekStartsOn: 0 }).setHours(24, 0, 0, 0);
    const timeUntilReset = differenceInMilliseconds(nextSundayMidnight, now);
    const resetTimer = setTimeout(() => {
      resetTasks();
    }, timeUntilReset);
    return () => clearTimeout(resetTimer);
  }, []);

  // Effect for task monitoring and alerts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks((prevTasks) => {
        return prevTasks.map((task) => {
          // Ensure we're working with Date objects
          const taskDate = new Date(task.date);
          const timeRemaining = taskDate.getTime() - now.getTime();
  
          // Debug log
          console.log({
            task: task.text,
            dueTime: taskDate.toLocaleTimeString(),
            currentTime: now.toLocaleTimeString(),
            timeRemaining: Math.floor(timeRemaining / 1000), // in seconds
            isToday: isToday(taskDate),
            shouldShowClock: isToday(taskDate) || isFuture(taskDate)
          });
  
          // Clock icon logic
          if ((isToday(taskDate) || isFuture(taskDate)) && !task.archived && !task.completed) {
            task = { ...task, showClockIcon: true };
          }
           // 5-minute alert
           if (isToday(taskDate) &&
           timeRemaining <= 5 * 60000 && // less than or equal to 5 minutes
           timeRemaining > 4 * 60000 && // more than 4 minutes
           !task.alertPlayed5Min) {
         console.log('🚨 5-minute Alert triggered for:', task.text);
         alertAudio.current.play()
           .catch(e => console.error('Audio play error:', e));
         return { ...task, alertPlayed5Min: true };
       }

          // One minute alert and shake
          if (isToday(taskDate) && 
              timeRemaining <= 60000 && // less than 1 minute
              timeRemaining > 0 && 
              !task.alertPlayed) {
            console.log('🚨 Alert triggered for:', task.text);
            alertAudio.current.play()
              .catch(e => console.error('Audio play error:', e));
            return { ...task, alertPlayed: true, isShaking: true };
          }
  
          // Keep shaking if within alert window
          if (task.isShaking && timeRemaining > 0) {
            return task;
          }
  
          // Stop shaking if time has passed
          if (task.isShaking && timeRemaining <= 0) {
            return { ...task, isShaking: false };
          }
  
          return task;
        });
      });
    }, 1000); // Check every second
  
    return () => clearInterval(interval);
  }, []);

  // Effect for fetching widget rating
  useEffect(() => {
    const fetchRating = async () => {
      const avgRating = await fetchAverageRating();
      setWidgetRating(avgRating);
    };

    fetchRating();
  }, []);
  return (
    <>
      <Analytics />
      <div className="App">
        {scheduleAlert.show && (
          <div className="completion-popup">
            <p>This task has been scheduled!</p>
            <div className="button-container">
              <button onClick={() => setScheduleAlert({ show: false, taskId: null })}>OK</button>
            </div>
          </div>
        )}

        {alertVisible && (
          <div className="alert">
            <p>Tasks have been reset for the week!</p>
            <button onClick={() => setAlertVisible(false)}>&times;</button>
          </div>
        )}

        {completionPopup.show && (
          <div className="completion-popup">
            <p>Have you completed this task?</p>
            <div className="button-container">
              <button onClick={() => handleCompletionResponse('yes')}>Yes</button>
              <button onClick={() => handleCompletionResponse('no')}>No</button>
            </div>
          </div>
        )}

        <div className="widget">
          <div className="header">
            <div className="header-content">
              <div className="logo">
                <img src="/logo.png" alt="TaskGo Logo" />
              </div>
              <h1 className="title">TaskNGo</h1>
              <FaBell
                className="alert-icon"
                onClick={() => setAlertVisible(true)}
              />
            </div>
          </div>

          <div className="input-container">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              placeholder="Enter your task..."
            />
            <input
              type="datetime-local"
              value={taskDate}
              onChange={(e) => setTaskDate(e.target.value)}
            />
            <button onClick={addTask}>Add Task</button>
          </div>

          <div className="categories">
            <div className="category">
              <h2>Today</h2>
              {tasks.filter((task) => isToday(task.date) && !task.archived && !task.completed).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  deleteTask={deleteTask}
                  archiveTask={archiveTask}
                  completeTask={completeTask}
                  onScheduleClick={handleScheduleClick}
                />
              ))}
            </div>

            <div className="category">
              <h2>Upcoming</h2>
              {tasks.filter((task) => isFuture(task.date) && !isToday(task.date) && !task.archived && !task.completed).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  deleteTask={deleteTask}
                  archiveTask={archiveTask}
                  completeTask={completeTask}
                  onScheduleClick={handleScheduleClick}
                />
              ))}
            </div>

            <div className="category completed">
              <h2>Completed</h2>
              {tasks.filter((task) => task.completed && !task.archived).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  deleteTask={deleteTask}
                  archiveTask={archiveTask}
                  completeTask={completeTask}
                  onScheduleClick={handleScheduleClick}
                />
              ))}
            </div>

            <div className="category archived">
              <h2>Archived</h2>
              {tasks.filter((task) => task.archived).map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  deleteTask={deleteTask}
                  archiveTask={archiveTask}
                  completeTask={completeTask}
                  onScheduleClick={handleScheduleClick}
                />
              ))}
            </div>
          </div>

          <div className="widget-rating">
            <h3>Rate this Widget:</h3>
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`star ${star <= widgetRating ? 'filled' : ''}`}
                  onClick={() => handleWidgetRating(star)}
                >
                  &#9733;
                </span>
              ))}
            </div>
            <p>Your Rating: {widgetRating} / 5</p>
          </div>

          <footer className="footer">
            &copy; Made by Affouet Emmanuella Ouattara. All rights reserved.
          </footer>
        </div>
      </div>
    </>
  );
}

// TaskItem component (outside App component)
const TaskItem = ({ task, deleteTask, archiveTask, completeTask, onScheduleClick }) => {
  const [showAlert, setShowAlert] = useState(false);

  const handleNotificationClick = async () => {
    try {
      const permission = await OneSignal.Notifications.permission;
      
      if (permission !== 'granted') {
        await OneSignal.Notifications.requestPermission();
      }

      onScheduleClick(task.id);
      setShowAlert(true);
    } catch (error) {
      console.error('Error handling notification:', error);
      alert("Please enable notifications using the OneSignal bell icon first.");
    }
  };

  return (
    <div className={`task-item ${task.isShaking ? 'shake' : ''}`}>
      <span>{task.text}</span>
      <span>{format(task.date, 'MM/dd/yyyy HH:mm')}</span>
      <div className="icons">
        {task.showClockIcon && !task.archived && !task.completed && 
          <FaClock className="icon clock-icon" />
        }
        {isFuture(task.date) && !task.archived && !task.completed && (
          <FaBell 
            className={`icon alert-icon notification ${showAlert ? 'active' : ''}`}
            onClick={handleNotificationClick}
          />
        )}
        {!task.archived && (
          <FaArchive onClick={() => archiveTask(task.id)} className="icon" />
        )}
        {!task.completed && (
          <FaCheck onClick={() => completeTask(task.id)} className="icon" />
        )}
        <FaTrashAlt onClick={() => deleteTask(task.id)} className="icon" />
      </div>
    </div>
  );
};

export default App;
