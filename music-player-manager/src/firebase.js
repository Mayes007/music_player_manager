import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth"; 

const firebaseConfig = {
  apiKey: "AIzaSyAYVyG0_3hWaaGZRCqSSf3m7H6r9w9KtlU",
  authDomain: "musicplayermanager.firebaseapp.com",
  projectId: "musicplayermanager",
  storageBucket: "musicplayermanager.appspot.com",
  messagingSenderId: "70241340472",
  appId: "1:70241340472:web:3891bbac865616a4a86acd"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); 
