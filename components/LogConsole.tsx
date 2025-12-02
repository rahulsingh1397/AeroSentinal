import React, { useEffect, useRef } from 'react';
import { LogMessage } from '../types';
import { Terminal } from 'lucide-react';

interface LogConsoleProps {
  logs: LogMessage[];
}

export const LogConsole: React.FC<LogConsoleProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full bg-black/80 font-mono text-xs border-t border-slate-700">
      <div className="flex items-center gap-2 px-3 py-1 bg-slate-800 border-b border-slate-700 text-slate-400 select-none">
        <Terminal size={12} />
        <span className="font-bold">SYSTEM LOG</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {logs.length === 0 && <div className="text-slate-600 italic">No logs initialized...</div>}
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2">
             <span className="text-slate-500">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, fractionalSecondDigits: 2 } as any)}]</span>
             <span className={`${
                 log.level === 'error' ? 'text-red-400 font-bold' : 
                 log.level === 'warn' ? 'text-orange-400' : 
                 log.level === 'success' ? 'text-green-400' : 'text-slate-300'
             }`}>
                {log.level.toUpperCase()}
             </span>
             <span className="text-slate-300">{log.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};