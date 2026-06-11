import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBg11NA7R1awTFD542L2sEcDaHc3ZycLcE",
  authDomain: "ecotech-app-e697d.firebaseapp.com",
  projectId: "ecotech-app-e697d",
  storageBucket: "ecotech-app-e697d.firebasestorage.app",
  messagingSenderId: "502083989202",
  appId: "1:502083989202:web:66401741c13e85582bc70b"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();