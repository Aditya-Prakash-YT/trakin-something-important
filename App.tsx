
import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
} from "firebase/auth";
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Settings as SettingsIcon,
  Plus,
  LogIn,
  Target,
  Check,
  LayoutGrid,
  List,
  ArrowUpDown,
  Calendar,
  RotateCcw,
  Cloud,
  CloudOff,
  RefreshCw,
  Folder,
  CheckSquare,
  Square,
  X,
  Trash2,
  CheckCircle2,
  CheckSquare2,
  FolderPlus
} from 'lucide-react';
import { Counter, CounterLog, Tab, ThemeSettings, CounterGroup, TodoList } from './types';
import { 
  initFirebase, 
  subscribeToAuth, 
  subscribeToCounters, 
  addCounter, 
  updateCounterValue, 
  deleteCounter,
  getHistoryLogs,
  isFirebaseReady,
  updateCounterTitle,
  updateCounterTarget,
  checkDailyResets,
  subscribeToGroups,
  addGroup,
  deleteGroup,
  updateCounterGroup,
  bulkDeleteCounters,
  subscribeToTodoLists,
  addTodoList,
  updateTodoList,
  deleteTodoList,
  subscribeToUserSettings,
  updateUserSettings
} from './services/firebaseService';
import { CounterView } from './components/CounterView';
import { Settings } from './components/Settings';
import { CalendarStats } from './components/CalendarStats';
import { AuthModal } from './components/AuthModal';
import { TodoManager } from './components/TodoManager';
import clsx from 'clsx';

const COLORS = [
  { hex: '#6366f1', name: 'Indigo' },
  { hex: '#ef4444', name: 'Red' },
  { hex: '#22c55e', name: 'Green' },
  { hex: '#eab308', name: 'Yellow' },
  { hex: '#ec4899', name: 'Pink' },
  { hex: '#06b6d4', name: 'Cyan' },
  { hex: '#f97316', name: 'Orange' },
];

type ViewMode = 'grid' | 'list';
type SortMode = 'updated' | 'alpha' | 'value' | 'created';

interface CounterCardProps {
  counter: Counter;
  onClick: () => void;
  viewMode: ViewMode;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
}

