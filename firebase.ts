import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore/lite";

export const apiKey = "AIzaSyBQVkRjbTQD6BXCdo2JeiFfwyvGVT7bOXM";
const app = initializeApp({
  apiKey: apiKey,
  authDomain: "harmony-6bd51.firebaseapp.com",
  projectId: "harmony-6bd51",
  storageBucket: "harmony-6bd51.appspot.com",
  messagingSenderId: "914732561143",
  appId: "1:914732561143:web:b041f0c5e7fab57400d9f2",
  measurementId: "G-S79J6E39ZP",
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
