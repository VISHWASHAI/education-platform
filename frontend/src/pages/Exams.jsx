import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FileText, ClipboardCheck, GraduationCap, PenSquare, Repeat } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ACADEMIC_STAFF } from '../constants/roles';

const STATUS_COLORS = {
  draft: 'bg-warning/10 text-warning border-warning/30',
  published: 'bg-success/10 text-success border-success/30',
  archived: 'bg-slate-100 text-slate-500 border-slate-300',
};

const EXAM_TYPE_META = {
  quiz: { label: 'Quiz', icon: FileText },
  midterm: { label: 'Midterm', icon: ClipboardCheck },
  final: { label: 'Final Exam', icon: GraduationCap },
  assignment: { label: 'Assignment', icon: PenSquare },
  practice_test: { label: 'Practice Test', icon: Repeat },
};

const emptyForm = { title: '', description: '', classId: '', examType: 'quiz' };

export function Exams() {
  const { user } = useAuth();
  const canManage = ACADEMIC_STAFF.includes(user?.role);
  const isStudent = user?.role === 'student';
  const [exams, setExams] = useState([]);
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
      .get('/exams')
      .then(({ data }) => setExams(data))
      .catch(() => setError('Could not load exams'))
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
      const { data } = await api.post('/exams', form);
      setShowModal(false);
      setForm(emptyForm);
      setExams((prev) => [{ ...data, class_name: '', question_count: 0, total_marks: 0, submission_count: 0 }, ...prev]);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create exam');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Exams</h1>
          <p className="text-blue-100 mt-1">{exams.length} total exams</p>
        </div>
        {canManage && (
          <PrimaryButton className="flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={18} /> Create Exam
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      {loading ? (
        <p className="text-slate-500">Loading…</p>
      ) : exams.length === 0 ? (
        <GlassCard><p className="text-slate-500">No exams yet.</p></GlassCard>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exams.map((e) => {
            const meta = EXAM_TYPE_META[e.exam_type] ?? { label: e.exam_type, icon: FileText };
            const TypeIcon = meta.icon;
            return (
              <Link key={e.id} to={`/exams/${e.id}`}>
                <GlassCard>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{e.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {e.class_name ? `${e.class_name} - ${e.class_section}` : ''}
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
                      <TypeIcon size={19} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border capitalize ${STATUS_COLORS[e.status] ?? ''}`}>
                      {e.status}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">{meta.label}</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <p className="text-sm text-slate-600">
                      {e.question_count} questions · {e.total_marks} marks
                    </p>
                    {isStudent && e.status === 'published' && (
                      <span className="text-xs font-semibold text-blue-700">Take exam →</span>
                    )}
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal title="Create Exam" onClose={() => { setShowModal(false); setForm(emptyForm); setFormError(''); }}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormInput label="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
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
            <label className="block">
              <span className="label-caps mb-2 block">Exam Type</span>
              <select
                className="input-field"
                value={form.examType}
                onChange={(e) => setForm({ ...form, examType: e.target.value })}
              >
                <option value="quiz">Quiz</option>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
                <option value="assignment">Assignment</option>
                <option value="practice_test">Practice Test</option>
              </select>
            </label>
            {formError && <p className="text-sm text-danger">{formError}</p>}
            <PrimaryButton type="submit" className="w-full" disabled={saving}>
              {saving ? 'Creating…' : 'Create Exam'}
            </PrimaryButton>
          </form>
        </Modal>
      )}
    </div>
  );
}
