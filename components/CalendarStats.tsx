import React, { useMemo, useState } from 'react';
import { CounterLog, Counter } from '../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter, X, Clock, Activity } from 'lucide-react';
import clsx from 'clsx';

interface CalendarStatsProps {
  logs: CounterLog[];
  counters: Counter[];
}

export const CalendarStats: React.FC<CalendarStatsProps> = ({ logs, counters }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedCounterId, setSelectedCounterId] = useState<string | 'all'>('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Filter logs by selected counter
  const filteredLogs = useMemo(() => {
    if (selectedCounterId === 'all') return logs;
    return logs.filter(log => log.counterId === selectedCounterId);
  }, [logs, selectedCounterId]);

  // Aggregate daily counts
  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    
    filteredLogs.forEach(log => {
      const dayKey = format(new Date(log.timestamp), 'yyyy-MM-dd');
      // Only sum positive increments to show "activity done"
      if (log.valueChange > 0) {
        const current = map.get(dayKey) || 0;
        map.set(dayKey, current + log.valueChange);
      }
    });
    return map;
  }, [filteredLogs]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    
    // Add padding days for start of week (Sunday start)
    const startDay = start.getDay(); // 0 = Sunday
    const padding = Array(startDay).fill(null);
    
    return [...padding, ...days];
  }, [currentDate]);

  const maxCount = useMemo(() => {
    let max = 0;
    dailyData.forEach(val => { if(val > max) max = val; });
    return max || 1;
  }, [dailyData]);

  // Details for selected day
  const selectedDayDetails = useMemo(() => {
    if (!selectedDate) return { logs: [], total: 0 };
    
    // Use filteredLogs to respect the current filter view
    const dayLogs = filteredLogs.filter(log => isSameDay(new Date(log.timestamp), selectedDate));
    
    // Sort desc by time
    dayLogs.sort((a, b) => b.timestamp - a.timestamp);
    
    const total = dayLogs.reduce((acc, log) => acc + (log.valueChange > 0 ? log.valueChange : 0), 0);
    
    return { logs: dayLogs, total };
  }, [selectedDate, filteredLogs]);

  const getCounterInfo = (id: string) => counters.find(c => c.id === id);

  const getIntensityColor = (count: number) => {
    if (count === 0) return 'bg-gray-800/50 border-gray-800';
    const intensity = count / maxCount;
    if (intensity < 0.25) return 'bg-indigo-900/40 border-indigo-500/30 text-indigo-200';
    if (intensity < 0.5) return 'bg-indigo-700/60 border-indigo-500/50 text-indigo-100';
    if (intensity < 0.75) return 'bg-indigo-600/80 border-indigo-400/60 text-white';
    return 'bg-indigo-500 border-indigo-300 text-white font-bold shadow-lg shadow-indigo-500/20';
  };

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1));

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col gap-4">
        {/* Header with Controls */}
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <CalendarIcon className="text-indigo-400" size={20} />
                {format(currentDate, 'MMMM yyyy')}
              </h2>
           </div>
           <div className="flex gap-2">
              <button onClick={handlePrevMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
                <ChevronLeft size={18} />
              </button>
              <button onClick={handleNextMonth} className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition">
                <ChevronRight size={18} />
              </button>
           </div>
        </div>

        {/* Counter Filter */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            <Filter size={14} className="text-gray-500 shrink-0" />
            <button 
                onClick={() => setSelectedCounterId('all')}
                className={clsx(
                    "text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap",
                    selectedCounterId === 'all' 
                    ? "bg-gray-700 border-gray-600 text-white" 
                    : "bg-transparent border-gray-800 text-gray-500 hover:bg-gray-900"
                )}
            >
                All Activity
            </button>
            {counters.map(c => (
                <button
                    key={c.id}
                    onClick={() => setSelectedCounterId(c.id)}
                    className={clsx(
                        "text-xs px-3 py-1.5 rounded-full border transition whitespace-nowrap flex items-center gap-2",
                        selectedCounterId === c.id
                        ? "bg-gray-800 text-white border-gray-600"
                        : "bg-transparent border-gray-800 text-gray-500 hover:bg-gray-900"
                    )}
                >
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    {c.title}
                </button>
            ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
        <div className="grid grid-cols-7 mb-2 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-[10px] font-bold text-gray-600 uppercase py-2">
                    {d}
                </div>
            ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, i) => {
                if (!day) return <div key={`pad-${i}`} />;
                
                const dayKey = format(day, 'yyyy-MM-dd');
                const count = dailyData.get(dayKey) || 0;
                const isCurrentDay = isToday(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);

                return (
                    <button 
                        key={dayKey}
                        onClick={() => setSelectedDate(day)}
                        className={clsx(
                            "aspect-square rounded-xl border flex flex-col items-center justify-center relative transition-all duration-200 group active:scale-95",
                            getIntensityColor(count),
                            isCurrentDay && "ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900",
                            isSelected && "ring-2 ring-white ring-offset-2 ring-offset-gray-900 z-10 scale-110 shadow-xl"
                        )}
                    >
                        <span className={clsx("text-xs", count > 0 ? "opacity-100" : "opacity-40")}>
                            {format(day, 'd')}
                        </span>
                        {count > 0 && (
                            <span className="text-[10px] font-bold mt-0.5">
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
      </div>
      
      {/* Legend / Stats */}
      <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-500 text-xs uppercase font-bold mb-1">Total Count</div>
              <div className="text-2xl font-bold text-white">
                 {Array.from(dailyData.values()).reduce((a: number, b: number) => a + b, 0)}
              </div>
          </div>
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
              <div className="text-gray-500 text-xs uppercase font-bold mb-1">Active Days</div>
              <div className="text-2xl font-bold text-indigo-400">
                 {dailyData.size}
              </div>
          </div>
      </div>

      {/* Day Details Modal */}
      {selectedDate && (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4" 
            onClick={() => setSelectedDate(null)}
        >
            <div 
                className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200" 
                onClick={e => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                             {format(selectedDate, 'EEEE, MMM do')}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                            {selectedDayDetails.total > 0 ? `${selectedDayDetails.total} updates` : 'No activity'}
                        </p>
                    </div>
                    <button 
                        onClick={() => setSelectedDate(null)} 
                        className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-4 space-y-3">
                    {selectedDayDetails.logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-500 text-sm gap-2">
                            <Activity size={32} className="opacity-20" />
                            <p>No activity recorded for this day.</p>
                        </div>
                    ) : (
                        selectedDayDetails.logs.map(log => {
                            const counter = getCounterInfo(log.counterId);
                            return (
                                <div key={log.id} className="flex items-center justify-between bg-gray-950/50 p-3 rounded-xl border border-gray-800/50 hover:border-gray-700 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-gray-950 shadow-sm" 
                                            style={{ backgroundColor: counter?.color || '#374151' }}
                                        >
                                            {counter?.title.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-200">
                                                {counter?.title || 'Unknown Counter'}
                                            </div>
                                            <div className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} /> 
                                                {format(new Date(log.timestamp), 'h:mm a')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={clsx(
                                        "font-bold text-lg", 
                                        log.valueChange > 0 ? "text-green-400" : "text-red-400"
                                    )}>
                                        {log.valueChange > 0 ? '+' : ''}{log.valueChange}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};