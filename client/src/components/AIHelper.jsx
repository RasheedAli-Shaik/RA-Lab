import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  AlertCircle,
  Bot,
  User,
  Eraser,
  Wand2,
  BookOpen,
  Check,
  X,
  GitMerge,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Edit block parser                                                  */
/* ------------------------------------------------------------------ */
/**
 * Parse AI response text for <<<SUGGESTED_EDIT>>> blocks.
 * Returns an array of segments:
 *   { type: 'text', content: string }
 *   { type: 'edit', find: string, replace: string, id: number }
 */
function parseResponseSegments(text) {
  const segments = [];
  const editPattern = /<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\n?([\s\S]*?)<<<REPLACE>>>\n?([\s\S]*?)<<<END_EDIT>>>/g;

  let lastIdx = 0;
  let editId = 0;
  let match;

  while ((match = editPattern.exec(text)) !== null) {
    // Text before this edit block
    if (match.index > lastIdx) {
      const before = text.slice(lastIdx, match.index).trim();
      if (before) segments.push({ type: 'text', content: before });
    }

    segments.push({
      type: 'edit',
      find: match[1].replace(/\n$/, ''),
      replace: match[2].replace(/\n$/, ''),
      id: editId++,
    });

    lastIdx = match.index + match[0].length;
  }

  // Remaining text after last edit block
  if (lastIdx < text.length) {
    const remaining = text.slice(lastIdx).trim();
    if (remaining) segments.push({ type: 'text', content: remaining });
  }

  // If no edit blocks found, return the whole text as one segment
  if (segments.length === 0 && text.trim()) {
    segments.push({ type: 'text', content: text });
  }

  return segments;
}

/**
 * AI-powered LaTeX helper panel with code-edit capabilities.
 * Chat-style interface that sends queries to the Gemini-backed API.
 * Parses SUGGESTED_EDIT blocks and provides Accept/Reject buttons.
 */
