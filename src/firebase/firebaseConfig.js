//Firebase:
import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  getAuth,
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyB149h6o-LEJ4WdtDPOFj9MOUhcV23-SSU",
  authDomain: "codedesk-f15a6.firebaseapp.com",
  projectId: "codedesk-f15a6",
  storageBucket: "codedesk-f15a6.firebasestorage.app",
  messagingSenderId: "798605891619",
  appId: "1:798605891619:web:9b41ae7228eda41d76f996",
};

const app = initializeApp(firebaseConfig);

let auth;

try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch (error) {
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);