import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  User, 
  Auth,
  onAuthStateChanged
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  onSnapshot, 
  serverTimestamp,
  orderBy,
  increment,
  writeBatch,
  Firestore,
  deleteDoc
} from "firebase/firestore";
import { FirebaseConfig } from "../types";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

const STORAGE_KEY_CONFIG = 'tally_firebase_config';

export const getStoredConfig = (): FirebaseConfig | null => {
  const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (stored) return JSON.parse(stored);
  return null;
};

export const saveConfig = (config: FirebaseConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  // Force reload to init firebase
  window.location.reload();
};

export const clearConfig = () => {
  localStorage.removeItem(STORAGE_KEY_CONFIG);
  window.location.reload();
};

export const initFirebase = (): boolean => {
  const config = getStoredConfig();
  if (!config) return false;

  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    return true;
  } catch (e) {
    console.error("Firebase init failed", e);
    return false;
  }
};

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const logout = async () => {
  if (!auth) throw new Error("Firebase not initialized");
  return signOut(auth);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

// --- Firestore Operations ---

export const subscribeToCounters = (userId: string, callback: (counters: any[]) => void) => {
  if (!db) return () => {};
  
  const q = query(
    collection(db, "users", userId, "counters"),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const counters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(counters);
  });
};

export const addCounter = async (userId: string, title: string, color: string, target?: number) => {
  if (!db) throw new Error("No DB");
  
  const data: any = {
    title,
    count: 0,
    color,
    createdAt: Date.now(),
    lastUpdated: Date.now()
  };

  if (target !== undefined && target !== null) {
    data.target = target;
  }
  
  await addDoc(collection(db, "users", userId, "counters"), data);
};

export const deleteCounter = async (userId: string, counterId: string) => {
    if (!db) throw new Error("No DB");
    await deleteDoc(doc(db, "users", userId, "counters", counterId));
}

export const updateCounterValue = async (userId: string, counterId: string, delta: number, newValue: number) => {
  if (!db) throw new Error("No DB");

  const batch = writeBatch(db);
  
  // 1. Update Counter Doc
  const counterRef = doc(db, "users", userId, "counters", counterId);
  batch.update(counterRef, {
    count: increment(delta),
    lastUpdated: Date.now()
  });

  // 2. Add Log
  const logsRef = collection(db, "users", userId, "logs");
  batch.set(doc(logsRef), { // Auto ID
    counterId,
    timestamp: Date.now(),
    valueChange: delta,
    newValue: newValue
  });

  await batch.commit();
};

export const getHistoryLogs = async (userId: string, daysBack: number = 30) => {
  if (!db) return [];
  
  const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  const q = query(
    collection(db, "users", userId, "logs"),
    where("timestamp", ">=", startDate),
    orderBy("timestamp", "asc")
  );
  
  const { getDocs } = await import("firebase/firestore");
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const isFirebaseReady = () => !!app && !!auth && !!db;