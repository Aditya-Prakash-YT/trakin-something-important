import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
} from "firebase/auth";
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Settings as SettingsIcon,
  Plus,
  Sparkles,
  LogIn,
  Target,
  Check,
  LayoutGrid,
  List,
  ArrowUpDown,
  Calendar,
  Type,
  RotateCcw,
  Clock
} from 'lucide-react';
import { Counter, CounterLog, Tab } from './types';
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
  checkDailyResets
} from './services/firebaseService';
import { generateInsights } from './services/geminiService';
import { CounterView } from './components/CounterView';
import { Settings } from './components/Settings';
import { CalendarStats } from './components/CalendarStats';
import { AuthModal } from './components/AuthModal';
import clsx from 'clsx';

// Local storage fallback for demo purposes if no firebase
const USE_LOCAL_STORAGE = !isFirebaseReady();

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
}

const CounterCard: React.FC<CounterCardProps> = ({ counter, onClick, viewMode }) => {
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

  if (viewMode === 'list') {
      return (
        <button 
            onClick={onClick}
            className={clsx(
                "w-full bg-gray-900 hover:bg-gray-800 transition-all p-4 rounded-xl border flex items-center justify-between shadow-sm group",
                isTargetReached ? "border-green-500/30 bg-green-900/5" : "border-gray-800"
            )}
        >
            <div className="flex items-center gap-4">
                <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-gray-950 relative"
                    style={{ backgroundColor: isTargetReached ? '#4ade80' : counter.color }}
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
                    style={{ color: isTargetReached ? '#4ade80' : counter.color }}
                >
                    {counter.count}
                </span>
            </div>
        </button>
      )
  }

  return (
    <button 
      onClick={onClick}
      className={clsx(
          "bg-gray-900 hover:bg-gray-800 transition-all p-5 rounded-2xl border flex flex-col items-start space-y-3 shadow-lg relative overflow-hidden group min-h-[160px]",
          isTargetReached ? "border-green-500/30" : "border-gray-800"
      )}
    >
      <div 
        className={clsx(
            "absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-opacity duration-500",
            isTargetReached ? "opacity-30" : "opacity-20"
        )}
        style={{ backgroundColor: isTargetReached ? '#4ade80' : counter.color }}
      ></div>
      
      <div className="flex justify-between w-full items-start">
          <span className="text-gray-400 text-xs font-medium uppercase tracking-wider truncate w-full text-left pr-4">{counter.title}</span>
          {counter.resetDaily && (
              <div className="bg-blue-900/20 p-1.5 rounded-md border border-blue-500/20" title="Resets Daily">
                  <RotateCcw size={12} className="text-blue-400" />
              </div>
          )}
      </div>

      <span 
        className={clsx(
            "text-4xl font-bold transition-transform duration-200 origin-left",
            animClass
        )}
        style={{ color: isTargetReached ? '#4ade80' : counter.color }}
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
  const [logs, setLogs] = useState<CounterLog[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Create Counter State
  const [newCounterTitle, setNewCounterTitle] = useState("");
  const [newCounterColor, setNewCounterColor] = useState(COLORS[0].hex);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState("");
  const [resetDaily, setResetDaily] = useState(true);

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Sorting & View
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated');

  // Initialize
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
        // Load local counters
        const localData = localStorage.getItem('local_counters');
        if (localData) {
            // Simple local check for daily resets in demo mode (simplified)
            const c: Counter[] = JSON.parse(localData);
            const today = new Date().toISOString().split('T')[0];
            const updated = c.map(counter => {
                if (counter.resetDaily && counter.lastResetDate !== today) {
                    return { ...counter, count: 0, lastResetDate: today };
                }
                return counter;
            });
            setCounters(updated);
        }
    }
  }, []);

  // Sync counters
  useEffect(() => {
    if (user) {
      const unsub = subscribeToCounters(user.uid, (data) => {
        setCounters(data);
      });
      // Fetch initial logs for charts
      getHistoryLogs(user.uid).then(setLogs);
      return () => unsub();
    } else if (!isFirebaseConfigured) {
        // Sync to local storage
        localStorage.setItem('local_counters', JSON.stringify(counters));
    }
  }, [user, counters, isFirebaseConfigured]);

  // Derived state for sorting
  const sortedCounters = useMemo(() => {
    const c = [...counters];
    switch (sortMode) {
        case 'alpha':
            return c.sort((a, b) => a.title.localeCompare(b.title));
        case 'value':
            return c.sort((a, b) => b.count - a.count);
        case 'created':
            return c.sort((a, b) => b.createdAt - a.createdAt);
        case 'updated':
        default:
            return c.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }
  }, [counters, sortMode]);

  const handleCreateCounter = async () => {
    if (!newCounterTitle.trim()) return;
    
    const target = hasTarget && targetValue ? parseInt(targetValue) : undefined;

    if (user) {
      await addCounter(user.uid, newCounterTitle, newCounterColor, target, resetDaily);
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
        lastResetDate: resetDaily ? new Date().toISOString().split('T')[0] : undefined
      };
      setCounters(prev => [newCounter, ...prev]);
    }
    
    // Reset Form
    setNewCounterTitle("");
    setNewCounterColor(COLORS[0].hex);
    setHasTarget(false);
    setTargetValue("");
    setResetDaily(true);
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

  const handleGetInsights = async () => {
    setLoadingAi(true);
    const insight = await generateInsights(counters, logs);
    setAiInsight(insight);
    setLoadingAi(false);
  };

  // Render Active Counter Mode
  if (activeCounterId) {
    const counter = counters.find(c => c.id === activeCounterId);
    if (counter) {
      return (
        <CounterView 
          counter={counter} 
          onBack={() => setActiveCounterId(null)}
          onUpdate={handleUpdateCounter}
          onRename={handleRenameCounter}
          onUpdateTarget={handleUpdateTarget}
          onDelete={handleDeleteCounter}
        />
      );
    }
  }

  // Render Main Layout
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col font-sans">
      
      {/* Top Bar */}
      <header className="px-6 py-5 flex justify-between items-center bg-gray-950 border-b border-gray-900 sticky top-0 z-10">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-violet-400">
          TallyMaster
        </h1>
        {!user && isFirebaseConfigured && (
            <button 
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 text-xs bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-full hover:bg-indigo-600/30 transition"
            >
                <LogIn size={14} /> Sign In
            </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-24 no-scrollbar">
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="p-6 space-y-4">
             {!isFirebaseConfigured && (
                <div className="bg-yellow-900/20 border border-yellow-700/50 p-4 rounded-xl text-yellow-500 text-sm mb-4">
                    <strong>Demo Mode:</strong> Data is saved locally. Configure Firebase in Settings for cloud sync.
                </div>
            )}
            
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-2 bg-gray-900 p-1 rounded-lg">
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

                <div className="flex gap-1 text-xs overflow-x-auto no-scrollbar pb-1">
                     <button 
                        onClick={() => setSortMode('updated')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", sortMode === 'updated' ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900")}
                     >
                        <Calendar size={14} />
                        <span className="hidden sm:inline">Recent</span>
                     </button>
                     <button 
                        onClick={() => setSortMode('created')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", sortMode === 'created' ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900")}
                     >
                        <Clock size={14} />
                        <span className="hidden sm:inline">Newest</span>
                     </button>
                     <button 
                        onClick={() => setSortMode('alpha')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", sortMode === 'alpha' ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900")}
                     >
                        <Type size={14} />
                        <span className="hidden sm:inline">Name</span>
                     </button>
                     <button 
                        onClick={() => setSortMode('value')}
                        className={clsx("px-3 py-2 rounded-lg border transition-colors flex items-center gap-2 shrink-0", sortMode === 'value' ? "bg-indigo-900/20 border-indigo-500/30 text-indigo-400" : "bg-transparent border-transparent text-gray-500 hover:bg-gray-900")}
                     >
                        <ArrowUpDown size={14} />
                        <span className="hidden sm:inline">Count</span>
                     </button>
                </div>
            </div>

            <div className={clsx(
                "grid gap-4",
                viewMode === 'grid' ? "grid-cols-2" : "grid-cols-1"
            )}>
              {sortedCounters.map(counter => (
                <CounterCard 
                  key={counter.id} 
                  counter={counter} 
                  viewMode={viewMode}
                  onClick={() => setActiveCounterId(counter.id)} 
                />
              ))}

              <button 
                onClick={() => setShowAddModal(true)}
                className={clsx(
                    "bg-gray-900/50 hover:bg-gray-900 transition rounded-2xl border border-dashed border-gray-800 flex flex-col items-center justify-center space-y-2 group",
                    viewMode === 'grid' ? "p-5 min-h-[160px]" : "p-4 min-h-[80px]"
                )}
              >
                <div className="w-8 h-8 rounded-full bg-gray-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors text-gray-500">
                    <Plus size={16} />
                </div>
                {viewMode === 'grid' && <span className="text-sm text-gray-500 group-hover:text-gray-300">New Counter</span>}
              </button>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6">
             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <CalendarStats logs={logs} counters={counters} />
             </div>

             <div className="bg-gradient-to-br from-indigo-900/20 to-violet-900/20 p-6 rounded-2xl border border-indigo-500/20">
                <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Sparkles size={18} className="text-yellow-400" />
                        AI Insights
                    </h3>
                    {!aiInsight && (
                        <button 
                            onClick={handleGetInsights}
                            disabled={loadingAi}
                            className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {loadingAi ? 'Analyzing...' : 'Generate'}
                        </button>
                    )}
                </div>
                {aiInsight ? (
                     <p className="text-gray-300 text-sm leading-relaxed animate-fade-in">
                        {aiInsight}
                     </p>
                ) : (
                    <p className="text-gray-500 text-sm italic">
                        Unlock patterns in your counting habits powered by Gemini AI.
                    </p>
                )}
             </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <Settings 
            user={user} 
            onClose={() => {}}
          />
        )}
      </main>

      {/* Navigation Tab Bar */}
      <nav className="fixed bottom-0 w-full bg-gray-950/90 backdrop-blur-lg border-t border-gray-900 flex justify-around py-4 pb-8 z-30">
        <button 
            onClick={() => setActiveTab('dashboard')}
            className={clsx("flex flex-col items-center gap-1 transition-colors", activeTab === 'dashboard' ? "text-indigo-400" : "text-gray-600")}
        >
            <LayoutDashboard size={24} />
            <span className="text-[10px] font-medium">Counters</span>
        </button>
        <button 
            onClick={() => setActiveTab('analytics')}
            className={clsx("flex flex-col items-center gap-1 transition-colors", activeTab === 'analytics' ? "text-indigo-400" : "text-gray-600")}
        >
            <HistoryIcon size={24} />
            <span className="text-[10px] font-medium">History</span>
        </button>
        <button 
            onClick={() => setActiveTab('settings')}
            className={clsx("flex flex-col items-center gap-1 transition-colors", activeTab === 'settings' ? "text-indigo-400" : "text-gray-600")}
        >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}

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
                        className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 transition-colors"
                        value={newCounterTitle}
                        onChange={(e) => setNewCounterTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleCreateCounter()}
                    />
                </div>

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
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500" 
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

                {/* Target Toggle */}
                <div className="mb-6 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <label className="flex items-center gap-2 text-white font-medium cursor-pointer select-none">
                            <input 
                                type="checkbox"
                                checked={hasTarget}
                                onChange={(e) => setHasTarget(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-indigo-600 focus:ring-indigo-500" 
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
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-indigo-500"
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

    </div>
  );
}