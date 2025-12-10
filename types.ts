

export interface CounterGroup {
  id: string;
  name: string;
  createdAt: number;
}

export interface Counter {
  id: string;
  title: string;
  count: number;
  color: string;
  target?: number;
  createdAt: number;
  lastUpdated: number;
  userId?: string;
  resetDaily?: boolean;
  lastResetDate?: string; // YYYY-MM-DD string
  groupId?: string;
}

export interface CounterLog {
  id: string;
  counterId: string;
  timestamp: number;
  valueChange: number; // 1 or -1 usually
  newValue: number;
}

export interface TodoNode {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  isExpanded: boolean;
  children: TodoNode[];
  priority?: 'high' | 'medium' | 'low';
  dueDate?: number; // Timestamp
}

export interface TodoList {
  id: string;
  title: string;
  color: string;
  items: TodoNode[];
  createdAt: number;
  updatedAt: number;
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
  measurementId?: string;
}

export interface UserDatabaseConfig {
  config: FirebaseConfig;
  updatedAt: number;
}

export type BaseTheme = 'default' | 'medium-dark' | 'dark' | 'extra-dark' | 'oled';
export type ComponentTheme = 'default' | 'high-contrast';

export interface ThemeSettings {
  base: BaseTheme;
  component: ComponentTheme;
}

export type Tab = 'dashboard' | 'todos' | 'analytics' | 'settings';