const CounterCard: React.FC<CounterCardProps> = ({ 
    counter, 
    onClick, 
    viewMode, 
    selectionMode, 
    isSelected, 
    onToggleSelection 
}) => {
  const [animClass, setAnimClass] = useState('');
  const [prevCount, setPrevCount] = useState(counter.count);

  useEffect(() => {
    if (counter.count !== prevCount) {
      if (counter.count > prevCount) {
         setAnimClass('scale-110');
      } else {
         setAnimClass('scale-90');
      }
      setPrevCount(counter.count);
      const timer = setTimeout(() => setAnimClass(''), 200);
      return () => clearTimeout(timer);
    }
  }, [counter.count, prevCount]);

  const isTargetReached = counter.target !== undefined && counter.count >= counter.target;
  
  const displayColor = counter.color;
  const targetColor = '#4ade80';

  const handleClick = (e: React.MouseEvent) => {
      if (selectionMode) {
          e.preventDefault();
          onToggleSelection();
      } else {
          onClick();
      }
  };

  if (viewMode === 'list') {
      return (
        <button 
            onClick={handleClick}
            className={clsx(
                "w-full transition-all p-4 rounded-xl border flex items-center justify-between shadow-sm group relative bg-gray-900 border-gray-800",
                isTargetReached 
                    ? "border-green-500/30 bg-green-900/10" 
                    : (isSelected && selectionMode ? "border-indigo-500 bg-indigo-900/20" : "hover:bg-gray-900/50 hover:border-gray-700")
            )}
        >
            <div className="flex items-center gap-4">
                {selectionMode && (
                    <div className="mr-2">
                        {isSelected ? <CheckSquare className="text-indigo-400" /> : <Square className="text-gray-600" />}
                    </div>
                )}
                
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-gray-950 relative"
                    style={{ backgroundColor: isTargetReached ? targetColor : displayColor }}
                >
                    {counter.title.charAt(0).toUpperCase()}
                    {counter.resetDaily && (
                        <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-0.5 border border-gray-700">
                             <RotateCcw size={8} className="text-blue-400" />
                        </div>
                    )}
                </div>
                <div className="text-left">
                    <span className="block text-gray-300 font-medium text-sm">{counter.title}</span>
                    <span className="text-gray-500 text-[10px] flex items-center gap-1">
                        {counter.resetDaily ? 'Daily Reset' : new Date(counter.lastUpdated).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-4">
                 {counter.target && (
                    <div className={clsx(
                        "text-[10px] font-semibold flex items-center gap-1",
                        isTargetReached ? "text-green-400" : "text-gray-600"
                    )}>
                        <Target size={12} />
                        {Math.round((counter.count / counter.target) * 100)}%
                    </div>
                )}
                <span 
                    className={clsx(
                        "text-2xl font-bold transition-transform duration-200",
                        animClass
                    )}
                    style={{ color: isTargetReached ? targetColor : displayColor }}
                >
                    {counter.count}
                </span>
            </div>
        </button>
      )
  }

  return (
    <button 
      onClick={handleClick}
      className={clsx(
          "transition-all p-5 rounded-2xl border flex flex-col items-start space-y-3 shadow-lg relative overflow-hidden group min-h-[160px] bg-gray-900 border-gray-800 hover:bg-gray-800",
          isTargetReached 
             ? "border-green-500/30 ring-1 ring-green-500/20" 
             : (isSelected && selectionMode ? "border-indigo-500 ring-1 ring-indigo-500/50" : "")
      )}
    >
      {/* Selection Overlay Checkbox */}
      {selectionMode && (
          <div className="absolute top-3 right-3 z-20">
              {isSelected ? (
                  <CheckCircle2 className="text-white fill-indigo-500" size={24} />
              ) : (
                  <div className="w-6 h-6 rounded-full border-2 border-gray-600 bg-black/40" />
              )}
          </div>
      )}

      <div 
        className={clsx(
            "absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-opacity duration-500",
            isTargetReached ? "opacity-30" : "opacity-10"
        )}
        style={{ backgroundColor: isTargetReached ? targetColor : displayColor }}
      ></div>
      
      <div className="flex justify-between w-full items-start">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider truncate w-full text-left pr-4">{counter.title}</span>
          {counter.resetDaily && (
              <div className="p-1.5 rounded-md border bg-blue-900/20 border-blue-500/20" title="Resets Daily">
                  <RotateCcw size={12} className="text-blue-400" />
              </div>
          )}
      </div>

      <span 
        className={clsx(
            "text-4xl font-bold transition-transform duration-200 origin-left",
            animClass
        )}
        style={{ color: isTargetReached ? targetColor : displayColor }}
      >
        {counter.count}
      </span>
      <div className="flex justify-between items-end w-full mt-auto">
          <div className="text-gray-600 text-[10px]">
              {new Date(counter.lastUpdated).toLocaleDateString()}
          </div>
          {counter.target && (
              <div className={clsx(
                  "text-[10px] font-semibold flex items-center gap-1",
                  isTargetReached ? "text-green-400" : "text-gray-500"
              )}>
                  <Target size={10} />
                  {Math.round((counter.count / counter.target) * 100)}%
              </div>
          )}
      </div>
    </button>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [groups, setGroups] = useState<CounterGroup[]>([]);
  const [todoLists, setTodoLists] = useState<TodoList[]>([]); 
  const [logs, setLogs] = useState<CounterLog[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Theme State
  const [themeSettings, setThemeSettings] = useState<ThemeSettings>(() => {
    const stored = localStorage.getItem('app_theme_settings');
    return stored ? JSON.parse(stored) : { base: 'default', component: 'default' };
  });
  
  // Create Counter State
  const [newCounterTitle, setNewCounterTitle] = useState("");
  const [newCounterColor, setNewCounterColor] = useState(COLORS[0].hex);
  const [newCounterGroupId, setNewCounterGroupId] = useState("");
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [resetDaily, setResetDaily] = useState(true);

  // Group Manager State
  const [newGroupName, setNewGroupName] = useState("");

  // Sorting & View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated');

  // Handle Theme Update
  const handleThemeChange = (newSettings: Partial<ThemeSettings>) => {
      const nextSettings = { ...themeSettings, ...newSettings };
      setThemeSettings(nextSettings);
      localStorage.setItem('app_theme_settings', JSON.stringify(nextSettings));
      if (user) {
          updateUserSettings(user.uid, nextSettings);
      }
  };

  // Initialize Theme CSS Variables
  useEffect(() => {
    const root = document.documentElement;
    const { base, component } = themeSettings;

    // Apply Base Theme (Background)
    switch(base) {
        case 'oled':
            root.style.setProperty('--c-gray-950', '0 0 0'); // Pure Black
            break;
        case 'extra-dark':
            root.style.setProperty('--c-gray-950', '9 9 11'); // Zinc 950
            break;
        case 'dark':
            root.style.setProperty('--c-gray-950', '24 24 27'); // Zinc 900
            break;
        case 'medium-dark':
             root.style.setProperty('--c-gray-950', '15 23 42'); // Slate 900
             break;
        case 'default':
        default:
            root.style.setProperty('--c-gray-950', '3 7 18'); // Default Deep Blue
            break;
    }

    // Apply Component Theme (Card Backgrounds and Borders)
    // We adjust gray-900 (card bg) and gray-850 (border) relative to the choice
    if (component === 'high-contrast') {
        // High Contrast: Darker cards, Lighter borders
        if (base === 'oled' || base === 'extra-dark') {
            root.style.setProperty('--c-gray-900', '0 0 0'); 
            root.style.setProperty('--c-gray-850', '82 82 91'); // Zinc 600
        } else {
             root.style.setProperty('--c-gray-900', '9 9 11'); // Darker than normal
             root.style.setProperty('--c-gray-850', '75 85 99'); // Gray 600
        }
    } else {
        // Default Component Theme
        switch(base) {
            case 'oled':
                root.style.setProperty('--c-gray-900', '24 24 27'); // Zinc 900 Cards on Black
                root.style.setProperty('--c-gray-850', '39 39 42');
                break;
            case 'extra-dark':
                root.style.setProperty('--c-gray-900', '24 24 27'); // Zinc 900
                root.style.setProperty('--c-gray-850', '39 39 42');
                break;
            case 'dark':
                 root.style.setProperty('--c-gray-900', '39 39 42'); // Zinc 800
                 root.style.setProperty('--c-gray-850', '63 63 70');
                 break;
            case 'medium-dark':
                 root.style.setProperty('--c-gray-900', '30 41 59'); // Slate 800
                 root.style.setProperty('--c-gray-850', '51 65 85');
                 break;
            case 'default':
            default:
                 root.style.setProperty('--c-gray-900', '17 24 39');
                 root.style.setProperty('--c-gray-850', '31 41 55');
                 break;
        }
    }

  }, [themeSettings]);

  // Initialize Firebase
  useEffect(() => {
    const configured = initFirebase();
    setIsFirebaseConfigured(configured);
    
    if (configured) {
      const unsubAuth = subscribeToAuth((u) => {
        setUser(u);
        if (u) {
            checkDailyResets(u.uid);
        }
      });
      return () => unsubAuth();
    } else {
        const localData = localStorage.getItem('local_counters');
        if (localData) {
            const c: Counter[] = JSON.parse(localData);
            setCounters(c);
        }
        const localGroups = localStorage.getItem('local_groups');
        if (localGroups) {
            setGroups(JSON.parse(localGroups));
        }
        const localTodos = localStorage.getItem('local_todos');
        if (localTodos) {
            setTodoLists(JSON.parse(localTodos));
        }
    }
  }, []);

  useEffect(() => {
    if (user) {
      const unsubCounters = subscribeToCounters(user.uid, (data, syncing) => {
        setCounters(data);
        setIsSyncing(syncing);
      });
      const unsubGroups = subscribeToGroups(user.uid, (data) => {
        setGroups(data);
      });
      const unsubTodos = subscribeToTodoLists(user.uid, (data) => {
          setTodoLists(data);
      });
      const unsubSettings = subscribeToUserSettings(user.uid, (settings) => {
          setThemeSettings(settings);
          localStorage.setItem('app_theme_settings', JSON.stringify(settings));
      });
      
      getHistoryLogs(user.uid).then(setLogs);
      
      return () => {
        unsubCounters();
        unsubGroups();
        unsubTodos();
        unsubSettings();
      };
    } else if (!isFirebaseConfigured) {
        localStorage.setItem('local_counters', JSON.stringify(counters));
        localStorage.setItem('local_groups', JSON.stringify(groups));
        localStorage.setItem('local_todos', JSON.stringify(todoLists));
    }
  }, [user, counters.length, groups.length, todoLists, isFirebaseConfigured]); 

  // Handlers ... (Keep existing handlers)
  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    if (user) await addGroup(user.uid, newGroupName);
    else {
        setGroups(prev => [...prev, { id: Date.now().toString(), name: newGroupName, createdAt: Date.now() }]);
    }
    setNewGroupName("");
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (confirm("Delete this group?")) {
        if (user) await deleteGroup(user.uid, groupId);
        else {
            setGroups(prev => prev.filter(g => g.id !== groupId));
            setCounters(prev => prev.map(c => c.groupId === groupId ? { ...c, groupId: undefined } : c));
        }
    }
  };

  const handleUpdateCounterGroup = async (id: string, groupId: string | null) => {
      if (user) await updateCounterGroup(user.uid, id, groupId);
      else setCounters(prev => prev.map(c => c.id === id ? { ...c, groupId: groupId || undefined } : c));
  };

  const groupedCounters = useMemo(() => {
    const c = [...counters];
    let sorted = c;
    switch (sortMode) {
        case 'alpha': sorted = c.sort((a, b) => a.title.localeCompare(b.title)); break;
        case 'value': sorted = c.sort((a, b) => b.count - a.count); break;
        case 'created': sorted = c.sort((a, b) => b.createdAt - a.createdAt); break;
        case 'updated': default: sorted = c.sort((a, b) => b.lastUpdated - a.lastUpdated); break;
    }

    const sections: { id: string, name: string, counters: Counter[] }[] = [];
    const ungrouped = sorted.filter(c => !c.groupId || !groups.find(g => g.id === c.groupId));
    if (ungrouped.length > 0) sections.push({ id: 'ungrouped', name: 'Ungrouped', counters: ungrouped });
    groups.forEach(g => {
        const groupCounters = sorted.filter(c => c.groupId === g.id);
        if (groupCounters.length > 0) sections.push({ id: g.id, name: g.name, counters: groupCounters });
    });
    return sections;
  }, [counters, groups, sortMode]);

  const handleCreateCounter = async () => {
    if (!newCounterTitle.trim()) return;
    const target = hasTarget && targetValue ? parseInt(targetValue) : undefined;
    const groupId = newCounterGroupId || undefined;

    if (user) {
      await addCounter(user.uid, newCounterTitle, newCounterColor, target, resetDaily, groupId);
    } else {
      setCounters(prev => [{
        id: Date.now().toString(),
        title: newCounterTitle,
        count: 0,
        color: newCounterColor,
        target,
        createdAt: Date.now(),
        lastUpdated: Date.now(),
        resetDaily,
        lastResetDate: resetDaily ? new Date().toISOString().split('T')[0] : undefined,
        groupId
      }, ...prev]);
    }
    setNewCounterTitle(""); setNewCounterColor(COLORS[0].hex); setHasTarget(false); setTargetValue(""); setResetDaily(true); setNewCounterGroupId(""); setShowAddModal(false);
  };

  const handleUpdateCounter = async (id: string, delta: number) => {
    if (user) {
      const counter = counters.find(c => c.id === id);
      if(counter) await updateCounterValue(user.uid, id, delta, counter.count + delta);
    } else {
      setCounters(prev => prev.map(c => {
        if (c.id === id) {
            const next = c.count + delta;
            setLogs(prevLogs => [...prevLogs, { id: Date.now().toString(), counterId: id, timestamp: Date.now(), valueChange: delta, newValue: next }]);
            return { ...c, count: next, lastUpdated: Date.now() };
        }
        return c;
      }));
    }
  };

  const handleRenameCounter = async (id: string, newTitle: string) => {
      if (user) await updateCounterTitle(user.uid, id, newTitle);
      else setCounters(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  const handleUpdateTarget = async (id: string, newTarget: number | null) => {
      if (user) await updateCounterTarget(user.uid, id, newTarget);
      else setCounters(prev => prev.map(c => c.id === id ? { ...c, target: newTarget || undefined } : c));
  };

  const handleDeleteCounter = async (id: string) => {
      if (user) await deleteCounter(user.uid, id);
      else setCounters(prev => prev.filter(c => c.id !== id));
      setActiveCounterId(null);
  };

  const handleAddTodoList = async (title: string, color: string) => {
      if (user) await addTodoList(user.uid, title, color);
      else setTodoLists(prev => [{ id: Date.now().toString(), title, color, items: [], createdAt: Date.now(), updatedAt: Date.now() }, ...prev]);
  };

  const handleUpdateTodoList = async (listId: string, data: Partial<TodoList>) => {
      if (user) await updateTodoList(user.uid, listId, data);
      else setTodoLists(prev => prev.map(list => list.id === listId ? { ...list, ...data, updatedAt: Date.now() } : list));
  };

  const handleDeleteTodoList = async (listId: string) => {
      if (user) await deleteTodoList(user.uid, listId);
      else setTodoLists(prev => prev.filter(l => l.id !== listId));
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === counters.length) setSelectedIds(new Set());
      else setSelectedIds(new Set(counters.map(c => c.id)));
  };

  const handleExitSelectionMode = () => { setIsSelectionMode(false); setSelectedIds(new Set()); }

  const handleBulkDelete = async () => {
      if (!user || selectedIds.size === 0) return;
      if (confirm(`Delete ${selectedIds.size} counters?`)) {
          await bulkDeleteCounters(user.uid, Array.from(selectedIds));
          handleExitSelectionMode();
      }
  };

  if (activeCounterId) {
    const counter = counters.find(c => c.id === activeCounterId);
    if (counter) {
      return (
        <div className="h-screen w-full pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gray-950">
            <CounterView 
              counter={counter} 
              groups={groups}
              onBack={() => setActiveCounterId(null)}
              onUpdate={handleUpdateCounter}
              onRename={handleRenameCounter}
              onUpdateTarget={handleUpdateTarget}
              onUpdateGroup={handleUpdateCounterGroup}
              onDelete={handleDeleteCounter}
            />
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen text-gray-100 flex flex-col font-sans transition-colors duration-300 bg-gray-950">
      
      {/* Top Header Bar */}
      <header className="fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b transition-colors duration-300 bg-gray-950/80 border-gray-800">
          <div className="pt-[env(safe-area-inset-top)] px-4 h-14 flex items-center justify-between">
              <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-lg shadow-lg rotate-3 bg-gray-900 border border-gray-800 text-white">
                      T
                  </div>
                  <h1 className="text-lg font-bold tracking-tight text-white">
                    TallyMaster
                  </h1>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8">
                    {user ? (
                        isSyncing ? (
                            <RefreshCw size={16} className="animate-spin text-yellow-500" />
                        ) : (
                            <div className="relative">
                                <Cloud size={18} className="opacity-40 text-green-500" />
                                <Check size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold text-green-500" />
                            </div>
                        )
                    ) : (
                        <CloudOff size={18} className="text-gray-600" />
                    )}
                </div>

                {!user && isFirebaseConfigured && (
                    <button 
                        onClick={() => setShowAuthModal(true)}
                        className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition font-semibold border bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20"
                    >
                        <LogIn size={14} /> 
                        <span>Sign In</span>
                    </button>
                )}
              </div>
          </div>
      </header>

      <main className="flex-1 overflow-y-auto pt-[calc(3.5rem+env(safe-area-inset-top))] pb-[calc(5rem+env(safe-area-inset-bottom))] no-scrollbar scroll-smooth">
        
        {activeTab === 'dashboard' && (
          <div className="px-4 md:px-6 mt-4">
             {!isFirebaseConfigured && (
                <div className="bg-yellow-900/10 border border-yellow-700/30 p-3 rounded-xl text-yellow-500 text-xs mb-6 flex items-start gap-2">
                    <CloudOff size={16} className="shrink-0 mt-0.5" />
                    <span><strong>Demo Mode:</strong> Data is saved locally. Sign in via Settings to sync.</span>
                </div>
            )}
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div className="flex gap-1 p-1 rounded-xl border bg-gray-900/50 border-gray-800/50">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={clsx("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                         onClick={() => setViewMode('list')}
                         className={clsx("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-gray-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-300")}
                    >
                        <List size={16} />
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar items-center">
                     {counters.length > 0 && (
                        <button 
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) setSelectedIds(new Set());
                            }}
                            className={clsx(
                                "px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0 text-xs font-medium",
                                isSelectionMode 
                                    ? "bg-indigo-600 border-indigo-500 text-white"
                                    : "bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900"
                            )}
                        >
                            {isSelectionMode ? <X size={14} /> : <CheckSquare size={14} />}
                            {isSelectionMode ? 'Cancel' : 'Select'}
                        </button>
                     )}
                     
                     <div className="h-4 w-px bg-gray-800 mx-1 hidden sm:block"></div>

                     {!isSelectionMode && (
                         <>
                            <button 
                                onClick={() => setShowGroupModal(true)}
                                className="px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0 bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-900 hover:text-white"
                            >
                                <Folder size={14} />
                                <span className="hidden sm:inline text-xs font-medium">Groups</span>
                            </button>

                            <button 
                                onClick={() => setSortMode('updated')}
                                className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                                    sortMode === 'updated' 
                                        ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400"
                                        : "bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-900"
                                )}
                            >
                                <Calendar size={14} />
                                <span className="hidden sm:inline text-xs font-medium">Recent</span>
                            </button>
                            <button 
                                onClick={() => setSortMode('value')}
                                className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                                    sortMode === 'value' 
                                        ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400"
                                        : "bg-gray-900/50 border-gray-800 text-gray-400 hover:bg-gray-900"
                                )}
                            >
                                <ArrowUpDown size={14} />
                                <span className="hidden sm:inline text-xs font-medium">Count</span>
                            </button>
                         </>
                     )}
                     
                     {isSelectionMode && (
                         <button 
                            onClick={handleSelectAll}
                            className="px-3 py-2 rounded-lg border bg-gray-900/50 border-gray-800 text-gray-400 hover:text-white hover:bg-gray-900 text-xs font-medium"
                         >
                            {selectedIds.size === counters.length ? "Deselect All" : "Select All"}
                         </button>
                     )}
                </div>
            </div>

            {counters.length === 0 && (
                <div className="text-center py-20 flex flex-col items-center animate-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bg-gray-900 border border-gray-800 text-white">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No counters yet</h3>
                    <p className="text-gray-500 mb-8 max-w-xs">Start tracking habits, scores, or inventory by creating your first counter.</p>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className="px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105 bg-gray-800 border border-gray-700 text-white"
                    >
                        Create Counter
                    </button>
                </div>
            )}

            <div className="space-y-10">
                {groupedCounters.map(section => (
                    <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {(groups.length > 0 || section.id !== 'ungrouped') && (
                            <div className="flex items-center gap-4 mb-4">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">
                                    {section.name}
                                </h3>
                                <div className="h-px bg-gray-800 flex-1"></div>
                                <span className="text-xs text-gray-600 font-medium">{section.counters.length}</span>
                            </div>
                        )}

                        <div className={clsx(
                            "grid gap-4",
                            viewMode === 'grid' ? "grid-cols-2" : "grid-cols-1"
                        )}>
                            {section.counters.map(counter => (
                                <CounterCard 
                                    key={counter.id} 
                                    counter={counter} 
                                    viewMode={viewMode}
                                    onClick={() => setActiveCounterId(counter.id)} 
                                    selectionMode={isSelectionMode}
                                    isSelected={selectedIds.has(counter.id)}
                                    onToggleSelection={() => toggleSelection(counter.id)}
                                />
                            ))}
                            
                            {section.id === 'ungrouped' && groups.length === 0 && (
                                <button 
                                    onClick={() => setShowAddModal(true)}
                                    className={clsx(
                                        "bg-gray-900/30 hover:bg-gray-900/60 transition rounded-2xl border border-dashed border-gray-800 flex flex-col items-center justify-center space-y-2 group transition-colors duration-300",
                                        viewMode === 'grid' ? "p-5 min-h-[160px]" : "p-4 min-h-[80px]"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center transition-colors text-gray-500 group-hover:bg-indigo-600 group-hover:text-white">
                                        <Plus size={16} />
                                    </div>
                                    {viewMode === 'grid' && <span className="text-sm text-gray-500 group-hover:text-gray-300">New Counter</span>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

             {counters.length > 0 && groups.length > 0 && (
                 <button 
                    onClick={() => setShowAddModal(true)}
                    className="mt-8 w-full py-4 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:bg-gray-900 hover:border-gray-500 transition flex items-center justify-center gap-2"
                 >
                     <Plus size={20} />
                     <span>Create New Counter</span>
                 </button>
             )}
          </div>
        )}

        {activeTab === 'todos' && (
            <TodoManager 
                lists={todoLists}
                onAddList={handleAddTodoList}
                onUpdateList={handleUpdateTodoList}
                onDeleteList={handleDeleteTodoList}
            />
        )}

        {activeTab === 'analytics' && (
          <div className="px-4 md:px-6 space-y-6 mt-4">
             <div className="p-6 rounded-2xl border transition-colors duration-300 bg-gray-900 border-gray-800">
                <CalendarStats logs={logs} counters={counters} />
             </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <Settings 
            user={user} 
            onClose={() => {}}
            settings={themeSettings}
            onSettingsChange={handleThemeChange}
          />
        )}
      </main>

      {isSelectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full px-6 py-3 shadow-2xl z-50 flex items-center gap-4 animate-in slide-in-from-bottom-6">
              <span className="text-sm font-bold text-white mr-2">{selectedIds.size} Selected</span>
              <div className="h-6 w-px bg-gray-700"></div>
              
              <button 
                 onClick={handleBulkDelete}
                 className="flex flex-col items-center gap-1 text-red-400 hover:text-red-300 transition group"
              >
                  <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-medium">Delete</span>
              </button>
          </div>
      )}

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {showGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
            <div className="bg-gray-900 w-full max-w-sm p-6 rounded-2xl border border-gray-800 shadow-2xl relative">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Folder className="text-indigo-400" size={24} />
                        Manage Groups
                    </h3>
                    <button onClick={() => setShowGroupModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                </div>

                <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-2">
                    {groups.length === 0 ? (
                        <p className="text-gray-500 text-sm text-center py-4">No groups created yet.</p>
                    ) : (
                        groups.map(group => (
                            <div key={group.id} className="flex items-center justify-between bg-gray-800/50 p-3 rounded-xl border border-gray-800">
                                <span className="font-medium text-gray-200">{group.name}</span>
                                <button 
                                    onClick={() => handleDeleteGroup(group.id)}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-2 border-t border-gray-800 pt-6">
                     <div className="relative flex-1">
                        <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="text"
                            placeholder="New Group Name"
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 text-sm"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddGroup()}
                        />
                     </div>
                     <button 
                        onClick={handleAddGroup}
                        disabled={!newGroupName.trim()}
                        className="px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                        <Plus size={20} />
                     </button>
                </div>
            </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
            <div className="bg-gray-900 w-full sm:w-96 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-bold text-white mb-6">Create Counter</h3>
                
                <div className="mb-6">
                    <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="e.g., Pushups, Coffees..." 
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none transition-colors"
                        value={newCounterTitle}
                        onChange={(e) => setNewCounterTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCounter()}
                    />
                </div>

                {groups.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Group</label>
                         <div className="relative">
                             <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                             <select
                                value={newCounterGroupId}
                                onChange={(e) => setNewCounterGroupId(e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none transition-colors"
                             >
                                 <option value="">Ungrouped</option>
                                 {groups.map(g => (
                                     <option key={g.id} value={g.id}>{g.name}</option>
                                 ))}
                             </select>
                         </div>
                    </div>
                )}

                <div className="mb-6">
                    <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-3">Color</label>
                    <div className="flex flex-wrap gap-3">
                        {COLORS.map(color => (
                            <button
                                key={color.hex}
                                onClick={() => setNewCounterColor(color.hex)}
                                className={clsx(
                                    "w-8 h-8 rounded-full transition-transform hover:scale-110 focus:outline-none flex items-center justify-center",
                                    newCounterColor === color.hex && "ring-2 ring-white ring-offset-2 ring-offset-gray-900"
                                )}
                                style={{ backgroundColor: color.hex }}
                                aria-label={color.name}
                            >
                                {newCounterColor === color.hex && <Check size={14} className="text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="mb-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between">
                         <label className="flex items-center gap-3 text-white font-medium cursor-pointer select-none w-full">
                            <input 
                                type="checkbox"
                                checked={resetDaily}
                                onChange={(e) => setResetDaily(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900" 
                            />
                            <div className="flex flex-col">
                                <span className="flex items-center gap-2 text-sm">
                                    <RotateCcw size={14} className="text-indigo-400" />
                                    Daily Reset
                                </span>
                                <span className="text-[10px] text-gray-500">Automatically set count to 0 at midnight</span>
                            </div>
                        </label>
                    </div>
                 </div>

                <div className="mb-6 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-white font-medium cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={hasTarget}
                                onChange={(e) => setHasTarget(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900" 
                            />
                            <span className="flex items-center gap-2 text-sm">
                                <Target size={14} className="text-indigo-400" />
                                Enable Target
                            </span>
                        </label>
                    </div>
                    
                    {hasTarget && (
                        <div className="mt-3 animate-in slide-in-from-top-2">
                             <input 
                                type="number" 
                                placeholder="Target value (e.g. 100)" 
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
                                value={targetValue}
                                onChange={(e) => setTargetValue(e.target.value)}
                            />
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setShowAddModal(false)}
                        className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleCreateCounter}
                        disabled={!newCounterTitle.trim()}
                        className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-lg border-t transition-colors duration-300 pb-[env(safe-area-inset-bottom)] bg-gray-950/90 border-gray-900">
          <div className="flex justify-around items-center h-16">
             <button onClick={() => setActiveTab('dashboard')} className={clsx("flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", activeTab === 'dashboard' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}>
                <LayoutDashboard size={24} strokeWidth={activeTab === 'dashboard' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Counters</span>
             </button>
             <button onClick={() => setActiveTab('todos')} className={clsx("flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", activeTab === 'todos' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}>
                <CheckSquare2 size={24} strokeWidth={activeTab === 'todos' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Tasks</span>
             </button>
             <button onClick={() => setActiveTab('analytics')} className={clsx("flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", activeTab === 'analytics' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}>
                <HistoryIcon size={24} strokeWidth={activeTab === 'analytics' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Stats</span>
             </button>
             <button onClick={() => setActiveTab('settings')} className={clsx("flex flex-col items-center justify-center w-full h-full gap-1 transition-colors", activeTab === 'settings' ? "text-indigo-400" : "text-gray-500 hover:text-gray-300")}>
                <SettingsIcon size={24} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                <span className="text-[10px] font-medium">Settings</span>
             </button>
          </div>
      </nav>

    </div>
  );
}
