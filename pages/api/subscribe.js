import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers for local development and production frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*'); // Dynamically handle the origin header
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Allow necessary methods
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed.',
    });
  }

  try {
    const { subscription, userId, notificationPermission } = req.body;

    if (!subscription || !userId) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Subscription and userId are required',
      });
    }

    // Prepare the payload for OneSignal
    const requestBody = {
      app_id: process.env.ONESIGNAL_APP_ID,
      identifier: userId,
      notification_types: notificationPermission === 'granted' ? 1 : -2, // Grant or deny notifications
      device_type: 5, // Web push
      tags: {
        subscription_date: new Date().toISOString(),
        platform: 'web',
      },
    };

    if (subscription) {
      requestBody.subscription = subscription;
    }

    // Make the request to OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: errorData.errors?.[0] || 'Failed to register with OneSignal',
      });
    }

    const data = await response.json();
    return res.status(200).json({
      success: true,
      playerId: data.id,
      message: 'Successfully registered for notifications',
    });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to process subscription',
    });
  }
}

// Update configuration for body parser and external resolver
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100kb', // Ensure this is big enough for your payloads
    },
    externalResolver: true,
  },
};
