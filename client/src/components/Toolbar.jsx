import React from 'react';
import {
  Play,
  Save,
  Rocket,
  FileCode,
  Loader2,
  Box,
  ChevronRight
} from 'lucide-react';

export default function Toolbar({
  fileName,
  onFileNameChange,
  onCompile,
  onSave,
  isCompiling,
  isSaving,
}) {
  return (
    <div className="glass-panel w-full h-16 rounded-2xl flex items-center px-6 justify-between border-white/5 relative overflow-hidden group">
      
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/4 w-1/2 h-full bg-cyan-500/10 blur-[50px] rounded-full pointer-events-none"></div>

      {/* Left: Brand & File */}
      <div className="flex items-center gap-6 relative z-10">
        <div className="flex items-center gap-3 group/brand">
            <div className="relative">
                <div className="absolute inset-0 bg-cyan-500 blur-md opacity-20 group-hover/brand:opacity-40 transition-opacity"></div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 relative z-10 border border-white/10">
                    <FileCode className="w-5 h-5 text-white" />
                </div>
            </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white leading-none font-sans">
              RA-LAB
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-cyan-300 font-medium opacity-80">
              Workspace
            </span>
          </div>
        </div>

        <div className="h-8 w-[1px] bg-white/10 mx-2"></div>

        <div className="flex items-center gap-2 group/input">
          <span className="text-slate-500 text-sm font-mono opacity-50 select-none">./</span>
          <input
            type="text"
            value={fileName}
            onChange={(e) => onFileNameChange(e.target.value)}
            className="
              bg-transparent text-starlight text-sm font-mono font-medium
              focus:outline-none focus:text-cyan-300 w-48 transition-colors
              placeholder:text-slate-600
            "
          />
          <span className="text-[10px] text-slate-500 border border-slate-700/50 rounded px-1.5 py-0.5 opacity-0 group-hover/input:opacity-100 transition-opacity">
            EDIT
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3 relative z-10">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="group relative px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all outline-none overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
          {isSaving ? (
             <Loader2 className="w-4 h-4 text-slate-300 animate-spin" />
          ) : (
             <span className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-white">
               <Save className="w-4 h-4" />
               <span>Save Disc</span>
             </span>
          )}
        </button>

        <button
          onClick={onCompile}
          disabled={isCompiling}
          className="group relative px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 border border-cyan-400/30 flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95 transition-all duration-300"
        >
          {isCompiling ? (
            <>
              <Loader2 className="w-4 h-4 text-white animate-spin" />
              <span className="text-sm font-bold text-white tracking-wide">COMPILING</span>
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4 text-white group-hover:rotate-45 transition-transform duration-300" />
              <span className="text-sm font-bold text-white tracking-wide">COMPILE</span>
              <div className="w-px h-3 bg-white/20 mx-1"></div>
              <ChevronRight className="w-3 h-3 text-white/70" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
