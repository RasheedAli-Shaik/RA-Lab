import React from 'react';
import { Eye, Maximize2, RefreshCw } from 'lucide-react';

export default function PdfViewer({ pdfUrl, isCompiling }) {
  return (
    <div className="h-full flex flex-col bg-[#0f1115] relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f1115] to-[#050505]"></div>

      {/* Header */}
      <div className="h-9 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.02] relative z-10">
        <div className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Render Output</span>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600 font-mono">100%</span>
            <Maximize2 className="w-3 h-3 text-slate-600 hover:text-slate-300 cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 relative z-10 flex items-center justify-center p-4">
        
        {isCompiling && (
          <div className="absolute inset-0 z-50 bg-[#0f1115]/80 backdrop-blur-sm flex flex-col items-center justify-center animate-fade-in">
             <div className="relative">
                 <div className="w-16 h-16 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 border-4 border-violet-500/30 border-b-violet-400 rounded-full animate-spin-reverse delay-75"></div>
                 </div>
             </div>
             <p className="mt-6 text-sm font-medium tracking-widest text-cyan-400 animate-pulse">RENDERING SEQUENCE</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full rounded-lg overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-white/10 relative group">
             {/* Glow border on hover */}
             <div className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 blur-sm pointer-events-none"></div>
             
             <iframe
               src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
               className="w-full h-full bg-white relative z-10"
               title="PDF Preview"
             />
          </div>
        ) : (
          <div className="text-center relative">
             <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-cyan-500/10 to-violet-500/10 blur-xl absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse-slow"></div>
             <div className="w-24 h-32 border-2 border-dashed border-slate-700 rounded-lg flex items-center justify-center mx-auto mb-6 relative hover:border-cyan-500/50 transition-colors duration-500">
                <RefreshCw className="w-8 h-8 text-slate-600" />
             </div>
             <h3 className="text-lg font-light text-slate-200 mb-2 font-display">Awaiting Output</h3>
             <p className="text-xs text-slate-500 max-w-[200px] mx-auto leading-relaxed">
               Execute compilation to generate visual output.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}
