// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Firestore collection and document references
const ratingsCollection = "ratings";
const taskngoDoc = "Taskngo";

// Function to add or update a user's rating
export async function addUserRating(userId, userRating) {
  const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

  try {
    const taskngoSnapshot = await getDoc(taskngoRef);

    if (taskngoSnapshot.exists()) {
      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};
      userRatings[userId] = userRating;

      await updateDoc(taskngoRef, {
        userRatings,
      });

      console.log("User rating added/updated successfully.");
      await updateAverageRating();
    } else {
      console.error("Document does not exist!");
    }
  } catch (error) {
    console.error("Error updating user rating:", error);
  }
}

// Function to calculate and update the average rating
export async function updateAverageRating() {
  const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

  try {
    const taskngoSnapshot = await getDoc(taskngoRef);

    if (taskngoSnapshot.exists()) {
      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};

      const ratings = Object.values(userRatings);
      const averageRating = ratings.length > 0 
        ? ratings.reduce((a, b) => a + b) / ratings.length 
        : 0;

      await updateDoc(taskngoRef, { averageRating });
      console.log("Average rating updated successfully.");
    }
  } catch (error) {
    console.error("Error updating average rating:", error);
  }
}

// Function to fetch the current average rating
export async function fetchAverageRating() {
  const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

  try {
    const docSnap = await getDoc(taskngoRef);
    return docSnap.exists() ? (docSnap.data().averageRating || 0) : 0;
  } catch (error) {
    console.error("Error fetching average rating:", error);
    return 0;
  }
}

export { analytics, db };