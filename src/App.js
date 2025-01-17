import React, { useState, useEffect, useRef } from 'react';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture, startOfWeek, differenceInMilliseconds } from 'date-fns';
import { Analytics } from "@vercel/analytics/react";
import { addUserRating, updateAverageRating, fetchAverageRating } from './firebase.js';
import './App.css';
import { initializeOneSignal, sendTaskNotification } from './OneSignal.js';

// Constants
const ALERT_SOUND = '/message-alert.mp3';

const sendTaskReminder = (task, now, alertAudio, setTasks) => {
  const taskDate = new Date(task.date);
  const timeRemaining = taskDate.getTime() - now.getTime();
  const fiveMinutes = 5 * 60 * 1000;
  const oneMinute = 60 * 1000;
  
  let updatedTask = null;
  
  if (timeRemaining <= fiveMinutes && timeRemaining > fiveMinutes - 1000 && !task.fiveMinAlert) {
    updatedTask = { ...task, fiveMinAlert: true, isShaking: true };
    alertAudio.current.play().catch(e => console.error('Audio play error:', e));
  } else if (timeRemaining <= oneMinute && timeRemaining > oneMinute - 1000 && !task.oneMinAlert) {
    updatedTask = { ...task, oneMinAlert: true, isShaking: true };
    alertAudio.current.play().catch(e => console.error('Audio play error:', e));
  } else if (timeRemaining <= 0 && timeRemaining > -1000 && !task.dueAlert) {
    updatedTask = { ...task, dueAlert: true, isShaking: true };
    alertAudio.current.play().catch(e => console.error('Audio play error:', e));
  }

  if (updatedTask) {
    setTasks(prevTasks => prevTasks.map(t => (t.id === task.id ? updatedTask : t)));
  }

  // Reset shaking after a delay
  if ((task.fiveMinAlert || task.oneMinAlert || task.dueAlert) && timeRemaining < -10000) {
    setTasks(prevTasks =>
      prevTasks.map(t => (t.id === task.id ? { ...t, isShaking: false } : t))
    );
  }
};



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
    const timer = setTimeout(() => {
      try {
        initializeOneSignal();
        console.log('OneSignal initialized successfully');
      } catch (error) {
        console.error('Failed to initialize OneSignal:', error);
      }
    }, 1000);
  
    return () => clearTimeout(timer); // Cleanup the timer when the component unmounts
  }, []);
  
  
  useEffect(() => {
    const onCanPlayThrough = () => console.log('Audio can play through');
    const onError = (e) => console.error('Audio error:', e);
    const onLoadedData = () => console.log('Audio file loaded successfully:', ALERT_SOUND);
    const onSuspend = () => console.log('Audio loading suspended');
  
    alertAudio.current = new Audio(ALERT_SOUND);
    alertAudio.current.addEventListener('canplaythrough', onCanPlayThrough);
    alertAudio.current.addEventListener('error', onError);
    alertAudio.current.addEventListener('loadeddata', onLoadedData);
    alertAudio.current.addEventListener('suspend', onSuspend);
    
    try {
      alertAudio.current.load();
      console.log('Audio load initiated:', ALERT_SOUND);
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  
    return () => {
      alertAudio.current.removeEventListener('canplaythrough', onCanPlayThrough);
      alertAudio.current.removeEventListener('error', onError);
      alertAudio.current.removeEventListener('loadeddata', onLoadedData);
      alertAudio.current.removeEventListener('suspend', onSuspend);
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

const handleScheduleClick = (taskId) => {
    setScheduleAlert({ show: true, taskId });
    setTimeout(() => {
      setScheduleAlert({ show: false, taskId: null });
    }, 3000);
  };

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
        await sendTaskNotification(task); // Send the task notification
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

  const completeTask = (id) => {
    setCompletionPopup({ show: true, taskId: id });
  };

  const resetTasks = () => {
    setTasks([]);
  };

  const handleCompletionResponse = (response) => {
    if (completionPopup.taskId) {
      setTasks(prevTasks => prevTasks.map(task => {
        if (task.id === completionPopup.taskId) {
          return {
            ...task,
            completed: response === 'yes',
            alertPlayed: response !== 'yes',
          };
        }
        return task;
      }));
    }
    setCompletionPopup({ show: false, taskId: null });
  };
  

  const handleWidgetRating = async (ratingValue) => {
    let userId;
    
    try {
      setWidgetRating(ratingValue);
      userId = Date.now().toString();
      await addUserRating(userId, ratingValue);
      await updateAverageRating();
      console.log('Rating updated successfully:', ratingValue);
    } catch (error) {
      console.error('Error updating rating:', error);
      
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        console.log('Connection issue detected, retrying...');
        setTimeout(async () => {
          try {
            await addUserRating(userId, ratingValue);
            await updateAverageRating();
            console.log('Rating updated successfully on retry');
          } catch (retryError) {
            console.error('Failed to update rating after retry:', retryError);
          }
        }, 2000);
      }
    }
  };
  

  useEffect(() => {
    const now = new Date();
    const nextSundayMidnight = startOfWeek(now, { weekStartsOn: 0 }).setHours(24, 0, 0, 0);
    const timeUntilReset = differenceInMilliseconds(nextSundayMidnight, now);
    const resetTimer = setTimeout(() => {
      resetTasks();
    }, timeUntilReset);
    return () => clearTimeout(resetTimer);
  }, []);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      
      // Update task reminders in one batch
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => {
          sendTaskReminder(task, now, alertAudio, setTasks); // Update reminders
          return task;
        });
        return updatedTasks; // Return updated task list
      });
    }, 1000);
  
    return () => clearInterval(interval);  // Cleanup
  }, [alertAudio]); // Dependency on alertAudio only
  
  

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
            {tasks
              .filter(
                (task) =>
                  isFuture(task.date) &&
                  !isToday(task.date) &&
                  !task.archived &&
                  !task.completed
              )
              .map((task) => (
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
            {tasks
              .filter((task) => task.completed && !task.archived)
              .map((task) => (
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
            {tasks
              .filter((task) => task.archived)
              .map((task) => (
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
        {task.showClockIcon && !task.archived && !task.completed && (
          <FaClock className="icon clock-icon" />
        )}
        {isFuture(task.date) && !task.archived && !task.completed && (
          <FaBell
            className="icon alert-icon"
            onClick={() => onScheduleClick(task.id)}
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