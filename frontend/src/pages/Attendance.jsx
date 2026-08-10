import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { PrimaryButton } from '../components/shared/PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { ALL_STAFF } from '../constants/roles';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'leave'];
const STATUS_COLORS = {
  present: 'bg-success/20 text-success border-success/40',
  absent: 'bg-danger/20 text-danger border-danger/40',
  late: 'bg-warning/20 text-warning border-warning/40',
  leave: 'bg-info/20 text-info border-info/40',
};

const today = new Date().toISOString().slice(0, 10);

export function Attendance() {
  const { user } = useAuth();
  const [classId, setClassId] = useState(1);
  const [date, setDate] = useState(today);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  function load() {
    setLoading(true);
    api
      .get('/attendance', { params: { classId, date } })
      .then(({ data }) => setRows(data.map((r) => ({ ...r, status: r.status ?? 'present' }))))
      .catch(() => setMessage('Could not load attendance'))
      .finally(() => setLoading(false));
  }

  useEffect(load, [classId, date]);

  function setStatus(studentId, status) {
    setRows((prev) => prev.map((r) => (r.student_id === studentId ? { ...r, status } : r)));
  }

  async function save() {
    setSaving(true);
    setMessage('');
    try {
      await api.post('/attendance', {
        classId,
        date,
        records: rows.map((r) => ({ studentId: r.student_id, status: r.status })),
      });
      setMessage('Attendance saved.');
    } catch {
      setMessage('Could not save attendance.');
    } finally {
      setSaving(false);
    }
  }

  if (!ALL_STAFF.includes(user?.role)) {
    return (
      <GlassCard>
        <p className="text-slate-600">Attendance records aren't part of your role's access.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Attendance</h1>
        <p className="text-blue-100 mt-1">Mark daily attendance for a class</p>
      </div>

      <GlassCard>
        <div className="flex flex-wrap items-end gap-4 mb-6">
          <label className="block">
            <span className="label-caps mb-2 block">Class ID</span>
            <input
              type="number"
              min={1}
              value={classId}
              onChange={(e) => setClassId(Number(e.target.value))}
              className="input-field w-32"
            />
          </label>
          <label className="block">
            <span className="label-caps mb-2 block">Date</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </label>
          <PrimaryButton onClick={save} disabled={saving || loading}>
            {saving ? 'Saving…' : 'Save Attendance'}
          </PrimaryButton>
          {message && <span className="text-sm text-slate-600">{message}</span>}
        </div>

        {loading ? (
          <p className="text-slate-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-slate-500">No students found in this class.</p>
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div
                key={r.student_id}
                className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="text-slate-900 font-medium">{r.full_name}</p>
                  <p className="text-xs text-slate-500">{r.admission_no}</p>
                </div>
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatus(r.student_id, status)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border capitalize transition-all duration-300 ${
                        r.status === status ? STATUS_COLORS[status] : 'border-slate-200 text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
