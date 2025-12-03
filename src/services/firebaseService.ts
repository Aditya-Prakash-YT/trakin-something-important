import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut, 
  updateProfile,
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
  increment,
  writeBatch,
  Firestore,
  deleteDoc,
  orderBy,
  getDocs,
  deleteField
} from "firebase/firestore";
import { FirebaseConfig, Counter } from "../types";

let app: any;
let auth: Auth | undefined;
let db: Firestore | undefined;

const STORAGE_KEY_CONFIG = 'tally_firebase_config';

// 1. Try Environment Variables first (For your deployed website)
const ENV_CONFIG: FirebaseConfig | null = import.meta.env.VITE_API_KEY ? {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
} : null;

// 2. Hardcoded fallback (Only for local dev if you don't use .env)
const HARDCODED_CONFIG: FirebaseConfig | null = {
  apiKey: "AIzaSyC3g2ki9O6MJgOonBn7cnZNIkqvvv0nbRo",
  authDomain: "let-s-see-118ce.firebaseapp.com",
  projectId: "let-s-see-118ce",
  storageBucket: "let-s-see-118ce.firebasestorage.app",
  messagingSenderId: "402553381428",
  appId: "1:402553381428:web:1b25f566173363b905e061",
  measurementId: "G-F0X564TT7P"
};

export const getStoredConfig = (): FirebaseConfig | null => {
  if (ENV_CONFIG) return ENV_CONFIG;
  if (HARDCODED_CONFIG) return HARDCODED_CONFIG;
  const stored = localStorage.getItem(STORAGE_KEY_CONFIG);
  if (stored) return JSON.parse(stored);
  return null;
};

export const saveConfig = (config: FirebaseConfig) => {
  localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
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

// ... (Rest of the file remains exactly the same as your previous version)
// --- Auth Operations ---

export const registerUser = async (name: string, email: string, pass: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
  await updateProfile(userCredential.user, {
    displayName: name
  });
  return userCredential.user;
};

export const loginUser = async (email: string, pass: string) => {
  if (!auth) throw new Error("Firebase not initialized");
  const userCredential = await signInWithEmailAndPassword(auth, email, pass);
  return userCredential.user;
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

export const subscribeToCounters = (
  userId: string, 
  callback: (counters: any[], isSyncing: boolean) => void
) => {
  if (!db) return () => {};
  
  const q = query(
    collection(db, "users", userId, "counters"),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const counters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const isSyncing = snapshot.metadata.hasPendingWrites;
    callback(counters, isSyncing);
  });
};

export const addCounter = async (userId: string, title: string, color: string, target?: number, resetDaily: boolean = false) => {
  if (!db) throw new Error("No DB");
  
  const data: any = {
    title,
    count: 0,
    color,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
    resetDaily,
    lastResetDate: resetDaily ? new Date().toISOString().split('T')[0] : null
  };

  if (target !== undefined && target !== null) {
    data.target = target;
  }
  
  await addDoc(collection(db, "users", userId, "counters"), data);
};

export const updateCounterTitle = async (userId: string, counterId: string, newTitle: string) => {
  if (!db) throw new Error("No DB");
  const counterRef = doc(db, "users", userId, "counters", counterId);
  await updateDoc(counterRef, { title: newTitle });
};

export const updateCounterTarget = async (userId: string, counterId: string, newTarget: number | null) => {
  if (!db) throw new Error("No DB");
  const counterRef = doc(db, "users", userId, "counters", counterId);
  if (newTarget === null) {
      await updateDoc(counterRef, { target: deleteField() });
  } else {
      await updateDoc(counterRef, { target: newTarget });
  }
};

export const deleteCounter = async (userId: string, counterId: string) => {
    if (!db) throw new Error("No DB");
    await deleteDoc(doc(db, "users", userId, "counters", counterId));
}

export const updateCounterValue = async (userId: string, counterId: string, delta: number, newValue: number) => {
  if (!db) throw new Error("No DB");

  const batch = writeBatch(db);
  const counterRef = doc(db, "users", userId, "counters", counterId);
  batch.update(counterRef, {
    count: increment(delta),
    lastUpdated: Date.now()
  });

  const logsRef = collection(db, "users", userId, "logs");
  batch.set(doc(logsRef), {
    counterId,
    timestamp: Date.now(),
    valueChange: delta,
    newValue: newValue
  });

  await batch.commit();
};

export const getHistoryLogs = async (userId: string, daysBack: number = 365) => {
  if (!db) return [];
  const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  const q = query(
    collection(db, "users", userId, "logs"),
    where("timestamp", ">=", startDate),
    orderBy("timestamp", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const checkDailyResets = async (userId: string) => {
  if (!db) return;
  const todayStr = new Date().toISOString().split('T')[0];
  const q = query(collection(db, "users", userId, "counters"));
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  let hasUpdates = false;

  snapshot.forEach((docSnap) => {
    const counter = docSnap.data() as Counter;
    if (counter.resetDaily) {
      if (counter.lastResetDate !== todayStr) {
        const ref = doc(db, "users", userId, "counters", docSnap.id);
        batch.update(ref, {
          count: 0,
          lastResetDate: todayStr,
          lastUpdated: Date.now()
        });
        hasUpdates = true;
      }
    }
  });

  if (hasUpdates) {
    await batch.commit();
  }
};

export const isFirebaseReady = () => !!app && !!auth && !!db;