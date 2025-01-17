import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();

// Use port from environment or fallback to 3001
const port = process.env.PORT || 3001;

// Setup CORS
app.use(cors({ origin: process.env.FRONTEND_URL || 'https://taskngo.vercel.app' })); // Restrict to production frontend

app.use(express.json()); // For parsing JSON request bodies

const handler = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { subscription, userId, notificationPermission } = req.body;

    if (!subscription || !userId) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Subscription and userId are required',
      });
    }

    const oneSignalPayload = {
      app_id: process.env.REACT_APP_ONESIGNAL_APP_ID,
      identifier: userId,
      notification_types: notificationPermission === 'granted' ? 1 : -2,
      device_type: 5,
      tags: {
        subscription_date: new Date().toISOString(),
        platform: 'web',
        environment: process.env.NODE_ENV || 'development',
      },
    };

    const response = await fetch('https://onesignal.com/api/v1/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.REACT_APP_ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(oneSignalPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: data.errors?.[0] || 'Failed to register with OneSignal',
      });
    }

    return res.status(200).json({
      success: true,
      playerId: data.id,
      message: 'Successfully registered for notifications',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message:
        process.env.NODE_ENV === 'development'
          ? error.message
          : 'Failed to process subscription',
    });
  }
};

// Define routes
app.get('/', (req, res) => {
  res.send('Server is running!');
});

app.post('/api/subscribe', handler); // Subscribe route

// Start the server
app.listen(port, () => {
  console.log(`Server listening at ${process.env.NODE_ENV === 'production' ? '' : 'http://localhost:'}${port}`);
});
