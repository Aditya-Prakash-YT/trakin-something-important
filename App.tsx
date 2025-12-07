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
  CheckCircle2
} from 'lucide-react';
import { Counter, CounterLog, Tab, AppTheme, CounterGroup } from './types';
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
  updateCounterGroup
} from './services/firebaseService';
import { CounterView } from './components/CounterView';
import { Settings } from './components/Settings';
import { CalendarStats } from './components/CalendarStats';
import { AuthModal } from './components/AuthModal';
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
  isMonochrome: boolean;
  selectionMode: boolean;
  isSelected: boolean;
  onToggleSelection: () => void;
}

const CounterCard: React.FC<CounterCardProps> = ({ 
    counter, 
    onClick, 
    viewMode, 
    isMonochrome, 
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
  
  // Theme Overrides
  const displayColor = isMonochrome ? '#ffffff' : counter.color;
  const targetColor = isMonochrome ? '#ffffff' : '#4ade80';

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
                "w-full bg-gray-900 transition-all p-4 rounded-xl border flex items-center justify-between shadow-sm group relative",
                isTargetReached 
                    ? (isMonochrome ? "border-white bg-white/10" : "border-green-500/30 bg-green-900/5") 
                    : (isSelected && selectionMode ? "border-indigo-500 bg-indigo-900/20" : "border-gray-800 hover:bg-gray-800")
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
                             <RotateCcw size={8} className={isMonochrome ? "text-white" : "text-blue-400"} />
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
                        isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : "text-gray-600"
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
          "bg-gray-900 transition-all p-5 rounded-2xl border flex flex-col items-start space-y-3 shadow-lg relative overflow-hidden group min-h-[160px]",
          isTargetReached 
             ? (isMonochrome ? "border-white" : "border-green-500/30") 
             : (isSelected && selectionMode ? "border-indigo-500 ring-1 ring-indigo-500/50" : "border-gray-800 hover:bg-gray-800")
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
            isTargetReached ? "opacity-30" : "opacity-20"
        )}
        style={{ backgroundColor: isTargetReached ? targetColor : displayColor }}
      ></div>
      
      <div className="flex justify-between w-full items-start">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider truncate w-full text-left pr-4">{counter.title}</span>
          {counter.resetDaily && (
              <div className={clsx(
                  "p-1.5 rounded-md border",
                  isMonochrome ? "bg-white/20 border-white/20" : "bg-blue-900/20 border-blue-500/20"
              )} title="Resets Daily">
                  <RotateCcw size={12} className={isMonochrome ? "text-white" : "text-blue-400"} />
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
                  isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : "text-gray-500"
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
  const [logs, setLogs] = useState<CounterLog[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Selection Mode State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Theme State
  const [theme, setTheme] = useState<AppTheme>(() => {
    return (localStorage.getItem('app_theme') as AppTheme) || 'default';
  });
  const isMonochrome = theme === 'pitch-black';
  
  // Create Counter State
  const [newCounterTitle, setNewCounterTitle] = useState("");
  const [newCounterColor, setNewCounterColor] = useState(COLORS[0].hex);
  const [newCounterGroupId, setNewCounterGroupId] = useState("");
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [resetDaily, setResetDaily] = useState(true);

  // Sorting & View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated');

  // Initialize Theme
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'pitch-black') {
        root.style.setProperty('--c-gray-950', '0 0 0');
        root.style.setProperty('--c-gray-900', '0 0 0');
        root.style.setProperty('--c-gray-850', '20 20 20');
    } else if (theme === 'dark') {
        root.style.setProperty('--c-gray-950', '24 24 27'); // Zinc 900
        root.style.setProperty('--c-gray-900', '39 39 42'); // Zinc 800
        root.style.setProperty('--c-gray-850', '63 63 70'); // Zinc 700
    } else {
        // Default
        root.style.setProperty('--c-gray-950', '3 7 18');
        root.style.setProperty('--c-gray-900', '17 24 39');
        root.style.setProperty('--c-gray-850', '31 41 55');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

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
        // Load local counters (legacy support)
        const localData = localStorage.getItem('local_counters');
        if (localData) {
            const c: Counter[] = JSON.parse(localData);
            setCounters(c);
        }
    }
  }, []);

  // Sync counters and groups
  useEffect(() => {
    if (user) {
      const unsubCounters = subscribeToCounters(user.uid, (data, syncing) => {
        setCounters(data);
        setIsSyncing(syncing);
      });
      const unsubGroups = subscribeToGroups(user.uid, (data) => {
        setGroups(data);
      });
      
      getHistoryLogs(user.uid).then(setLogs);
      
      return () => {
        unsubCounters();
        unsubGroups();
      };
    } else if (!isFirebaseConfigured) {
        // Sync to local storage
        localStorage.setItem('local_counters', JSON.stringify(counters));
    }
  }, [user, counters.length, isFirebaseConfigured]); // Depend on counters.length for local storage sync only

  // Group Management Handlers
  const handleAddGroup = async (name: string) => {
    if (user) {
      await addGroup(user.uid, name);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (user) {
      await deleteGroup(user.uid, groupId);
    }
  };

  const handleUpdateCounterGroup = async (id: string, groupId: string | null) => {
      if (user) {
          await updateCounterGroup(user.uid, id, groupId);
      } else {
          setCounters(prev => prev.map(c => c.id === id ? { ...c, groupId: groupId || undefined } : c));
      }
  };


  // Derived state for sorting and grouping
  const groupedCounters = useMemo(() => {
    // 1. Sort counters first
    const c = [...counters];
    let sorted = c;
    switch (sortMode) {
        case 'alpha':
            sorted = c.sort((a, b) => a.title.localeCompare(b.title));
            break;
        case 'value':
            sorted = c.sort((a, b) => b.count - a.count);
            break;
        case 'created':
            sorted = c.sort((a, b) => b.createdAt - a.createdAt);
            break;
        case 'updated':
        default:
            sorted = c.sort((a, b) => b.lastUpdated - a.lastUpdated);
            break;
    }

    // 2. Group them
    const sections: { id: string, name: string, counters: Counter[] }[] = [];
    
    // Ungrouped
    const ungrouped = sorted.filter(c => !c.groupId || !groups.find(g => g.id === c.groupId));
    if (ungrouped.length > 0) {
        sections.push({ id: 'ungrouped', name: 'Ungrouped', counters: ungrouped });
    }

    // Grouped Sections
    groups.forEach(g => {
        const groupCounters = sorted.filter(c => c.groupId === g.id);
        if (groupCounters.length > 0) {
            sections.push({ id: g.id, name: g.name, counters: groupCounters });
        }
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
      const newCounter: Counter = {
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
      };
      setCounters(prev => [newCounter, ...prev]);
    }
    
    // Reset Form
    setNewCounterTitle("");
    setNewCounterColor(COLORS[0].hex);
    setHasTarget(false);
    setTargetValue("");
    setResetDaily(true);
    setNewCounterGroupId("");
    setShowAddModal(false);
  };

  const handleUpdateCounter = async (id: string, delta: number) => {
    if (user) {
      const counter = counters.find(c => c.id === id);
      if(counter) {
          await updateCounterValue(user.uid, id, delta, counter.count + delta);
      }
    } else {
      setCounters(prev => prev.map(c => {
        if (c.id === id) {
            const next = c.count + delta;
            // Also log locally for chart?
            const log: CounterLog = {
                id: Date.now().toString(),
                counterId: id,
                timestamp: Date.now(),
                valueChange: delta,
                newValue: next
            }
            setLogs(prevLogs => [...prevLogs, log]);
            return { ...c, count: next, lastUpdated: Date.now() };
        }
        return c;
      }));
    }
  };

  const handleRenameCounter = async (id: string, newTitle: string) => {
      if (user) {
          await updateCounterTitle(user.uid, id, newTitle);
      } else {
          setCounters(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
      }
  };

  const handleUpdateTarget = async (id: string, newTarget: number | null) => {
      if (user) {
          await updateCounterTarget(user.uid, id, newTarget);
      } else {
          setCounters(prev => prev.map(c => {
             if (c.id === id) {
                 const updated = { ...c };
                 if (newTarget === null) delete updated.target;
                 else updated.target = newTarget;
                 return updated;
             }
             return c;
          }));
      }
  };

  const handleDeleteCounter = async (id: string) => {
      try {
        if (user) {
            await deleteCounter(user.uid, id);
        } else {
            setCounters(prev => prev.filter(c => c.id !== id));
        }
        setActiveCounterId(null);
      } catch (error) {
        console.error("Failed to delete counter", error);
        alert("Failed to delete counter. Please try again.");
      }
  };

  // Selection Logic
  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedIds.size === counters.length) {
          setSelectedIds(new Set());
      } else {
          setSelectedIds(new Set(counters.map(c => c.id)));
      }
  };

  const handleExitSelectionMode = () => {
      setIsSelectionMode(false);
      setSelectedIds(new Set());
  }

  // Bulk Operations
  const handleBulkDelete = async () => {
      if (!user || selectedIds.size === 0) return;
      
      if (confirm(`Are you sure you want to delete ${selectedIds.size} counters? This cannot be undone.`)) {
          await bulkDeleteCounters(user.uid, Array.from(selectedIds));
          handleExitSelectionMode();
      }
  };


  // Render Active Counter Mode
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
              isMonochrome={isMonochrome}
            />
        </div>
      );
    }
  }

  // Render Main Layout
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans transition-colors duration-300">
      
      {/* Top Bar - Added pt-[env(safe-area-inset-top)] for mobile notch support */}
      <header className="px-6 py-5 pt-[calc(1.25rem+env(safe-area-inset-top))] flex justify-between items-center bg-gray-950 border-b border-gray-900 sticky top-0 z-10 transition-colors duration-300">
        <h1 className={clsx("text-xl font-bold", isMonochrome ? "text-white" : "bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400")}>
          TallyMaster
        </h1>
        
        <div className="flex items-center gap-3">
            {/* Sync Status Indicator */}
            <div className="flex items-center justify-center">
                {user ? (
                    isSyncing ? (
                        <div title="Syncing..." className={clsx("transition-colors duration-300", isMonochrome ? "text-white" : "text-yellow-500")}>
                            <RefreshCw size={18} className="animate-spin" />
                        </div>
                    ) : (
                        <div title="Synced" className={clsx("transition-colors duration-300 relative", isMonochrome ? "text-white" : "text-green-500")}>
                            <Cloud size={18} fill="currentColor" className="opacity-20" />
                            <Check size={10} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold" strokeWidth={4} />
                        </div>
                    )
                ) : (
                    <div title="Local Storage (Offline)" className={clsx("transition-colors duration-300", isMonochrome ? "text-gray-500" : "text-red-500/80")}>
                        <CloudOff size={18} />
                    </div>
                )}
            </div>

            {!user && isFirebaseConfigured && (
                <button 
                    onClick={() => setShowAuthModal(true)}
                    className={clsx(
                        "flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition",
                        isMonochrome ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30"
                    )}
                >
                    <LogIn size={14} /> Sign In
                </button>
            )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="p-6">
             {!isFirebaseConfigured && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl text-yellow-500 text-sm mb-4">
                    <strong>Demo Mode:</strong> Data is saved locally. Configure Firebase in Settings for cloud sync.
                </div>
            )}
            
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sticky top-0 bg-gray-950 z-10 py-2">
                <div className="flex gap-2 bg-gray-900 p-1 rounded-lg transition-colors duration-300">
                    <button 
                        onClick={() => setViewMode('grid')}
                        className={clsx("p-2 rounded-md transition-colors", viewMode === 'grid' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}
                    >
                        <LayoutGrid size={16} />
                    </button>
                    <button 
                         onClick={() => setViewMode('list')}
                         className={clsx("p-2 rounded-md transition-colors", viewMode === 'list' ? "bg-gray-800 text-white" : "text-gray-500 hover:text-gray-300")}
                    >
                        <List size={16} />
                    </button>
                </div>

                <div className="flex gap-2 w-full sm:w-auto overflow-x-auto no-scrollbar items-center">
                    {/* Select Toggle */}
                     {counters.length > 0 && (
                        <button 
                            onClick={() => {
                                setIsSelectionMode(!isSelectionMode);
                                if (isSelectionMode) setSelectedIds(new Set());
                            }}
                            className={clsx(
                                "px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0 text-xs font-medium",
                                isSelectionMode 
                                    ? (isMonochrome ? "bg-white text-black border-white" : "bg-indigo-600 border-indigo-500 text-white")
                                    : "bg-transparent border-gray-800 text-gray-400 hover:text-white hover:border-gray-600"
                            )}
                        >
                            {isSelectionMode ? <X size={14} /> : <CheckSquare size={14} />}
                            {isSelectionMode ? 'Cancel' : 'Select'}
                        </button>
                     )}
                     
                     <div className="h-4 w-px bg-gray-800 mx-1 hidden sm:block"></div>

                     {/* Regular Tools */}
                     {!isSelectionMode && (
                         <>
                            {/* Sorting Options */}
                            <button 
                                onClick={() => setSortMode('updated')}
                                className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                                    sortMode === 'updated' 
                                        ? (isMonochrome ? "bg-white/10 border-white text-white" : "bg-indigo-900/20 border-indigo-500/30 text-indigo-400") 
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900"
                                )}
                            >
                                <Calendar size={14} />
                                <span className="hidden sm:inline text-xs font-medium">Recent</span>
                            </button>
                            <button 
                                onClick={() => setSortMode('value')}
                                className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", 
                                    sortMode === 'value' 
                                        ? (isMonochrome ? "bg-white/10 border-white text-white" : "bg-indigo-900/20 border-indigo-500/30 text-indigo-400") 
                                        : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900"
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
                            className="px-3 py-2 rounded-lg border bg-transparent border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 text-xs font-medium"
                         >
                            {selectedIds.size === counters.length ? "Deselect All" : "Select All"}
                         </button>
                     )}
                </div>
            </div>

            {/* Empty State */}
            {counters.length === 0 && (
                <div className="text-center py-20 flex flex-col items-center">
                    <div className={clsx("w-20 h-20 rounded-full flex items-center justify-center mb-6", isMonochrome ? "bg-white/10 text-white" : "bg-indigo-900/20 text-indigo-400")}>
                        <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No counters yet</h3>
                    <p className="text-gray-500 mb-8 max-w-xs">Start tracking habits, scores, or inventory by creating your first counter.</p>
                    <button 
                        onClick={() => setShowAddModal(true)}
                        className={clsx(
                            "px-6 py-3 rounded-xl font-bold shadow-lg transition transform hover:scale-105",
                            isMonochrome ? "bg-white text-black" : "bg-indigo-600 text-white shadow-indigo-900/20"
                        )}
                    >
                        Create Counter
                    </button>
                </div>
            )}

            {/* Grouped Counters */}
            <div className="space-y-10">
                {groupedCounters.map(section => (
                    <div key={section.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Section Header (Only show if we have groups or if it's not the only 'Ungrouped' section) */}
                        {(groups.length > 0 || section.id !== 'ungrouped') && (
                            <div className="flex items-center gap-4 mb-4">
                                <h3 className={clsx("text-sm font-bold uppercase tracking-wider", isMonochrome ? "text-white" : "text-gray-400")}>
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
                                    isMonochrome={isMonochrome}
                                    selectionMode={isSelectionMode}
                                    isSelected={selectedIds.has(counter.id)}
                                    onToggleSelection={() => toggleSelection(counter.id)}
                                />
                            ))}
                            
                            {/* Add Button Logic - If simple view (no groups yet), show large add button at end of list. 
                                If grouped, maybe show small add button per group? 
                                Let's stick to global add button at the bottom of Ungrouped or as a FAB?
                                Actually, let's allow adding specifically to a group? Too complex for now.
                                Just render the big Add card only in the 'Ungrouped' section if it exists, or at the very end.
                            */}
                            {section.id === 'ungrouped' && groups.length === 0 && (
                                <button 
                                    onClick={() => setShowAddModal(true)}
                                    className={clsx(
                                        "bg-gray-900/50 hover:bg-gray-900 transition rounded-2xl border border-dashed border-gray-800 flex flex-col items-center justify-center space-y-2 group transition-colors duration-300",
                                        viewMode === 'grid' ? "p-5 min-h-[160px]" : "p-4 min-h-[80px]"
                                    )}
                                >
                                    <div className={clsx(
                                        "w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center transition-colors text-gray-500",
                                        isMonochrome ? "group-hover:bg-white group-hover:text-black" : "group-hover:bg-indigo-600 group-hover:text-white"
                                    )}>
                                        <Plus size={16} />
                                    </div>
                                    {viewMode === 'grid' && <span className="text-sm text-gray-500 group-hover:text-gray-300">New Counter</span>}
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

             {/* Global Add Button for Grouped Layouts */}
             {counters.length > 0 && groups.length > 0 && (
                 <button 
                    onClick={() => setShowAddModal(true)}
                    className={clsx(
                        "mt-8 w-full py-4 rounded-xl border border-dashed border-gray-700 text-gray-400 hover:text-white hover:bg-gray-900 hover:border-gray-500 transition flex items-center justify-center gap-2"
                    )}
                 >
                     <Plus size={20} />
                     <span>Create New Counter</span>
                 </button>
             )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6">
             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 transition-colors duration-300">
                <CalendarStats logs={logs} counters={counters} isMonochrome={isMonochrome} />
             </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Settings 
            user={user} 
            onClose={() => {}}
            currentTheme={theme}
            onThemeChange={setTheme}
            isMonochrome={isMonochrome}
          />
        )}
      </main>

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md border border-gray-700 rounded-full px-6 py-3 shadow-2xl z-40 flex items-center gap-4 animate-in slide-in-from-bottom-6">
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

      {/* Navigation Tab Bar - Added pb-[env(safe-area-inset-bottom)] for mobile home bar support */}
      <nav className="fixed bottom-0 w-full bg-gray-950/90 backdrop-blur-lg border-t border-gray-900 flex justify-between items-center px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-30 transition-colors duration-300">
        <button 
            onClick={() => setActiveTab('dashboard')}
            className={clsx("flex flex-col items-center gap-1 transition-colors flex-1", activeTab === 'dashboard' ? (isMonochrome ? "text-white" : "text-indigo-400") : "text-gray-600")}
        >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium">Counters</span>
        </button>
        <button 
            onClick={() => setActiveTab('analytics')}
            className={clsx("flex flex-col items-center gap-1 transition-colors flex-1", activeTab === 'analytics' ? (isMonochrome ? "text-white" : "text-indigo-400") : "text-gray-600")}
        >
            <HistoryIcon size={24} />
            <span className="text-[10px] font-medium">History</span>
        </button>
        <button 
            onClick={() => setActiveTab('settings')}
            className={clsx("flex flex-col items-center gap-1 transition-colors flex-1", activeTab === 'settings' ? (isMonochrome ? "text-white" : "text-indigo-400") : "text-gray-600")}
        >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {/* Group Manager Modal */}

      {/* Add Counter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
            <div className="bg-gray-900 w-full sm:w-96 p-6 rounded-2xl border border-gray-800 shadow-2xl overflow-y-auto max-h-[90vh]">
                <h3 className="text-xl font-bold text-white mb-6">Create Counter</h3>
                
                {/* Name Input */}
                <div className="mb-6">
                    <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Name</label>
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="e.g., Pushups, Coffees..." 
                        className={clsx(
                            "w-full bg-gray-950 border rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none transition-colors",
                            isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-800 focus:border-indigo-500"
                        )}
                        value={newCounterTitle}
                        onChange={(e) => setNewCounterTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCounter()}
                    />
                </div>

                {/* Group Selector */}
                {groups.length > 0 && (
                    <div className="mb-6">
                        <label className="block text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">Group</label>
                         <div className="relative">
                             <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                             <select
                                value={newCounterGroupId}
                                onChange={(e) => setNewCounterGroupId(e.target.value)}
                                className={clsx(
                                    "w-full bg-gray-950 border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none appearance-none transition-colors",
                                    isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                                )}
                             >
                                 <option value="">Ungrouped</option>
                                 {groups.map(g => (
                                     <option key={g.id} value={g.id}>{g.name}</option>
                                 ))}
                             </select>
                         </div>
                    </div>
                )}

                {/* Color Picker */}
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

                {/* Daily Reset Toggle */}
                 <div className="mb-4 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between">
                         <label className="flex items-center gap-3 text-white font-medium cursor-pointer select-none w-full">
                            <input 
                                type="checkbox"
                                checked={resetDaily}
                                onChange={(e) => setResetDaily(e.target.checked)}
                                className={clsx(
                                    "w-4 h-4 rounded border-gray-700 bg-gray-800 focus:ring-offset-gray-900",
                                    isMonochrome ? "text-white focus:ring-white" : "text-indigo-600 focus:ring-indigo-500"
                                )} 
                            />
                            <div className="flex flex-col">
                                <span className={clsx("flex items-center gap-2 text-sm")}>
                                    <RotateCcw size={14} className={isMonochrome ? "text-white" : "text-indigo-400"} />
                                    Daily Reset
                                </span>
                                <span className="text-[10px] text-gray-500">Automatically set count to 0 at midnight</span>
                            </div>
                        </label>
                    </div>
                 </div>

                {/* Target Toggle */}
                <div className="mb-6 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-white font-medium cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={hasTarget}
                                onChange={(e) => setHasTarget(e.target.checked)}
                                className={clsx(
                                    "w-4 h-4 rounded border-gray-700 bg-gray-800 focus:ring-offset-gray-900",
                                    isMonochrome ? "text-white focus:ring-white" : "text-indigo-600 focus:ring-indigo-500"
                                )} 
                            />
                            <span className="flex items-center gap-2 text-sm">
                                <Target size={14} className={isMonochrome ? "text-white" : "text-indigo-400"} />
                                Enable Target
                            </span>
                        </label>
                    </div>
                    
                    {hasTarget && (
                        <div className="mt-3 animate-in slide-in-from-top-2">
                             <input 
                                type="number" 
                                placeholder="Target value (e.g. 100)" 
                                className={clsx(
                                    "w-full bg-gray-900 border rounded-lg p-2 text-white text-sm placeholder-gray-600 focus:outline-none",
                                    isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                                )}
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
                        className={clsx(
                            "flex-1 py-3 text-white font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                            isMonochrome ? "bg-white text-black hover:bg-gray-200" : "bg-indigo-600 hover:bg-indigo-500"
                        )}
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
      )}

    </div>
  );
}