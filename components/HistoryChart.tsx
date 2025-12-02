import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { CounterLog } from '../types';
import { format } from 'date-fns';

interface HistoryChartProps {
  logs: CounterLog[];
}

export const HistoryChart: React.FC<HistoryChartProps> = ({ logs }) => {
  const data = useMemo(() => {
    const grouped = logs.reduce((acc, log) => {
      const day = format(new Date(log.timestamp), 'MMM dd');
      if (!acc[day]) acc[day] = 0;
      acc[day] += log.valueChange > 0 ? log.valueChange : 0; // Track positive increments only for visual simplicity? Or net? Let's do positive activity.
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(grouped).map(([day, count]) => ({ day, count }));
  }, [logs]);

  if (data.length === 0) {
    return <div className="text-center text-gray-500 py-10">No activity yet. Start counting!</div>;
  }

  return (
    <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis 
                dataKey="day" 
                stroke="#6b7280" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                itemStyle={{ color: '#818cf8' }}
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#6366f1" />
                ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
    </div>
  );
};