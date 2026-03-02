import React from 'react';
import { FileCode2, Cpu } from 'lucide-react';

/**
 * Minimal status bar at the very bottom of the IDE.
 * Shows cursor position, filename, engine, and compilation status.
 */
export default function StatusBar({
  cursorPosition,
  compilationStatus,
  fileName,
}) {
  const statusLabel = {
    idle: null,
    compiling: '● Compiling…',
    success: '● Compiled',
    error: '● Errors',
  }[compilationStatus];

  const statusColor = {
    idle: '',
    compiling: 'text-blue-400',
    success: 'text-emerald-400',
    error: 'text-red-400',
  }[compilationStatus];

  return (
    <footer className="h-6 bg-slate-900 border-t border-slate-700/60 flex items-center px-3 text-[11px] text-slate-500 gap-3 shrink-0 select-none">
      {/* Cursor position */}
      <span className="font-mono">
        Ln {cursorPosition.line}, Col {cursorPosition.col}
      </span>

      <Sep />

      {/* File name */}
      <span className="flex items-center gap-1">
        <FileCode2 className="w-3 h-3" />
        {fileName}
      </span>

      <Sep />

      {/* Language */}
      <span>LaTeX</span>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Compilation status */}
      {statusLabel && (
        <>
          <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
          <Sep />
        </>
      )}

      {/* Engine */}
      <span className="flex items-center gap-1">
        <Cpu className="w-3 h-3" />
        tectonic
      </span>
    </footer>
  );
}

function Sep() {
  return <div className="h-3 w-px bg-slate-700/60" />;
}
