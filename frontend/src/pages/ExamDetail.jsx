import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, CheckCircle2, Circle, Pencil, Trash2, Download, Clock, FileText, ListChecks, AlertTriangle } from 'lucide-react';
import { api, downloadCsv } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { FormInput } from '../components/shared/FormInput';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { Modal } from '../components/shared/Modal';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Skeleton } from '../components/shared/Skeleton';
import { ACADEMIC_STAFF } from '../constants/roles';

const emptyQuestion = { questionText: '', questionType: 'mcq', options: ['', '', '', ''], correctAnswer: '0', defaultMarks: 1 };

const EXAM_TYPE_LABELS = {
  quiz: 'Quiz',
  midterm: 'Midterm',
  final: 'Final Exam',
  assignment: 'Assignment',
  practice_test: 'Practice Test',
};

export function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { confirm, showToast } = useUI();
  const canManage = ACADEMIC_STAFF.includes(user?.role);
  const isStudent = user?.role === 'student';

  const [exam, setExam] = useState(null);
  const [error, setError] = useState('');
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState(emptyQuestion);
  const [savingQuestion, setSavingQuestion] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  const [submissions, setSubmissions] = useState(null);
  const [gradingSubmission, setGradingSubmission] = useState(null);

  const [mySubmission, setMySubmission] = useState(undefined);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  function loadExam() {
    api.get(`/exams/${id}`).then(({ data }) => setExam(data)).catch(() => setError('Could not load exam'));
  }

  useEffect(() => {
    loadExam();
    if (canManage) {
      api.get(`/exams/${id}/submissions`).then(({ data }) => setSubmissions(data)).catch(() => {});
    } else if (isStudent) {
      api.get(`/exams/${id}/my-submission`).then(({ data }) => setMySubmission(data)).catch(() => setMySubmission(null));
    }
  }, [id]);

  const totalMarks = useMemo(
    () => (exam ? exam.questions.reduce((sum, q) => sum + Number(q.marks), 0) : 0),
    [exam]
  );
  const answeredCount = useMemo(
    () => (exam ? exam.questions.filter((q) => (answers[q.exam_question_id] ?? '').toString().trim() !== '').length : 0),
    [exam, answers]
  );
  const canTake = isStudent && exam?.status === 'published' && mySubmission === null && exam.questions.length > 0;

  async function togglePublish() {
    const nextStatus = exam.status === 'published' ? 'draft' : 'published';
    const { data } = await api.put(`/exams/${id}`, { status: nextStatus });
    setExam((prev) => ({ ...prev, status: data.status }));
  }

  function openEdit() {
    setEditForm({ title: exam.title, description: exam.description || '' });
    setShowEdit(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/exams/${id}`, editForm);
      setShowEdit(false);
      loadExam();
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDeleteExam() {
    const ok = await confirm({
      title: 'Delete exam?',
      message: `Delete "${exam.title}"? This removes all questions and submissions for this exam.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/exams/${id}`);
      showToast('Exam deleted.');
      navigate('/exams');
    } catch (err) {
      showToast(err.response?.data?.error || 'Could not delete exam', 'error');
    }
  }

  function openAddQuestion() {
    setShowAddQuestion(true);
    api.get('/questions', { params: { classId: exam.class_id } }).then(({ data }) => setBankQuestions(data)).catch(() => {});
  }

  async function attachQuestion(questionId, marks) {
    await api.post(`/exams/${id}/questions`, { questionId, marks });
    loadExam();
  }

  async function removeQuestion(examQuestionId) {
    await api.delete(`/exams/${id}/questions/${examQuestionId}`);
    loadExam();
  }

  async function createAndAttachQuestion(e) {
    e.preventDefault();
    setSavingQuestion(true);
    try {
      const payload = {
        classId: exam.class_id,
        questionText: newQuestion.questionText,
        questionType: newQuestion.questionType,
        defaultMarks: Number(newQuestion.defaultMarks),
      };
      if (newQuestion.questionType === 'mcq') {
        payload.options = newQuestion.options
          .map((text, idx) => ({ key: String(idx), text }))
          .filter((o) => o.text.trim());
        payload.correctAnswer = newQuestion.correctAnswer;
      }
      const { data } = await api.post('/questions', payload);
      await attachQuestion(data.id, data.default_marks);
      setNewQuestion(emptyQuestion);
      openAddQuestion();
    } finally {
      setSavingQuestion(false);
    }
  }

  async function openGrading(submissionRow) {
    const { data } = await api.get(`/exams/submissions/${submissionRow.id}`);
    setGradingSubmission(data);
  }

  async function saveGrade(answerId, score, feedback) {
    await api.put(`/exams/submissions/${gradingSubmission.id}/answers/${answerId}/grade`, { score: Number(score), feedback });
    const { data } = await api.get(`/exams/submissions/${gradingSubmission.id}`);
    setGradingSubmission(data);
    api.get(`/exams/${id}/submissions`).then(({ data }) => setSubmissions(data)).catch(() => {});
  }

  async function submitMyAnswers() {
    setShowConfirmSubmit(false);
    setSubmitting(true);
    try {
      const payload = exam.questions.map((q) => ({
        examQuestionId: q.exam_question_id,
        answerText: answers[q.exam_question_id] ?? '',
      }));
      await api.post(`/exams/${id}/submit`, { answers: payload });
      const { data } = await api.get(`/exams/${id}/my-submission`);
      setMySubmission(data);
    } finally {
      setSubmitting(false);
    }
  }

  function jumpToQuestion(examQuestionId) {
    document.getElementById(`question-${examQuestionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!exam) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-1/3" />
      <div className="glass-card p-6">
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900">{exam.title}</h1>
            <span className="px-2 py-0.5 rounded-md text-xs font-semibold border bg-blue-50 text-blue-700 border-blue-200">
              {EXAM_TYPE_LABELS[exam.exam_type] ?? exam.exam_type}
            </span>
          </div>
          <p className="text-slate-500 mt-1">{exam.class_name} - {exam.class_section}</p>
        </div>
        {canManage && (
          <div className="flex gap-3">
            <PrimaryButton variant="secondary" className="!px-3" onClick={openEdit} title="Edit exam">
              <Pencil size={16} />
            </PrimaryButton>
            <PrimaryButton variant="secondary" onClick={togglePublish}>
              {exam.status === 'published' ? 'Unpublish' : 'Publish'}
            </PrimaryButton>
            <PrimaryButton variant="secondary" className="!px-3 hover:!text-danger" onClick={handleDeleteExam} title="Delete exam">
              <Trash2 size={16} />
            </PrimaryButton>
          </div>
        )}
      </div>

      {exam.description && (
        <GlassCard>
          <p className="text-slate-700 whitespace-pre-wrap">{exam.description}</p>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <ListChecks size={17} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Questions</p>
            <p className="text-lg font-bold text-slate-900">{exam.questions.length}</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
            <FileText size={17} />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Marks</p>
            <p className="text-lg font-bold text-slate-900">{totalMarks}</p>
          </div>
        </div>
        {exam.ends_at && (
          <div className="glass-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <Clock size={17} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Closes</p>
              <p className="text-sm font-semibold text-slate-900">{new Date(exam.ends_at).toLocaleString()}</p>
            </div>
          </div>
        )}
        {isStudent && (
          <div className="glass-card p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 shrink-0">
              <CheckCircle2 size={17} />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
              <p className="text-sm font-semibold text-slate-900 capitalize">
                {mySubmission ? mySubmission.status : exam.status}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className={canTake ? 'grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6 items-start' : ''}>
        <div className="space-y-6">
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-slate-800">Questions</h3>
              {canManage && (
                <PrimaryButton className="flex items-center gap-2 !py-2 !px-4 text-sm" onClick={openAddQuestion}>
                  <Plus size={16} /> Add Question
                </PrimaryButton>
              )}
            </div>

            {exam.questions.length === 0 ? (
              <p className="text-slate-500">No questions added yet.</p>
            ) : (
              <div className="space-y-4">
                {exam.questions.map((q, idx) => (
                  <div key={q.exam_question_id} id={`question-${q.exam_question_id}`} className="rounded-xl border border-slate-200 p-5 scroll-mt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <span className="w-7 h-7 rounded-full bg-blue-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="text-slate-900 font-medium">{q.question_text}</p>
                          <p className="text-xs text-slate-500 mt-1 capitalize">{q.question_type.replace('_', ' ')} · {q.marks} {Number(q.marks) === 1 ? 'mark' : 'marks'}</p>

                          {q.question_type === 'mcq' && canTake && (
                            <div className="mt-4 space-y-2">
                              {(q.options || []).map((opt) => {
                                const selected = answers[q.exam_question_id] === opt.key;
                                return (
                                  <label
                                    key={opt.key}
                                    className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 cursor-pointer transition-all duration-150 ${
                                      selected ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input
                                      type="radio"
                                      name={`q-${q.exam_question_id}`}
                                      value={opt.key}
                                      checked={selected}
                                      onChange={() => setAnswers((prev) => ({ ...prev, [q.exam_question_id]: opt.key }))}
                                      className="accent-blue-700"
                                    />
                                    <span className={`text-sm ${selected ? 'text-blue-900 font-medium' : 'text-slate-700'}`}>{opt.text}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {q.question_type !== 'mcq' && canTake && (
                            <textarea
                              className="input-field mt-4"
                              rows={4}
                              placeholder="Write your answer…"
                              value={answers[q.exam_question_id] ?? ''}
                              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.exam_question_id]: e.target.value }))}
                            />
                          )}

                          {isStudent && mySubmission && (
                            <AnswerReview answer={mySubmission.answers.find((a) => a.exam_question_id === q.exam_question_id)} />
                          )}
                        </div>
                      </div>
                      {canManage && (
                        <button onClick={() => removeQuestion(q.exam_question_id)} className="text-xs text-danger hover:underline shrink-0">
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {canTake && (
              <div className="mt-6 pt-6 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4">
                <p className="text-sm text-slate-500">
                  {answeredCount} of {exam.questions.length} questions answered
                </p>
                <PrimaryButton onClick={() => setShowConfirmSubmit(true)} disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Exam'}
                </PrimaryButton>
              </div>
            )}

            {isStudent && !canTake && exam.status !== 'published' && mySubmission === null && (
              <p className="mt-6 text-sm text-slate-500">This exam is not yet published.</p>
            )}

            {isStudent && mySubmission && (
              <div className="mt-6 rounded-lg bg-blue-50 border border-blue-200 p-4 flex items-center gap-3">
                <CheckCircle2 className="text-success shrink-0" size={20} />
                <p className="text-slate-900 font-medium">
                  {mySubmission.status === 'graded'
                    ? `Final Score: ${mySubmission.total_score} / ${mySubmission.max_score}`
                    : 'Submitted — awaiting grading for some answers.'}
                </p>
              </div>
            )}
          </GlassCard>
        </div>

        {canTake && (
          <div className="hidden lg:block sticky top-24">
            <GlassCard>
              <p className="label-caps mb-3">Question Palette</p>
              <div className="grid grid-cols-5 gap-2">
                {exam.questions.map((q, idx) => {
                  const answered = (answers[q.exam_question_id] ?? '').toString().trim() !== '';
                  return (
                    <button
                      key={q.exam_question_id}
                      onClick={() => jumpToQuestion(q.exam_question_id)}
                      className={`w-9 h-9 rounded-lg text-xs font-semibold flex items-center justify-center border transition-colors duration-150 ${
                        answered
                          ? 'bg-blue-700 text-white border-blue-700'
                          : 'bg-white text-slate-500 border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-slate-500">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-blue-700 inline-block" /> Answered</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-slate-300 inline-block" /> Not answered</div>
              </div>
            </GlassCard>
          </div>
        )}
      </div>

      {canManage && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-800">Submissions ({submissions?.length ?? 0})</h3>
            {submissions?.length > 0 && (
              <button
                onClick={() => downloadCsv(`/exams/${id}/submissions/export`, {}, `exam_${id}_results.csv`)}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>
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
                    <td className="py-3 text-slate-600 capitalize">{s.status}</td>
                    <td className="py-3 text-slate-600">{s.total_score ?? '—'} / {s.max_score}</td>
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

      {showConfirmSubmit && (
        <Modal title="Submit Exam?" onClose={() => setShowConfirmSubmit(false)}>
          <div className="space-y-4">
            {answeredCount < exam.questions.length ? (
              <div className="flex items-start gap-3 rounded-lg bg-warning/10 border border-warning/30 p-4">
                <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
                <p className="text-sm text-slate-700">
                  You've answered <strong>{answeredCount}</strong> of <strong>{exam.questions.length}</strong> questions.
                  Unanswered questions will be scored as zero. Submit anyway?
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-700">
                You've answered all {exam.questions.length} questions. Once submitted, you won't be able to change your answers.
              </p>
            )}
            <div className="flex gap-3">
              <PrimaryButton className="flex-1" onClick={submitMyAnswers} disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Exam'}
              </PrimaryButton>
              <PrimaryButton variant="secondary" className="flex-1" onClick={() => setShowConfirmSubmit(false)}>
                Keep Reviewing
              </PrimaryButton>
            </div>
          </div>
        </Modal>
      )}

      {showAddQuestion && (
        <Modal title="Add Question" onClose={() => setShowAddQuestion(false)}>
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <p className="label-caps mb-2">From Question Bank</p>
              {bankQuestions.length === 0 ? (
                <p className="text-slate-500 text-sm">No questions in the bank for this class yet.</p>
              ) : (
                <div className="space-y-2">
                  {bankQuestions.map((q) => (
                    <div key={q.id} className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
                      <span className="text-sm text-slate-700">{q.question_text}</span>
                      <button
                        onClick={() => attachQuestion(q.id, q.default_marks)}
                        className="text-xs font-semibold text-blue-600 hover:underline"
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="label-caps mb-2">Create New Question</p>
              <form onSubmit={createAndAttachQuestion} className="space-y-3">
                <FormInput
                  label="Question Text"
                  required
                  value={newQuestion.questionText}
                  onChange={(e) => setNewQuestion({ ...newQuestion, questionText: e.target.value })}
                />
                <label className="block">
                  <span className="label-caps mb-2 block">Type</span>
                  <select
                    className="input-field"
                    value={newQuestion.questionType}
                    onChange={(e) => setNewQuestion({ ...newQuestion, questionType: e.target.value })}
                  >
                    <option value="mcq">Multiple Choice</option>
                    <option value="short_text">Short Text</option>
                    <option value="long_text">Long Text</option>
                    <option value="essay">Essay</option>
                  </select>
                </label>

                {newQuestion.questionType === 'mcq' && (
                  <div className="space-y-2">
                    {newQuestion.options.map((opt, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="correct"
                          checked={newQuestion.correctAnswer === String(idx)}
                          onChange={() => setNewQuestion({ ...newQuestion, correctAnswer: String(idx) })}
                        />
                        <input
                          className="input-field"
                          placeholder={`Option ${idx + 1}`}
                          value={opt}
                          onChange={(e) => {
                            const options = [...newQuestion.options];
                            options[idx] = e.target.value;
                            setNewQuestion({ ...newQuestion, options });
                          }}
                        />
                      </div>
                    ))}
                    <p className="text-xs text-slate-400">Select the radio button next to the correct option.</p>
                  </div>
                )}

                <FormInput
                  label="Marks"
                  type="number"
                  min={1}
                  value={newQuestion.defaultMarks}
                  onChange={(e) => setNewQuestion({ ...newQuestion, defaultMarks: e.target.value })}
                />
                <PrimaryButton type="submit" className="w-full" disabled={savingQuestion}>
                  {savingQuestion ? 'Adding…' : 'Create & Add to Exam'}
                </PrimaryButton>
              </form>
            </div>
          </div>
        </Modal>
      )}

      {showEdit && (
        <Modal title="Edit Exam" onClose={() => setShowEdit(false)}>
          <form onSubmit={saveEdit} className="space-y-4">
            <FormInput
              label="Title"
              required
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
            <label className="block">
              <span className="label-caps mb-2 block">Description</span>
              <textarea
                className="input-field"
                rows={3}
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              />
            </label>
            <PrimaryButton type="submit" className="w-full" disabled={savingEdit}>
              {savingEdit ? 'Saving…' : 'Save Changes'}
            </PrimaryButton>
          </form>
        </Modal>
      )}

      {gradingSubmission && (
        <Modal title={`Grade — ${gradingSubmission.full_name}`} onClose={() => setGradingSubmission(null)}>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            {gradingSubmission.answers.map((a) => (
              <GradeRow key={a.answer_id} answer={a} onSave={saveGrade} />
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function AnswerReview({ answer }) {
  if (!answer) return null;

  const optionLabel = answer.question_type === 'mcq'
    ? (answer.options || []).find((o) => o.key === answer.answer_text)?.text
    : null;

  return (
    <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 p-3">
      <p className="text-xs text-slate-500">
        Your answer: <span className="text-slate-800 font-medium">{optionLabel ?? answer.answer_text ?? '—'}</span>
      </p>
      {answer.is_correct !== null && (
        <p className={`text-xs mt-1.5 font-semibold ${answer.is_correct ? 'text-success' : 'text-danger'}`}>
          {answer.is_correct ? 'Correct' : 'Incorrect'} · {answer.score} / {answer.max_marks}
        </p>
      )}
      {answer.is_correct === null && (
        <p className="text-xs mt-1.5 font-semibold text-warning">
          {answer.score !== null ? `Scored ${answer.score} / ${answer.max_marks}` : 'Pending review'}
        </p>
      )}
      {answer.feedback && <p className="text-xs text-slate-600 mt-1.5 italic">"{answer.feedback}"</p>}
    </div>
  );
}

function GradeRow({ answer, onSave }) {
  const [score, setScore] = useState(answer.score ?? '');
  const [feedback, setFeedback] = useState(answer.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const autoGraded = answer.question_type === 'mcq';

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(answer.answer_id, score, feedback);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
      <p className="text-slate-900 font-medium text-sm">{answer.question_text}</p>
      <p className="text-xs text-slate-500 mt-1">Answer: {answer.answer_text || '—'}</p>
      {autoGraded ? (
        <p className={`text-xs mt-2 font-semibold ${answer.is_correct ? 'text-success' : 'text-danger'}`}>
          {answer.is_correct ? 'Correct' : 'Incorrect'} · {answer.score} / {answer.max_marks}
        </p>
      ) : (
        <div className="flex items-end gap-3 mt-3">
          <label className="block">
            <span className="label-caps mb-1 block">Score (/ {answer.max_marks})</span>
            <input type="number" className="input-field w-28" value={score} onChange={(e) => setScore(e.target.value)} />
          </label>
          <label className="block flex-1">
            <span className="label-caps mb-1 block">Feedback</span>
            <input className="input-field" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
          </label>
          <PrimaryButton className="!py-2 !px-4 text-sm" onClick={handleSave} disabled={saving || score === ''}>
            Save
          </PrimaryButton>
        </div>
      )}
    </div>
  );
}
