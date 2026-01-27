// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYVyG0_3hWaaGZRCqSSf3m7H6r9w9KtlU",
  authDomain: "musicplayermanager.firebaseapp.com",
  projectId: "musicplayermanager",
  storageBucket: "musicplayermanager.firebasestorage.app",
  messagingSenderId: "70241340472",
  appId: "1:70241340472:web:3891bbac865616a4a86acd",
  measurementId: "G-DWP0YPSR86"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);