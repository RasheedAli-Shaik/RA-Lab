import React from 'react';
import { Network, CircleDashed } from 'lucide-react';

export default function StatusBar({ cursorPosition, status, docSize }) {
  // Status config
  const STATUS_CONFIG = {
    idle: { color: 'bg-slate-500', text: 'READY' },
    compiling: { color: 'bg-cyan-500 animate-pulse', text: 'PROCESSING' },
    success: { color: 'bg-emerald-500', text: 'ONLINE' },
    error: { color: 'bg-red-500', text: 'ERROR' },
  };

  const currentStatus = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className="w-full h-full px-4 flex items-center justify-between text-[11px] font-mono tracking-wider text-slate-500 uppercase select-none">
      
      {/* Left Data */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 group">
          <Network className="w-3 h-3 text-slate-600 group-hover:text-cyan-400 transition-colors" />
          <span className="group-hover:text-slate-300 transition-colors">Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
        </div>
        
        <div className="flex items-center gap-2">
            <span className="w-px h-3 bg-slate-800"></span>
            <span>UTF-8</span>
        </div>

        <div className="flex items-center gap-2">
             <span className="w-px h-3 bg-slate-800"></span>
             <span>{(docSize / 1024).toFixed(2)} KB</span>
        </div>
      </div>

      {/* Right Data */}
      <div className="flex items-center gap-3">
         <span className={\	ext-[9px] font-bold \\}>
            SERVER STATUS
         </span>
         
         <div className="flex items-center gap-2 bg-slate-900/50 px-2 py-1 rounded border border-white/5">
            <div className={\w-1.5 h-1.5 rounded-full \\}></div>
            <span className={status === 'compiling' ? 'text-cyan-400' : 'text-slate-400'}>
                {currentStatus.text}
            </span>
         </div>
      </div>
    </div>
  );
}
