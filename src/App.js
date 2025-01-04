import React, { useState, useEffect, useRef } from 'react';
import { FaArchive, FaTrashAlt, FaBell, FaClock, FaCheck } from 'react-icons/fa';
import { format, isToday, isFuture, isPast, startOfWeek, differenceInMilliseconds, endOfDay } from 'date-fns';
import './App.css';

// Import Firebase functions
import { addUserRating, updateAverageRating, fetchAverageRating } from './firebase';

const ALERT_SOUND = '/message-alert.mp3';

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [taskDate, setTaskDate] = useState('');
  const [alertVisible, setAlertVisible] = useState(false);
  const [completionPopup, setCompletionPopup] = useState({ show: false, taskId: null });
  const [scheduleAlert, setScheduleAlert] = useState({ show: false, taskId: null });
  const [widgetRating, setWidgetRating] = useState(0); // Widget-wide rating state
  const alertAudio = useRef(new Audio(ALERT_SOUND));

  const handleScheduleClick = (taskId) => {
    setScheduleAlert({ show: true, taskId });
  };

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

  const deleteTask = (id) => {
    setTasks(tasks.filter((task) => task.id !== id));
  };

  const archiveTask = (id) => {
    setTasks(tasks.map((task) =>
      task.id === id ? { ...task, archived: true } : task
    ));
  };

  // Show the popup only when the "validate" icon is clicked
  const completeTask = (id) => {
    setCompletionPopup({ show: true, taskId: id });
  };

  const resetTasks = () => {
    setTasks([]);
    setAlertVisible(true);
  };

  const stopSound = () => {
    alertAudio.pause();
    alertAudio.currentTime = 0;
  };

  // Handle the response to mark the task as completed
  const handleCompletionResponse = (response) => {
    if (completionPopup.taskId) {
      if (response === 'yes') {
        // Mark the task as completed
        setTasks(tasks.map((task) =>
          task.id === completionPopup.taskId ? { ...task, completed: true } : task
        ));
      } else if (response === 'no') {
        // Do not mark the task as completed, just close the popup
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === completionPopup.taskId
              ? { ...task, alertPlayed: true }  // Mark alert as played so we don't show it again
              : task
          )
        );
        stopSound(); // Stop the alert sound if "No" is clicked
      }
    }
    
    // Close the popup after either "Yes" or "No"
    setCompletionPopup({ show: false, taskId: null });
  };

  const handleWidgetRating = async (ratingValue) => {
    setWidgetRating(ratingValue); // Update the rating value in the state

    // Generate a unique ID for the user (e.g., using the current timestamp or UUID)
    const userId = Date.now().toString();  // Using timestamp as a unique ID
    
    await addUserRating(userId, ratingValue);  // Update Firestore with the new user rating
    
    // Update the average rating in Firebase after adding the user's rating
    await updateAverageRating();
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
      setTasks((prevTasks) => {
        const updatedTasks = prevTasks.map((task) => {
          const timeRemaining = task.date - now;

          if (isToday(task.date) && timeRemaining <= 60000 && timeRemaining > 0 && !task.alertPlayed) {
            alertAudio.current.play(); // Play the alert sound
            return { ...task, alertPlayed: true, isShaking: true };
          }

          if (timeRemaining <= 0) {
            return { ...task, isShaking: false }; // Remove shake once the task time has passed
          }

          if (!isToday(task.date) && isPast(endOfDay(task.date)) && !task.completed && !task.archived) {
            return { ...task, archived: true };
          }

          return task;
        });
        return updatedTasks;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchRating = async () => {
      const avgRating = await fetchAverageRating();
      setWidgetRating(avgRating); // Fetch and set the average rating from Firebase
    };

    fetchRating(); // Fetch the current average rating when the component mounts
  }, []);

  return (
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

        {/* Widget Rating Section */}
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
        {isToday(task.date) && !isPast(task.date) && <FaClock className="icon clock-icon" />}
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

