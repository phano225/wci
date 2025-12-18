import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// REMPLACEZ LES VALEURS VIDES PAR CELLES DE VOTRE CONSOLE FIREBASE
// Si les valeurs sont vides, l'application passera automatiquement en mode "Local Demo"
const firebaseConfig = {
  apiKey: "", 
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

let db: any = null;
let storage: any = null;
let auth: any = null;

// Initialisation uniquement si une clé API est présente
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "") {
    try {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        storage = getStorage(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully (Modular SDK).");
    } catch (e) {
        console.error("Firebase initialization failed:", e);
    }
} else {
    console.warn("World Canal Info: No Firebase API Key found. App running in Local Demo Mode (LocalStorage).");
}

export { db, storage, auth };
