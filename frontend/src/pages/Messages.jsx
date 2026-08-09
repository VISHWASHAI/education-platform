import { useEffect, useRef, useState } from 'react';
import { Plus, Send, Users2 } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';

const POLL_INTERVAL_MS = 4000;

export function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [error, setError] = useState('');

  const lastMessageIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  function loadConversations() {
    api.get('/messaging/conversations').then(({ data }) => setConversations(data)).catch(() => {});
  }

  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    setMessages([]);
    lastMessageIdRef.current = null;

    function poll() {
      const params = lastMessageIdRef.current ? { after: lastMessageIdRef.current } : {};
      api
        .get(`/messaging/conversations/${activeId}/messages`, { params })
        .then(({ data }) => {
          if (data.length === 0) return;
          setMessages((prev) => [...prev, ...data]);
          lastMessageIdRef.current = data[data.length - 1].id;
        })
        .catch(() => setError('Could not load messages'));
    }

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function openContacts() {
    setShowContacts(true);
    const { data } = await api.get('/messaging/contacts');
    setContacts(data);
  }

  async function startConversation(userId) {
    const { data } = await api.post('/messaging/conversations/direct', { userId });
    setShowContacts(false);
    loadConversations();
    setActiveId(data.id);
  }

  async function joinClassChat() {
    const { data } = await api.post('/messaging/conversations/my-class');
    loadConversations();
    setActiveId(data.id);
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    const body = draft;
    setDraft('');
    const { data } = await api.post(`/messaging/conversations/${activeId}/messages`, { body });
    setMessages((prev) => [...prev, data]);
    lastMessageIdRef.current = data.id;
    loadConversations();
  }

  function conversationLabel(c) {
    if (c.type === 'class') return `${c.class_name} - ${c.class_section} (Class Chat)`;
    return c.other_participants?.[0]?.fullName ?? 'Conversation';
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
          <p className="text-slate-500 mt-1">{conversations.length} conversations</p>
        </div>
        <div className="flex gap-3">
          {user?.role === 'student' && (
            <PrimaryButton variant="secondary" className="flex items-center gap-2" onClick={joinClassChat}>
              <Users2 size={16} /> My Class Chat
            </PrimaryButton>
          )}
          <PrimaryButton className="flex items-center gap-2" onClick={openContacts}>
            <Plus size={16} /> New Message
          </PrimaryButton>
        </div>
      </div>

      {error && <p className="text-danger">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard className="lg:col-span-1 p-0 overflow-hidden">
          {conversations.length === 0 ? (
            <p className="text-slate-500 p-6">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setActiveId(c.id)}
                    className={`w-full text-left px-5 py-4 border-b border-slate-100 transition-colors duration-300 ${
                      activeId === c.id ? 'bg-blue-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-slate-900 text-sm font-medium">{conversationLabel(c)}</p>
                    <p className="text-slate-500 text-xs mt-1 truncate">{c.last_message ?? 'No messages yet'}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>

        <GlassCard className="lg:col-span-2 flex flex-col h-[560px]">
          {!activeId ? (
            <div className="flex-1 flex items-center justify-center text-slate-500">Select a conversation</div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                        m.sender_id === user?.id ? 'bg-blue-700 text-white' : 'bg-slate-50 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {m.sender_id !== user?.id && <p className="text-xs text-blue-600 font-semibold mb-1">{m.sender_name}</p>}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="flex gap-3 mt-4">
                <input
                  className="input-field flex-1"
                  placeholder="Type a message…"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />
                <PrimaryButton type="submit" className="!px-4">
                  <Send size={16} />
                </PrimaryButton>
              </form>
            </>
          )}
        </GlassCard>
      </div>

      {showContacts && (
        <Modal title="New Message" onClose={() => setShowContacts(false)}>
          {contacts.length === 0 ? (
            <p className="text-slate-500 text-sm">No contacts available.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {contacts.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => startConversation(c.id)}
                    className="w-full text-left rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 hover:bg-blue-50 transition-colors duration-300"
                  >
                    <p className="text-slate-900 text-sm font-medium">{c.full_name}</p>
                    <p className="text-xs text-slate-500 capitalize">{c.role.replace('_', ' ')}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
