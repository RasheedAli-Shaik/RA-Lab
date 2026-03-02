import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Loader2,
  Bot,
  User,
  AlertCircle,
  Wand2,
  Wrench,
  BookOpen,
  FileCode,
  Zap,
  Check,
  X,
  GitMerge,
  RefreshCw,
} from 'lucide-react';

const EDIT_RE =
  /<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\n?([\s\S]*?)<<<REPLACE>>>\n?([\s\S]*?)<<<END_EDIT>>>/g;

function parseSegments(text) {
  const segments = [];
  let lastIdx = 0;
  let editId = 0;
  let m;
  EDIT_RE.lastIndex = 0;
  while ((m = EDIT_RE.exec(text)) !== null) {
    if (m.index > lastIdx) {
      const t = text.slice(lastIdx, m.index).trim();
      if (t) segments.push({ type: 'text', content: t });
    }
    segments.push({
      type: 'edit',
      find: m[1].replace(/\n$/, ''),
      replace: m[2].replace(/\n$/, ''),
      id: editId++,
    });
    lastIdx = m.index + m[0].length;
  }
  if (lastIdx < text.length) {
    const t = text.slice(lastIdx).trim();
    if (t) segments.push({ type: 'text', content: t });
  }
  if (segments.length === 0 && text.trim()) {
    segments.push({ type: 'text', content: text });
  }
  return segments;
}

export default function AgentPanel({ code, logs, onApplyEdit }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeMode, setActiveMode] = useState('chat');
  const [appliedEdits, setAppliedEdits] = useState(new Set());
  const [rejectedEdits, setRejectedEdits] = useState(new Set());
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const callAgent = async (query, mode) => {
    setIsLoading(true);
    setMessages((p) => [...p, { role: 'user', content: query }]);
    try {
      const res = await fetch(`/api/agent/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, code: code || undefined, logs: logs || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || `HTTP ${res.status}`);
      }
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: data.response,
          mode: data.mode,
          edits: data.edits || [],
        },
      ]);
    } catch (err) {
      setMessages((p) => [...p, { role: 'error', content: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const callChat = async (query) => {
    setIsLoading(true);
    setMessages((p) => [...p, { role: 'user', content: query }]);
    try {
      // Build conversation history for multi-turn
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: query });

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          code: code || undefined,
          logs: logs || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || data?.detail || `HTTP ${res.status}`);
      }
      setMessages((p) => [
        ...p,
        {
          role: 'assistant',
          content: data.response,
          mode: 'chat',
          edits: data.edits || [],
        },
      ]);
    } catch (err) {
      setMessages((p) => [...p, { role: 'error', content: err.message }]);
    } finally {
      setIsLoading(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    const q = input.trim();
    if (!q || isLoading) return;
    setInput('');
    if (activeMode === 'chat') {
      callChat(q);
    } else {
      callAgent(q, activeMode);
    }
  };

  const handleAcceptEdit = (msgIdx, editId, find, replace) => {
    const key = `${msgIdx}-${editId}`;
    if (appliedEdits.has(key) || rejectedEdits.has(key)) return;
    const success = onApplyEdit(find, replace);
    if (success) setAppliedEdits((p) => new Set([...p, key]));
  };

  const handleRejectEdit = (msgIdx, editId) => {
    const key = `${msgIdx}-${editId}`;
    setRejectedEdits((p) => new Set([...p, key]));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Mode selector */}
      <div className="px-2 py-1.5 border-b border-slate-700/60 flex items-center gap-1.5 shrink-0 overflow-x-auto scrollbar-thin">
        <ModeBtn
          icon={<Sparkles className="w-3 h-3" />}
          label="Chat"
          active={activeMode === 'chat'}
          onClick={() => setActiveMode('chat')}
          color="purple"
        />
        <ModeBtn
          icon={<Wand2 className="w-3 h-3" />}
          label="Generate"
          active={activeMode === 'generate'}
          onClick={() => setActiveMode('generate')}
          color="blue"
        />
        <ModeBtn
          icon={<Wrench className="w-3 h-3" />}
          label="Fix"
          active={activeMode === 'fix'}
          onClick={() => setActiveMode('fix')}
          color="red"
        />
        <ModeBtn
          icon={<RefreshCw className="w-3 h-3" />}
          label="Refactor"
          active={activeMode === 'refactor'}
          onClick={() => setActiveMode('refactor')}
          color="amber"
        />
        <ModeBtn
          icon={<BookOpen className="w-3 h-3" />}
          label="Explain"
          active={activeMode === 'explain'}
          onClick={() => setActiveMode('explain')}
          color="cyan"
        />
        <ModeBtn
          icon={<FileCode className="w-3 h-3" />}
          label="Complete"
          active={activeMode === 'complete'}
          onClick={() => setActiveMode('complete')}
          color="emerald"
        />
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3">
              <Zap className="w-6 h-6 text-indigo-400 opacity-60" />
            </div>
            <p className="text-sm font-medium text-slate-400">RA-Lab Coding Agent</p>
            <p className="text-xs mt-1 text-center max-w-xs leading-relaxed">
              An autonomous LaTeX coding agent powered by Gemini.
              Select a mode above, then type your request.
              The agent can generate, fix, refactor, explain, and
              complete LaTeX code with structured edits.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <MsgBubble
            key={idx}
            msg={msg}
            msgIdx={idx}
            applied={appliedEdits}
            rejected={rejectedEdits}
            onAccept={handleAcceptEdit}
            onReject={handleRejectEdit}
          />
        ))}

        {isLoading && (
          <div className="flex gap-2 animate-fade-in">
            <Av role="assistant" />
            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              Agent working…
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
          placeholder={PLACEHOLDERS[activeMode] || 'Ask the agent…'}
          disabled={isLoading}
          className="
            flex-1 bg-slate-800/60 text-slate-200 text-sm px-3 py-2 rounded-lg
            border border-slate-600/60 placeholder-slate-500
            focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
            focus:outline-none disabled:opacity-50 transition-colors
          "
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="p-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

const PLACEHOLDERS = {
  chat: 'Chat with the agent…',
  generate: 'Describe the document to generate…',
  fix: 'Describe what to fix or just send…',
  refactor: 'What should be improved?',
  explain: 'Ask for an explanation…',
  complete: 'What should be completed?',
};

function ModeBtn({ icon, label, active, onClick, color }) {
  const base = {
    purple: 'bg-purple-600/15 text-purple-300 hover:bg-purple-600/30',
    blue: 'bg-blue-600/15 text-blue-300 hover:bg-blue-600/30',
    red: 'bg-red-600/15 text-red-300 hover:bg-red-600/30',
    amber: 'bg-amber-600/15 text-amber-300 hover:bg-amber-600/30',
    cyan: 'bg-cyan-600/15 text-cyan-300 hover:bg-cyan-600/30',
    emerald: 'bg-emerald-600/15 text-emerald-300 hover:bg-emerald-600/30',
  };
  const activeClass = {
    purple: 'bg-purple-600/40 text-purple-200 ring-1 ring-purple-500/50',
    blue: 'bg-blue-600/40 text-blue-200 ring-1 ring-blue-500/50',
    red: 'bg-red-600/40 text-red-200 ring-1 ring-red-500/50',
    amber: 'bg-amber-600/40 text-amber-200 ring-1 ring-amber-500/50',
    cyan: 'bg-cyan-600/40 text-cyan-200 ring-1 ring-cyan-500/50',
    emerald: 'bg-emerald-600/40 text-emerald-200 ring-1 ring-emerald-500/50',
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 text-[11px] rounded-md font-medium whitespace-nowrap transition-all ${
        active ? activeClass[color] : base[color]
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MsgBubble({ msg, msgIdx, applied, rejected, onAccept, onReject }) {
  const isUser = msg.role === 'user';
  const isErr = msg.role === 'error';
  const segments =
    msg.role === 'assistant' ? parseSegments(msg.content) : [{ type: 'text', content: msg.content }];

  return (
    <div className={`flex gap-2 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Av role={msg.role} />}
      <div
        className={`max-w-[85%] rounded-lg text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm px-3 py-2'
            : isErr
            ? 'bg-red-500/10 text-red-300 border border-red-500/20 px-3 py-2'
            : 'bg-slate-800/70 text-slate-200 rounded-bl-sm'
        }`}
      >
        {isUser || isErr ? (
          <pre className="whitespace-pre-wrap font-sans text-[13px]">{msg.content}</pre>
        ) : (
          <div className="space-y-0">
            {segments.map((s, i) => {
              if (s.type === 'text') {
                return (
                  <pre key={i} className="whitespace-pre-wrap font-sans text-[13px] px-3 py-2">
                    {s.content}
                  </pre>
                );
              }
              const key = `${msgIdx}-${s.id}`;
              return (
                <EditCard
                  key={i}
                  find={s.find}
                  replace={s.replace}
                  isApplied={applied.has(key)}
                  isRejected={rejected.has(key)}
                  onAccept={() => onAccept(msgIdx, s.id, s.find, s.replace)}
                  onReject={() => onReject(msgIdx, s.id)}
                />
              );
            })}
          </div>
        )}
        {msg.mode && !isUser && !isErr && (
          <div className="px-3 pb-2 pt-0">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              mode: {msg.mode}
            </span>
          </div>
        )}
      </div>
      {isUser && <Av role="user" />}
    </div>
  );
}

