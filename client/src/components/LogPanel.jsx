import React from 'react';
import { Info } from 'lucide-react';

export default function LogPanel({ logs, errors, warnings }) {
  return (
    <div className="h-full bg-[#050510]/95 font-mono text-xs overflow-auto p-4 scrollbar-thin relative group">
      {/* Matrix rain effect simplified */}
      <div className="absolute inset-0 bg-[linear-gradient(0deg,transparent_24%,rgba(32,255,100,.03)_25%,rgba(32,255,100,.03)_26%,transparent_27%,transparent_74%,rgba(32,255,100,.03)_75%,rgba(32,255,100,.03)_76%,transparent_77%,transparent),linear-gradient(90deg,transparent_24%,rgba(32,255,100,.03)_25%,rgba(32,255,100,.03)_26%,transparent_27%,transparent_74%,rgba(32,255,100,.03)_75%,rgba(32,255,100,.03)_76%,transparent_77%,transparent)] bg-[length:50px_50px] pointer-events-none opacity-20"></div>

      {logs ? (
        <div className="space-y-1 relative z-10">
          {logs.split('\n').map((line, idx) => {
            if (!line.trim()) return null;
            
            // Heuristic coloring
            let colorClass = 'text-slate-400';
            if (line.match(/error/i) || line.match(/!/)) {
                colorClass = 'text-red-400 bg-red-500/5 px-2 py-0.5 -mx-2 rounded border-l-2 border-red-500';
            } else if (line.match(/warning/i)) {
                colorClass = 'text-yellow-400';
            } else if (line.match(/success/i) || line.match(/done/i)) {
                colorClass = 'text-green-400';
            }

            return (
              <div key={idx} className={`${colorClass} whitespace-pre-wrap break-all leading-5 flex items-start gap-2`}>
                 <span className="opacity-30 select-none mr-2">{idx + 1}</span>
                 {line}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 relative z-10">
          <Info className="w-8 h-8 mb-2" />
          <p>System buffers empty</p>
        </div>
      )}
    </div>
  );
}
