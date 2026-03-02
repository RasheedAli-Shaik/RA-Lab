import React from 'react';
import {
  Play,
  Save,
  Download,
  FileText,
  Loader2,
  Keyboard,
} from 'lucide-react';

export default function Toolbar({
  fileName,
  onFileNameChange,
  onCompile,
  onSave,
  isCompiling,
  isSaving,
  pdfUrl,
  compilationStatus,
}) {
  const handleDownloadPdf = async () => {
    try {
      const res = await fetch('/api/document/pdf');
      if (!res.ok) throw new Error('No PDF available');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.replace(/\.tex$/, '.pdf') || 'document.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      // Silently fail — button is only shown when pdfUrl exists
    }
  };

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700/60 flex items-center px-4 gap-2 shrink-0 select-none">
      {/* ── Brand ── */}
      <div className="flex items-center gap-2 mr-3">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
          <FileText className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="font-bold text-base tracking-tight text-white hidden sm:inline">
          RA-<span className="text-blue-400">Lab</span>
        </span>
      </div>

      <Separator />

      {/* ── File name ── */}
      <input
        type="text"
        value={fileName}
        onChange={(e) => onFileNameChange(e.target.value)}
        spellCheck={false}
        className="
          bg-slate-800/60 text-slate-200 text-sm font-mono px-2.5 py-1 rounded
          border border-slate-600/60 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
          focus:outline-none w-36 sm:w-44 transition-colors
        "
      />

      <Separator />

      {/* ── Save .tex to server ── */}
      <ToolbarButton
        onClick={onSave}
        disabled={isSaving}
        icon={
          isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )
        }
        label="Save .tex"
        shortcut="Ctrl+S"
      />

      {/* ── Compile ── */}
      <button
        onClick={onCompile}
        disabled={isCompiling}
        className="
          flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold rounded
          bg-blue-600 hover:bg-blue-700 active:bg-blue-800
          text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        "
        title="Compile (Ctrl+Enter)"
      >
        {isCompiling ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" fill="currentColor" />
        )}
        {isCompiling ? 'Compiling…' : 'Compile'}
      </button>

      {/* ── Download PDF (separate from Save .tex) ── */}
      {pdfUrl && (
        <button
          onClick={handleDownloadPdf}
          className="
            flex items-center gap-1.5 px-3 py-1.5 text-sm rounded
            bg-slate-800 hover:bg-slate-700 text-slate-200
            transition-colors
          "
          title="Download compiled PDF to your computer"
        >
          <Download className="w-4 h-4" />
          <span className="hidden sm:inline">Download PDF</span>
        </button>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Compilation status pill ── */}
      <StatusPill status={compilationStatus} />

      {/* ── Keyboard hint ── */}
      <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 ml-2">
        <Keyboard className="w-3.5 h-3.5" />
        <span>Ctrl+↵ Compile</span>
      </div>
    </header>
  );
}

/* Small internal components */

function Separator() {
  return <div className="h-5 w-px bg-slate-700/60 mx-1" />;
}

function ToolbarButton({ onClick, disabled, icon, label, shortcut }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="
        flex items-center gap-1.5 px-3 py-1.5 text-sm rounded
        bg-slate-800 hover:bg-slate-700 active:bg-slate-600
        text-slate-200 transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
      "
      title={shortcut ? `${label} (${shortcut})` : label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function StatusPill({ status }) {
  if (status === 'idle') return null;

  const config = {
    compiling: {
      bg: 'bg-blue-500/15',
      text: 'text-blue-400',
      dot: 'bg-blue-400 animate-pulse',
      label: 'Compiling',
    },
    success: {
      bg: 'bg-emerald-500/15',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      label: 'Compiled',
    },
    error: {
      bg: 'bg-red-500/15',
      text: 'text-red-400',
      dot: 'bg-red-400',
      label: 'Errors',
    },
  }[status];

  if (!config) return null;

  return (
    <span
      className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}
