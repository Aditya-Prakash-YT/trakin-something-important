
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
  deleteField,
  setDoc,
  getDoc
} from "firebase/firestore";
import { FirebaseConfig, Counter, CounterGroup, CounterLog, TodoList, ThemeSettings } from "../types";

// Workaround for firebase/app type definition issues
const { initializeApp, getApps } = (firebaseAppModule as any);

// --- 1. PRIMARY APP (Authentication & Config Storage) ---
// This connects to the App's own database to authenticate users and retrieve their settings.

const PRIMARY_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyC3g2ki9O6MJgOonBn7cnZNIkqvvv0nbRo",
  authDomain: "let-s-see-118ce.firebaseapp.com",
  projectId: "let-s-see-118ce",
  storageBucket: "let-s-see-118ce.firebasestorage.app",
  messagingSenderId: "402553381428",
  appId: "1:402553381428:web:1b25f566173363b905e061",
  measurementId: "G-F0X564TT7P"
};

let primaryApp: any;
let primaryAuth: Auth;
let primaryDb: Firestore;

// --- 2. SECONDARY APP (User Data Storage) ---
// This connects to the User's provided database.
let secondaryApp: any;
let secondaryAuth: Auth | undefined;
let secondaryDb: Firestore | undefined;

// --- INITIALIZATION ---

export const initFirebase = (): boolean => {
  try {
    // Initialize Primary App immediately (Idempotent)
    const apps = getApps();
    const existingPrimary = apps.find((a: any) => a.name === '[DEFAULT]');
    
    if (!existingPrimary) {
      primaryApp = initializeApp(PRIMARY_CONFIG);
    } else {
      primaryApp = existingPrimary;
    }

    primaryAuth = getAuth(primaryApp);
    primaryDb = getFirestore(primaryApp);
    return true;
  } catch (e) {
    console.error("Primary Firebase init failed", e);
    return false;
  }
};

export const isFirebaseReady = () => !!secondaryDb && !!secondaryAuth;

// Helper to get the correct User ID for data operations.
// We prioritize the Secondary Auth UID because that matches the Security Rules
// of the user's provided database.
const getEffectiveUid = (primaryUid: string): string => {
    return secondaryAuth?.currentUser?.uid || primaryUid;
};

// --- DUAL-AUTH OPERATIONS ---

/**
 * 1. Register in Primary DB.
 * 2. Save Secondary credentials in Primary DB (fallback to local).
 * 3. Init Secondary App.
 * 4. Register in Secondary DB.
 */
export const registerUser = async (name: string, email: string, pass: string, secondaryConfig: FirebaseConfig) => {
  if (!primaryAuth) throw new Error("Primary Firebase not initialized");

  // 1. Create User in Primary
  const primaryCreds = await createUserWithEmailAndPassword(primaryAuth, email, pass);
  await updateProfile(primaryCreds.user, { displayName: name });

  // 2. Save Secondary Config to Primary DB (with fallback)
  try {
      await setDoc(doc(primaryDb, "users", primaryCreds.user.uid, "system", "dbConfig"), {
        config: secondaryConfig,
        updatedAt: Date.now()
      });
  } catch (e) {
      console.warn("Primary DB Write Failed, saving config locally", e);
      localStorage.setItem(`dbConfig_${primaryCreds.user.uid}`, JSON.stringify(secondaryConfig));
  }

  // 3. Initialize Secondary App
  await initSecondaryApp(secondaryConfig, "secondary_" + primaryCreds.user.uid);

  // 4. Register User in Secondary DB (Replicating account)
  if (!secondaryAuth) throw new Error("Failed to init secondary auth");
  try {
      await createUserWithEmailAndPassword(secondaryAuth, email, pass);
      if (secondaryAuth.currentUser) {
           await updateProfile(secondaryAuth.currentUser, { displayName: name });
      }
  } catch (e: any) {
      // If email already exists in secondary (user used an existing DB), try to login instead
      if (e.code === 'auth/email-already-in-use') {
          await signInWithEmailAndPassword(secondaryAuth, email, pass);
      } else {
          throw e;
      }
  }

  return primaryCreds.user;
};

