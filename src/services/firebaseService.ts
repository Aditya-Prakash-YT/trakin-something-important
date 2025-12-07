import * as firebaseAppModule from "firebase/app";
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
import { getStorage, FirebaseStorage } from "firebase/storage";
import { FirebaseConfig, Counter, CounterGroup, CounterLog } from "../types";

// Workaround for firebase/app type definition issues
const { initializeApp, getApps, getApp } = (firebaseAppModule as any);

let app: any;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

const STORAGE_KEY_CONFIG = 'tally_firebase_config';

// --- CONFIGURATION SETUP ---
// Using import.meta.env for Vite compatibility, falling back to process.env if needed
const ENV_CONFIG: FirebaseConfig | null = (import.meta as any).env?.VITE_API_KEY ? {
  apiKey: (import.meta as any).env.VITE_API_KEY,
  authDomain: (import.meta as any).env.VITE_AUTH_DOMAIN || "",
  projectId: (import.meta as any).env.VITE_PROJECT_ID || "",
  storageBucket: (import.meta as any).env.VITE_STORAGE_BUCKET || "",
  messagingSenderId: (import.meta as any).env.VITE_MESSAGING_SENDER_ID || "",
  appId: (import.meta as any).env.VITE_APP_ID || ""
} : (process.env.REACT_APP_API_KEY ? {
  apiKey: process.env.REACT_APP_API_KEY,
  authDomain: process.env.REACT_APP_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_APP_ID || ""
} : null);

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
    // Use named imports for firebase/app functions
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    return true;
  } catch (e) {
    console.error("Firebase init failed", e);
    return false;
  }
};

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

  // includeMetadataChanges triggers events for local writes (hasPendingWrites: true)
  // and server confirmation (hasPendingWrites: false)
  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const counters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // If hasPendingWrites is true, data is local and not yet on server
    const isSyncing = snapshot.metadata.hasPendingWrites;
    callback(counters, isSyncing);
  });
};

export const subscribeToGroups = (
  userId: string,
  callback: (groups: CounterGroup[]) => void
) => {
  if (!db) return () => {};
  
  const q = query(
    collection(db, "users", userId, "groups"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterGroup));
    callback(groups);
  });
};

export const addGroup = async (userId: string, name: string) => {
  if (!db) throw new Error("No DB");
  await addDoc(collection(db, "users", userId, "groups"), {
    name,
    createdAt: Date.now()
  });
};

export const deleteGroup = async (userId: string, groupId: string) => {
  if (!db) throw new Error("No DB");

  const batch = writeBatch(db);
  
  // 1. Delete the group
  batch.delete(doc(db, "users", userId, "groups", groupId));

  // 2. Remove groupId from all counters in this group
  const countersRef = collection(db, "users", userId, "counters");
  const q = query(countersRef, where("groupId", "==", groupId));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { groupId: deleteField() });
  });

  await batch.commit();
};

export const addCounter = async (userId: string, title: string, color: string, target?: number, resetDaily: boolean = false, groupId?: string) => {
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

  if (groupId) {
    data.groupId = groupId;
  }
  
  await addDoc(collection(db, "users", userId, "counters"), data);
};

export const updateCounterTitle = async (userId: string, counterId: string, newTitle: string) => {
  if (!db) throw new Error("No DB");
  const counterRef = doc(db, "users", userId, "counters", counterId);
  await updateDoc(counterRef, { title: newTitle });
};

export const updateCounterGroup = async (userId: string, counterId: string, groupId: string | null) => {
  if (!db) throw new Error("No DB");
  const counterRef = doc(db, "users", userId, "counters", counterId);
  if (groupId === null) {
    await updateDoc(counterRef, { groupId: deleteField() });
  } else {
    await updateDoc(counterRef, { groupId });
  }
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

// Bulk Operations

export const bulkDeleteCounters = async (userId: string, counterIds: string[]) => {
  if (!db) throw new Error("No DB");
  const batch = writeBatch(db);
  counterIds.forEach(id => {
      const ref = doc(db, "users", userId, "counters", id);
      batch.delete(ref);
  });
  await batch.commit();
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

export const getHistoryLogs = async (userId: string, daysBack: number = 365): Promise<CounterLog[]> => {
  if (!db) return [];
  
  const startDate = Date.now() - (daysBack * 24 * 60 * 60 * 1000);
  
  const q = query(
    collection(db, "users", userId, "logs"),
    where("timestamp", ">=", startDate),
    orderBy("timestamp", "asc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterLog));
};

// Check for daily resets
export const checkDailyResets = async (userId: string) => {
  if (!db) return;

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Get all counters for user
  const q = query(collection(db, "users", userId, "counters"));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);
  let hasUpdates = false;

  snapshot.forEach((docSnap) => {
    const counter = docSnap.data() as Counter;
    if (counter.resetDaily) {
      // If never reset, or last reset was not today
      if (counter.lastResetDate !== todayStr) {
        // Reset to 0
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
    console.log("Performed daily resets");
  }
};

export const isFirebaseReady = () => !!app && !!auth && !!db;
