import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Log environment setup
console.log('Environment check:', {
  NODE_ENV: process.env.NODE_ENV,
  APP_ID: process.env.REACT_APP_ONESIGNAL_APP_ID ? 'Set' : 'Not set',
  REST_API_KEY: process.env.REACT_APP_ONESIGNAL_REST_API_KEY ? 'Set' : 'Not set'
});

// CORS configuration
const corsOptions = {
  origin: ['http://localhost:3000', 'https://taskngo.vercel.app'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    contentType: req.headers['content-type']
  });
  next();
});

// Single notification endpoint
app.post('/api/send-notification', async (req, res) => {
  const { title, message, userId, data = {}, icon = "/logo192.png" } = req.body;

  if (!title || !message || !userId) {
    return res.status(400).json({ 
      error: 'Missing required data',
      details: 'Title, message, and userId are required'
    });
  }

  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : 'https://taskngo.vercel.app';

    // Construct notification payload
    const notificationPayload = {
      app_id: process.env.REACT_APP_ONESIGNAL_APP_ID,
      include_player_ids: [userId],
      contents: { en: message },
      headings: { en: title },
      web_push_type: 'Notification',
      priority: 10,
      ttl: 30,
      isAnyWeb: true,
      // Icons with absolute URLs
      chrome_web_icon: `${baseUrl}${icon}`,
      chrome_web_badge: `${baseUrl}/logo192.png`,
      chrome_web_image: `${baseUrl}/logo512.png`,
      firefox_icon: `${baseUrl}/logo192.png`,
      // Sound settings
      web_push_sound: `${baseUrl}/message-alert.mp3`,
      android_sound: 'notification',
      ios_sound: 'notification',
      // Additional data
      data: {
        ...data,
        userId,
        timestamp: new Date().toISOString(),
        sound: true
      },
      // Action buttons
      web_buttons: [{
        id: "open-app",
        text: "Open Task",
        icon: `${baseUrl}/logo192.png`,
        url: baseUrl
      }],
      // Template settings
      web_push_template: "default",
      // Notification behavior
      url: baseUrl,
      chrome_web_origin: baseUrl,
      chrome_web_default_notification_icon: `${baseUrl}/logo192.png`,
      // Appearance settings
      chrome_web_style: {
        type: 'notification',
        title: title,
        message: message,
        icon: `${baseUrl}/logo192.png`,
        badge: `${baseUrl}/logo192.png`,
        image: `${baseUrl}/logo512.png`,
        requireInteraction: true,
        silent: false
      }
    };

    // Send to OneSignal
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', {
        status: response.status,
        errors: responseData.errors,
        payload: notificationPayload
      });
      return res.status(response.status).json({
        error: 'Failed to send notification',
        details: responseData.errors?.[0] || 'Unknown error occurred'
      });
    }

    // Log success and respond
    console.log('Notification sent successfully:', {
      title,
      userId,
      notificationId: responseData.id,
      sound: true
    });

    return res.status(200).json({
      success: true,
      message: 'Notification sent successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An error occurred while sending the notification'
    });
  }
});

// Webhook endpoints for notification events
app.post('/api/notification-displayed', (req, res) => {
  console.log('Notification displayed:', req.body);
  res.status(200).send();
});

app.post('/api/notification-clicked', (req, res) => {
  console.log('Notification clicked:', req.body);
  res.status(200).send();
});

app.post('/api/notification-dismissed', (req, res) => {
  console.log('Notification dismissed:', req.body);
  res.status(200).send();
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port} in ${process.env.NODE_ENV || 'development'} mode`);
});