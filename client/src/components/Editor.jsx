import React, { useCallback, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { StreamLanguage } from '@codemirror/language';
import { stex } from '@codemirror/legacy-modes/mode/stex';
import { oneDark } from '@codemirror/theme-one-dark';
import { Code2 } from 'lucide-react';

/**
 * LaTeX code editor panel built on CodeMirror 6.
 * Provides syntax highlighting, line numbers, bracket matching, and more.
 */
export default function Editor({ code, onChange, onCursorChange }) {
  // Define LaTeX language support once
  const extensions = useMemo(() => [StreamLanguage.define(stex)], []);

  const handleChange = useCallback(
    (value) => {
      onChange(value);
    },
    [onChange]
  );

  // Track cursor position from editor view updates
  const handleUpdate = useCallback(
    (viewUpdate) => {
      if (viewUpdate.selectionSet && onCursorChange) {
        const head = viewUpdate.state.selection.main.head;
        const line = viewUpdate.state.doc.lineAt(head);
        onCursorChange({
          line: line.number,
          col: head - line.from + 1,
        });
      }
    },
    [onCursorChange]
  );

  return (
    <div className="h-full flex flex-col bg-[#0d1117]">
      {/* Panel header */}
      <div className="h-8 bg-slate-900/80 border-b border-slate-700/60 flex items-center px-3 shrink-0">
        <Code2 className="w-3.5 h-3.5 text-slate-500 mr-2" />
        <span className="text-xs text-slate-400 font-medium tracking-wide uppercase">
          Editor
        </span>
      </div>

      {/* Editor area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={extensions}
          onChange={handleChange}
          onUpdate={handleUpdate}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: false,
            indentOnInput: true,
            tabSize: 4,
            highlightSelectionMatches: true,
            drawSelection: true,
            rectangularSelection: true,
            crosshairCursor: false,
            dropCursor: true,
          }}
        />
      </div>
    </div>
  );
}
