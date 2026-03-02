import React, { useRef, useEffect } from 'react';
import {
  Terminal,
  Activity,
  AlertOctagon,
  CheckCircle2,
  XOctagon,
  Cpu
} from 'lucide-react';

export default function LogPanel({ logs, errors = [], warnings = [] }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col bg-slate-950/40 text-xs font-mono">
      {/* Logs Display */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-auto p-4 scrollbar-thin scrollbar-thumb-slate-700/20 scrollbar-track-transparent space-y-1"
      >
        {logs ? (
            logs.split('\n').map((line, idx) => (
              <LogLine key={idx} line={line} />
            ))
        ) : (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
                <Cpu className="w-12 h-12 mb-4 text-slate-400" />
                <p className="text-slate-400 tracking-widest">SYSTEM IDLE</p>
            </div>
        )}
      </div>

      {/* Diagnostics Footer */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="border-t border-red-500/20 bg-red-950/10 p-2 flex gap-4 shrink-0 backdrop-blur-sm relative overflow-hidden">
           <div className="absolute inset-0 bg-red-500/5 animate-pulse"></div>
           
           {errors.length > 0 && (
            <div className="flex items-center gap-2 text-red-400 relative z-10">
              <XOctagon className="w-3.5 h-3.5" />
              <span className="font-bold">{errors.length} CRITICAL</span>
            </div>
           )}
           
           {warnings.length > 0 && (
            <div className="flex items-center gap-2 text-amber-400 relative z-10">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span className="font-medium">{warnings.length} warning(s)</span>
            </div>
           )}
        </div>
      )}
      
      {errors.length === 0 && warnings.length === 0 && logs && (
         <div className="border-t border-emerald-500/20 bg-emerald-950/10 p-2 flex gap-2 items-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="tracking-wide text-[10px] font-bold uppercase">System Nominal</span>
         </div>
      )}
    </div>
  );
}

function LogLine({ line }) {
  if (!line.trim()) return null;
  const lower = line.toLowerCase();

  let className = "text-slate-400 border-l-2 border-transparent pl-2 opacity-80 hover:opacity-100 transition-opacity";
  
  if (lower.includes('error') || lower.includes('!')) {
    className = "text-red-400 border-l-2 border-red-500 pl-2 bg-red-500/5 py-0.5";
  } else if (lower.includes('warning')) {
    className = "text-amber-400 border-l-2 border-amber-500 pl-2";
  } else if (lower.includes('success') || lower.includes('complete')) {
    className = "text-emerald-400 border-l-2 border-emerald-500 pl-2";
  } else if (lower.includes('compile') || lower.includes('running')) {
    className = "text-cyan-400 border-l-2 border-cyan-500 pl-2";
  }

  return <div className={\ont-mono whitespace-pre-wrap \\}>{line}</div>;
}
