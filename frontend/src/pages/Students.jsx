import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, KeyRound } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { IconButton } from '../components/shared/IconButton';
import { SkeletonTableRows } from '../components/shared/Skeleton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { ADMIN_TRIO } from '../constants/roles';

const emptyForm = { admissionNo: '', fullName: '', email: '', classId: '', guardianName: '', guardianContact: '', dateOfBirth: '' };
const PAGE_SIZE = 20;

export function Students() {
  const { user } = useAuth();
  const { confirm, showToast } = useUI();
  const canManage = ADMIN_TRIO.includes(user?.role);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
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

  const [loginTarget, setLoginTarget] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginError, setLoginError] = useState('');
  const [savingLogin, setSavingLogin] = useState(false);
  const [loginResult, setLoginResult] = useState(null);

  function load() {
    setLoading(true);
    api
      .get('/students', { params: { search, page, pageSize: PAGE_SIZE } })
      .then(({ data }) => {
        setStudents(data.data);
        setTotal(data.total);
        setError('');
      })
      .catch(() => setError('Could not load students'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
  }, [search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    api.get('/classes').then(({ data }) => setClasses(data)).catch(() => {});
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setCreatedCredential(null);
    setShowModal(true);
  }

  function openEdit(s) {
    setEditing(s);
    setForm({
      admissionNo: s.admission_no,
      fullName: s.full_name,
      email: s.email ?? '',
      classId: s.class_id ?? '',
      guardianName: s.guardian_name ?? '',
      guardianContact: s.guardian_contact ?? '',
      dateOfBirth: s.date_of_birth ? s.date_of_birth.slice(0, 10) : '',
    });
    setFormError('');
    setCreatedCredential(null);
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
      const payload = { ...form, classId: form.classId || null, dateOfBirth: form.dateOfBirth || null };
      if (editing) {
        await api.put(`/students/${editing.id}`, payload);
        closeModal();
      } else {
        const { data } = await api.post('/students', payload);
        if (data.temporaryPassword) {
          setCreatedCredential({ email: form.email, password: data.temporaryPassword });
        } else {
          closeModal();
        }
      }
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not save student');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s) {
    const ok = await confirm({
      title: 'Remove student?',
      message: `Remove ${s.full_name} (${s.admission_no})? This cannot be undone.`,
      confirmLabel: 'Remove',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/students/${s.id}`);
      showToast('Student removed.');
      load();
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not delete student', 'error');
    }
  }

  function openCreateLogin(s) {
    setLoginTarget(s);
    setLoginEmail('');
    setLoginError('');
    setLoginResult(null);
  }

  async function handleCreateLogin(e) {
    e.preventDefault();
    setSavingLogin(true);
    setLoginError('');
    try {
      const { data } = await api.post(`/students/${loginTarget.id}/create-login`, { email: loginEmail });
      setLoginResult(data);
      load();
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Could not create login');
    } finally {
      setSavingLogin(false);
    }
  }

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 mt-1">{total} total students</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={openCreate}>
            <Plus size={18} /> Add Student
          </PrimaryButton>
        )}
      </div>

      <GlassCard>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <FormInput
            placeholder="Search by name or admission number…"
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
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Admission No</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Name</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Class</th>
                <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Guardian</th>
                {canManage && <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Login</th>}
                {canManage && <th className="py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonTableRows columns={canManage ? 6 : 4} />
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 4} className="py-6 text-center text-slate-500">No students found</td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-blue-50 transition-colors duration-300">
                    <td className="py-3 text-slate-700">{s.admission_no}</td>
                    <td className="py-3 text-slate-900 font-medium">{s.full_name}</td>
                    <td className="py-3 text-slate-600">
                      {s.class_name ? `${s.class_name} - ${s.class_section}` : '—'}
                    </td>
                    <td className="py-3 text-slate-600">{s.guardian_name ?? '—'}</td>
                    {canManage && (
                      <td className="py-3">
                        {s.user_id ? (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-success/10 text-success border-success/30" title={s.email}>
                            Has login
                          </span>
                        ) : (
                          <button
                            onClick={() => openCreateLogin(s)}
                            className="flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline"
                          >
                            <KeyRound size={13} /> Create login
                          </button>
                        )}
                      </td>
                    )}
                    {canManage && (
                      <td className="py-3">
                        <div className="flex justify-end gap-2">
                          <IconButton icon={Pencil} variant="primary" title="Edit" onClick={() => openEdit(s)} />
                          <IconButton icon={Trash2} variant="danger" title="Delete" onClick={() => handleDelete(s)} />
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
              <IconButton
                icon={ChevronLeft}
                title="Previous page"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                variant="primary"
              />
              <IconButton
                icon={ChevronRight}
                title="Next page"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                variant="primary"
              />
            </div>
          </div>
        )}
      </GlassCard>

      {showModal && (
        <Modal title={editing ? 'Edit Student' : 'Add Student'} onClose={closeModal}>
          {createdCredential ? (
            <div className="space-y-4">
              <p className="text-slate-700">Student created. Share these login credentials:</p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <p><span className="text-slate-500">Email:</span> {createdCredential.email}</p>
                <p><span className="text-slate-500">Temporary Password:</span> {createdCredential.password}</p>
              </div>
              <PrimaryButton className="w-full" onClick={closeModal}>Done</PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <FormInput
                label="Admission Number"
                required
                disabled={!!editing}
                value={form.admissionNo}
                onChange={(e) => setForm({ ...form, admissionNo: e.target.value })}
              />
              <FormInput label="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              {!editing && (
                <FormInput
                  label="Email (optional — enables student login)"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              )}
              <label className="block">
                <span className="label-caps mb-2 block">Class</span>
                <select className="input-field" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                  <option value="">— Unassigned —</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.section}</option>
                  ))}
                </select>
              </label>
              <FormInput label="Guardian Name" value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} />
              <FormInput label="Guardian Contact" value={form.guardianContact} onChange={(e) => setForm({ ...form, guardianContact: e.target.value })} />
              <FormInput label="Date of Birth" type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
              {formError && <p className="text-sm text-danger">{formError}</p>}
              <PrimaryButton type="submit" className="w-full" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Student'}
              </PrimaryButton>
            </form>
          )}
        </Modal>
      )}

      {loginTarget && (
        <Modal title={`Create Login — ${loginTarget.full_name}`} onClose={() => setLoginTarget(null)}>
          {loginResult ? (
            <div className="space-y-4">
              <p className="text-slate-700">Login created. Share these credentials:</p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm space-y-1">
                <p><span className="text-slate-500">Email:</span> {loginResult.email}</p>
                <p><span className="text-slate-500">Temporary Password:</span> {loginResult.temporaryPassword}</p>
              </div>
              <PrimaryButton className="w-full" onClick={() => setLoginTarget(null)}>Done</PrimaryButton>
            </div>
          ) : (
            <form onSubmit={handleCreateLogin} className="space-y-4">
              <FormInput
                label="Email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
              />
              {loginError && <p className="text-sm text-danger">{loginError}</p>}
              <PrimaryButton type="submit" className="w-full" disabled={savingLogin}>
                {savingLogin ? 'Creating…' : 'Create Login'}
              </PrimaryButton>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}
