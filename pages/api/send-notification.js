import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed',
      message: 'Only POST requests are allowed.',
    });
  }

  try {
    const { userId, title, message, data } = req.body;

    // Enhanced validation with detailed error messages
    const validationErrors = [];
    if (!userId) validationErrors.push('userId is required');
    if (!title) validationErrors.push('title is required');
    if (!message) validationErrors.push('message is required');

    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Missing required data',
        details: validationErrors,
      });
    }

    // Verify environment variables
    if (!process.env.ONESIGNAL_APP_ID || !process.env.ONESIGNAL_REST_API_KEY) {
      console.error('Missing OneSignal configuration');
      return res.status(500).json({
        error: 'Server Configuration Error',
        message: 'OneSignal configuration is missing.',
      });
    }

    // Construct the OneSignal notification payload
    const notification = {
      app_id: process.env.ONESIGNAL_APP_ID,
      include_player_ids: [userId],
      contents: { en: message },
      headings: { en: title },
      data: data || {},
      priority: 10,
      ttl: 86400, // 24 hours in seconds
      // Sound configuration
      ios_sound: 'default',  // This applies to iOS/macOS (PWAs as well)
      android_sound: 'default', // For Android devices, but often applicable to browsers as well
    };

    console.log('Sending notification:', {
      userId,
      title,
      message,
      appId: process.env.ONESIGNAL_APP_ID?.slice(0, 5) + '...', // Log partial app ID for security
    });

    // Send the notification using OneSignal's REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notification),
    });

    // Enhanced error handling with detailed logging
    if (!response.ok) {
      const errorData = await response.json();
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers),
        body: errorData,
      };
      
      console.error('OneSignal API Error:', JSON.stringify(errorDetails, null, 2));
      console.error('OneSignal API Error:', {
        status: response.status,
        response: await response.json(),
      });
      
      return res.status(response.status).json({
        error: 'OneSignal API Error',
        message: errorData.errors?.[0] || 'Failed to send notification.',
        details: errorData,
      });
    }

    // Parse and return the successful response
    const responseData = await response.json();
    console.log('Notification sent successfully:', {
      id: responseData.id,
      recipients: responseData.recipients,
    });
    
    return res.status(200).json({
      success: true,
      id: responseData.id,
      recipients: responseData.recipients,
      message: 'Notification sent successfully.',
    });
  } catch (error) {
    console.error('Server Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });
    
    return res.status(500).json({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development'
        ? error.message
        : 'Failed to send notification.',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
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
