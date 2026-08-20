import { useEffect, useState } from 'react';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { IconButton } from '../components/shared/IconButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ADMIN_TRIO } from '../constants/roles';

const emptyForm = { name: '', section: '', leadTeacherId: '' };

export function Classes() {
  const { user } = useAuth();
  const canManage = ADMIN_TRIO.includes(user?.role);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [roster, setRoster] = useState(null);

  function load() {
    setLoading(true);
    api
      .get('/classes')
      .then(({ data }) => {
        setClasses(data);
        setError('');
      })
      .catch(() => setError('Could not load classes'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    api.get('/teachers', { params: { pageSize: 100 } }).then(({ data }) => setTeachers(data.data)).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(cls, e) {
    e.stopPropagation();
    setEditing(cls);
    setForm({ name: cls.name, section: cls.section, leadTeacherId: cls.lead_teacher_id ?? '' });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const payload = { ...form, leadTeacherId: form.leadTeacherId || null };
      if (editing) {
        await api.put(`/classes/${editing.id}`, payload);
      } else {
        await api.post('/classes', payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save class');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cls, e) {
    e.stopPropagation();
    if (!window.confirm(`Delete ${cls.name} - ${cls.section}?`)) return;
    try {
      await api.delete(`/classes/${cls.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete class');
    }
  }

  async function openRoster(cls) {
    setRoster({ cls, students: null });
    const { data } = await api.get(`/classes/${cls.id}/roster`);
    setRoster({ cls, students: data });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Classes</h1>
          <p className="text-slate-500 mt-1">{classes.length} total classes</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} /> Add Class
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((c) => (
            <GlassCard key={c.id} className="cursor-pointer" onClick={() => openRoster(c)}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{c.name} - {c.section}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {c.lead_teacher_name ? `Led by ${c.lead_teacher_name}` : 'No lead teacher assigned'}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={20} />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-600">{c.student_count} students</p>
                {canManage && (
                  <div className="flex gap-2">
                    <IconButton icon={Pencil} variant="primary" title="Edit" onClick={(e) => openEdit(c, e)} />
                    <IconButton icon={Trash2} variant="danger" title="Delete" onClick={(e) => handleDelete(c, e)} />
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Class' : 'Add Class'} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Class Name" placeholder="Grade 8" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <FormInput label="Section" placeholder="A" required value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} />
            <label className="block">
              <span className="label-caps mb-2 block">Lead Teacher</span>
              <select
                className="input-field"
                value={form.leadTeacherId}
                onChange={(e) => setForm({ ...form, leadTeacherId: e.target.value })}
              >
                <option value="">— None —</option>
                {teachers.map((t) => (
                  <option key={t.user_id} value={t.user_id}>{t.full_name}</option>
                ))}
              </select>
            </label>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Class'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {roster && (
        <Modal title={`${roster.cls.name} - ${roster.cls.section} Roster`} onClose={() => setRoster(null)}>
          {roster.students === null ? (
            <p className="text-slate-500">Loading…</p>
          ) : roster.students.length === 0 ? (
            <p className="text-slate-500">No students assigned to this class yet.</p>
          ) : (
            <ul className="space-y-2 max-h-80 overflow-y-auto">
              {roster.students.map((s) => (
                <li key={s.id} className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-2">
                  <p className="text-slate-900 text-sm font-medium">{s.full_name}</p>
                  <p className="text-xs text-slate-500">{s.admission_no}</p>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </div>
  );
}
