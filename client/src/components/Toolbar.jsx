import React from 'react';
import {
  Save,
  Rocket,
  FileCode,
  Loader2,
  MoreVertical
} from 'lucide-react';

export default function Toolbar({
  fileName,
  onFileNameChange,
  onCompile,
  onSave,
  isCompiling,
  isSaving,
  // pdfUrl, // unused
  // compilationStatus // unused
}) {
  return (
    <div className="glass-panel w-full h-[60px] rounded-xl flex items-center px-4 justify-between relative overflow-hidden group transition-all duration-300">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-1/3 h-full bg-cyan-500/5 blur-[40px] rounded-full pointer-events-none sticky-glow"></div>

      {/* Left: Brand & File */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-white/20">
                <FileCode className="w-4 h-4 text-white" />
            </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white leading-none font-heading">
              RA-LAB
            </span>
            <span className="text-[9px] uppercase tracking-[0.25em] text-cyan-400 font-bold opacity-80">
              Workspace
            </span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-white/10 mx-1"></div>

        <div className="flex items-center gap-2 group/input">
          <span className="text-slate-600 text-xs font-mono font-bold select-none">./</span>
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            spellCheck="false"
            autoComplete="off"
            aria-label="File Name"
            className="
              bg-transparent text-slate-200 text-xs font-mono font-medium
              focus:outline-none focus:text-cyan-300 w-48 transition-colors
              placeholder:text-slate-700
            "
          />
          <span className="text-[9px] text-slate-600 border border-slate-800 rounded px-1.5 py-px opacity-0 group-hover/input:opacity-100 transition-opacity">
            EDIT
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 relative z-10">
        <button
          onClick={onSave}
          disabled={isSaving}
          title="Save (Ctrl+S)"
          className="glass-button h-9 px-4 rounded-lg flex items-center gap-2 group"
        >
          {isSaving ? (
             <Loader2 className="w-3.5 h-3.5 text-slate-300 animate-spin" />
          ) : (
             <>
               <Save className="w-3.5 h-3.5" />
               <span className="text-xs font-bold tracking-wide">SAVE</span>
             </>
          )}
        </button>

        <button
          onClick={onCompile}
          disabled={isCompiling}
          title="Compile Document (Ctrl+Enter)"
          className="
            relative h-9 px-5 rounded-lg flex items-center gap-2 overflow-hidden transition-all duration-300
            bg-white text-black font-bold text-xs tracking-wide hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]
            disabled:opacity-70 disabled:cursor-not-allowed
          "
        >
          {isCompiling ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>BUILDING</span>
            </>
          ) : (
            <>
              <Rocket className="w-3.5 h-3.5" />
              <span>COMPILE PDF</span>
            </>
          )}
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-500 pointer-events-none"></div>
        </button>
        
        <button 
          className="glass-button w-9 h-9 rounded-lg flex items-center justify-center"
          aria-label="More Options"
          title="Settings & Tools"
        >
            <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
