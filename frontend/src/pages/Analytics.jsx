import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { LineChart } from '../components/shared/LineChart';
import { PercentBarChart } from '../components/shared/PercentBarChart';
import { GroupedBarChart } from '../components/shared/GroupedBarChart';

export function Analytics() {
  const [attendanceTrend, setAttendanceTrend] = useState(null);
  const [examPerformance, setExamPerformance] = useState(null);
  const [classPerformance, setClassPerformance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/analytics/attendance-trend'),
      api.get('/analytics/exam-performance'),
      api.get('/analytics/class-performance'),
    ])
      .then(([a, e, c]) => {
        setAttendanceTrend(a.data);
        setExamPerformance(e.data);
        setClassPerformance(c.data);
      })
      .catch(() => setError('Could not load analytics data'));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">Institution-wide performance at a glance</p>
      </div>

      {error && <p className="text-danger">{error}</p>}

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Attendance Rate — Last 30 Days</h3>
        {attendanceTrend ? (
          <LineChart data={attendanceTrend} labelKey="date" valueKey="presentRate" />
        ) : (
          <p className="text-slate-500">Loading…</p>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Average Exam Scores (Recent Exams)</h3>
        {examPerformance ? (
          <PercentBarChart data={examPerformance} labelKey="title" valueKey="avgPercentage" />
        ) : (
          <p className="text-slate-500">Loading…</p>
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Class Comparison</h3>
        {classPerformance ? (
          <GroupedBarChart
            data={classPerformance}
            labelKey="className"
            series={[
              { key: 'attendanceRate', label: 'Attendance Rate' },
              { key: 'avgExamScore', label: 'Avg Exam Score' },
            ]}
          />
        ) : (
          <p className="text-slate-500">Loading…</p>
        )}
      </GlassCard>
    </div>
  );
}
