export default async function handler(req, res) {
  // Ensure that the request method is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get the subscription data from the request body
  const { subscription } = req.body;

  // Validate if the subscription object is present
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription data is required' });
  }

  try {
    // In a real-world scenario, you would store the subscription in a database.
    // For now, we will just log it to the console.
    console.log('Received subscription:', subscription);

    // Respond with success
    return res.status(200).json({ success: true });
  } catch (error) {
    // If something goes wrong, return a 500 error
    return res.status(500).json({ error: error.message });
  }
}
