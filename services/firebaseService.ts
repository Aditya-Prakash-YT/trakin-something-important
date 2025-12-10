
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

// --- DUAL-AUTH OPERATIONS ---

/**
 * 1. Register in Primary DB.
 * 2. Save Secondary credentials in Primary DB.
 * 3. Init Secondary App.
 * 4. Register in Secondary DB.
 */
export const registerUser = async (name: string, email: string, pass: string, secondaryConfig: FirebaseConfig) => {
  if (!primaryAuth) throw new Error("Primary Firebase not initialized");

  // 1. Create User in Primary
  const primaryCreds = await createUserWithEmailAndPassword(primaryAuth, email, pass);
  await updateProfile(primaryCreds.user, { displayName: name });

  // 2. Save Secondary Config to Primary DB
  await setDoc(doc(primaryDb, "users", primaryCreds.user.uid, "system", "dbConfig"), {
    config: secondaryConfig,
    updatedAt: Date.now()
  });

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
 * 2. Fetch Config.
 * 3. Init Secondary.
 * 4. Login to Secondary (using passed password).
 */
export const loginUser = async (email: string, pass: string) => {
  if (!primaryAuth) throw new Error("Primary Firebase not initialized");

  // 1. Login Primary
  const primaryCreds = await signInWithEmailAndPassword(primaryAuth, email, pass);
  
  // 2. Fetch Config
  const configDoc = await getDoc(doc(primaryDb, "users", primaryCreds.user.uid, "system", "dbConfig"));
  
  if (!configDoc.exists()) {
      // Edge case: User exists in primary but no config saved? 
      // This might happen if previous registration failed halfway.
      throw new Error("Account configuration missing. Please contact support.");
  }

  const { config } = configDoc.data() as { config: FirebaseConfig };

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
 * Since we handle the secondary login manually in loginUser/registerUser,
 * this listener mainly confirms the session persistence of the Primary account.
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
        // If we are refreshing the page, 'secondaryDb' will be undefined.
        // We cannot auto-restore secondary session because we don't have the password 
        // in memory anymore to sign in to the Secondary DB.
        
        // However, if we just logged in via the explicit functions above, secondaryDb is set.
        if (secondaryDb) {
            callback(user);
        } else {
            // Page refresh scenario:
            // We have Primary Auth, but we need to re-hydrate Secondary.
            // Problem: We don't have the password.
            // Solution: We force the user to re-login to get the password, 
            // OR we rely on Firebase Auth Persistence for the secondary app *if* we named it uniquely.
            // But getting the secondary persistence to fire before we have the config is tricky.
            
            // For this implementation, on a hard refresh, we will force a logout 
            // because we can't decrypt the secondary DB without re-authenticating.
            console.log("Session restore requires re-authentication for security.");
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
  
  const q = query(
    collection(secondaryDb, "users", userId, "counters"),
    orderBy("lastUpdated", "desc")
  );

  return onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
    const counters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const isSyncing = snapshot.metadata.hasPendingWrites;
    callback(counters, isSyncing);
  });
};

export const subscribeToGroups = (
  userId: string,
  callback: (groups: CounterGroup[]) => void
) => {
  if (!secondaryDb) return () => {};
  
  const q = query(
    collection(secondaryDb, "users", userId, "groups"),
    orderBy("createdAt", "asc")
  );

  return onSnapshot(q, (snapshot) => {
    const groups = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterGroup));
    callback(groups);
  });
};

export const addGroup = async (userId: string, name: string) => {
  if (!secondaryDb) throw new Error("No DB");
  await addDoc(collection(secondaryDb, "users", userId, "groups"), {
    name,
    createdAt: Date.now()
  });
};

export const deleteGroup = async (userId: string, groupId: string) => {
  if (!secondaryDb) throw new Error("No DB");

  const batch = writeBatch(secondaryDb);
  batch.delete(doc(secondaryDb, "users", userId, "groups", groupId));

  const countersRef = collection(secondaryDb, "users", userId, "counters");
  const q = query(countersRef, where("groupId", "==", groupId));
  const snapshot = await getDocs(q);
  
  snapshot.forEach(docSnap => {
    batch.update(docSnap.ref, { groupId: deleteField() });
  });

  await batch.commit();
};

export const addCounter = async (userId: string, title: string, color: string, target?: number, resetDaily: boolean = false, groupId?: string) => {
  if (!secondaryDb) throw new Error("No DB");
  
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
  
  await addDoc(collection(secondaryDb, "users", userId, "counters"), data);
};

export const updateCounterTitle = async (userId: string, counterId: string, newTitle: string) => {
  if (!secondaryDb) throw new Error("No DB");
  const counterRef = doc(secondaryDb, "users", userId, "counters", counterId);
  await updateDoc(counterRef, { title: newTitle });
};

export const updateCounterGroup = async (userId: string, counterId: string, groupId: string | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const counterRef = doc(secondaryDb, "users", userId, "counters", counterId);
  if (groupId === null) {
    await updateDoc(counterRef, { groupId: deleteField() });
  } else {
    await updateDoc(counterRef, { groupId });
  }
};

