// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgVMWh_xuP9CRptIbaS_nJ7e0j2Dp5sRY",
  authDomain: "myself-4e877.firebaseapp.com",
  projectId: "myself-4e877",
  storageBucket: "myself-4e877.firebasestorage.app",
  messagingSenderId: "603026482562",
  appId: "1:603026482562:web:9e790b4884674549ea5b9b",
  measurementId: "G-4MS84VJ031"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Make these available globally or export them for use in other modules
window.firebaseApp = app;
window.firebaseAuth = auth;
window.firebaseDb = db;
window.firebaseStorage = storage;

console.log("Firebase initialized with config:", firebaseConfig);