export default function AIHelper({ messages, onSendQuery, onApplyEdit, isLoading }) {
  const [input, setInput] = useState('');
  const [appliedEdits, setAppliedEdits] = useState(new Set());
  const [rejectedEdits, setRejectedEdits] = useState(new Set());
  const endRef = useRef(null);

  // Scroll to newest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    onSendQuery(q);
    setInput('');
  };

  const quickAction = (query) => {
    if (isLoading) return;
    onSendQuery(query);
  };

  const handleAcceptEdit = (msgIdx, editId, find, replace) => {
    const key = `${msgIdx}-${editId}`;
    if (appliedEdits.has(key) || rejectedEdits.has(key)) return;
    const success = onApplyEdit(find, replace);
    if (success) {
      setAppliedEdits((prev) => new Set([...prev, key]));
    }
  };

  const handleRejectEdit = (msgIdx, editId) => {
    const key = `${msgIdx}-${editId}`;
    setRejectedEdits((prev) => new Set([...prev, key]));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Quick-action bar */}
      <div className="px-3 py-2 border-b border-slate-700/60 flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-thin">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mr-1 whitespace-nowrap">
          Quick:
        </span>
        <QuickButton
          icon={<Wand2 className="w-3 h-3" />}
          label="Analyze Errors"
          disabled={isLoading}
          onClick={() =>
            quickAction('Analyze the compilation errors and suggest fixes using SUGGESTED_EDIT blocks.')
          }
          color="purple"
        />
        <QuickButton
          icon={<BookOpen className="w-3 h-3" />}
          label="Review Code"
          disabled={isLoading}
          onClick={() =>
            quickAction(
              'Review my LaTeX code for issues and best-practice improvements. Suggest fixes using SUGGESTED_EDIT blocks.'
            )
          }
          color="cyan"
        />
        <QuickButton
          icon={<Eraser className="w-3 h-3" />}
          label="Fix Warnings"
          disabled={isLoading}
          onClick={() =>
            quickAction(
              'Help me resolve the warnings in the compilation output. Provide SUGGESTED_EDIT blocks for each fix.'
            )
          }
          color="amber"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-purple-400 opacity-60" />
            </div>
            <p className="text-sm font-medium text-slate-400">
              RA-Lab AI Assistant
            </p>
            <p className="text-xs mt-1 text-center max-w-xs leading-relaxed">
              Ask questions about LaTeX, request code snippets, or use the quick
              actions above to analyze errors. The AI can suggest edits that you
              can accept or reject with a single click.
            </p>
          </div>
        )}

        {messages.map((msg, msgIdx) => (
          <MessageBubble
            key={msgIdx}
            message={msg}
            msgIdx={msgIdx}
            appliedEdits={appliedEdits}
            rejectedEdits={rejectedEdits}
            onAcceptEdit={handleAcceptEdit}
            onRejectEdit={handleRejectEdit}
          />
        ))}

        {isLoading && (
          <div className="flex gap-2 animate-fade-in">
            <Avatar role="assistant" />
            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-400" />
              Analyzing…
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={submit}
        className="border-t border-slate-700/60 p-2 flex gap-2 shrink-0 bg-slate-900/30"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about LaTeX…"
          disabled={isLoading}
          className="
            flex-1 bg-slate-800/60 text-slate-200 text-sm px-3 py-2 rounded-lg
            border border-slate-600/60 placeholder-slate-500
            focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30
            focus:outline-none disabled:opacity-50 transition-colors
          "
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="
            p-2.5 rounded-lg bg-purple-600 hover:bg-purple-700
            text-white transition-colors
            disabled:opacity-40 disabled:cursor-not-allowed
          "
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

/* ── Internal helpers ────────────────────────────────────────────── */

function MessageBubble({ message, msgIdx, appliedEdits, rejectedEdits, onAcceptEdit, onRejectEdit }) {
  const { role, content } = message;

  const isUser = role === 'user';
  const isError = role === 'error';

  // Parse assistant messages for edit blocks
  const segments = role === 'assistant'
    ? parseResponseSegments(content)
    : [{ type: 'text', content }];

  return (
    <div
      className={`flex gap-2 animate-slide-up ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && <Avatar role={role} />}
      <div
        className={`
          max-w-[85%] rounded-lg text-sm leading-relaxed
          ${
            isUser
              ? 'bg-blue-600 text-white rounded-br-sm px-3 py-2'
              : isError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-2'
              : 'bg-slate-800/70 text-slate-200 rounded-bl-sm'
          }
        `}
      >
        {isUser || isError ? (
          <pre className="whitespace-pre-wrap font-sans text-[13px]">
            {content}
          </pre>
        ) : (
          <div className="space-y-0">
            {segments.map((seg, segIdx) => {
              if (seg.type === 'text') {
                return (
                  <pre key={segIdx} className="whitespace-pre-wrap font-sans text-[13px] px-3 py-2">
                    {seg.content}
                  </pre>
                );
              }
              // Edit block
              const editKey = `${msgIdx}-${seg.id}`;
              const isApplied = appliedEdits.has(editKey);
              const isRejected = rejectedEdits.has(editKey);

              return (
                <EditBlock
                  key={segIdx}
                  find={seg.find}
                  replace={seg.replace}
                  isApplied={isApplied}
                  isRejected={isRejected}
                  onAccept={() => onAcceptEdit(msgIdx, seg.id, seg.find, seg.replace)}
                  onReject={() => onRejectEdit(msgIdx, seg.id)}
                />
              );
            })}
          </div>
        )}
      </div>
      {isUser && <Avatar role="user" />}
    </div>
  );
}

function EditBlock({ find, replace, isApplied, isRejected, onAccept, onReject }) {
  return (
    <div className="mx-2 my-2 border border-slate-600/40 rounded-lg overflow-hidden bg-slate-900/60">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-600/40">
        <div className="flex items-center gap-1.5 text-[11px] text-purple-300 font-semibold">
          <GitMerge className="w-3 h-3" />
          Suggested Edit
        </div>
        <div className="flex items-center gap-1">
          {isApplied ? (
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <Check className="w-3 h-3" /> Applied
            </span>
          ) : isRejected ? (
            <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
              <X className="w-3 h-3" /> Rejected
            </span>
          ) : (
            <>
              <button
                onClick={onAccept}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-emerald-600/80 hover:bg-emerald-600 text-white transition-colors flex items-center gap-1"
                title="Apply this edit to your code"
              >
                <Check className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={onReject}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-600/80 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1"
                title="Dismiss this edit"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </>
          )}
        </div>
      </div>

      {/* Diff view */}
      <div className="grid grid-cols-1 divide-y divide-slate-700/40">
        {/* Remove */}
        <div className="px-3 py-1.5 bg-red-500/5">
          <div className="text-[10px] text-red-400 font-semibold mb-0.5 uppercase tracking-wider">Remove</div>
          <pre className="text-[12px] text-red-300/90 font-mono whitespace-pre-wrap leading-5 break-all">{find}</pre>
        </div>
        {/* Add */}
        <div className="px-3 py-1.5 bg-emerald-500/5">
          <div className="text-[10px] text-emerald-400 font-semibold mb-0.5 uppercase tracking-wider">Replace with</div>
          <pre className="text-[12px] text-emerald-300/90 font-mono whitespace-pre-wrap leading-5 break-all">{replace}</pre>
        </div>
      </div>
    </div>
  );
}

function Avatar({ role }) {
  const config = {
    user: { bg: 'bg-blue-500/20', Icon: User, color: 'text-blue-400' },
    assistant: {
      bg: 'bg-purple-500/20',
      Icon: Sparkles,
      color: 'text-purple-400',
    },
    error: { bg: 'bg-red-500/20', Icon: AlertCircle, color: 'text-red-400' },
  }[role] || { bg: 'bg-slate-700', Icon: Bot, color: 'text-slate-400' };

  return (
    <div
      className={`w-6 h-6 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
    >
      <config.Icon className={`w-3 h-3 ${config.color}`} />
    </div>
  );
}

function QuickButton({ icon, label, disabled, onClick, color }) {
  const colors = {
    purple: 'bg-purple-600/15 text-purple-300 hover:bg-purple-600/25',
    cyan: 'bg-cyan-600/15 text-cyan-300 hover:bg-cyan-600/25',
    amber: 'bg-amber-600/15 text-amber-300 hover:bg-amber-600/25',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1 px-2 py-1 text-[11px] rounded-md
        font-medium whitespace-nowrap transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        ${colors[color] || colors.purple}
      `}
    >
      {icon}
      {label}
    </button>
  );
}