/**
 * 1. Login to Primary.
 * 2. Fetch Config (Cloud or Local).
 * 3. Init Secondary.
 * 4. Login to Secondary (using passed password).
 */
export const loginUser = async (email: string, pass: string) => {
  if (!primaryAuth) throw new Error("Primary Firebase not initialized");

  // 1. Login Primary
  const primaryCreds = await signInWithEmailAndPassword(primaryAuth, email, pass);
  
  // 2. Fetch Config
  let config: FirebaseConfig | null = null;
  
  // Try Cloud
  try {
    const configDoc = await getDoc(doc(primaryDb, "users", primaryCreds.user.uid, "system", "dbConfig"));
    if (configDoc.exists()) {
        config = configDoc.data().config;
    }
  } catch (e) {
      console.warn("Could not fetch cloud config", e);
  }

  // Try Local Fallback
  if (!config) {
      const local = localStorage.getItem(`dbConfig_${primaryCreds.user.uid}`);
      if (local) {
          try { config = JSON.parse(local); } catch(e) {}
      }
  }
  
  if (!config) {
      throw new Error("Account configuration missing. Please check your internet or contact support.");
  }

  // 3. Init Secondary
  await initSecondaryApp(config, "secondary_" + primaryCreds.user.uid);

  // 4. Login Secondary
  if (!secondaryAuth) throw new Error("Secondary Auth failed to load");
  await signInWithEmailAndPassword(secondaryAuth, email, pass);

  return primaryCreds.user;
};

const initSecondaryApp = async (config: FirebaseConfig, appName: string) => {
    // Check if app already exists to avoid duplication errors
    const apps = getApps();
    const existingApp = apps.find((a: any) => a.name === appName);

    if (existingApp) {
        secondaryApp = existingApp;
    } else {
        secondaryApp = initializeApp(config, appName);
    }

    secondaryAuth = getAuth(secondaryApp);
    secondaryDb = getFirestore(secondaryApp);
};

export const logout = async () => {
  if (secondaryAuth) await signOut(secondaryAuth);
  if (primaryAuth) await signOut(primaryAuth);
  // We keep the apps initialized, just sign out
  secondaryDb = undefined;
  secondaryAuth = undefined;
};

/**
 * Subscribes to PRIMARY auth state, but we really care about the secondary flow.
 */
export const subscribeToAuth = (callback: (user: User | null) => void) => {
  if (!primaryAuth) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(primaryAuth, async (user) => {
    if (!user) {
        // Logged out
        secondaryDb = undefined;
        callback(null);
    } else {
        // Logged in (Session restored)
        if (secondaryDb) {
            callback(user);
        } else {
            // Force re-login on refresh to restore secondary session securely
            // (Simpler than storing config in localStorage universally)
            await signOut(primaryAuth);
            callback(null);
        }
    }
  });
};

// --- DATA OPERATIONS (Targeting Secondary DB) ---
// All functions below must use `secondaryDb`.

export const subscribeToCounters = (
  userId: string, 
  callback: (counters: any[], isSyncing: boolean) => void
) => {
  if (!secondaryDb) return () => {};
  
  const effectiveUid = getEffectiveUid(userId);
  
  const q = query(
    collection(secondaryDb, "users", effectiveUid, "counters"),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const counters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const isSyncing = snapshot.metadata.hasPendingWrites;
    callback(counters, isSyncing);
  }, (error) => {
      console.error("Counter Subscription Error:", error);
      if (error.code === 'permission-denied') {
          console.error("Check your Firestore Security Rules!");
      }
  });
};

