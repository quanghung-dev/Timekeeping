import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export type FirebaseState =
  | { status: 'demo' }
  | { status: 'ready' }
  | { status: 'error'; message: string };

const apiKey = firebaseConfig.apiKey?.trim() ?? '';
const intentionallyUnconfigured =
  apiKey === '' || apiKey.includes('your_api_key_here');

let app: FirebaseApp | undefined;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseState: FirebaseState;

if (intentionallyUnconfigured) {
  firebaseState = { status: 'demo' };
} else {
  const requiredValues = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.appId,
  ];

  if (requiredValues.some((value) => !value?.trim())) {
    firebaseState = {
      status: 'error',
      message: 'Cấu hình Firebase chưa đầy đủ. Vui lòng kiểm tra tệp .env.',
    };
  } else {
    try {
      app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      auth = getAuth(app);
      db = getFirestore(app);
      firebaseState = { status: 'ready' };
    } catch (error: unknown) {
      console.error('Work Log: Firebase initialization failed.', error);
      firebaseState = {
        status: 'error',
        message: 'Không thể khởi tạo Firebase. Vui lòng kiểm tra cấu hình và tải lại trang.',
      };
    }
  }
}

export const isDemoMode = firebaseState.status === 'demo';
export { auth, db, firebaseState };
export default app;
