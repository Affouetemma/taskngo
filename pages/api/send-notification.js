import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers (reusing your existing CORS setup)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

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
    const { userId, title, message, data } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        error: 'Missing required data',
        message: 'userId, title, and message are required',
      });
    }

    // Prepare the payload for OneSignal
    const notification = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: [userId],
      contents: { en: message },
      headings: { en: title },
      data: data || {},
      web_push_topic: 'task-reminder',
      priority: 10,
      ttl: 30, // Time to live in seconds
      web_push_type: 'Notification',
      isAnyWeb: true
    };

    // Send notification using OneSignal's REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('OneSignal API Error:', errorData);
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: errorData.errors?.[0] || 'Failed to send notification',
      });
    }

    const responseData = await response.json();
    console.log('Notification sent successfully:', responseData);
    return res.status(200).json({
      success: true,
      id: responseData.id,
      message: 'Notification sent successfully',
    });
  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to send notification',
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100kb',
    },
    externalResolver: true,
  },
};