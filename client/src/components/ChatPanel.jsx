import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Cpu, Activity } from 'lucide-react';

function extractEdits(text) {
  const edits = [];
  const regex = /<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\n?([\s\S]*?)<<<REPLACE>>>\n?([\s\S]*?)<<<END_EDIT>>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    edits.push({ find: match[1].replace(/\n$/, ''), replace: match[2].replace(/\n$/, '') });
  }
  return edits;
}
function extractLatexBlock(text) {
  const match = text.match(/\\\latex\n([\s\S]*?)\\\/);
  return match ? match[1].trim() : null;
}
function getCleanText(text) {
  return text.replace(/<<<SUGGESTED_EDIT>>>[\s\S]*?<<<END_EDIT>>>/g, '').replace(/\\\latex\n[\s\S]*?\\\/g, '').trim();
}

export default function ChatPanel({ code, logs, onApplyEdits, onSetCode }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    // Optimistic UI
    const sentText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: sentText }]);
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));
      history.push({ role: 'user', content: sentText });

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, code: code || undefined, logs: logs || undefined }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data?.error || 'Failed');

      const fullResponse = data.response;
      const edits = extractEdits(fullResponse);
      const latexBlock = extractLatexBlock(fullResponse);
      const cleanText = getCleanText(fullResponse);
      
      let appliedCount = 0;
      let generatedNew = false;

      if (edits.length > 0) appliedCount = onApplyEdits(edits);
      else if (latexBlock) {
        onSetCode(latexBlock);
        generatedNew = true;
      }

      let finalText = cleanText;
      if (appliedCount) finalText += \\n\n[ACTION] Auto-patched \ segment(s).\;
      if (generatedNew) finalText += \\n\n[ACTION] Re-generated entire document.\;

      setMessages(prev => [...prev, { role: 'assistant', content: finalText }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: "Connection failure." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/40 relative font-sans text-xs">
      <div className="flex-1 overflow-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-violet-500/20">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-60">
             <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/20 animate-float">
                <Bot className="w-8 h-8 text-white" />
             </div>
             <p className="text-sm font-medium text-slate-300">AI Assistant Online</p>
             <p className="text-xs text-slate-500 mt-2 max-w-[200px] text-center">Ready to analyze, refactor, and generate LaTeX code.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={\lex gap-3 \\}>
            {/* Avatar */}
            <div className={\w-8 h-8 rounded-lg flex items-center justify-center shrink-0 \\}>
              {msg.role === 'user' ? <User className="w-4 h-4 text-slate-300" /> : 
               msg.role === 'error' ? <Activity className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>

            {/* Bubble */}
            <div className={\
              max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm
              \
            \}>
               <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-lg bg-violet-600/20 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4 text-violet-400 animate-pulse" />
             </div>
             <div className="flex items-center gap-1 h-8">
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-75"></span>
                <span className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce delay-150"></span>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-white/5 bg-slate-900/50 backdrop-blur-xl">
        <form 
          onSubmit={sendMessage} 
          className="relative flex items-center gap-2 bg-slate-950/50 border border-white/10 rounded-xl px-2 py-2 focus-within:border-violet-500/50 focus-within:ring-1 focus-within:ring-violet-500/20 transition-all"
        >
           <input 
             value={input}
             onChange={e => setInput(e.target.value)}
             placeholder="Ask the AI to refactor, debug or generate..."
             className="flex-1 bg-transparent border-none focus:outline-none text-sm text-slate-200 placeholder:text-slate-600 px-2 font-medium"
           />
           <button 
             type="submit" 
             disabled={loading || !input.trim()}
             className="p-2 rounded-lg bg-violet-600 text-white hover:bg-violet-500 disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors shadow-lg shadow-violet-600/20"
           >
              <Send className="w-4 h-4" />
           </button>
        </form>
      </div>
    </div>
  );
}
