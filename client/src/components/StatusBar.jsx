import React from 'react';
import { FileType } from 'lucide-react';

export default function StatusBar({ cursorPosition, compilationStatus, fileName }) {
  return (
    <div className="h-7 shrink-0 flex items-center justify-between px-4 glass-panel border-t border-white/5 text-[10px] font-medium tracking-wide uppercase text-slate-400 relative z-20">
        
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 hover:text-cyan-400 transition-colors cursor-default">
           <FileType className="w-3 h-3" />
           <span>{fileName}</span>
        </div>
        
        <div className="flex items-center gap-2 hover:text-cyan-400 transition-colors cursor-default">
            <span>Ln {cursorPosition.line}, Col {cursorPosition.col}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
           <div className={`w-1.5 h-1.5 rounded-full ${compilationStatus === 'success' ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : compilationStatus === 'error' ? 'bg-red-500 shadow-[0_0_5px_#ef4444]' : 'bg-slate-600'}`}></div>
           <span className={compilationStatus === 'success' ? 'text-green-400' : compilationStatus === 'error' ? 'text-red-400' : ''}>
               {compilationStatus === 'idle' ? 'READY' : compilationStatus.toUpperCase()}
           </span>
        </div>
        <div className="text-slate-600">UTF-8</div>
        <div className="text-slate-600">LaTeX</div>
      </div>
    </div>
  );
}
