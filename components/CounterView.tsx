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
  isMonochrome?: boolean;
}

// Ripple Component for click effects
const Ripple = ({ x, y }: { x: number, y: number }) => {
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
    onDelete, 
    isMonochrome = false 
}) => {
  const [localCount, setLocalCount] = useState(counter.count);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [ripples, setRipples] = useState<{id: number, x: number, y: number}[]>([]);
  
  // Edit State
  const [editTitle, setEditTitle] = useState(counter.title);
  const [editTarget, setEditTarget] = useState<string>(counter.target?.toString() || "");
  const [editCount, setEditCount] = useState<string>(counter.count.toString()); // New: Manual count edit
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
  const displayColor = isMonochrome ? '#ffffff' : counter.color;
  const targetReachedColor = isMonochrome ? '#ffffff' : '#4ade80';
  
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
          // Don't trigger if modal is open or typing in input
          if (showMenu || showDeleteConfirm || isEditingTarget) return;
          if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

          if (e.code === 'Space' || e.key === 'Enter' || e.code === 'ArrowUp') {
              e.preventDefault(); // Prevent scroll
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
    <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden transition-colors duration-500 select-none">
      
      {/* Background glow */}
      <div 
        className={clsx(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-all duration-500 z-0",
          isTargetReached ? "opacity-40" : "opacity-20"
        )}
        style={{ backgroundColor: isTargetReached ? targetReachedColor : displayColor }}
      />

      {/* Main Clickable Area */}
      <div 
         className="flex-1 w-full flex flex-col items-center justify-center relative z-10 cursor-pointer outline-none active:bg-white/5 transition-colors"
         onClick={handleMainClick}
      >
        {ripples.map(r => <Ripple key={r.id} x={r.x} y={r.y} />)}
        
        {/* Header - Positioned absolutely to sit on top of click area */}
        <div className="absolute top-0 w-full p-4 flex justify-between items-center z-30 pt-[calc(1rem+env(safe-area-inset-top))]" onClick={e => e.stopPropagation()}>
            <button 
            onClick={onBack}
            className="p-3 bg-gray-800/50 backdrop-blur-md rounded-full text-white hover:bg-gray-700/50 transition"
            >
            <ArrowLeft size={20} />
            </button>
            <div className={clsx(
                "backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold transition-colors shadow-lg",
                isTargetReached 
                ? (isMonochrome ? "bg-white/20 text-white border border-white/30" : "bg-green-500/20 text-green-400 border border-green-500/30") 
                : "bg-gray-800/50 text-gray-300 border border-gray-700/50"
            )}>
                {counter.target ? `${localCount} / ${counter.target}` : 'No Limit'}
            </div>
            <button 
            onClick={() => setShowMenu(true)}
            className="p-3 bg-gray-800/50 backdrop-blur-md rounded-full text-white hover:bg-gray-700/50 transition"
            >
            <Settings2 size={20} />
            </button>
        </div>

        {/* Counter Display */}
        <h2 className="text-gray-400 text-lg font-medium tracking-wide uppercase mb-4 opacity-80 pointer-events-none">{counter.title}</h2>
        <div 
          className={clsx(
            "text-9xl font-black tabular-nums transition-all duration-300 select-none pointer-events-none",
            isAnimating === 'up' && "scale-110",
            isAnimating === 'down' && "scale-90",
            isTargetReached && "animate-pulse",
            isTargetReached && !isMonochrome && "drop-shadow-[0_0_40px_rgba(74,222,128,0.5)]",
            isTargetReached && isMonochrome && "drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]"
          )}
          style={{ color: isTargetReached ? targetReachedColor : displayColor }}
        >
          {localCount}
        </div>
        
        {/* Keyboard Hint (Desktop only) */}
        <div className="absolute bottom-8 text-gray-600 text-[10px] hidden sm:flex items-center gap-2 opacity-50">
            <Keyboard size={12} />
            <span>Press Space to Count</span>
        </div>

        {/* Target Progress Section */}
        {counter.target && (
            <div className="absolute bottom-32 w-full max-w-xs px-6 flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 pointer-events-none">
                <div className="flex justify-between w-full text-xs text-gray-500 mb-2 font-medium">
                    <span className={isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : ""}>
                        {isTargetReached ? 'Goal Reached!' : 'Progress'}
                    </span>
                    <span className={isTargetReached ? (isMonochrome ? "text-white" : "text-green-400") : ""}>{Math.round(calculateProgress())}%</span>
                </div>
                <div className={clsx(
                    "h-3 w-full bg-gray-900/80 rounded-full overflow-hidden border transition-colors duration-300",
                    isTargetReached 
                        ? (isMonochrome ? "border-white/50 shadow-[0_0_15px_rgba(255,255,255,0.3)]" : "border-green-500/50 shadow-[0_0_15px_rgba(74,222,128,0.3)]") 
                        : "border-gray-800/50"
                )}>
                    <div 
                        className="h-full transition-all duration-500 ease-out relative"
                        style={{ 
                            width: `${calculateProgress()}%`, 
                            backgroundColor: isTargetReached ? targetReachedColor : displayColor 
                        }}
                    >
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]"></div>
                    </div>
                </div>

                {/* Inline Target Controls (Interactive children must stop prop) */}
                <div className="mt-6 flex items-center justify-center pointer-events-auto" onClick={e => e.stopPropagation()}>
                    {isEditingTarget ? (
                       <div className="flex items-center gap-2 bg-gray-900/90 rounded-xl p-1.5 border border-gray-700 backdrop-blur-md shadow-2xl animate-in zoom-in-95 duration-200">
                           <button onClick={() => adjustQuickTarget(-1)} className="p-2 hover:bg-white/10 rounded-lg text-white active:scale-95 transition-transform"><Minus size={16}/></button>
                           <input 
                                ref={quickTargetInputRef}
                                type="number" 
                                className="bg-transparent text-white font-mono font-bold text-center w-16 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={quickTarget}
                                onChange={(e) => setQuickTarget(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && saveQuickTarget()}
                           />
                           <button onClick={() => adjustQuickTarget(1)} className="p-2 hover:bg-white/10 rounded-lg text-white active:scale-95 transition-transform"><Plus size={16}/></button>
                           <div className="w-px h-5 bg-gray-700 mx-1"></div>
                           <button onClick={saveQuickTarget} className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg active:scale-95 transition-transform"><Check size={16}/></button>
                       </div>
                    ) : (
                       <button 
                          onClick={startQuickEditTarget}
                          className="group flex items-center gap-2 py-2 px-4 rounded-full bg-gray-900/30 hover:bg-gray-800 border border-transparent hover:border-gray-700 transition-all active:scale-95"
                       >
                          <Target size={12} className={clsx("transition-colors", isMonochrome ? "text-white" : "text-indigo-400")} />
                          <span className="text-xs text-gray-500 group-hover:text-gray-200 font-medium">Goal: {counter.target}</span>
                          <Edit2 size={10} className="text-gray-600 group-hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Explicit Controls Footer */}
      <div 
        className="h-48 w-full max-w-md mx-auto grid grid-cols-2 gap-6 px-6 pb-[calc(2rem+env(safe-area-inset-bottom))] relative z-20 pointer-events-none"
      >
        {/* Pointer events auto on buttons only, so gaps are clickable for main area if we wanted, but h-48 blocks it. That's fine. */}
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpdate(-1); }}
          className="pointer-events-auto bg-gray-900/40 hover:bg-gray-900/60 active:bg-gray-800 border border-gray-800/50 hover:border-gray-700 rounded-3xl flex items-center justify-center transition-all duration-200 group backdrop-blur-sm active:scale-95 shadow-lg"
        >
          <Minus size={32} className="text-gray-500 group-hover:text-white transition-colors" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); handleUpdate(1); }}
          className={clsx(
              "pointer-events-auto rounded-3xl flex items-center justify-center transition-all duration-200 group active:scale-95 shadow-xl border border-transparent",
              isMonochrome 
                ? "bg-white text-black hover:bg-gray-200 shadow-white/10" 
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50"
          )}
        >
          <Plus size={40} className="drop-shadow-sm" />
        </button>
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
                        className={clsx(
                            "w-full bg-gray-950 border rounded-xl px-4 py-3 text-white focus:outline-none transition-colors",
                            isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                        )}
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
                            className={clsx(
                                "w-full bg-gray-950 border rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none transition-colors",
                                isMonochrome ? "border-gray-700 focus:border-white" : "border-gray-700 focus:border-indigo-500"
                            )}
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
