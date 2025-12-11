
import React, { useEffect, useState, useRef } from 'react';
import { ArrowLeft, Minus, Plus, Settings2, Trash2, X, Save, AlertTriangle, Folder, Check, Edit2, RotateCcw, Target, Hash, Keyboard } from 'lucide-react';
import { Counter, CounterGroup } from '../types';
import { playClick, playSuccess } from '../services/sound';
import clsx from 'clsx';

interface CounterViewProps {
  counter: Counter;
  groups?: CounterGroup[]; 
  onBack: () => void;
  onUpdate: (id: string, delta: number) => void;
  onRename: (id: string, newTitle: string) => void;
  onUpdateTarget: (id: string, target: number | null) => void;
  onUpdateGroup?: (id: string, groupId: string | null) => void;
  onDelete: (id: string) => void;
}

// Ripple Component for click effects
const Ripple: React.FC<{ x: number, y: number }> = ({ x, y }) => {
    const [active, setActive] = useState(false);
    useEffect(() => {
        requestAnimationFrame(() => setActive(true));
    }, []);
    return (
        <div 
            className="absolute rounded-full pointer-events-none transition-all duration-700 ease-out"
            style={{
                left: x,
                top: y,
                width: 20,
                height: 20,
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                transform: active ? 'translate(-50%, -50%) scale(40)' : 'translate(-50%, -50%) scale(0)',
                opacity: active ? 0 : 1
            }}
        />
    );
};

