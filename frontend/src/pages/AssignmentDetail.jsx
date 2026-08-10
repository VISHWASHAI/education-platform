import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { ACADEMIC_STAFF } from '../constants/roles';

const STATUS_COLORS = {
  submitted: 'bg-info/20 text-info border-info/40',
  late: 'bg-warning/20 text-warning border-warning/40',
  graded: 'bg-success/20 text-success border-success/40',
};

export function AssignmentDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = ACADEMIC_STAFF.includes(user?.role);
  const isStudent = user?.role === 'student';

  const [assignment, setAssignment] = useState(null);
  const [error, setError] = useState('');

  const [submissions, setSubmissions] = useState(null);
  const [grading, setGrading] = useState(null);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);

  const [mySubmission, setMySubmission] = useState(undefined);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function loadAssignment() {
    api.get(`/assignments/${id}`).then(({ data }) => setAssignment(data)).catch(() => setError('Could not load assignment'));
  }

  function loadSubmissions() {
    api.get(`/assignments/${id}/submissions`).then(({ data }) => setSubmissions(data)).catch(() => {});
  }

  useEffect(() => {
    loadAssignment();
    if (canManage) {
      loadSubmissions();
    } else if (isStudent) {
      api.get(`/assignments/${id}/my-submission`).then(({ data }) => setMySubmission(data)).catch(() => setMySubmission(null));
    }
  }, [id]);

  async function togglePublish() {
    const nextStatus = assignment.status === 'published' ? 'draft' : 'published';
    const { data } = await api.put(`/assignments/${id}`, { status: nextStatus });
    setAssignment((prev) => ({ ...prev, status: data.status }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { data } = await api.post(`/assignments/${id}/submit`, { content });
      setMySubmission(data);
    } finally {
      setSubmitting(false);
    }
  }

  function openGrading(row) {
    setGrading(row);
    setScore(row.score ?? '');
    setFeedback(row.feedback ?? '');
  }

  async function saveGrade() {
    setSavingGrade(true);
    try {
      await api.put(`/assignments/submissions/${grading.id}/grade`, { score: Number(score), feedback });
      setGrading(null);
      loadSubmissions();
    } finally {
      setSavingGrade(false);
    }
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!assignment) return <p className="text-blue-100">Loading…</p>;

  const isOverdue = assignment.due_at && new Date(assignment.due_at) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{assignment.title}</h1>
          <p className="text-blue-100 mt-1">
            {assignment.class_name} - {assignment.class_section}
            {assignment.due_at && (
              <span className={isOverdue ? 'text-danger' : ''}> · Due {new Date(assignment.due_at).toLocaleString()}</span>
            )}
          </p>
        </div>
        {canManage && (
          <PrimaryButton variant="secondary" onClick={togglePublish}>
            {assignment.status === 'published' ? 'Unpublish' : 'Publish'}
          </PrimaryButton>
        )}
      </div>

      <GlassCard>
        <p className="text-slate-700 whitespace-pre-wrap">{assignment.description || 'No description provided.'}</p>
        <p className="text-sm text-slate-500 mt-4">Max Score: {assignment.max_score}</p>
      </GlassCard>

      {isStudent && (
        <GlassCard>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Your Submission</h3>
          {mySubmission === undefined ? (
            <p className="text-slate-500">Loading…</p>
          ) : mySubmission ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="text-success" size={18} />
                <span className={`px-2 py-1 rounded-md text-xs font-semibold border capitalize ${STATUS_COLORS[mySubmission.status]}`}>
                  {mySubmission.status}
                </span>
              </div>
              <p className="text-slate-700 whitespace-pre-wrap">{mySubmission.content}</p>
              {mySubmission.status === 'graded' && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <p className="text-slate-900 font-medium">Score: {mySubmission.score} / {assignment.max_score}</p>
                  {mySubmission.feedback && <p className="text-sm text-slate-600 mt-1">{mySubmission.feedback}</p>}
                </div>
              )}
            </div>
          ) : assignment.status !== 'published' ? (
            <p className="text-slate-500">This assignment is not yet published.</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="label-caps mb-2 block">Your Answer / Submission Link</span>
                <textarea
                  className="input-field"
                  rows={6}
                  required
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your answer, or paste a link to your work…"
                />
              </label>
              <PrimaryButton type="submit" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Assignment'}
              </PrimaryButton>
            </form>
          )}
        </GlassCard>
      )}

      {canManage && (
        <GlassCard>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Submissions ({submissions?.length ?? 0})</h3>
          {!submissions || submissions.length === 0 ? (
            <p className="text-slate-500">No submissions yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Student</th>
                  <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Status</th>
                  <th className="py-3 font-semibold text-blue-700 uppercase text-xs">Score</th>
                  <th className="py-3"></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100">
                    <td className="py-3 text-slate-900 font-medium">{s.full_name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold border capitalize ${STATUS_COLORS[s.status]}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 text-slate-600">{s.score ?? '—'} / {assignment.max_score}</td>
                    <td className="py-3 text-right">
                      <button onClick={() => openGrading(s)} className="text-blue-600 hover:underline text-xs font-semibold">
                        Grade
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </GlassCard>
      )}

      {grading && (
        <Modal title={`Grade — ${grading.full_name}`} onClose={() => setGrading(null)}>
          <div className="space-y-4">
            <p className="text-slate-700 whitespace-pre-wrap text-sm bg-slate-50 border border-slate-200 rounded-lg p-4">
              {grading.content}
            </p>
            <label className="block">
              <span className="label-caps mb-2 block">Score (/ {assignment.max_score})</span>
              <input type="number" className="input-field" value={score} onChange={(e) => setScore(e.target.value)} />
            </label>
            <label className="block">
              <span className="label-caps mb-2 block">Feedback</span>
              <textarea className="input-field" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
            </label>
            <PrimaryButton className="w-full" onClick={saveGrade} disabled={savingGrade || score === ''}>
              {savingGrade ? 'Saving…' : 'Save Grade'}
            </PrimaryButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
