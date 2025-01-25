import React, { useState, useEffect, useRef } from 'react';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture} from 'date-fns';
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react"
import './App.css';
// eslint-disable-next-line no-unused-vars
import {  sendTaskNotification} from './OneSignal.js';
import { cleanupOneSignal } from './OneSignal.js';
import { register } from './serviceWorkerRegistration.js';
import UpdateNotification from './UpdateNotification.js';
import WeglotInit from './WeglotInit.js';




// Register the service worker
register({
  onSuccess: (registration) => {
    console.log('Service worker registered successfully', registration);
  },
  onUpdate: (registration) => {
    console.log('Service worker updated', registration);
  },
});

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
    alertAudio.current?.play().catch(e => console.error('Audio play error:', e));
  } else if (timeRemaining <= oneMinute && timeRemaining > oneMinute - 1000 && !task.oneMinAlert) {
    updatedTask = { ...task, oneMinAlert: true, isShaking: true };
    alertAudio.current?.play().catch(e => console.error('Audio play error:', e));
  } else if (timeRemaining <= 0 && timeRemaining > -1000 && !task.dueAlert) {
    updatedTask = { ...task, dueAlert: true, isShaking: true };
    alertAudio.current?.play().catch(e => console.error('Audio play error:', e));
  }

  if (updatedTask) {
    setTasks(prevTasks => prevTasks.map(t => (t.id === task.id ? updatedTask : t)));
    
    // Remove shake after 5 seconds
    setTimeout(() => {
      setTasks(prevTasks =>
        prevTasks.map(t => 
          t.id === task.id ? { ...t, isShaking: false } : t
        )
      );
    }, 5000);
  }
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [completionPopup, setCompletionPopup] = useState({ show: false, taskId: null });
  const [scheduleAlert, setScheduleAlert] = useState({ show: false, taskId: null });
  const alertAudio = useRef(null);
  const [taskPriority, setTaskPriority] = useState('medium');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [ currentLanguage,setCurrentLanguage] = useState(window.Weglot?.getCurrentLang() || 'en');
  




  useEffect(() => {
    if (window.Weglot) {
      const handleLanguageChange = () => {
        const newLang = window.Weglot.getCurrentLang();
        setCurrentLanguage(newLang);
      };
      window.Weglot.on('languageChanged', handleLanguageChange);
      return () => window.Weglot.off('languageChanged', handleLanguageChange);
    }
  });
  
  
  
 
  useEffect(() => {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks));
    }
  }, []);
  
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  
  useEffect(() => {
    return () => {
      cleanupOneSignal();
    };
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
  
  if (process.env.NODE_ENV === 'production') {
    console.log('Running in production mode!');
  } else {
    console.log('Running in development mode!');
  }
  

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
    console.log('Adding task:', newTask.trim(), taskDate);
    if (newTask.trim() && taskDate) {
      const task = {
        id: Date.now(),
        text: newTask.trim(),
        date: new Date(taskDate),
        priority: taskPriority,
        archived: false,
        completed: false,
        isShaking: false,
        fiveMinAlert: false,
        oneMinAlert: false,
      };
  
      try {
        await sendTaskNotification(task);
        console.log('Notification scheduled for task:', task.text);
        // Only add the task to state if notification scheduling succeeds
        setTasks((prevTasks) => [...prevTasks, task]);
        setNewTask('');
        setTaskDate('');
        setTaskPriority('medium');
      } catch (error) {
    
        // Show user-friendly error message
        alert("Failed to schedule notification. The task will be added without notifications.");
        // Still add the task even if notification fails
        setTasks((prevTasks) => [...prevTasks, task]);
        setNewTask('');
        setTaskDate('');
        setTaskPriority('medium');
      }
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
  

 
  useEffect(() => {
    // Precompute time buckets for tasks
    const initializeTaskBuckets = (tasks) => {
      const now = Date.now();
      return tasks.reduce((buckets, task) => {
        const timeRemaining = new Date(task.date).getTime() - now;
        const bucket = Math.floor(timeRemaining / 1000); // Group by seconds
        if (!buckets[bucket]) buckets[bucket] = [];
        buckets[bucket].push(task);
        return buckets;
      }, {});
    };
  
    let taskBuckets = initializeTaskBuckets(tasks);
    let bucketKeys = Object.keys(taskBuckets).map(Number).sort((a, b) => a - b);
  
    const processBuckets = () => {
      const now = Date.now();
      const currentBucket = bucketKeys[0];
      
      if (currentBucket !== undefined && currentBucket <= Math.floor(now / 1000)) {
        const dueTasks = taskBuckets[currentBucket] || [];
        dueTasks.forEach(task => {
          sendTaskReminder(task, new Date(), alertAudio, setTasks);
        });
        
        // Remove processed bucket
        delete taskBuckets[currentBucket];
        bucketKeys.shift();
      }
    };
  
    const interval = setInterval(processBuckets, 1000);
  
    return () => clearInterval(interval);
  }, [tasks, alertAudio]);
  
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
  }, [alertAudio]);
  


  return (
    <>
  
      <Analytics />
      <div className="App">
        <WeglotInit />
     
        {scheduleAlert.show && (
  <div className="completion-popup">
    <p>
      {currentLanguage === 'fr' ? "Cette tâche a été planifiée!" : "This task has been scheduled!"}
    </p>
    <div className="button-container">
      <button onClick={() => setScheduleAlert({ show: false, taskId: null })}>
        {currentLanguage === 'fr' ? "D'accord" : "OK"}
      </button>
    </div>
  </div>
)}


        {/* ... */}
        <SpeedInsights />
      
        {completionPopup.show && (
  <div className="completion-popup">
    <p>
      {currentLanguage === 'fr' ? "Avez-vous terminé cette tâche?" : "Have you completed this task?"}
    </p>
    <div className="button-container">
      <button onClick={() => handleCompletionResponse('yes')}>
        {currentLanguage === 'fr' ? "Oui" : "Yes"}
      </button>
      <button onClick={() => handleCompletionResponse('no')}>
        {currentLanguage === 'fr' ? "Non" : "No"}
      </button>
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
    <div id="weglot-language-switcher"></div>
    <UpdateNotification /> 
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
             <select 
    value={taskPriority}
    onChange={(e) => setTaskPriority(e.target.value)}
    className="priority-select"
  >
    <option value="high">High Priority</option>
    <option value="medium">Medium Priority</option>
    <option value="low">Low Priority</option>
  </select>
            <button onClick={addTask}>Add Task</button>
          </div>
          <div className="filter-controls">
  <select 
    value={priorityFilter}
    onChange={(e) => setPriorityFilter(e.target.value)}
    className="priority-filter"
  >
    <option value="all">All Priorities</option>
    <option value="high">High Priority Only</option>
    <option value="medium">Medium Priority Only</option>
    <option value="low">Low Priority Only</option>
  </select>
</div>
          <div className="categories">
          <div className="category">
  <h2>Today</h2>
  {tasks
    .filter((task) => 
      (priorityFilter === 'all' || task.priority === priorityFilter.toLowerCase().replace(' Only', '')) &&
      isToday(task.date) && 
      !task.archived && 
      !task.completed
    )
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .map((task) => (
      <TaskItem
      key={task.id}
      task={task}
      deleteTask={deleteTask}
      archiveTask={archiveTask}
      completeTask={completeTask}
      onScheduleClick={handleScheduleClick}
      currentLanguage={currentLanguage}
    />
    ))}
</div>
            <div className="category">
  <h2>Upcoming</h2>
  {tasks
    .filter((task) => 
      (priorityFilter === 'all' || task.priority === priorityFilter) &&
      isFuture(task.date) &&
      !isToday(task.date) &&
      !task.archived &&
      !task.completed
    )
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .map((task) => (
      <TaskItem
      key={task.id}
      task={task}
      deleteTask={deleteTask}
      archiveTask={archiveTask}
      completeTask={completeTask}
      onScheduleClick={handleScheduleClick}
      currentLanguage={currentLanguage}
    />
    ))}
</div>

<div className="category completed">
  <h2>Completed</h2>
  {tasks
    .filter((task) => 
      (priorityFilter === 'all' || task.priority === priorityFilter) &&
      task.completed && 
      !task.archived
    )
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .map((task) => (
      <TaskItem
      key={task.id}
      task={task}
      deleteTask={deleteTask}
      archiveTask={archiveTask}
      completeTask={completeTask}
      onScheduleClick={handleScheduleClick}
      currentLanguage={currentLanguage}
    />
    ))}
</div>

<div className="category archived">
  <h2>Archived</h2>
  {tasks
    .filter((task) => 
      (priorityFilter === 'all' || task.priority === priorityFilter) &&
      task.archived
    )
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .map((task) => (
      <TaskItem
      key={task.id}
      task={task}
      deleteTask={deleteTask}
      archiveTask={archiveTask}
      completeTask={completeTask}
      onScheduleClick={handleScheduleClick}
      currentLanguage={currentLanguage}
    />
    ))}
</div>
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
const TaskItem = ({ task, deleteTask, archiveTask, completeTask, onScheduleClick, currentLanguage }) => {
  return (
    <div className={`task-item priority-${task.priority} ${task.isShaking ? 'shake' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="task-priority">
          {currentLanguage === 'fr' 
            ? task.priority === 'high' ? 'ÉLEVÉE'
              : task.priority === 'medium' ? 'MOYENNE'
              : 'BASSE'
            : task.priority.toUpperCase()}
        </span>
        <span>{task.text}</span>
      </div>
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