// Import the functions you need from the SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHIo-SM6M4N6k3cdAUb3p9ICEnZfKSY3g",
  authDomain: "taskngo-e2ddd.firebaseapp.com",
  projectId: "taskngo-e2ddd",
  storageBucket: "taskngo-e2ddd.firebasestorage.app",
  messagingSenderId: "856409446769",
  appId: "1:856409446769:web:30b05291693301e5d3bed0",
  measurementId: "G-J9GJS59BZN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Firestore collection and document references
const ratingsCollection = "ratings"; // Collection name
const taskngoDoc = "Taskngo"; // Document ID

// Function to add or update a user's rating
export async function addUserRating(userId, userRating) {
  const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

  try {
    // Fetch the existing document data
    const taskngoSnapshot = await getDoc(taskngoRef);

    if (taskngoSnapshot.exists()) {
      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};

      // Update the user's rating in the userRatings map
      userRatings[userId] = userRating;

      // Update the userRatings map in Firestore
      await updateDoc(taskngoRef, {
        userRatings
      });

      console.log("User rating added/updated successfully.");
      
      // After updating user ratings, recalculate the average rating
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

      // Calculate the total rating and the average
      let totalRating = 0;
      let numberOfRatings = 0;

      // Loop through the userRatings to calculate the total rating and the number of ratings
      for (let userId in userRatings) {
        totalRating += userRatings[userId];
        numberOfRatings++;
      }

      // If there are ratings, calculate the average
      if (numberOfRatings > 0) {
        const averageRating = totalRating / numberOfRatings;

        // Update the averageRating field in Firestore
        await updateDoc(taskngoRef, { averageRating });
        console.log("Average rating updated successfully.");
      } else {
        console.error("No ratings available to calculate the average.");
      }
    } else {
      console.error("Document does not exist!");
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

    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.averageRating || 0; // Return the average rating or 0 if not set
    } else {
      console.error("No such document!");
      return 0; // Default value if document doesn't exist
    }
  } catch (error) {
    console.error("Error fetching average rating:", error);
    throw error;
  }
}

// Function to fetch a specific user's rating
export async function fetchUserRating(userId) {
  const taskngoRef = doc(db, ratingsCollection, taskngoDoc);

  try {
    const taskngoSnapshot = await getDoc(taskngoRef);

    if (taskngoSnapshot.exists()) {
      const data = taskngoSnapshot.data();
      const userRatings = data.userRatings || {};

      // Return the user's rating if it exists, or null otherwise
      return userRatings[userId] || null;
    } else {
      console.error("Document does not exist!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching user rating:", error);
    throw error;
  }
}

export { db, analytics };
