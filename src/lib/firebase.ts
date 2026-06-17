import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Auto-detect Demo Mode if credentials are not specified, are empty, or contain default placeholders
export const isDemoMode = 
  !firebaseConfig.apiKey || 
  firebaseConfig.apiKey.trim() === '' || 
  firebaseConfig.apiKey.includes('your_api_key_here');

let app;
let auth: any = null;
let db: any = null;

if (!isDemoMode) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Work Log: Connected to Firebase services successfully.");
  } catch (error) {
    console.error("Work Log: Firebase initialization failed. Falling back to Demo Mode.", error);
  }
} else {
  console.warn("Work Log: Running in DEMO MODE. Configure Firebase in .env to use live Authentication & Firestore.");
}

export { auth, db };
export default app;
