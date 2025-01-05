import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture, isPast, startOfWeek, differenceInMilliseconds, endOfDay } from 'date-fns';
import './App.css';
import { addUserRating, updateAverageRating, fetchAverageRating } from './firebase';
import { Analytics } from "@vercel/analytics/react";
import TagManager from 'react-gtm-module';
import notificationService from './sendNotification';

// Initialize GTM
const tagManagerArgs = {
  gtmId: 'GTM-NPK8MNRQ',
};
TagManager.initialize(tagManagerArgs);

const ALERT_SOUND = '/message-alert.mp3';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [completionPopup, setCompletionPopup] = useState({ show: false, taskId: null });
  const [scheduleAlert, setScheduleAlert] = useState({ show: false, taskId: null });
  const [widgetRating, setWidgetRating] = useState(0);
  const alertAudio = useRef(new Audio(ALERT_SOUND));
  const [notificationPermission, setNotificationPermission] = useState(false);

  // Request notification permission when the app loads
  useEffect(() => {
    const requestNotificationPermission = async () => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission === 'granted');
      }
    };
    requestNotificationPermission();
  }, []);

  const handleScheduleClick = useCallback((taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (task && notificationPermission) {
      notificationService.scheduleNotification(task);
    }
    setScheduleAlert({ show: true, taskId });
  }, [tasks, notificationPermission]);

  const addTask = useCallback(() => {
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
      
      // Schedule notification for the new task if permission granted
      if (notificationPermission) {
        notificationService.scheduleNotification(task);
      }
      
      setNewTask('');
      setTaskDate('');
    } else {
      alert("Please provide both a task and a date.");
    }
  }, [newTask, taskDate, notificationPermission]);

  const deleteTask = useCallback((id) => {
    notificationService.cancelNotification(id);
    setTasks(prevTasks => prevTasks.filter((task) => task.id !== id));
  }, []);

  const archiveTask = useCallback((id) => {
    notificationService.cancelNotification(id);
    setTasks(prevTasks => prevTasks.map((task) =>
      task.id === id ? { ...task, archived: true } : task
    ));
  }, []);

  const completeTask = useCallback((id) => {
    setCompletionPopup({ show: true, taskId: id });
  }, []);

  const resetTasks = useCallback(() => {
    tasks.forEach(task => {
      notificationService.cancelNotification(task.id);
    });
    setTasks([]);
    setAlertVisible(true);
  }, [tasks]);

  const handleCompletionResponse = useCallback((response) => {
    if (completionPopup.taskId) {
      setTasks(prevTasks => {
        return prevTasks.map((task) => {
          if (task.id === completionPopup.taskId) {
            if (response === 'yes') {
              notificationService.cancelNotification(task.id);
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
  }, [completionPopup.taskId]);

  const handleWidgetRating = useCallback(async (ratingValue) => {
    setWidgetRating(ratingValue);
    const userId = Date.now().toString();
    await addUserRating(userId, ratingValue);
    await updateAverageRating();
  }, []);

  // Weekly reset effect
  useEffect(() => {
    const now = new Date();
    const nextSundayMidnight = startOfWeek(now, { weekStartsOn: 0 }).setHours(24, 0, 0, 0);
    const timeUntilReset = differenceInMilliseconds(nextSundayMidnight, now);
    const resetTimer = setTimeout(() => {
      resetTasks();
    }, timeUntilReset);
    return () => clearTimeout(resetTimer);
  }, [resetTasks]);

  // Task monitoring effect
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((task) => {
          const timeRemaining = task.date - now;
          console.log(`Task ID: ${task.id} | Time Remaining: ${timeRemaining}ms`);

          if (isFuture(task.date) && !task.archived && !task.completed) {
            if (format(task.date, 'MM/dd/yyyy') === format(now, 'MM/dd/yyyy') && !isToday(task.date)) {
              return { ...task, date: now };
            }
          }

          const showClockIcon = (isToday(task.date) || isFuture(task.date)) && !task.archived && !task.completed;
          if (showClockIcon) {
            task.showClockIcon = true;
          }

          if (isToday(task.date) && timeRemaining <= 60000 && timeRemaining > 0 && !task.alertPlayed) {
            console.log(`Playing sound for task ID: ${task.id}`);
            alertAudio.current.play();
            return { ...task, alertPlayed: true, isShaking: true };
          }

          if (isToday(task.date) &&
            (Math.abs(timeRemaining) < 1000 || (timeRemaining > 0 && timeRemaining <= 3600000)) && 
            !task.archived && 
            !task.completed &&
            !task.alertPlayed) {
            if (!completionPopup.show) {
              setCompletionPopup({ show: true, taskId: task.id });
            }
            return { ...task, isShaking: false, alertPlayed: true };
          }

          if (timeRemaining <= 0) {
            return { ...task, isShaking: false };
          }

          if (!isToday(task.date) && isPast(endOfDay(task.date)) && !task.completed && !task.archived) {
            notificationService.cancelNotification(task.id);
            return { ...task, archived: true };
          }

          return task;
        });
        return updatedTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [completionPopup.show]);

  // Fetch rating effect
  useEffect(() => {
    const fetchRating = async () => {
      const avgRating = await fetchAverageRating();
      setWidgetRating(avgRating);
    };
    fetchRating();
  }, []);

  // Listen for notification-related messages from service worker
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data && event.data.type === 'COMPLETE_TASK') {
        completeTask(event.data.taskId);
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [completeTask]);

  return (
    <div className="App">
      <Analytics />
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
  );
}

const TaskItem = ({ task, deleteTask, archiveTask, completeTask, onScheduleClick }) => {
  return (
    <div className={`task-item ${task.isShaking ? 'shake' : ''}`}>
      <span>{task.text}</span>
      <span>{format(task.date, 'MM/dd/yyyy HH:mm')}</span>
      <div className="icons">
        {task.showClockIcon && !task.archived && !task.completed && <FaClock className="icon clock-icon" />}
        {isFuture(task.date) && !task.archived && !task.completed && (
          <FaBell className="icon alert-icon" onClick={() => onScheduleClick(task.id)} />
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