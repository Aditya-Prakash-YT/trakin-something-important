import React, { useEffect, useState } from 'react';
import { ArrowLeft, Minus, Plus, Settings2, Trash2, Edit3, X, Target } from 'lucide-react';
import { Counter } from '../types';
import { playClick, playSuccess } from '../services/sound';
import clsx from 'clsx';

interface CounterViewProps {
  counter: Counter;
  onBack: () => void;
  onUpdate: (id: string, delta: number) => void;
  onDelete: (id: string) => void;
}

export const CounterView: React.FC<CounterViewProps> = ({ counter, onBack, onUpdate, onDelete }) => {
  const [localCount, setLocalCount] = useState(counter.count);
  const [isAnimating, setIsAnimating] = useState<'up' | 'down' | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setLocalCount(counter.count);
  }, [counter.count]);

  // Check goal reached
  useEffect(() => {
    if (counter.target && localCount === counter.target && isAnimating === 'up') {
        playSuccess();
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
  }, [localCount, counter.target]);

  const handleUpdate = (delta: number) => {
    playClick(delta > 0 ? 1.2 : 0.8);
    if (navigator.vibrate) navigator.vibrate(10);
    
    setLocalCount(prev => prev + delta);
    setIsAnimating(delta > 0 ? 'up' : 'down');
    setTimeout(() => setIsAnimating(null), 200);
    
    onUpdate(counter.id, delta);
  };

  const calculateProgress = () => {
    if (!counter.target) return 0;
    const progress = (localCount / counter.target) * 100;
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div className="h-full flex flex-col bg-gray-950 relative overflow-hidden">
      {/* Background glow based on color */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] opacity-20 pointer-events-none"
        style={{ backgroundColor: counter.color }}
      />

      {/* Header */}
      <div className="absolute top-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-gray-950/80 to-transparent">
        <button 
          onClick={onBack}
          className="p-2 bg-gray-800/50 backdrop-blur-md rounded-full text-white hover:bg-gray-700/50 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="bg-gray-800/50 backdrop-blur-md px-3 py-1 rounded-full text-xs text-gray-300 font-medium">
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
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 border border-gray-800 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Options</h3>
                <button onClick={() => setShowMenu(false)}><X className="text-gray-400" /></button>
            </div>
            
            <button 
               className="w-full flex items-center gap-3 p-4 bg-gray-800 rounded-xl mb-3 text-white hover:bg-gray-700 transition"
               onClick={() => {
                   alert("Rename not implemented in this demo.");
                   setShowMenu(false);
               }}
            >
                <Edit3 size={20} />
                <span>Rename Counter</span>
            </button>
             <button 
               className="w-full flex items-center gap-3 p-4 bg-red-900/20 text-red-400 rounded-xl hover:bg-red-900/30 transition border border-red-900/30"
               onClick={() => {
                   if(confirm("Are you sure you want to delete this counter?")) {
                       onDelete(counter.id);
                   }
               }}
            >
                <Trash2 size={20} />
                <span>Delete Counter</span>
            </button>
          </div>
        </div>
      )}

      {/* Display Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10">
        <h2 className="text-gray-400 text-lg font-medium tracking-wide uppercase mb-2">{counter.title}</h2>
        <div 
          className={clsx(
            "text-9xl font-black tabular-nums transition-transform duration-100",
            isAnimating === 'up' && "scale-110",
            isAnimating === 'down' && "scale-90"
          )}
          style={{ color: counter.color }}
        >
          {localCount}
        </div>
        
        {/* Target Progress Bar */}
        {counter.target && (
            <div className="mt-8 w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium">
                    <span>Progress</span>
                    <span>{Math.round(calculateProgress())}%</span>
                </div>
                <div className="h-2 w-full bg-gray-900 rounded-full overflow-hidden border border-gray-800/50">
                    <div 
                        className="h-full transition-all duration-300 ease-out"
                        style={{ width: `${calculateProgress()}%`, backgroundColor: counter.color }}
                    />
                </div>
                {localCount >= counter.target && (
                    <div className="text-center mt-2 text-green-400 text-xs font-bold tracking-widest animate-pulse">
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