function EditCard({ find, replace, isApplied, isRejected, onAccept, onReject }) {
  return (
    <div className="mx-2 my-2 border border-slate-600/40 rounded-lg overflow-hidden bg-slate-900/60">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800/80 border-b border-slate-600/40">
        <div className="flex items-center gap-1.5 text-[11px] text-indigo-300 font-semibold">
          <GitMerge className="w-3 h-3" />
          Agent Edit
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
              >
                <Check className="w-3 h-3" /> Accept
              </button>
              <button
                onClick={onReject}
                className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-600/80 hover:bg-slate-600 text-slate-300 transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 divide-y divide-slate-700/40">
        <div className="px-3 py-1.5 bg-red-500/5">
          <div className="text-[10px] text-red-400 font-semibold mb-0.5 uppercase tracking-wider">Remove</div>
          <pre className="text-[12px] text-red-300/90 font-mono whitespace-pre-wrap leading-5 break-all">
            {find}
          </pre>
        </div>
        <div className="px-3 py-1.5 bg-emerald-500/5">
          <div className="text-[10px] text-emerald-400 font-semibold mb-0.5 uppercase tracking-wider">Replace with</div>
          <pre className="text-[12px] text-emerald-300/90 font-mono whitespace-pre-wrap leading-5 break-all">
            {replace}
          </pre>
        </div>
      </div>
    </div>
  );
}

function Av({ role }) {
  const cfg = {
    user: { bg: 'bg-blue-500/20', Icon: User, color: 'text-blue-400' },
    assistant: { bg: 'bg-indigo-500/20', Icon: Zap, color: 'text-indigo-400' },
    error: { bg: 'bg-red-500/20', Icon: AlertCircle, color: 'text-red-400' },
  }[role] || { bg: 'bg-slate-700', Icon: Bot, color: 'text-slate-400' };

  return (
    <div className={`w-6 h-6 rounded-full ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
      <cfg.Icon className={`w-3 h-3 ${cfg.color}`} />
    </div>
  );
}