export const subscribeToGroups = (
  userId: string,
  callback: (groups: CounterGroup[]) => void
) => {
  if (!secondaryDb) return () => {};
  const effectiveUid = getEffectiveUid(userId);
  
  const q = query(
    collection(secondaryDb, "users", effectiveUid, "groups"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterGroup));
    callback(groups);
  });
};

export const addGroup = async (userId: string, name: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  await addDoc(collection(secondaryDb, "users", effectiveUid, "groups"), {
    name,
    createdAt: Date.now()
  });
};

export const deleteGroup = async (userId: string, groupId: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);

  const batch = writeBatch(secondaryDb);
  batch.delete(doc(secondaryDb, "users", effectiveUid, "groups", groupId));

  const countersRef = collection(secondaryDb, "users", effectiveUid, "counters");
  const q = query(countersRef, where("groupId", "==", groupId));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { groupId: deleteField() });
  });

  await batch.commit();
};

export const addCounter = async (userId: string, title: string, color: string, target?: number, resetDaily: boolean = false, groupId?: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  
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
  
  await addDoc(collection(secondaryDb, "users", effectiveUid, "counters"), data);
};

export const updateCounterTitle = async (userId: string, counterId: string, newTitle: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  const counterRef = doc(secondaryDb, "users", effectiveUid, "counters", counterId);
  await updateDoc(counterRef, { title: newTitle });
};

export const updateCounterGroup = async (userId: string, counterId: string, groupId: string | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  const counterRef = doc(secondaryDb, "users", effectiveUid, "counters", counterId);
  if (groupId === null) {
    await updateDoc(counterRef, { groupId: deleteField() });
  } else {
    await updateDoc(counterRef, { groupId });
  }
};

export const updateCounterTarget = async (userId: string, counterId: string, newTarget: number | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  const counterRef = doc(secondaryDb, "users", effectiveUid, "counters", counterId);
  if (newTarget === null) {
      await updateDoc(counterRef, { target: deleteField() });
  } else {
      await updateDoc(counterRef, { target: newTarget });
  }
};

export const deleteCounter = async (userId: string, counterId: string) => {
    if (!secondaryDb) throw new Error("No DB");
    const effectiveUid = getEffectiveUid(userId);
    await deleteDoc(doc(secondaryDb, "users", effectiveUid, "counters", counterId));
}

export const bulkDeleteCounters = async (userId: string, counterIds: string[]) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  const batch = writeBatch(secondaryDb);
  counterIds.forEach(id => {
      const ref = doc(secondaryDb!, "users", effectiveUid, "counters", id);
      batch.delete(ref);
  });
  await batch.commit();
}

export const bulkUpdateCounterGroup = async (userId: string, counterIds: string[], groupId: string | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  const batch = writeBatch(secondaryDb);
  counterIds.forEach(id => {
      const ref = doc(secondaryDb!, "users", effectiveUid, "counters", id);
      if (groupId === null) {
          batch.update(ref, { groupId: deleteField() });
      } else {
          batch.update(ref, { groupId });
      }
  });
  await batch.commit();
}

export const updateCounterValue = async (userId: string, counterId: string, delta: number, newValue: number) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);

  const batch = writeBatch(secondaryDb);
  
  const counterRef = doc(secondaryDb, "users", effectiveUid, "counters", counterId);
  batch.update(counterRef, {
    count: increment(delta),
    lastUpdated: Date.now()
  });

  const logsRef = collection(secondaryDb, "users", effectiveUid, "logs");
  batch.set(doc(logsRef), { 
    counterId,
    timestamp: Date.now(),
    valueChange: delta,
    newValue: newValue
  });

  await batch.commit();
};

