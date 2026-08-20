import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ClipboardList } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ACADEMIC_STAFF } from '../constants/roles';

const STATUS_COLORS = {
  draft: 'bg-warning/20 text-warning border-warning/40',
  published: 'bg-success/20 text-success border-success/40',
};

const emptyForm = { title: '', description: '', classId: '', dueAt: '', maxScore: 100 };

export function Assignments() {
  const { user } = useAuth();
  const canManage = ACADEMIC_STAFF.includes(user?.role);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/assignments')
      .then(({ data }) => setAssignments(data))
      .catch(() => setError('Could not load assignments'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    if (canManage) {
      api.get('/classes').then(({ data }) => setClasses(data)).catch(() => {});
    }
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/assignments', { ...form, dueAt: form.dueAt || null, maxScore: Number(form.maxScore) });
      setShowModal(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create assignment');
    } finally {
      setSaving(false);
    }
  }

  const isOverdue = (dueAt) => dueAt && new Date(dueAt) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500 mt-1">{assignments.length} total assignments</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={18} /> New Assignment
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : assignments.length === 0 ? (
        <GlassCard><p className="text-slate-500">No assignments yet.</p></GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((a) => (
            <Link key={a.id} to={`/assignments/${a.id}`}>
              <GlassCard>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{a.title}</h3>
                    <p className="text-sm text-slate-500 mt-1">{a.class_name} - {a.class_section}</p>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <ClipboardList size={20} />
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-4">
                  <span className={`px-2 py-1 rounded-md text-xs font-semibold border capitalize ${STATUS_COLORS[a.status] ?? ''}`}>
                    {a.status}
                  </span>
                  {a.due_at && (
                    <span className={`text-xs ${isOverdue(a.due_at) ? 'text-danger' : 'text-slate-500'}`}>
                      Due {new Date(a.due_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-600 mt-3">{a.submission_count} submissions · {a.max_score} pts</p>
              </GlassCard>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title="New Assignment" onClose={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <label className="block">
              <span className="label-caps mb-2 block">Description</span>
              <textarea
                className="input-field"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label-caps mb-2 block">Class</span>
              <select
                className="input-field"
                required
                value={form.classId}
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              >
                <option value="">Select a class…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                ))}
              </select>
            </label>
            <FormInput
              label="Due Date"
              type="datetime-local"
              value={form.dueAt}
              onChange={(e) => setForm({ ...form, dueAt: e.target.value })}
            />
            <FormInput
              label="Max Score"
              type="number"
              min={1}
              value={form.maxScore}
              onChange={(e) => setForm({ ...form, maxScore: e.target.value })}
            />
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={saving}>
              {saving ? 'Creating…' : 'Create Assignment'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  );
}
