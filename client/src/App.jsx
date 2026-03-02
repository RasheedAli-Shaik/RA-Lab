import React, { useState, useCallback, useEffect } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { Toaster, toast } from 'react-hot-toast';
import { Terminal, Sparkles, Layout, Grid, Cpu, Layers } from 'lucide-react';

import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import PdfViewer from './components/PdfViewer';
import LogPanel from './components/LogPanel';
import ChatPanel from './components/ChatPanel';
import StatusBar from './components/StatusBar';

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

const TOAST_OPTIONS = {
  style: {
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(10px)',
    color: '#e2e8f0',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    fontSize: '13px',
    fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  },
  success: {
    iconTheme: { primary: '#00f3ff', secondary: '#0f172a' },
    duration: 3000,
  },
  error: {
    iconTheme: { primary: '#ff00aa', secondary: '#0f172a' },
    duration: 5000,
  },
};

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

  // Compile 
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

  // Save 
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

  // Apply an array of edits from the AI to the editor in one go
  const applyEdits = useCallback(
    (edits) => {
      let current = code;
      let applied = 0;
      for (const edit of edits) {
        if (current.includes(edit.find)) {
          current = current.replace(edit.find, edit.replace);
          applied++;
        }
      }
      if (applied > 0) setCode(current);
      return applied;
    },
    [code]
  );

  // Keyboard shortcuts 
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

  // Render
  return (
    <div className="h-screen w-screen overflow-hidden text-slate-100 flex flex-col relative font-sans selection:bg-cyan-500/30 selection:text-cyan-100">
      <Toaster position="bottom-right" toastOptions={TOAST_OPTIONS} />
      
      {/* ── Background Effects ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(112,0,255,0.05),transparent_70%)]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/5 blur-[120px] rounded-full translate-y-1/2 translate-x-1/2" />
        <div className="absolute top-1/2 left-0 w-[300px] h-[300px] bg-purple-600/5 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative z-10 flex flex-col h-full p-3 gap-3">
        {/* ── Toolbar ── */}
        <div className="shrink-0 animate-slide-up">
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
        </div>

        {/* ── Main Workspace Glass Panel ── */}
        <div className="flex-1 min-h-0 glass-panel rounded-2xl overflow-hidden flex flex-col shadow-2xl relative animate-fade-in">
            <PanelGroup direction="vertical" className="flex-1 min-h-0">
            {/* Top row: Editor | PDF */}
            <Panel defaultSize={70} minSize={30}>
                <PanelGroup direction="horizontal" className="h-full">
                <Panel defaultSize={50} minSize={20} className="bg-transparent">
                    <Editor
                    code={code}
                    onChange={setCode}
                    onCursorChange={setCursorPosition}
                    />
                </Panel>

                <PanelResizeHandle className="w-[2px] bg-white/5 hover:bg-cyan-500/50 transition-colors cursor-col-resize relative z-50 group">
                   <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-white/20 group-hover:bg-cyan-400 transition-colors"></div>
                </PanelResizeHandle>

                <Panel defaultSize={50} minSize={20} className="bg-transparent">
                    <PdfViewer pdfUrl={pdfUrl} isCompiling={isCompiling} />
                </Panel>
                </PanelGroup>
            </Panel>

            <PanelResizeHandle className="h-[2px] bg-white/5 hover:bg-cyan-500/50 transition-colors cursor-row-resize relative z-50 group">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-1 rounded-full bg-white/20 group-hover:bg-cyan-400 transition-colors"></div>
            </PanelResizeHandle>

            {/* Bottom row: Logs / AI Helper */}
            <Panel defaultSize={30} minSize={10} className="bg-[#050510]/80 backdrop-blur-md">
                <div className="h-full flex flex-col">
                {/* Tab bar */}
                <div className="h-10 border-b border-white/5 flex items-center px-4 gap-4 bg-white/[0.02]">
                    <TabButton
                    active={activeBottomTab === 'logs'}
                    onClick={() => setActiveBottomTab('logs')}
                    icon={<Terminal className="w-3.5 h-3.5" />}
                    label="SYSTEM LOGS"
                    badge={compilationErrors.length > 0 ? compilationErrors.length : null}
                    />
                    <TabButton
                    active={activeBottomTab === 'chat'}
                    onClick={() => setActiveBottomTab('chat')}
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    label="NEURAL ASSISTANT"
                    />
                    
                    <div className="flex-1"></div>
                    <div className="text-[10px] uppercase tracking-widest text-slate-600 font-mono">
                         v2.0 • build 492
                    </div>
                </div>

                {/* Tab content */}
                <div className="flex-1 min-h-0 overflow-hidden relative">
                     {/* Inner shadow for depth */}
                     <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10"></div>
                     
                    {activeBottomTab === 'logs' && (
                    <LogPanel
                        logs={compilationLogs}
                        errors={compilationErrors}
                        warnings={compilationWarnings}
                    />
                    )}
                    {activeBottomTab === 'chat' && (
                    <ChatPanel
                        code={code}
                        logs={compilationLogs}
                        onApplyEdits={applyEdits}
                        onSetCode={setCode}
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
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative group flex items-center gap-2 py-1.5 px-1 text-[10px] font-bold tracking-widest uppercase transition-all
        ${active ? 'text-cyan-400' : 'text-slate-500 hover:text-slate-300'}
      `}
    >
      <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
          {icon}
      </span>
      <span>{label}</span>
      
      {/* Active Indicator Line */}
      {active && (
        <div className="absolute -bottom-[11px] left-0 w-full h-[2px] bg-cyan-500 shadow-[0_0_10px_#00f3ff]"></div>
      )}
      
      {/* Badge */}
      {badge && (
        <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500/20 text-red-400 text-[9px] border border-red-500/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]">
          {badge}
        </span>
      )}
    </button>
  );
}
