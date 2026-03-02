import React, { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';
import { Code2, Hash, FileCode } from 'lucide-react';
import { EditorView } from '@codemirror/view';

// Custom aesthetic theme for CodeMirror
const customTheme = EditorView.theme({
  '&': {
    backgroundColor: 'transparent !important', // Handle glass effect in CSS
    height: '100%'
  },
  '.cm-content': {
    fontFamily: '"JetBrains Mono", monospace',
    caretColor: '#22d3ee'
  },
  '.cm-gutters': {
    backgroundColor: 'transparent',
    color: 'rgba(255,255,255,0.2)',
    borderRight: 'none'
  },
  '.cm-lineNumbers .cm-gutterElement': {
    paddingRight: '12px'
  }
});

export default function Editor({ code, onChange, onCursorChange }) {
  const extensions = useMemo(() => [
    StreamLanguage.define(stex), 
    customTheme,
    EditorView.lineWrapping
  ], []);

  const handleChange = useCallback((value) => onChange(value), [onChange]);
  
  const handleUpdate = useCallback((viewUpdate) => {
    if (viewUpdate.selectionSet && onCursorChange) {
      const head = viewUpdate.state.selection.main.head;
      const line = viewUpdate.state.doc.lineAt(head);
      onCursorChange({ line: line.number, col: head - line.from + 1 });
    }
  }, [onCursorChange]);

  return (
    <div className="h-full flex flex-col bg-slate-950/30">
      {/* Decorative Header */}
      <div className="h-9 border-b border-white/5 flex items-center justify-between px-4 bg-white/[0.02]">
        <div className="flex items-center gap-2">
            <FileCode className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">Input Source</span>
        </div>
        <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/20 border border-red-500/40"></div>
            <div className="w-2 h-2 rounded-full bg-yellow-500/20 border border-yellow-500/40"></div>
            <div className="w-2 h-2 rounded-full bg-green-500/20 border border-green-500/40"></div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative group">
        {/* Glow effect behind editor */}
        <div className="absolute top-10 right-10 w-96 h-96 bg-violet-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-violet-500/10 transition-colors duration-1000"></div>

        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={handleChange}
          onUpdate={handleUpdate}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLine: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            indentOnInput: true,
            history: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentWithTab: true
          }}
          className="text-[13px] h-full"
        />
      </div>
    </div>
  );
}
