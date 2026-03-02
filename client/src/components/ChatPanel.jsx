import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Zap, Activity } from 'lucide-react';

function extractEdits(text) {
  const edits = [];
  // Revised regex to be more tolerant of whitespace around tags
  const regex = /<<<SUGGESTED_EDIT>>>\s*<<<FIND>>>\s*([\s\S]*?)<<<REPLACE>>>\s*([\s\S]*?)<<<END_EDIT>>>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    edits.push({ find: match[1].trim(), replace: match[2].trim() });
  }
  return edits;
}
function extractLatexBlock(text) {
  // Try to match standard markdown code blocks for LaTeX or TeX
  const match = text.match(/```(?:latex|tex)\n([\s\S]*?)```/);
  return match ? match[1].trim() : null;
}
function getCleanText(text) {
  // Remove edit blocks and code blocks from the displayed message
  let clean = text.replace(/<<<SUGGESTED_EDIT>>>[\s\S]*?<<<END_EDIT>>>/g, '');
  // Optional: Remove the code block if it was used to replace content, 
  // or keep it if you want the user to see it. 
  // For now, let's keep it in the chat bubble as reference.
  return clean.trim();
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
        .filter(m => m.role === 'user' || m.role === 'assistant')
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

      let finalMessages = [];
      if (cleanText) finalMessages.push(cleanText);

      // Append Action Reports
      if (appliedCount) {
         setMessages(prev => [...prev, { role: 'assistant', content: cleanText }, { role: 'system', content: `Checking diffs... Patch successfully applied to ${appliedCount} segment(s).` }]);
      } else if (generatedNew) {
         setMessages(prev => [...prev, { role: 'assistant', content: cleanText }, { role: 'system', content: "Generated new document structure." }]);
      } else {
         setMessages(prev => [...prev, { role: 'assistant', content: cleanText }]);
      }

    } catch (err) {
      setMessages(prev => [...prev, { role: 'error', content: "Network layer interruption. Agent unreachable." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative font-sans text-xs">
      <div className="flex-1 overflow-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-violet-500/20">
        
        {/* Welcome State */}
        {messages.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
             <div className="relative">
                 <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(124,58,237,0.3)] animate-float">
                    <Bot className="w-10 h-10 text-white" />
                 </div>
                 <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0f172a] rounded-lg flex items-center justify-center border border-white/10">
                    <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                 </div>
             </div>
             <p className="text-base font-bold text-slate-200 tracking-tight">AI Assistant Online</p>
             <p className="text-[11px] text-slate-500 mt-2 max-w-[200px] text-center leading-relaxed">
                Neural network ready for analysis. Describe your intent or paste errors.
             </p>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-slide-in-right`}>
            
            {/* Avatar */}
            {msg.role !== 'system' && (
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border 
                    ${msg.role === 'user' ? 'bg-slate-800 border-slate-700' : 'bg-violet-600/10 border-violet-500/20'}
                `}>
                {msg.role === 'user' ? <User className="w-4 h-4 text-slate-400" /> : 
                msg.role === 'error' ? <Activity className="w-4 h-4 text-red-500" /> : <Bot className="w-4 h-4 text-violet-400" />}
                </div>
            )}

            {/* Bubble */}
            <div className={`flex flex-col gap-1 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'system' ? (
                     <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 w-full animate-pulse-subtle">
                        <Zap className="w-3 h-3" />
                        <span className="font-mono font-bold tracking-tight">{msg.content}</span>
                     </div>
                ) : (
                    <>
                        <div className={`
                            px-4 py-3 rounded-2xl shadow-sm text-[13px] leading-relaxed whitespace-pre-wrap
                            ${msg.role === 'user' 
                                ? 'bg-slate-800 text-slate-200 rounded-tr-none' 
                                : msg.role === 'error' 
                                ? 'bg-red-500/10 border border-red-500/20 text-red-200'
                                : 'bg-white/5 border border-white/5 text-slate-300 rounded-tl-none backdrop-blur-md'}
                        `}>
                            {msg.content}
                        </div>
                        {msg.role === 'assistant' && (
                            <span className="text-[10px] text-slate-600 pl-1">Just now</span>
                        )}
                    </>
                )}
            </div>
          </div>
        ))}
        
        {/* Loading Indicator */}
        {loading && (
             <div className="flex gap-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border bg-violet-600/10 border-violet-500/20">
                     <Bot className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex items-center gap-1 h-8">
                     <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.3s]"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.15s]"></div>
                     <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-bounce"></div>
                </div>
             </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-black/20 shrink-0 border-t border-white/5 backdrop-blur-xl">
        <form onSubmit={sendMessage} className="relative group">
           <div className="absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
           <div className="relative flex items-center bg-[#0a0a15] rounded-xl border border-white/10 overflow-hidden">
                <input
                    className="flex-1 bg-transparent px-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none"
                    placeholder="Ask AI to modify code..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                />
                <button
                    disabled={!input.trim() || loading}
                    className="p-2 mr-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <Send className="w-4 h-4" />
                </button>
           </div>
        </form>
      </div>
    </div>
  );
}
