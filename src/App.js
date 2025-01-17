import React, { useState, useEffect, useRef } from 'react';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture, startOfWeek, differenceInMilliseconds } from 'date-fns';
import { Analytics } from "@vercel/analytics/react";
import { addUserRating, updateAverageRating, fetchAverageRating } from './firebase.js';
import './App.css';
import { initializeOneSignal, sendTaskNotification } from './OneSignal.js';

// Constants
const ALERT_SOUND = '/message-alert.mp3';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [completionPopup, setCompletionPopup] = useState({ show: false, taskId: null });
  const [scheduleAlert, setScheduleAlert] = useState({ show: false, taskId: null });
  const [widgetRating, setWidgetRating] = useState(0);
  const alertAudio = useRef(null);

useEffect(() => {
    // Initialize OneSignal
    const timer = setTimeout(() => {
      try {
        initializeOneSignal();
        console.log('OneSignal initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OneSignal:', error);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    // Preload audio
    alertAudio.current = new Audio(ALERT_SOUND);
    
    // Event listeners for better debugging
    alertAudio.current.addEventListener('canplaythrough', () => {
      console.log('Audio can play through');
    });
  
    alertAudio.current.addEventListener('error', (e) => {
      console.error('Audio error:', e);
    });
  
    // Add a load success handler
    alertAudio.current.addEventListener('loadeddata', () => {
      console.log('Audio file loaded successfully:', ALERT_SOUND);
    });
  
    // Add suspended state handler (useful for debugging autoplay issues)
    alertAudio.current.addEventListener('suspend', () => {
      console.log('Audio loading suspended');
    });
  
    try {
      alertAudio.current.load();
      console.log('Audio load initiated:', ALERT_SOUND);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  
    // Cleanup function to remove event listeners
    return () => {
      if (alertAudio.current) {
        alertAudio.current.removeEventListener('canplaythrough', () => {});
        alertAudio.current.removeEventListener('error', () => {});
        alertAudio.current.removeEventListener('loadeddata', () => {});
        alertAudio.current.removeEventListener('suspend', () => {});
      }
    };
  }, []);

  useEffect(() => {
    const handleTaskScheduled = (event) => {
      console.log('Task scheduled event received:', event.detail);
      setScheduleAlert({ show: true, taskId: event.detail.taskId });
      setTimeout(() => setScheduleAlert({ show: false, taskId: null }), 3000);
    };

    window.addEventListener('taskScheduled', handleTaskScheduled);
    return () => window.removeEventListener('taskScheduled', handleTaskScheduled);
  }, []);



  // Handle schedule click with subscription check
  const handleScheduleClick = (taskId) => {
    setScheduleAlert({ show: true, taskId });
    setTimeout(() => {
      setScheduleAlert({ show: false, taskId: null });
    }, 3000);
  };

  // Task management functions
  const addTask = async () => {
    if (newTask.trim() && taskDate) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        date: new Date(taskDate),
        archived: false,
        completed: false,
        isShaking: false,
        fiveMinAlert: false,
        oneMinAlert: false,
      };
  
      try {
        await sendTaskNotification(task);
        console.log('Notification scheduled for task:', task.text);
      } catch (error) {
        console.error('Error scheduling notification:', error);
      }
      
      setTasks((prevTasks) => [...prevTasks, task]);
      setNewTask('');
      setTaskDate('');
    } else {
      alert("Please provide both a task and a date.");
    }
  };
      
  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const archiveTask = (id) => {
    setTasks(tasks.map((task) =>
      task.id === id ? { ...task, archived: true } : task
    ));
  };
  // Only show completion popup when validation icon is clicked
  const completeTask = (id) => {
    setCompletionPopup({ show: true, taskId: id });
  };
  

  const resetTasks = () => {
    setTasks([]);

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
    let userId; // Define userId in outer scope so it's available in retry logic
    
    try {
      setWidgetRating(ratingValue);
      userId = Date.now().toString();
      await addUserRating(userId, ratingValue);
      await updateAverageRating();
      console.log('Rating updated successfully:', ratingValue);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        console.log('Connection issue detected, retrying...');
        // Retry after 2 seconds
        setTimeout(async () => {
          try {
            await addUserRating(userId, ratingValue);
            await updateAverageRating();
            console.log('Rating updated successfully on retry');
          } catch (retryError) {
            console.error('Failed to update rating after retry:', retryError);
          }
        }, 2000);
      } else {
        console.error('Error updating rating:', error);
      }
    }
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
        const taskDate = new Date(task.date);
        const timeRemaining = taskDate.getTime() - now.getTime();
        const fiveMinutes = 5 * 60 * 1000;
        const oneMinute = 60 * 1000;

        // Clock icon for today's or future tasks
        if ((isToday(taskDate) || isFuture(taskDate)) && !task.archived && !task.completed) {
          task = { ...task, showClockIcon: true };
        }

       // Handle 5-minute alert
       if (isToday(taskDate) && 
    timeRemaining <= fiveMinutes && 
    timeRemaining > fiveMinutes - 1000 && 
    !task.fiveMinAlert) {
  console.log('🚨 5-minute alert triggered for:', task.text);
  
  alertAudio.current.play()
    .catch(e => console.error('Audio play error:', e));

  if (window.OneSignal) {
    window.OneSignal.isPushNotificationsEnabled()
      .then(isSubscribed => {
        if (isSubscribed) {
          if (window.location.hostname === 'localhost') {
            new Notification('Task Reminder', {
              body: `⏰ 5-minute reminder: "${task.text}" is coming up!`,
              icon: '/logo.png'
            });
          } else {
            window.OneSignal.createNotification({
              heading: { en: "Task Reminder" },
              content: { en: `⏰ 5-minute reminder: "${task.text}" is coming up!` },
              url: window.location.origin,
              chrome_web_icon: "/logo.png"
            });
          }
        }
      })
      .catch(error => console.error('Push notification error:', error));
  }
  
  return { ...task, fiveMinAlert: true, isShaking: true };
}



       // Handle 1-minute alert
          if (isToday(taskDate) && 
            timeRemaining <= oneMinute && 
            timeRemaining > oneMinute - 1000 && 
            !task.oneMinAlert) {
          console.log('🚨 1-minute alert triggered for:', task.text);
          
          alertAudio.current.play()
            .catch(e => console.error('Audio play error:', e));
        
          if (window.OneSignal) {
            window.OneSignal.isPushNotificationsEnabled()
              .then(isSubscribed => {
                if (isSubscribed) {
                  if (window.location.hostname === 'localhost') {
                    new Notification('Urgent Task Reminder', {
                      body: `⚠️ 1-minute reminder: "${task.text}" is almost due!`,
                      icon: '/logo.png'
                    });
                  } else {
                    window.OneSignal.createNotification({
                      heading: { en: "Urgent Task Reminder" },
                      content: { en: `⚠️ 1-minute reminder: "${task.text}" is almost due!` },
                      url: window.location.origin,
                      chrome_web_icon: "/logo.png"
                    });
                  }
                }
              })
              .catch(error => console.error('Push notification error:', error));
          }
          
          return { ...task, oneMinAlert: true, isShaking: true };
        }
    // Handle due time alert
    if (isToday(taskDate) && 
    timeRemaining <= 0 && 
    timeRemaining > -1000 && 
    !task.dueAlert) {
  console.log('🔔 Task is now due:', task.text);
  alertAudio.current.play()
    .catch(e => console.error('Audio play error:', e));
  return { ...task, dueAlert: true, isShaking: true };
}
        
        // Stop shaking after 10 seconds
        if ((task.fiveMinAlert || task.oneMinAlert || task.dueAlert) && 
            ((timeRemaining < fiveMinutes - 10000) || 
             (timeRemaining < oneMinute - 10000) ||
             (timeRemaining < -10000))) {
          return { ...task, isShaking: false };
        }

        return task;
      });
    });
  }, 1000);

  return () => clearInterval(interval);
}, [completionPopup]);

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
                <img src="/logo.png" alt="Taskngo Logo" />
              </div>
              <h1 className="title">Taskngo</h1>
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

// TaskItem component 
const TaskItem = ({ task, deleteTask, archiveTask, completeTask, onScheduleClick }) => {

  return (
    <div className={`task-item ${task.isShaking ? 'shake' : ''}`}>
        <span>{task.text}</span>
        <span>{format(task.date, 'MM/dd/yyyy HH:mm')}</span>
        <div className="icons">
            {/* Clock icon for Today or Upcoming tasks */}
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