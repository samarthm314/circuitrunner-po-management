import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCKMlSANzAUW-ZyqSVabljt-j9wYmItsVs",
  authDomain: "circuitrunners-po-system.firebaseapp.com",
  projectId: "circuitrunners-po-system",
  storageBucket: "circuitrunners-po-system.firebasestorage.app",
  messagingSenderId: "1005018335052",
  appId: "1:1005018335052:web:43d763913c4054bb00f1e9",
  measurementId: "G-85BR2YX7ZN"
};

// Initialize Firebase only if it hasn't been initialized already
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();


export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;