import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { IconButton } from '../components/shared/IconButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ADMIN_TRIO } from '../constants/roles';

const emptyForm = { fullName: '', email: '', department: '', specialization: '' };
const PAGE_SIZE = 20;

export function Teachers() {
  const { user } = useAuth();
  const canManage = ADMIN_TRIO.includes(user?.role);
  const [teachers, setTeachers] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [createdCredential, setCreatedCredential] = useState(null);

  function load() {
    setLoading(true);
    api
      .get('/teachers', { params: { search, page, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setTeachers(data.data);
        setTotal(data.total);
        setError('');
      })
      .catch(() => setError('Could not load teachers'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({ fullName: t.full_name, email: t.email, department: t.department ?? '', specialization: t.specialization ?? '' });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setCreatedCredential(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        await api.put(`/teachers/${editing.id}`, {
          fullName: form.fullName,
          department: form.department,
          specialization: form.specialization,
        });
        closeModal();
        load();
      } else {
        const { data } = await api.post('/teachers', form);
        if (data.temporaryPassword) {
          setCreatedCredential({ email: form.email, password: data.temporaryPassword });
        } else {
          closeModal();
        }
        load();
      }
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save teacher');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(t) {
    await api.put(`/teachers/${t.id}`, { isActive: !t.is_active });
    load();
  }

  async function handleDelete(t) {
    if (!window.confirm(`Remove ${t.full_name}? This deletes their account and cannot be undone.`)) return;
    try {
      await api.delete(`/teachers/${t.id}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete teacher');
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Teachers</h1>
          <p className="text-blue-100 mt-1">{total} total teachers</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} /> Add Teacher
          </PrimaryButton>
        )}
      </div>

      <GlassCard>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <FormInput
            placeholder="Search by name, email, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-11"
          />
        </div>

        {error && <p className="text-danger mb-4">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Name</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Email</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Department</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Specialization</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Status</th>
                {canManage && <th className="py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-500">Loading…</td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={canManage ? 6 : 5} className="py-6 text-center text-slate-500">No teachers found</td></tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors duration-300">
                    <td className="py-3 text-slate-900 font-medium">{t.full_name}</td>
                    <td className="py-3 text-slate-600">{t.email}</td>
                    <td className="py-3 text-slate-600">{t.department ?? '—'}</td>
                    <td className="py-3 text-slate-600">{t.specialization ?? '—'}</td>
                    <td className="py-3">
                      {canManage ? (
                        <button
                          onClick={() => toggleActive(t)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors duration-300 ${t.is_active ? 'bg-success/20 text-success border-success/40' : 'bg-danger/20 text-danger border-danger/40'}`}
                          title="Toggle active status"
                        >
                          {t.is_active ? 'Active' : 'Inactive'}
                        </button>
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${t.is_active ? 'bg-success/20 text-success border-success/40' : 'bg-danger/20 text-danger border-danger/40'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                      )}
                    </td>
                    {canManage && (
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton icon={Pencil} variant="primary" title="Edit" onClick={() => openEdit(t)} />
                          <IconButton icon={Trash2} variant="danger" title="Delete" onClick={() => handleDelete(t)} />
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <IconButton icon={ChevronLeft} title="Previous page" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page <= 1} variant="primary" />
              <IconButton icon={ChevronRight} title="Next page" onClick={() => setPage((p) => Math.min(p + 1, totalPages))} disabled={page >= totalPages} variant="primary" />
            </div>
          </div>
        )}
      </GlassCard>

      {showModal && (
        <Modal title={editing ? 'Edit Teacher' : 'Add Teacher'} onClose={closeModal}>
          {createdCredential ? (
            <div className="space-y-4">
              <p className="text-slate-700">Teacher created. Share these temporary credentials:</p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <p><span className="text-slate-500">Email:</span> {createdCredential.email}</p>
                <p><span className="text-slate-500">Temporary Password:</span> {createdCredential.password}</p>
              </div>
              <PrimaryButton className="w-full" onClick={closeModal}>Done</PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput label="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              <FormInput
                label="Email"
                type="email"
                required
                disabled={!!editing}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <FormInput label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
              <FormInput label="Specialization" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} />
              {formError && <p className="text-sm text-danger">{formError}</p>}
              <PrimaryButton type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Teacher'}
              </PrimaryButton>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
