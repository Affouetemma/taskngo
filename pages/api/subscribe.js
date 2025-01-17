import fetch from 'node-fetch'; // Make sure to import fetch for server-side requests.

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Or limit to specific origins if needed
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS method for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Log the received request details for debugging
  console.log('Received request to /api/subscribe:', {
    method: req.method,
    headers: req.headers,
    body: req.body
  });

  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted'
    });
  }

  try {
    const { subscription, userId, notificationPermission } = req.body;

    // Log the received subscription data
    console.log('Received subscription data:', { subscription, userId, notificationPermission });

    // Validate required data
    if (!subscription || !userId) {
      console.log('Missing required data:', { subscription, userId });
      return res.status(400).json({
        error: 'Missing required data',
        message: 'Subscription and userId are required'
      });
    }

    // Log the OneSignal request details
    console.log('Sending request to OneSignal API with:', {
      appId: process.env.ONESIGNAL_APP_ID,
      userId,
      notificationType: notificationPermission === 'granted' ? 1 : -2
    });

    // Prepare the payload for the OneSignal API
    const requestBody = {
      app_id: process.env.ONESIGNAL_APP_ID,
      identifier: userId,
      notification_types: notificationPermission === 'granted' ? 1 : -2, // Grant or deny notifications
      device_type: 5, // Web push
      tags: {
        subscription_date: new Date().toISOString(),
        platform: 'web'
      }
    };

    // Ensure that subscription data is included (if needed)
    if (subscription) {
      requestBody.subscription = subscription;
    }

    // Make the request to the OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${process.env.ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });

    // Log the response status from OneSignal
    console.log('OneSignal API response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OneSignal API Error:', errorData);
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: errorData.errors?.[0] || 'Failed to register with OneSignal'
      });
    }

    const data = await response.json();
    console.log('OneSignal API success response:', data);

    return res.status(200).json({
      success: true,
      playerId: data.id,
      message: 'Successfully registered for notifications'
    });

  } catch (error) {
    console.error('Detailed subscription error:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to process subscription'
    });
  }
}

// Update config to include CORS and better error handling
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100kb', // Ensure this is big enough for your payloads
    },
    externalResolver: true,
  },
};
