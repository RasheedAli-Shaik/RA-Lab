import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Toaster, toast } from 'react-hot-toast';
import { Terminal, Sparkles, Zap } from 'lucide-react';

import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import PdfViewer from './components/PdfViewer';
import LogPanel from './components/LogPanel';
import AIHelper from './components/AIHelper';
import AgentPanel from './components/AgentPanel';
import StatusBar from './components/StatusBar';

/* ------------------------------------------------------------------ */
/*  Default LaTeX template                                            */
/* ------------------------------------------------------------------ */
const DEFAULT_TEMPLATE = `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage[margin=1in]{geometry}

\\title{My Document}
\\author{RA-Lab User}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Hello, World! Welcome to \\textbf{RA-Lab} — your LaTeX Workshop IDE.

This is a sample document to get you started. Edit the code on the left
and click \\textbf{Compile} to see your PDF on the right.

\\section{Mathematics}
Einstein's famous equation:
\\[ E = mc^2 \\]

The quadratic formula:
\\[ x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\]

An integral:
\\[ \\int_{0}^{\\infty} e^{-x^2}\\, dx = \\frac{\\sqrt{\\pi}}{2} \\]

\\section{Lists}
\\begin{itemize}
    \\item First item
    \\item Second item
    \\item Third item with \\textit{italic text}
\\end{itemize}

\\section{Conclusion}
Start editing this document and click \\textbf{Compile} to see your PDF!

\\end{document}
`;

