import React, { useRef, useEffect } from 'react';
import {
  Terminal,
  AlertTriangle,
  XCircle,
  Info,
  CheckCircle2,
} from 'lucide-react';

/**
 * Compilation log panel.
 * Renders raw tectonic output with color-coded error/warning lines.
 */
export default function LogPanel({ logs, errors = [], warnings = [] }) {
  const scrollRef = useRef(null);

  // Auto-scroll to bottom when logs change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="h-full flex flex-col">
      {/* Log output */}
      <div ref={scrollRef} className="flex-1 overflow-auto p-3 scrollbar-thin">
        {logs ? (
          <div className="space-y-0">
            {logs.split('\n').map((line, idx) => (
              <LogLine key={idx} line={line} />
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <Terminal className="w-6 h-6 mb-2 opacity-40" />
            <p className="text-sm">Compilation output will appear here</p>
          </div>
        )}
      </div>

      {/* Summary bar */}
      {(errors.length > 0 || warnings.length > 0) && (
        <div className="border-t border-slate-700/60 px-3 py-1.5 flex gap-4 text-xs bg-slate-900/50 shrink-0">
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <XCircle className="w-3 h-3" />
              {errors.length} error{errors.length !== 1 ? 's' : ''}
            </span>
          )}
          {warnings.length > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertTriangle className="w-3 h-3" />
              {warnings.length} warning{warnings.length !== 1 ? 's' : ''}
            </span>
          )}
          {errors.length === 0 && warnings.length === 0 && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3 h-3" />
              No issues
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Individual log line with colour coding ─────────────────────── */

function LogLine({ line }) {
  if (!line.trim()) return null;

  let colorClass = 'text-slate-400';
  let Icon = null;

  const lower = line.toLowerCase();

  if (
    lower.startsWith('error:') ||
    lower.startsWith('error[') ||
    lower.startsWith('! ') ||
    lower.includes('fatal error')
  ) {
    colorClass = 'text-red-400';
    Icon = XCircle;
  } else if (
    lower.startsWith('warning:') ||
    lower.includes('latex warning') ||
    lower.includes('overfull') ||
    lower.includes('underfull')
  ) {
    colorClass = 'text-amber-400';
    Icon = AlertTriangle;
  } else if (
    lower.startsWith('note:') ||
    lower.includes('[info]')
  ) {
    colorClass = 'text-blue-400';
    Icon = Info;
  }

  return (
    <div className={`${colorClass} font-mono text-xs leading-5 flex items-start gap-1`}>
      {Icon && <Icon className="w-3 h-3 mt-0.5 flex-shrink-0" />}
      <span className="whitespace-pre-wrap break-all">{line}</span>
    </div>
  );
}
