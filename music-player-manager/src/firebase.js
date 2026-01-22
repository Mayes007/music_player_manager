// Import the functions you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAYVyG0_3hWaaGZRCqSSf3m7H6r9w9KtlU",
  authDomain: "musicplayermanager.firebaseapp.com",
  projectId: "musicplayermanager",
  storageBucket: "musicplayermanager.appspot.com",
  messagingSenderId: "70241340472",
  appId: "1:70241340472:web:3891bbac865616a4a86acd"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore & Storage to use in your app
export const db = getFirestore(app);
export const storage = getStorage(app);
