// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// Your web app's Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// Firestore collection and document references
const ratingsCollection = "ratings";
const taskngoDoc = "Taskngo";

// Utility function for retry logic
async function retry(operation, maxRetries = 3, delay = 1000) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.warn(`Operation failed, attempt ${i + 1}/${maxRetries}:`, error);
      
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Function to request and retrieve the messaging token
export async function requestFirebaseToken() {
  return retry(async () => {
    try {
      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_FIREBASE_VAPID_KEY,
      });
      if (token) {
        console.log("Firebase Messaging Token:", token);
        return token;
      }
      console.warn("No registration token available.");
      return null;
    } catch (error) {
      console.error("Error getting messaging token:", error);
      throw error; // Throw error to trigger retry
    }
  });
}

// Listener for foreground messages
export function onMessageListener() {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      console.log("Message received. ", payload);
      resolve(payload);
    });
  });
}

// Function to add or update a user's rating
export async function addUserRating(userId, userRating) {
  return retry(async () => {
    const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

    try {
      const taskngoSnapshot = await getDoc(taskngoRef);

      if (!taskngoSnapshot.exists()) {
        throw new Error("Document does not exist!");
      }

      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};
      userRatings[userId] = userRating;

      await updateDoc(taskngoRef, {
        userRatings,
      });

      console.log("User rating added/updated successfully.");
      await updateAverageRating();
      return true;
    } catch (error) {
      console.error("Error updating user rating:", error);
      throw error; // Throw error to trigger retry
    }
  });
}

// Function to calculate and update the average rating
export async function updateAverageRating() {
  return retry(async () => {
    const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

    try {
      const taskngoSnapshot = await getDoc(taskngoRef);

      if (!taskngoSnapshot.exists()) {
        throw new Error("Document does not exist!");
      }

      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};

      const ratingValues = Object.values(userRatings);
      if (ratingValues.length === 0) {
        console.log("No ratings available to calculate the average.");
        return 0;
      }

      const averageRating = ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length;
      await updateDoc(taskngoRef, { averageRating });
      console.log("Average rating updated successfully:", averageRating);
      return averageRating;
    } catch (error) {
      console.error("Error updating average rating:", error);
      throw error; // Throw error to trigger retry
    }
  });
}

// Function to fetch the current average rating
export async function fetchAverageRating() {
  return retry(async () => {
    const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

    try {
      const docSnap = await getDoc(taskngoRef);

      if (!docSnap.exists()) {
        console.warn("No such document!");
        return 0;
      }

      const data = docSnap.data();
      return data.averageRating || 0;
    } catch (error) {
      console.error("Error fetching average rating:", error);
      throw error; // Throw error to trigger retry
    }
  });
}

// Function to fetch a specific user's rating
export async function fetchUserRating(userId) {
  return retry(async () => {
    const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

    try {
      const taskngoSnapshot = await getDoc(taskngoRef);

      if (!taskngoSnapshot.exists()) {
        console.warn("Document does not exist!");
        return null;
      }

      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};
      return userRatings[userId] || null;
    } catch (error) {
      console.error("Error fetching user rating:", error);
      throw error; // Throw error to trigger retry
    }
  });
}

export { analytics, db, messaging };