export const getHistoryLogs = async (userId: string, daysBack: number = 365): Promise<CounterLog[]> => {
  if (!secondaryDb) return [];
  const effectiveUid = getEffectiveUid(userId);

  const CACHE_KEY = `tm_logs_cache_${effectiveUid}`;
  const now = Date.now();
  const cutoff = now - (daysBack * 24 * 60 * 60 * 1000);
  
  // 1. Load Cache
  let cachedLogs: CounterLog[] = [];
  let lastFetch = cutoff;
  
  try {
      const stored = localStorage.getItem(CACHE_KEY);
      if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.logs)) {
              cachedLogs = parsed.logs;
              lastFetch = parsed.lastFetch || cutoff;
          }
      }
  } catch (e) {
      console.warn("Failed to load logs cache", e);
  }

  const queryStart = Math.max(lastFetch, cutoff);

  // 2. Fetch New Logs
  const q = query(
    collection(secondaryDb, "users", effectiveUid, "logs"),
    where("timestamp", ">", queryStart),
    orderBy("timestamp", "asc")
  );
  
  const snapshot = await getDocs(q);
  const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterLog));

  // 3. Merge & Deduplicate
  const logsMap = new Map<string, CounterLog>();
  
  cachedLogs.forEach(log => {
      if (log.timestamp >= cutoff) {
          logsMap.set(log.id, log);
      }
  });

  newLogs.forEach(log => {
      logsMap.set(log.id, log);
  });

  const mergedLogs = Array.from(logsMap.values()).sort((a, b) => a.timestamp - b.timestamp);

  // 4. Save Cache
  try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
          logs: mergedLogs,
          lastFetch: now
      }));
  } catch (e) {
      console.warn("Failed to save logs cache", e);
  }

  return mergedLogs;
};

export const resetCountersBatch = async (userId: string, counterIds: string[]) => {
    if (!secondaryDb || counterIds.length === 0) return;
    const effectiveUid = getEffectiveUid(userId);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const batch = writeBatch(secondaryDb);
    
    counterIds.forEach(id => {
        const ref = doc(secondaryDb!, "users", effectiveUid, "counters", id);
        batch.update(ref, {
            count: 0,
            lastResetDate: todayStr,
            lastUpdated: Date.now()
        });
    });

    await batch.commit();
};

export const subscribeToTodoLists = (
  userId: string,
  callback: (lists: TodoList[]) => void
) => {
  if (!secondaryDb) return () => {};
  const effectiveUid = getEffectiveUid(userId);
  
  const q = query(
    collection(secondaryDb, "users", effectiveUid, "todoLists"),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TodoList));
    callback(lists);
  });
};

export const addTodoList = async (userId: string, title: string, color: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  
  const newList = {
    title,
    color,
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await addDoc(collection(secondaryDb, "users", effectiveUid, "todoLists"), newList);
};

export const updateTodoList = async (userId: string, listId: string, data: Partial<TodoList>) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  
  const listRef = doc(secondaryDb, "users", effectiveUid, "todoLists", listId);
  await updateDoc(listRef, {
    ...data,
    updatedAt: Date.now()
  });
};

export const deleteTodoList = async (userId: string, listId: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const effectiveUid = getEffectiveUid(userId);
  await deleteDoc(doc(secondaryDb, "users", effectiveUid, "todoLists", listId));
};

export const updateUserSettings = async (userId: string, settings: ThemeSettings) => {
    if (!secondaryDb) throw new Error("No DB");
    const effectiveUid = getEffectiveUid(userId);
    await setDoc(doc(secondaryDb, "users", effectiveUid, "settings", "theme"), settings);
};

export const subscribeToUserSettings = (userId: string, callback: (settings: ThemeSettings) => void) => {
    if (!secondaryDb) return () => {};
    const effectiveUid = getEffectiveUid(userId);
    return onSnapshot(doc(secondaryDb, "users", effectiveUid, "settings", "theme"), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as ThemeSettings);
        }
    });
};

export const updateSecondaryConfigInPrimary = async (userId: string, newConfig: FirebaseConfig) => {
    if (!primaryDb) throw new Error("Primary DB down");
    await setDoc(doc(primaryDb, "users", userId, "system", "dbConfig"), {
        config: newConfig,
        updatedAt: Date.now()
    });
};
