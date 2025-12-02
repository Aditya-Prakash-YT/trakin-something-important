import React, { useState, useEffect } from 'react';
import { 
  User, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  LayoutDashboard, 
  History as HistoryIcon, 
  Settings as SettingsIcon,
  Plus,
  Sparkles,
  LogIn,
  Target,
  Check
} from 'lucide-react';
import { Counter, CounterLog, Tab } from './types';
import { 
  initFirebase, 
  subscribeToAuth, 
  subscribeToCounters, 
  addCounter, 
  updateCounterValue, 
  signInWithGoogle,
  deleteCounter,
  getHistoryLogs,
  isFirebaseReady
} from './services/firebaseService';
import { generateInsights } from './services/geminiService';
import { CounterView } from './components/CounterView';
import { Settings } from './components/Settings';
import { HistoryChart } from './components/HistoryChart';
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [counters, setCounters] = useState<Counter[]>([]);
  const [logs, setLogs] = useState<CounterLog[]>([]);
  const [activeCounterId, setActiveCounterId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Create Counter State
  const [newCounterTitle, setNewCounterTitle] = useState("");
  const [newCounterColor, setNewCounterColor] = useState(COLORS[0].hex);
  const [hasTarget, setHasTarget] = useState(false);
  const [targetValue, setTargetValue] = useState("");

  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Initialize
  useEffect(() => {
    const configured = initFirebase();
    setIsFirebaseConfigured(configured);
    
    if (configured) {
      const unsubAuth = subscribeToAuth((u) => {
        setUser(u);
      });
      return () => unsubAuth();
    } else {
        // Load local counters
        const localData = localStorage.getItem('local_counters');
        if (localData) setCounters(JSON.parse(localData));
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


  const handleCreateCounter = async () => {
    if (!newCounterTitle.trim()) return;
    
    const target = hasTarget && targetValue ? parseInt(targetValue) : undefined;

    if (user) {
      await addCounter(user.uid, newCounterTitle, newCounterColor, target);
    } else {
      const newCounter: Counter = {
        id: Date.now().toString(),
        title: newCounterTitle,
        count: 0,
        color: newCounterColor,
        target,
        createdAt: Date.now(),
        lastUpdated: Date.now()
      };
      setCounters(prev => [newCounter, ...prev]);
    }
    
    // Reset Form
    setNewCounterTitle("");
    setNewCounterColor(COLORS[0].hex);
    setHasTarget(false);
    setTargetValue("");
    setShowAddModal(false);
  };

  const handleUpdateCounter = async (id: string, delta: number) => {
    if (user) {
      // Find current count to update accurately locally or wait for stream?
      // Optimistic update handled in View, Firestore handles source of truth
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

  const handleDeleteCounter = async (id: string) => {
      if (user) {
          await deleteCounter(user.uid, id);
      } else {
          setCounters(prev => prev.filter(c => c.id !== id));
      }
      setActiveCounterId(null);
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
                onClick={signInWithGoogle}
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
            
            <div className="grid grid-cols-2 gap-4">
              {counters.map(counter => (
                <button 
                  key={counter.id}
                  onClick={() => setActiveCounterId(counter.id)}
                  className="bg-gray-900 hover:bg-gray-800 transition p-5 rounded-2xl border border-gray-800 flex flex-col items-start space-y-3 shadow-lg relative overflow-hidden group"
                >
                  <div 
                    className="absolute top-0 right-0 w-20 h-20 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none opacity-20"
                    style={{ backgroundColor: counter.color }}
                  ></div>
                  <span className="text-gray-400 text-xs font-medium uppercase tracking-wider truncate w-full text-left">{counter.title}</span>
                  <span 
                    className="text-4xl font-bold group-hover:scale-110 transition-transform origin-left"
                    style={{ color: counter.color }}
                  >
                    {counter.count}
                  </span>
                  <div className="flex justify-between items-end w-full">
                      <div className="text-gray-600 text-[10px]">
                          {new Date(counter.lastUpdated).toLocaleDateString()}
                      </div>
                      {counter.target && (
                          <div className="text-[10px] font-semibold text-gray-500 flex items-center gap-1">
                              <Target size={10} />
                              {Math.round((counter.count / counter.target) * 100)}%
                          </div>
                      )}
                  </div>
                </button>
              ))}

              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gray-900/50 hover:bg-gray-900 transition p-5 rounded-2xl border border-dashed border-gray-800 flex flex-col items-center justify-center space-y-2 min-h-[140px] group"
              >
                <div className="w-12 h-12 rounded-full bg-gray-800 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition-colors text-gray-500">
                    <Plus size={24} />
                </div>
                <span className="text-sm text-gray-500 group-hover:text-gray-300">New Counter</span>
              </button>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="p-6 space-y-6">
             <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800">
                <h3 className="text-lg font-semibold text-white mb-4">Activity Log (30 Days)</h3>
                <HistoryChart logs={logs} />
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

      {/* Add Counter Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4 sm:p-0">
            <div className="bg-gray-900 w-full sm:w-96 p-6 rounded-2xl border border-gray-800 shadow-2xl">
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
                            <span className="flex items-center gap-2">
                                <Target size={16} className="text-indigo-400" />
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