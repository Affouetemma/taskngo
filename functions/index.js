const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");

// This is a sample function for demonstration purposes
exports.helloWorld = onRequest((req, res) => {
  logger.info("Hello logs!", {structuredData: true});
  res.send("Hello from Firebase!");
});
