const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fetch = require('node-fetch');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Map React env variables to server variables
const ONE_SIGNAL_APP_ID = process.env.REACT_APP_ONESIGNAL_APP_ID;
const ONE_SIGNAL_REST_API_KEY = process.env.REACT_APP_ONESIGNAL_REST_API_KEY;

// Log configuration
console.log('Environment Variables Check:', {
  NODE_ENV: process.env.NODE_ENV,
  APP_ID: ONE_SIGNAL_APP_ID ? 'Set' : 'Not set',
  REST_API_KEY: ONE_SIGNAL_REST_API_KEY ? 'Set' : 'Not set'
});

const app = express();

// CORS configuration
app.use(cors({
  origin: true,
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept', 'Origin'],
  credentials: true
}));

app.use(bodyParser.json());

// Subscribe endpoint
app.post('/api/subscribe', async (req, res) => {
  console.log('Received subscription request:', req.body);

  try {
    const { subscription, userId, notificationPermission } = req.body;

    if (!subscription || !userId) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Subscription and userId are required'
      });
    }

    const oneSignalPayload = {
      app_id: ONE_SIGNAL_APP_ID, // Use mapped variable
      identifier: userId,
      notification_types: notificationPermission === 'granted' ? 1 : -2,
      device_type: 5,
      tags: {
        subscription_date: new Date().toISOString(),
        platform: 'web',
        environment: process.env.NODE_ENV || 'development'
      }
    };

    console.log('Sending request to OneSignal:', {
      payload: oneSignalPayload,
      hasAppId: !!ONE_SIGNAL_APP_ID,
      hasApiKey: !!ONE_SIGNAL_REST_API_KEY
    });

    const response = await fetch('https://onesignal.com/api/v1/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONE_SIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', data);
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: data.errors?.[0] || 'Failed to register with OneSignal'
      });
    }

    console.log('OneSignal API success:', data);

    return res.status(200).json({
      success: true,
      playerId: data.id,
      message: 'Successfully registered for notifications'
    });

  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'Failed to process subscription'
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
});