export const updateCounterTarget = async (userId: string, counterId: string, newTarget: number | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const counterRef = doc(secondaryDb, "users", userId, "counters", counterId);
  if (newTarget === null) {
      await updateDoc(counterRef, { target: deleteField() });
  } else {
      await updateDoc(counterRef, { target: newTarget });
  }
};

export const deleteCounter = async (userId: string, counterId: string) => {
    if (!secondaryDb) throw new Error("No DB");
    await deleteDoc(doc(secondaryDb, "users", userId, "counters", counterId));
}

export const bulkDeleteCounters = async (userId: string, counterIds: string[]) => {
  if (!secondaryDb) throw new Error("No DB");
  const batch = writeBatch(secondaryDb);
  counterIds.forEach(id => {
      const ref = doc(secondaryDb, "users", userId, "counters", id);
      batch.delete(ref);
  });
  await batch.commit();
}

export const bulkUpdateCounterGroup = async (userId: string, counterIds: string[], groupId: string | null) => {
  if (!secondaryDb) throw new Error("No DB");
  const batch = writeBatch(secondaryDb);
  counterIds.forEach(id => {
      const ref = doc(secondaryDb, "users", userId, "counters", id);
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

  const batch = writeBatch(secondaryDb);
  
  const counterRef = doc(secondaryDb, "users", userId, "counters", counterId);
  batch.update(counterRef, {
    count: increment(delta),
    lastUpdated: Date.now()
  });

  const logsRef = collection(secondaryDb, "users", userId, "logs");
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

  const CACHE_KEY = `tm_logs_cache_${userId}`;
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

  // Ensure we don't query further back than we need if cache is empty or old
  const queryStart = Math.max(lastFetch, cutoff);

  // 2. Fetch New Logs
  // We add 1ms to avoid fetching the last log again if timestamps match exactly, 
  // though typically > comparison is enough.
  const q = query(
    collection(secondaryDb, "users", userId, "logs"),
    where("timestamp", ">", queryStart),
    orderBy("timestamp", "asc")
  );
  
  const snapshot = await getDocs(q);
  const newLogs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CounterLog));

  // 3. Merge & Deduplicate
  // Use a Map to deduplicate by ID in case of overlap
  const logsMap = new Map<string, CounterLog>();
  
  // Fill with cached logs that are still within the time window
  cachedLogs.forEach(log => {
      if (log.timestamp >= cutoff) {
          logsMap.set(log.id, log);
      }
  });

  // Add/Overwrite with new logs
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
      // LocalStorage might be full
      console.warn("Failed to save logs cache", e);
  }

  return mergedLogs;
};

// Optimized reset that uses existing state instead of querying
export const resetCountersBatch = async (userId: string, counterIds: string[]) => {
    if (!secondaryDb || counterIds.length === 0) return;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const batch = writeBatch(secondaryDb);
    
    counterIds.forEach(id => {
        const ref = doc(secondaryDb!, "users", userId, "counters", id);
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
  
  const q = query(
    collection(secondaryDb, "users", userId, "todoLists"),
    orderBy("updatedAt", "desc")
  );

  return onSnapshot(q, (snapshot) => {
    const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TodoList));
    callback(lists);
  });
};

export const addTodoList = async (userId: string, title: string, color: string) => {
  if (!secondaryDb) throw new Error("No DB");
  
  const newList = {
    title,
    color,
    items: [],
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  
  await addDoc(collection(secondaryDb, "users", userId, "todoLists"), newList);
};

export const updateTodoList = async (userId: string, listId: string, data: Partial<TodoList>) => {
  if (!secondaryDb) throw new Error("No DB");
  
  const listRef = doc(secondaryDb, "users", userId, "todoLists", listId);
  await updateDoc(listRef, {
    ...data,
    updatedAt: Date.now()
  });
};

export const deleteTodoList = async (userId: string, listId: string) => {
  if (!secondaryDb) throw new Error("No DB");
  await deleteDoc(doc(secondaryDb, "users", userId, "todoLists", listId));
};

export const updateUserSettings = async (userId: string, settings: ThemeSettings) => {
    if (!secondaryDb) throw new Error("No DB");
    await setDoc(doc(secondaryDb, "users", userId, "settings", "theme"), settings);
};

export const subscribeToUserSettings = (userId: string, callback: (settings: ThemeSettings) => void) => {
    if (!secondaryDb) return () => {};
    return onSnapshot(doc(secondaryDb, "users", userId, "settings", "theme"), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as ThemeSettings);
        }
    });
};

// --- Config Management for Primary DB ---
// We can update the secondary config stored in primary DB here
export const updateSecondaryConfigInPrimary = async (userId: string, newConfig: FirebaseConfig) => {
    if (!primaryDb) throw new Error("Primary DB down");
    await setDoc(doc(primaryDb, "users", userId, "system", "dbConfig"), {
        config: newConfig,
        updatedAt: Date.now()
    });
};

export const getStoredConfig = () => {
    // Legacy support removal - we no longer use localstorage config
    return null;
}
export const saveConfig = () => {}; 
export const clearConfig = () => {};
