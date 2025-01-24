// Import necessary SDK functions
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, updateDoc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// Validate environment variables
const requiredEnvVars = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_APP_ID",
  "REACT_APP_FIREBASE_MEASUREMENT_ID",
];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`Environment variable ${varName} is missing.`);
  }
});

// Firebase config
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

const ratingsCollection = "ratings";

// Initialize document if it does not exist
async function initializeRatingDocument(language = "en") {
  const docRef = doc(db, ratingsCollection, `Taskngo_${language}`);
  try {
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      await setDoc(docRef, {
        userRatings: {}, // Starts as empty object
        averageRating: 0, // Starts as 0
        totalRatings: 0, // Starts as 0
        lastUpdated: serverTimestamp(), // Initialize lastUpdated timestamp
      });
      console.log(`Initialized ratings document for language: ${language}`);
    }
  } catch (error) {
    console.error(`Error initializing ratings document for ${language}:`, error);
  }
}

// Add/update user rating
export async function addUserRating(userId, userRating, language = "en") {
  const docRef = doc(db, ratingsCollection, `Taskngo_${language}`);
  try {
    await initializeRatingDocument(language); // Ensure the document exists
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const userRatings = { ...data.userRatings, [userId]: userRating }; // Update user rating

      // Update Firestore with the new user ratings
      await updateDoc(docRef, {
        userRatings,
        lastUpdated: serverTimestamp(), // Update lastUpdated timestamp
      });

      // Update the average rating and return it
      return await updateAverageRating(language);
    }
  } catch (error) {
    console.error(`Error updating user rating for ${language}:`, error);
    throw error;
  }
}

// Update average rating based on user ratings
export async function updateAverageRating(language = "en") {
  const docRef = doc(db, ratingsCollection, `Taskngo_${language}`);
  try {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      const ratings = Object.values(data.userRatings || {});
      
      // Calculate the average rating, ensure it's at least 0
      const averageRating =
        ratings.length > 0
          ? Number((ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2))
          : 0;

      // Update Firestore with the new average rating and total ratings count
      await updateDoc(docRef, {
        averageRating,
        totalRatings: ratings.length, // Total number of ratings
        lastUpdated: serverTimestamp(), // Update lastUpdated timestamp
      });

      return averageRating;
    }
  } catch (error) {
    console.error(`Error updating average rating for ${language}:`, error);
    throw error;
  }
}

// Fetch average rating
export async function fetchAverageRating(language = "en") {
  const docRef = doc(db, ratingsCollection, `Taskngo_${language}`);
  try {
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      console.log(`Fetched average rating for Taskngo_${language}:`, data?.averageRating || 0);
      return Number(data?.averageRating || 0); // Return the average rating
    } else {
      console.warn(`Document Taskngo_${language} does not exist.`);
      return 0;
    }
  } catch (error) {
    console.error(`Error fetching average rating for ${language}:`, error);
    return 0;
  }
}

// Example: Fetching the rating for French (Taskngo_fr)
export async function fetchFrenchRating() {
  return await fetchAverageRating("fr");
}

// Export analytics and Firestore
export { analytics, db };