/* ------------------------------------------------------------------ */
/*  Toast configuration                                               */
/* ------------------------------------------------------------------ */
const TOAST_OPTIONS = {
  style: {
    background: '#1e293b',
    color: '#e2e8f0',
    border: '1px solid rgba(51, 65, 85, 0.6)',
    fontSize: '13px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  success: {
    iconTheme: { primary: '#10b981', secondary: '#1e293b' },
    duration: 3000,
  },
  error: {
    iconTheme: { primary: '#ef4444', secondary: '#1e293b' },
    duration: 5000,
  },
};

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
export default function App() {
  // ---- State ----
  const [code, setCode] = useState(DEFAULT_TEMPLATE);
  const [fileName, setFileName] = useState('document.tex');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [compilationLogs, setCompilationLogs] = useState('');
  const [compilationErrors, setCompilationErrors] = useState([]);
  const [compilationWarnings, setCompilationWarnings] = useState([]);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [compilationStatus, setCompilationStatus] = useState('idle'); // idle | compiling | success | error
  const [cursorPosition, setCursorPosition] = useState({ line: 1, col: 1 });
  const [activeBottomTab, setActiveBottomTab] = useState('logs');
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // ---- Compile ----
  const handleCompile = useCallback(async () => {
    if (isCompiling) return;
    setIsCompiling(true);
    setCompilationStatus('compiling');
    setActiveBottomTab('logs');
    setCompilationLogs('⏳ Compiling…\n');
    setCompilationErrors([]);
    setCompilationWarnings([]);

    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error?.message || `Server error (HTTP ${res.status})`);
      }

      setCompilationLogs(data.logs || '(no compiler output)');
      setCompilationErrors(data.errors || []);
      setCompilationWarnings(data.warnings || []);

      if (data.pdfGenerated) {
        setPdfUrl(`/api/document/pdf?v=${Date.now()}`);
        setCompilationStatus('success');
        toast.success('Compilation successful!');
      } else {
        setCompilationStatus('error');
        toast.error('Compilation failed — check the log panel.');
      }
    } catch (err) {
      setCompilationLogs(`❌ Compilation error:\n${err.message}`);
      setCompilationErrors([err.message]);
      setCompilationStatus('error');
      toast.error(err.message);
    } finally {
      setIsCompiling(false);
    }
  }, [code, isCompiling]);

  // ---- Save ----
  const handleSave = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/document/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, filename: fileName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || 'Save failed');
      }
      toast.success('Document saved');
    } catch (err) {
      toast.error(`Save failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [code, fileName, isSaving]);

  // ---- AI query (routed through FastAPI agent) ----
  const handleAIQuery = useCallback(
    async (query) => {
      setIsAiLoading(true);
      setAiMessages((prev) => [...prev, { role: 'user', content: query }]);

      try {
        // Build conversation history for multi-turn chat
        const history = aiMessages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }));
        history.push({ role: 'user', content: query });

        const res = await fetch('/api/agent/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: history,
            code: code || undefined,
            logs: compilationLogs || undefined,
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error?.message || data?.detail || 'AI request failed');
        }

        setAiMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.response },
        ]);
      } catch (err) {
        setAiMessages((prev) => [
          ...prev,
          { role: 'error', content: err.message },
        ]);
      } finally {
        setIsAiLoading(false);
      }
    },
    [compilationLogs, code, aiMessages]
  );

  // ---- Apply AI-suggested edit to the editor ----
  const handleApplyEdit = useCallback(
    (find, replace) => {
      if (!code.includes(find)) {
        toast.error('Edit failed: pattern not found in current code.');
        return false;
      }
      setCode(code.replace(find, replace));
      toast.success('Edit applied to editor.');
      return true;
    },
    [code]
  );

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKeyDown = (e) => {
      // Ctrl/Cmd + S → Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + Enter → Compile
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleCompile();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleSave, handleCompile]);

  // ---- Render ----
  return (
    <div className="h-screen flex flex-col overflow-hidden bg-slate-950 text-slate-100">
      <Toaster position="top-right" toastOptions={TOAST_OPTIONS} />

      {/* ── Toolbar ── */}
      <Toolbar
        fileName={fileName}
        onFileNameChange={setFileName}
        onCompile={handleCompile}
        onSave={handleSave}
        isCompiling={isCompiling}
        isSaving={isSaving}
        pdfUrl={pdfUrl}
        compilationStatus={compilationStatus}
      />

      {/* ── Main panels ── */}
      <PanelGroup direction="vertical" className="flex-1 min-h-0">
        {/* Top row: Editor | PDF */}
        <Panel defaultSize={72} minSize={30}>
          <PanelGroup direction="horizontal" className="h-full">
            <Panel defaultSize={50} minSize={20}>
              <Editor
                code={code}
                onChange={setCode}
                onCursorChange={setCursorPosition}
              />
            </Panel>

            <PanelResizeHandle className="w-[5px] bg-slate-800 hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-col-resize" />

            <Panel defaultSize={50} minSize={20}>
              <PdfViewer pdfUrl={pdfUrl} isCompiling={isCompiling} />
            </Panel>
          </PanelGroup>
        </Panel>

        <PanelResizeHandle className="h-[5px] bg-slate-800 hover:bg-blue-500/50 active:bg-blue-500 transition-colors cursor-row-resize" />

        {/* Bottom row: Logs / AI Helper */}
        <Panel defaultSize={28} minSize={8}>
          <div className="h-full flex flex-col bg-slate-950">
            {/* Tab bar */}
            <div className="h-9 bg-slate-900/80 border-b flex items-end px-2 gap-1 shrink-0">
              <TabButton
                active={activeBottomTab === 'logs'}
                onClick={() => setActiveBottomTab('logs')}
                icon={<Terminal className="w-3.5 h-3.5" />}
                label="Compilation Log"
                badge={
                  compilationErrors.length > 0
                    ? compilationErrors.length
                    : null
                }
                badgeColor="red"
              />
              <TabButton
                active={activeBottomTab === 'ai'}
                onClick={() => setActiveBottomTab('ai')}
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="AI Helper"
              />
              <TabButton
                active={activeBottomTab === 'agent'}
                onClick={() => setActiveBottomTab('agent')}
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Agent"
              />
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {activeBottomTab === 'logs' && (
                <LogPanel
                  logs={compilationLogs}
                  errors={compilationErrors}
                  warnings={compilationWarnings}
                />
              )}
              {activeBottomTab === 'ai' && (
                <AIHelper
                  messages={aiMessages}
                  onSendQuery={handleAIQuery}
                  onApplyEdit={handleApplyEdit}
                  isLoading={isAiLoading}
                />
              )}
              {activeBottomTab === 'agent' && (
                <AgentPanel
                  code={code}
                  logs={compilationLogs}
                  onApplyEdit={handleApplyEdit}
                />
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>

      {/* ── Status bar ── */}
      <StatusBar
        cursorPosition={cursorPosition}
        compilationStatus={compilationStatus}
        fileName={fileName}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Small helper: tab button                                          */
/* ------------------------------------------------------------------ */
function TabButton({ active, onClick, icon, label, badge, badgeColor }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-t
        transition-colors select-none
        ${
          active
            ? 'bg-slate-950 text-slate-200 border-t border-x border-slate-700/60'
            : 'text-slate-500 hover:text-slate-300'
        }
      `}
    >
      {icon}
      {label}
      {badge != null && (
        <span
          className={`
            ml-1 px-1.5 py-0.5 text-[10px] leading-none rounded-full font-semibold
            ${badgeColor === 'red' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}
          `}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
