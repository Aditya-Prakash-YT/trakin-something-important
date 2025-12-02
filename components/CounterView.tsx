import React, { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, Settings2, Trash2, Edit3, X, Target, Save, AlertTriangle } from 'lucide-react';
import { Counter } from '../types';
import { playClick, playSuccess } from '../services/sound';
import clsx from 'clsx';

interface CounterViewProps {
  counter: Counter;
  onBack: () => void;
  onUpdate: (id: string, delta: number) => void;
  onRename: (id: string, newTitle: string) => void;
  onUpdateTarget: (id: string, target: number | null) => void;
  onDelete: (id: string) => void;
  isMonochrome?: boolean;
}

export const CounterView: React.FC<CounterViewProps> = ({ counter, onBack, onUpdate, onRename, onUpdateTarget, onDelete, isMonochrome = false }) => {
  const [localCount, setLocalCount] = useState(counter.count);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  
  // Edit State
  const [editTitle, setEditTitle] = useState(counter.title);
  const [editTarget, setEditTarget] = useState<string>(counter.target?.toString() || "");
  const [isTargetEnabled, setIsTargetEnabled] = useState(!!counter.target);

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const DELETE_CONFIRM_TEXT = "yes delete this counter";

  // Determine display colors based on theme
  const displayColor = isMonochrome ? '#ffffff' : counter.color;
  const targetReachedColor = isMonochrome ? '#ffffff' : '#4ade80';
  
  useEffect(() => {
    setLocalCount(counter.count);
  }, [counter.count]);

  useEffect(() => {
    if (showMenu) {
        setEditTitle(counter.title);
        setEditTarget(counter.target?.toString() || "");
        setIsTargetEnabled(!!counter.target);
    }
  }, [counter, showMenu]);

  const isTargetReached = counter.target !== undefined && localCount >= counter.target;

  // Check goal reached
  useEffect(() => {
    if (counter.target && localCount === counter.target && isAnimating === 'up') {
        playSuccess();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [localCount, counter.target, isAnimating]);

  const handleUpdate = (delta: number) => {
    playClick(delta > 0 ? 1.2 : 0.8);
    if (navigator.vibrate) navigator.vibrate(10);
    
    setLocalCount(prev => prev + delta);
    setIsAnimating(delta > 0 ? 'up' : 'down');
    setTimeout(() => setIsAnimating(null), 200);
    
    onUpdate(counter.id, delta);
  };

  const handleSaveChanges = () => {
    let hasChanges = false;

    // Save Title
    if (editTitle.trim() && editTitle !== counter.title) {
        onRename(counter.id, editTitle);
        hasChanges = true;
    }
    
    // Save Target
    const numTarget = parseInt(editTarget);
    const oldTarget = counter.target;
    
    if (!isTargetEnabled && oldTarget !== undefined) {
        // Target was removed
        onUpdateTarget(counter.id, null);
        hasChanges = true;
    } else if (isTargetEnabled && !isNaN(numTarget)) {
        if (numTarget !== oldTarget) {
            onUpdateTarget(counter.id, numTarget);
            hasChanges = true;
        }
    }

    if (hasChanges) {
        // Ideally give feedback, but closing menu is fine
    }
    setShowMenu(false);
  };

  const calculateProgress = () => {
    if (!counter.target) return 0;
    const progress = (localCount / counter.target) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden transition-colors duration-500">
      {/* Background glow based on color */}
      <div 
        className={clsx(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-all duration-500",
          isTargetReached ? "opacity-40" : "opacity-20"
        )}
        style={{ backgroundColor: isTargetReached ? targetReachedColor : displayColor }}
      />

      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-gray-950/80 to-transparent">
        <button 
          onClick={onBack}
          className="p-2 bg-gray-800/50 backdrop-blur-md rounded-full text-white hover:bg-gray-700/50 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div className={clsx(
            "backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium transition-colors",
            isTargetReached 
              ? (isMonochrome ? "bg-white/20 text-white border border-white/30" : "bg-green-500/20 text-green-400 border border-green-500/30") 
              : "bg-gray-800/50 text-gray-300"
        )}>
             {counter.target ? `${localCount} / ${counter.target}` : 'No Limit'}
        </div>
        <button 
          onClick={() => setShowMenu(true)}
          className="p-2 bg-gray-800/50 backdrop-blur-md rounded-full text-white hover:bg-gray-700/50 transition"
        >
          <Settings2 size={24} />
        </button>
      </div>

      {/* Menu Modal */}
      {showMenu && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-800 shadow-2xl relative">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Options</h3>
                <button onClick={() => setShowMenu(false)}><X className="text-gray-400 hover:text-white" /></button>
            </div>
            
            <div className="space-y-5">
                {/* Rename */}
                <div>
                    <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Rename Counter</label>
                    <input 
                        type="text" 
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className={clsx(
                            "w-full bg-gray-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors",
                            isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                        )}
                    />
                </div>

                {/* Target */}
                <div>
                    <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Target Goal</label>
                    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                             <label className="flex items-center gap-2 text-white text-sm cursor-pointer select-none">
                                <input 
                                    type="checkbox"
                                    checked={isTargetEnabled}
                                    onChange={(e) => setIsTargetEnabled(e.target.checked)}
                                    className={clsx(
                                        "w-4 h-4 rounded border-gray-600 bg-gray-800 focus:ring-offset-gray-900",
                                        isMonochrome ? "text-white focus:ring-white" : "text-indigo-600 focus:ring-indigo-500"
                                    )} 
                                />
                                Enable Target
                            </label>
                        </div>
                        {isTargetEnabled && (
                            <input 
                                type="number" 
                                value={editTarget}
                                onChange={(e) => setEditTarget(e.target.value)}
                                placeholder="Target value"
                                className={clsx(
                                    "w-full bg-gray-900 border rounded-lg p-2 text-white text-sm focus:outline-none mt-2 transition-colors",
                                    isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                                )}
                            />
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleSaveChanges}
                    className={clsx(
                        "w-full text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2",
                        isMonochrome 
                          ? "bg-white text-black hover:bg-gray-200 shadow-white/10" 
                          : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20"
                    )}
                >
                    <Save size={18} /> Save Changes
                </button>
            </div>

            <div className="h-px bg-gray-800 my-6"></div>
            
             <button 
               className="w-full flex items-center justify-center gap-2 p-3 text-red-400 rounded-xl hover:bg-red-900/10 transition border border-transparent hover:border-red-900/20 text-sm font-medium"
               onClick={() => {
                   setShowMenu(false);
                   setShowDeleteConfirm(true);
                   setDeleteInput("");
               }}
            >
                <Trash2 size={16} />
                Delete Counter
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-gray-900 border border-red-900/50 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                <div className="flex items-center gap-3 mb-4 text-red-500">
                    <AlertTriangle size={24} />
                    <h3 className="text-xl font-bold">Delete Counter?</h3>
                </div>
                
                <p className="text-sm text-gray-400 mb-6">
                    This action is permanent and cannot be undone. All history for <span className="text-white font-bold">{counter.title}</span> will be lost.
                </p>
                
                <label className="block text-xs text-gray-500 font-bold uppercase mb-2">
                    Type "<span className="select-all text-gray-300">{DELETE_CONFIRM_TEXT}</span>" to confirm
                </label>
                <input 
                    type="text" 
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                    placeholder={DELETE_CONFIRM_TEXT}
                    className="w-full bg-black/50 border border-gray-700 rounded-xl p-3 text-white placeholder-gray-600 focus:outline-none focus:border-red-500 transition-colors mb-6"
                    autoFocus
                />
                
                <div className="flex gap-3">
                    <button 
                        onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteInput("");
                        }}
                        className="flex-1 py-3 text-gray-400 font-medium hover:text-white transition-colors bg-gray-800 rounded-xl"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onDelete(counter.id)}
                        disabled={deleteInput !== DELETE_CONFIRM_TEXT}
                        className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-red-900/20"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <h2 className="text-gray-400 text-lg font-medium tracking-wide uppercase mb-2">{counter.title}</h2>
        <div 
          className={clsx(
            "text-9xl font-black tabular-nums transition-all duration-300",
            isAnimating === 'up' && "scale-110",
            isAnimating === 'down' && "scale-90",
            isTargetReached && "animate-pulse",
            isTargetReached && !isMonochrome && "drop-shadow-[0_0_25px_rgba(74,222,128,0.6)]",
            isTargetReached && isMonochrome && "drop-shadow-[0_0_25px_rgba(255,255,255,0.6)]"
          )}
          style={{ color: isTargetReached ? targetReachedColor : displayColor }}
        >
          {localCount}
        </div>
        
        {/* Target Progress Bar */}
        {counter.target && (
            <div className="mt-8 w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                    <span className={isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : ""}>Progress</span>
                    <span className={isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : ""}>{Math.round(calculateProgress())}%</span>
                </div>
                <div className={clsx(
                    "h-2 w-full bg-gray-900 rounded-full overflow-hidden border transition-colors duration-300",
                    isTargetReached 
                        ? (isMonochrome ? "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]") 
                        : "border-gray-800/50"
                )}>
                    <div 
                        className="h-full transition-all duration-500 ease-out"
                        style={{ 
                            width: `${calculateProgress()}%`, 
                            backgroundColor: isTargetReached ? targetReachedColor : displayColor 
                        }}
                    />
                </div>
                {isTargetReached && (
                    <div className={clsx(
                        "text-center mt-3 text-sm font-bold tracking-[0.2em] animate-bounce-short",
                        isMonochrome ? "text-white" : "text-green-400"
                    )}>
                        GOAL REACHED
                    </div>
                )}
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="h-2/5 flex">
        <button 
          onClick={() => handleUpdate(-1)}
          className="flex-1 bg-gray-900 hover:bg-gray-800 active:bg-gray-700 transition-colors flex items-center justify-center border-t border-r border-gray-800 group"
        >
          <Minus size={48} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
        <button 
          onClick={() => handleUpdate(1)}
          className="flex-1 bg-gray-900 hover:bg-gray-800 active:bg-gray-700 transition-colors flex items-center justify-center border-t border-gray-800 group"
        >
          <Plus size={48} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
};