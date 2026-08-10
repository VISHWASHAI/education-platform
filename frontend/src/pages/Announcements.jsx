import { useEffect, useState } from 'react';
import { Plus, Pin, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';

const emptyForm = { title: '', body: '', targetRole: '', targetClassId: '', isPinned: false, expiresAt: '' };
const ROLES = ['super_admin', 'head_master', 'group_coordinator', 'teacher', 'office_admin', 'student'];

export function Announcements() {
  const { user } = useAuth();
  const isStaff = user?.role !== 'student';

  const [announcements, setAnnouncements] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('/announcements')
      .then(({ data }) => setAnnouncements(data))
      .catch(() => setError('Could not load announcements'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (isStaff) {
      api.get('/classes').then(({ data }) => setClasses(data)).catch(() => {});
    }
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/announcements', {
        ...form,
        targetRole: form.targetRole || null,
        targetClassId: form.targetClassId || null,
        expiresAt: form.expiresAt || null,
      });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(a) {
    await api.put(`/announcements/${a.id}`, { isPinned: !a.is_pinned });
    load();
  }

  async function remove(id) {
    await api.delete(`/announcements/${id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Announcements</h1>
          <p className="text-blue-100 mt-1">{announcements.length} announcements</p>
        </div>
        {isStaff && (
          <PrimaryButton className="flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Announcement
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : announcements.length === 0 ? (
        <GlassCard><p className="text-slate-500">No announcements yet.</p></GlassCard>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <GlassCard key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Pin size={14} className="text-blue-600" />}
                    <h3 className="text-lg font-semibold text-slate-900">{a.title}</h3>
                  </div>
                  <p className="text-slate-600 mt-2 whitespace-pre-wrap">{a.body}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-500">
                    <span>By {a.created_by_name}</span>
                    <span>·</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    {a.target_role && <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 capitalize">{a.target_role.replace('_', ' ')}</span>}
                    {a.class_name && <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200">{a.class_name} - {a.class_section}</span>}
                    {isStaff && a.status !== 'published' && (
                      <span className="px-2 py-0.5 rounded-md bg-warning/20 border border-warning/40 text-warning capitalize">{a.status}</span>
                    )}
                  </div>
                </div>
                {isStaff && (
                  <div className="flex gap-3">
                    <button onClick={() => togglePin(a)} title="Toggle pin" className="text-slate-500 hover:text-blue-600 transition-colors duration-300">
                      <Pin size={16} />
                    </button>
                    <button onClick={() => remove(a.id)} title="Delete" className="text-slate-500 hover:text-danger transition-colors duration-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Announcement" onClose={() => { setShowModal(false); setForm(emptyForm); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block">
              <span className="label-caps mb-2 block">Body</span>
              <textarea
                className="input-field"
                rows={4}
                required
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label-caps mb-2 block">Target Role</span>
              <select className="input-field" value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
                <option value="">Everyone</option>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label-caps mb-2 block">Target Class</span>
              <select className="input-field" value={form.targetClassId} onChange={(e) => setForm({ ...form, targetClassId: e.target.value })}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} - {c.section}</option>)}
              </select>
            </label>
            <FormInput
              label="Expires At (optional)"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isPinned} onChange={(e) => setForm({ ...form, isPinned: e.target.checked })} />
              Pin to top
            </label>
            <PrimaryButton type="submit" className="w-full" disabled={saving}>
              {saving ? 'Publishing…' : 'Publish Announcement'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  );
}
