export interface Counter {
  id: string;
  title: string;
  count: number;
  color: string;
  target?: number;
  createdAt: number;
  lastUpdated: number;
  userId?: string;
}

export interface CounterLog {
  id: string;
  counterId: string;
  timestamp: number;
  valueChange: number; // 1 or -1 usually
  newValue: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export type Theme = 'dark' | 'light';

export type Tab = 'dashboard' | 'analytics' | 'settings';