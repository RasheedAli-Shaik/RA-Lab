import React from 'react';
import { FileText, Loader2, Eye } from 'lucide-react';

/**
 * PDF preview panel.
 * Uses an <object> tag with embedded PDF viewer for reliable inline display.
 */
export default function PdfViewer({ pdfUrl, isCompiling }) {
  return (
    <div className="h-full flex flex-col bg-[#1a1a2e]">
      {/* Panel header */}
      <div className="h-8 bg-slate-900/80 border-b border-slate-700/60 flex items-center px-3 shrink-0">
        <Eye className="w-3.5 h-3.5 text-slate-500 mr-2" />
        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
          PDF Preview
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 relative">
        {/* Compilation overlay */}
        {isCompiling && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 flex flex-col items-center justify-center animate-fade-in">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
            <p className="text-slate-300 text-sm font-medium">Compiling…</p>
            <p className="text-slate-500 text-xs mt-1">
              This may take a moment on first run
            </p>
          </div>
        )}

        {/* PDF or placeholder */}
        {pdfUrl ? (
          <object
            data={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
            type="application/pdf"
            className="w-full h-full border-0 bg-white"
            title="PDF Preview"
          >
            <iframe
              src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`}
              className="w-full h-full border-0 bg-white"
              title="PDF Preview fallback"
            />
          </object>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-800/50 flex items-center justify-center mb-5">
              <FileText className="w-10 h-10 opacity-40" />
            </div>
            <p className="text-lg font-semibold text-slate-400">
              No PDF Generated Yet
            </p>
            <p className="text-sm mt-2 max-w-xs leading-relaxed">
              Write your LaTeX code in the editor, then click&nbsp;
              <span className="text-blue-400 font-medium">Compile</span> or
              press{' '}
              <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-xs font-mono border border-slate-700">
                Ctrl+↵
              </kbd>{' '}
              to generate a PDF.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
