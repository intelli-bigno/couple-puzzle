import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAvnf6Sl_9CGBx2daS3KiIW-Ul62_3L6YA",
  authDomain: "couple-diary-61d56.firebaseapp.com",
  projectId: "couple-diary-61d56",
  storageBucket: "couple-diary-61d56.firebasestorage.app",
  messagingSenderId: "434666098108",
  appId: "1:434666098108:web:0d110b3419299ea31b2fb9"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export const signIn = async () => {
  const result = await signInAnonymously(auth);
  return result.user.uid;
};
