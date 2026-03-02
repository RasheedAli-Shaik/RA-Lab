import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, User, AlertCircle, Sparkles } from 'lucide-react';

// Pull out all <<<SUGGESTED_EDIT>>> blocks from the AI response
function extractEdits(text) {
  const edits = [];
  const regex =
    /<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\n?([\s\S]*?)<<<REPLACE>>>\n?([\s\S]*?)<<<END_EDIT>>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    edits.push({
      find: match[1].replace(/\n$/, ''),
      replace: match[2].replace(/\n$/, ''),
    });
  }
  return edits;
}

// Pull out a ```latex ... ``` block (for full new-document generation)
function extractLatexBlock(text) {
  const match = text.match(/```latex\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}

// Strip edit blocks and latex code blocks so chat text is clean
function getCleanText(text) {
  return text
    .replace(/<<<SUGGESTED_EDIT>>>[\s\S]*?<<<END_EDIT>>>/g, '')
    .replace(/```latex\n[\s\S]*?```/g, '')
    .trim();
}

export default function ChatPanel({ code, logs, onApplyEdits, onSetCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Auto-scroll to the latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setInput('');

    // Add the user's message to the chat
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setLoading(true);

    try {
      // Build conversation history for the API
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: text });

      // Send to the FastAPI agent through the Node proxy
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
        throw new Error(
          data?.error?.message || data?.detail || 'Request failed'
        );
      }

      const fullResponse = data.response;

      // Parse what the AI returned
      const edits = extractEdits(fullResponse);
      const latexBlock = extractLatexBlock(fullResponse);
      const cleanText = getCleanText(fullResponse);

      // Auto-apply: edits to existing code, or load a brand-new document
      let appliedCount = 0;
      let generatedNew = false;

      if (edits.length > 0) {
        appliedCount = onApplyEdits(edits);
      } else if (latexBlock) {
        onSetCode(latexBlock);
        generatedNew = true;
      }

      // Build the chat message the user will see
      let displayText = cleanText;
      if (appliedCount > 0) {
        const s = appliedCount === 1 ? '' : 's';
        displayText += `\n\n✅ Applied ${appliedCount} edit${s} to your document.`;
      }
      if (generatedNew) {
        displayText += '\n\n✅ New document loaded into the editor.';
      }

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: displayText || 'Done!' },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'error', content: err.message },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3 scrollbar-thin">
        {messages.length === 0 && <EmptyState />}

        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-2">
            <Avatar role="assistant" />
            <div className="bg-slate-800/50 rounded-lg px-3 py-2 text-sm text-slate-400 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
              Thinking…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={sendMessage}
        className="border-t border-slate-700/60 p-2 flex gap-2 shrink-0 bg-slate-900/30"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything — edit, explain, generate, fix…"
          disabled={loading}
          className="
            flex-1 bg-slate-800/60 text-slate-200 text-sm px-3 py-2 rounded-lg
            border border-slate-600/60 placeholder-slate-500
            focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30
            focus:outline-none disabled:opacity-50 transition-colors
          "
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="Send"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}

// Shown when the chat is empty
function EmptyState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-slate-500">
      <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
        <Sparkles className="w-6 h-6 text-blue-400 opacity-60" />
      </div>
      <p className="text-sm font-medium text-slate-400">RA-Lab AI Assistant</p>
      <p className="text-xs mt-1 text-center max-w-xs leading-relaxed">
        Ask me to write, edit, fix, or explain your LaTeX document. I can read
        your code and apply changes directly in the editor.
      </p>
    </div>
  );
}

// A single chat bubble
function Message({ msg }) {
  const isUser = msg.role === 'user';
  const isError = msg.role === 'error';

  return (
    <div className={`flex gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && <Avatar role={msg.role} />}
      <div
        className={`max-w-[85%] rounded-lg text-sm leading-relaxed px-3 py-2 ${
          isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : isError
              ? 'bg-red-500/10 text-red-300 border border-red-500/20'
              : 'bg-slate-800/70 text-slate-200 rounded-bl-sm'
        }`}
      >
        <pre className="whitespace-pre-wrap font-sans text-[13px]">
          {msg.content}
        </pre>
      </div>
      {isUser && <Avatar role="user" />}
    </div>
  );
}

// Small avatar circle
function Avatar({ role }) {
  if (role === 'user') {
    return (
      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3 h-3 text-blue-400" />
      </div>
    );
  }
  if (role === 'error') {
    return (
      <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <AlertCircle className="w-3 h-3 text-red-400" />
      </div>
    );
  }
  return (
    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
      <Sparkles className="w-3 h-3 text-blue-400" />
    </div>
  );
}
