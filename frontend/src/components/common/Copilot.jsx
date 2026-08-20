import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send } from 'lucide-react';
import { api } from '../../api/client';

const SUGGESTIONS = [
  'Which students need attention?',
  'Show pending fees',
  "What's due this week?",
  'Show recent announcements',
];

export function Copilot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  async function ask(question) {
    if (!question.trim() || sending) return;
    setMessages((prev) => [...prev, { role: 'user', text: question }]);
    setDraft('');
    setSending(true);
    try {
      const { data } = await api.post('/copilot', { question });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: err.response?.data?.error || "Sorry, I couldn't process that right now." },
      ]);
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    ask(draft);
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform duration-200"
        style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1a1f6e 100%)' }}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
      >
        {open ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[calc(100vw-3rem)] max-w-sm h-[520px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3.5 text-white flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #1d4ed8 0%, #1a1f6e 100%)' }}>
            <Sparkles size={16} />
            <div>
              <p className="text-sm font-semibold leading-tight">EduFlow Assistant</p>
              <p className="text-[11px] text-white/70">Ask about students, fees, attendance…</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Try asking:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors duration-200"
                  >
                    {s}
                  </button>
                ))}
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-lg px-3.5 py-2 text-sm whitespace-pre-wrap ${
                      m.role === 'user' ? 'bg-blue-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))
            )}
            {sending && <p className="text-xs text-slate-400 px-1">Thinking…</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 p-3 border-t border-slate-100">
            <input
              className="input-field flex-1 !py-2 text-sm"
              placeholder="Ask a question…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="w-10 h-10 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-blue-800 transition-colors duration-200"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