export const CounterView: React.FC<CounterViewProps> = ({ 
    counter, 
    groups = [], 
    onBack, 
    onUpdate, 
    onRename, 
    onUpdateTarget, 
    onUpdateGroup, 
    onDelete 
}) => {
  const [localCount, setLocalCount] = useState(counter.count);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);
  
  // Edit State
  const [editTitle, setEditTitle] = useState(counter.title);
  const [editTarget, setEditTarget] = useState<string>(counter.target?.toString() || "");
  const [editCount, setEditCount] = useState<string>(counter.count.toString());
  const [isTargetEnabled, setIsTargetEnabled] = useState(!!counter.target);
  const [editGroupId, setEditGroupId] = useState<string>(counter.groupId || "");

  // Quick Target Edit State
  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [quickTarget, setQuickTarget] = useState<string>("");
  const quickTargetInputRef = useRef<HTMLInputElement>(null);

  // Delete State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const DELETE_CONFIRM_TEXT = "yes delete this counter";

  // Determine display colors based on theme
  const displayColor = counter.color;
  const targetReachedColor = '#4ade80';
  
  // Sync props to state
  useEffect(() => {
    setLocalCount(counter.count);
  }, [counter.count]);

  useEffect(() => {
    if (showMenu) {
        setEditTitle(counter.title);
        setEditTarget(counter.target?.toString() || "");
        setEditCount(counter.count.toString());
        setIsTargetEnabled(!!counter.target);
        setEditGroupId(counter.groupId || "");
    }
  }, [counter, showMenu]);

  useEffect(() => {
      if (isEditingTarget && quickTargetInputRef.current) {
          quickTargetInputRef.current.focus();
      }
  }, [isEditingTarget]);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (showMenu || showDeleteConfirm || isEditingTarget) return;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

          if (e.code === 'Space' || e.key === 'Enter' || e.code === 'ArrowUp') {
              e.preventDefault(); 
              handleUpdate(1);
          } else if (e.code === 'ArrowDown' || e.code === 'Backspace') {
              handleUpdate(-1);
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMenu, showDeleteConfirm, isEditingTarget]);


  const isTargetReached = counter.target !== undefined && localCount >= counter.target;

  // Check goal reached effect
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

  const handleMainClick = (e: React.MouseEvent) => {
      // Trigger ripple
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();
      
      setRipples(prev => [...prev, {id, x, y}]);
      setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 800);

      handleUpdate(1);
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
        onUpdateTarget(counter.id, null);
        hasChanges = true;
    } else if (isTargetEnabled && !isNaN(numTarget)) {
        if (numTarget !== oldTarget) {
            onUpdateTarget(counter.id, numTarget);
            hasChanges = true;
        }
    }

    // Save Manual Count
    const numCount = parseInt(editCount);
    if (!isNaN(numCount) && numCount !== counter.count) {
        const delta = numCount - counter.count;
        onUpdate(counter.id, delta);
        hasChanges = true;
    }

    // Save Group
    const newGroup = editGroupId || null;
    const oldGroup = counter.groupId || null;
    if (newGroup !== oldGroup && onUpdateGroup) {
        onUpdateGroup(counter.id, newGroup);
        hasChanges = true;
    }

    setShowMenu(false);
  };

  const startQuickEditTarget = (e: React.MouseEvent) => {
      e.stopPropagation();
      setQuickTarget(counter.target?.toString() || "");
      setIsEditingTarget(true);
  };

  const saveQuickTarget = () => {
      const val = parseInt(quickTarget);
      if (!isNaN(val) && val > 0) {
          onUpdateTarget(counter.id, val);
      }
      setIsEditingTarget(false);
  };

  const adjustQuickTarget = (delta: number) => {
      setQuickTarget(prev => {
          const curr = parseInt(prev) || 0;
          return Math.max(1, curr + delta).toString();
      });
  };

  const calculateProgress = () => {
    if (!counter.target) return 0;
    const progress = (localCount / counter.target) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="h-full flex flex-col relative overflow-hidden transition-colors duration-500 select-none bg-gray-950">
      
      {/* Background glow */}
      <div 
        className={clsx(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[500px] max-h-[500px] rounded-full blur-[100px] pointer-events-none transition-all duration-500 z-0",
          isTargetReached ? "opacity-30" : "opacity-15"
        )}
        style={{ backgroundColor: isTargetReached ? targetReachedColor : displayColor }}
      />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 p-6 pt-[calc(1.5rem+env(safe-area-inset-top))] flex items-start justify-between pointer-events-none">
        <button 
            onClick={onBack} 
            className="pointer-events-auto p-3 rounded-full bg-gray-900/40 border border-gray-800 text-gray-400 hover:text-white transition backdrop-blur-md hover:bg-gray-800/60"
        >
           <ArrowLeft size={24} />
        </button>
        
        <div className="pointer-events-auto bg-gray-900/60 border border-gray-800/50 backdrop-blur-md px-5 py-2 rounded-full font-mono text-sm font-bold text-gray-200 shadow-lg flex items-center gap-2">
            <span>{localCount}</span>
            <span className="text-gray-600">/</span>
            <span>{counter.target || '∞'}</span>
        </div>

        <button 
            onClick={() => setShowMenu(true)} 
            className="pointer-events-auto p-3 rounded-full bg-gray-900/40 border border-gray-800 text-gray-400 hover:text-white transition backdrop-blur-md hover:bg-gray-800/60"
        >
           <Settings2 size={24} />
        </button>
      </div>

      {/* Main Clickable Area */}
      <div 
         className="flex-1 w-full flex flex-col items-center justify-center relative z-10 cursor-pointer outline-none active:bg-white/5 transition-colors"
         onClick={handleMainClick}
      >
        {ripples.map(r => <Ripple key={r.id} x={r.x} y={r.y} />)}
        
        {/* Central Stats Group */}
        <div className="w-full max-w-xs flex flex-col items-center pointer-events-none transform -translate-y-12">
            
            {/* Progress Section */}
            {counter.target && (
                <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
                        <span>Progress</span>
                        <span>{Math.round(calculateProgress())}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-800/50 rounded-full overflow-hidden">
                        <div 
                            className="h-full transition-all duration-500 ease-out relative"
                             style={{ 
                                width: `${calculateProgress()}%`, 
                                backgroundColor: isTargetReached ? targetReachedColor : displayColor 
                            }}
                        >
                            {/* Shimmer */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Number */}
            <div 
                className={clsx(
                    "text-[8rem] sm:text-[10rem] leading-none font-black tracking-tighter tabular-nums transition-all duration-200 select-none",
                    isAnimating === 'up' && "scale-110",
                    isAnimating === 'down' && "scale-90",
                    isTargetReached && "animate-pulse drop-shadow-[0_0_30px_rgba(74,222,128,0.4)]"
                )}
                style={{ 
                    color: isTargetReached ? targetReachedColor : displayColor, 
                    textShadow: `0 0 60px ${displayColor}30` 
                }}
            >
                {localCount}
            </div>

            {/* Goal Pill */}
            <div className="pointer-events-auto mt-6">
                 {isEditingTarget ? (
                       <div className="flex items-center gap-2 bg-gray-900/90 rounded-full p-1 border border-gray-700 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                           <button onClick={() => adjustQuickTarget(-1)} className="p-2 hover:bg-white/10 rounded-full text-white active:scale-95 transition-transform"><Minus size={14}/></button>
                           <input 
                                ref={quickTargetInputRef}
                                type="number" 
                                className="bg-transparent text-white font-mono font-bold text-center w-16 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-sm"
                                value={quickTarget}
                                onChange={(e) => setQuickTarget(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveQuickTarget()}
                           />
                           <button onClick={() => adjustQuickTarget(1)} className="p-2 hover:bg-white/10 rounded-full text-white active:scale-95 transition-transform"><Plus size={14}/></button>
                           <button onClick={saveQuickTarget} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-full active:scale-95 transition-transform"><Check size={14}/></button>
                       </div>
                    ) : (
                        <button 
                            onClick={(e) => { e.stopPropagation(); startQuickEditTarget(e); }}
                            className="bg-gray-900/60 border border-gray-800 backdrop-blur-sm rounded-full px-4 py-1.5 flex items-center gap-2 text-xs font-bold text-gray-500 hover:bg-gray-800 hover:text-white transition group uppercase tracking-wide shadow-lg"
                        >
                            <Target size={12} className={clsx(isTargetReached ? "text-green-400" : "text-indigo-500")} />
                            <span>Goal: {counter.target || 'None'}</span>
                        </button>
                    )}
            </div>
         </div>
      </div>

      {/* Explicit Controls Footer */}
      <div 
        className="absolute bottom-0 left-0 right-0 px-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-24 flex flex-col items-center justify-end z-40 pointer-events-none bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent"
      >
        <div className="flex items-center gap-2 text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-6 pointer-events-auto opacity-60 animate-pulse">
            <Keyboard size={12} />
            <span>Press Space to Count</span>
        </div>

        <div className="flex items-center justify-center gap-6 pointer-events-auto">
            <button 
            onClick={(e) => { e.stopPropagation(); handleUpdate(-1); }}
            className="w-24 h-24 rounded-[2rem] bg-gray-900/80 border border-gray-800 text-gray-500 hover:text-white hover:bg-gray-800 hover:border-gray-700 active:scale-95 transition-all flex items-center justify-center shadow-xl backdrop-blur-sm group"
            >
            <Minus size={32} className="group-hover:scale-110 transition-transform opacity-70 group-hover:opacity-100" />
            </button>
            <button 
            onClick={(e) => { e.stopPropagation(); handleUpdate(1); }}
            className="w-32 h-32 rounded-[2.5rem] flex items-center justify-center transition-all active:scale-95 shadow-2xl shadow-indigo-500/20 text-white hover:brightness-110 hover:shadow-indigo-500/40 group relative overflow-hidden"
            style={{ backgroundColor: displayColor }}
            >
            <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
            <Plus size={56} className="drop-shadow-md group-hover:scale-110 transition-transform duration-300" />
            </button>
        </div>
      </div>

      {/* Menu Modal */}
      {showMenu && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-800 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar">
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
                        className="w-full bg-gray-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors border-gray-700 focus:border-indigo-500"
                    />
                </div>

                {/* Edit Current Value */}
                <div>
                    <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Current Count</label>
                    <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input 
                            type="number" 
                            value={editCount}
                            onChange={(e) => setEditCount(e.target.value)}
                            className="w-full bg-gray-950 border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none transition-colors border-gray-700 focus:border-indigo-500"
                        />
                        <button 
                            onClick={() => setEditCount("0")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400 hover:text-red-300 bg-red-900/20 px-2 py-1 rounded"
                        >
                            RESET
                        </button>
                    </div>
                </div>

                {/* Group Selector */}
                {groups.length > 0 && (
                    <div>
                         <label className="block text-xs text-gray-500 font-bold uppercase mb-2">Group</label>
                         <div className="relative">
                             <Folder className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                             <select
                                value={editGroupId}
                                onChange={(e) => setEditGroupId(e.target.value)}
                                className="w-full bg-gray-950 border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none appearance-none transition-colors border-gray-700 focus:border-indigo-500"
                             >
                                 <option value="">Ungrouped</option>
                                 {groups.map(g => (
                                     <option key={g.id} value={g.id}>{g.name}</option>
                                 ))}
                             </select>
                         </div>
                    </div>
                )}

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
                                    className="w-4 h-4 rounded border-gray-600 bg-gray-800 focus:ring-offset-gray-900 text-indigo-600 focus:ring-indigo-500" 
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
                                className="w-full bg-gray-900 border rounded-lg p-2 text-white text-sm focus:outline-none mt-2 transition-colors border-gray-700 focus:border-indigo-500"
                            />
                        )}
                    </div>
                </div>

                <button 
                    onClick={handleSaveChanges}
                    className="w-full text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 shadow-indigo-900/20"
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
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
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
    </div>
  );
};
