import { useEffect, useState } from 'react';
import { Users, GraduationCap, CalendarCheck, Award, Trophy, UserPlus, ClipboardList, FileText, Megaphone } from 'lucide-react';
import { api } from '../api/client';
import { GlassCard } from '../components/shared/GlassCard';
import { StatCard } from '../components/shared/StatCard';
import { LineChart } from '../components/shared/LineChart';
import { PercentBarChart } from '../components/shared/PercentBarChart';
import { GroupedBarChart } from '../components/shared/GroupedBarChart';
import { CategoryBarList } from '../components/shared/CategoryBarList';
import { Skeleton, SkeletonStatRow, SkeletonChart } from '../components/shared/Skeleton';

function trendLabel(pct) {
  if (pct === null || pct === undefined) return null;
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  return `${arrow} ${Math.abs(pct)}% vs last period`;
}

const MONTH_ITEMS = [
  { key: 'newStudents', label: 'New Students', icon: UserPlus },
  { key: 'newTeachers', label: 'New Teachers', icon: GraduationCap },
  { key: 'assignmentsCreated', label: 'Assignments', icon: ClipboardList },
  { key: 'examsCreated', label: 'Exams', icon: FileText },
  { key: 'announcementsPosted', label: 'Announcements', icon: Megaphone },
];

export function Analytics() {
  const [overview, setOverview] = useState(null);
  const [studentsByClass, setStudentsByClass] = useState(null);
  const [topPerformers, setTopPerformers] = useState(null);
  const [monthSummary, setMonthSummary] = useState(null);
  const [attendanceTrend, setAttendanceTrend] = useState(null);
  const [examPerformance, setExamPerformance] = useState(null);
  const [classPerformance, setClassPerformance] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/students-by-class'),
      api.get('/analytics/top-performers'),
      api.get('/analytics/month-summary'),
      api.get('/analytics/attendance-trend'),
      api.get('/analytics/exam-performance'),
      api.get('/analytics/class-performance'),
    ])
      .then(([o, s, t, m, a, e, c]) => {
        setOverview(o.data);
        setStudentsByClass(s.data);
        setTopPerformers(t.data);
        setMonthSummary(m.data);
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

      {overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Students"
            value={overview.totalStudents}
            change={trendLabel(overview.studentsTrendPct)}
            changeType={overview.studentsTrendPct >= 0 ? 'positive' : 'negative'}
            icon={Users}
            color="blue"
          />
          <StatCard title="Total Teachers" value={overview.totalTeachers} icon={GraduationCap} color="purple" />
          <StatCard
            title="Attendance Rate (This Month)"
            value={overview.attendanceRateThisMonth !== null ? `${overview.attendanceRateThisMonth}%` : '—'}
            change={trendLabel(overview.attendanceTrendPct)}
            changeType={overview.attendanceTrendPct >= 0 ? 'positive' : 'negative'}
            icon={CalendarCheck}
            color="green"
          />
          <StatCard
            title="Average Exam Score"
            value={overview.avgExamScore !== null ? `${overview.avgExamScore}%` : '—'}
            icon={Award}
            color="orange"
          />
        </div>
      ) : (
        <SkeletonStatRow />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Students by Class</h3>
          {studentsByClass ? (
            <CategoryBarList data={studentsByClass} labelKey="className" valueKey="count" />
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-1/3 mb-2" />
                  <Skeleton className="h-2.5 w-full rounded-full" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Trophy size={18} className="text-blue-600" />
            <h3 className="text-xl font-semibold text-slate-800">Top Performing Students</h3>
          </div>
          {topPerformers ? (
            topPerformers.length === 0 ? (
              <p className="text-slate-500">No graded exams yet.</p>
            ) : (
              <ul className="space-y-3">
                {topPerformers.map((p, i) => (
                  <li key={p.fullName} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">{p.fullName}</p>
                      {p.className && <p className="text-xs text-slate-500">{p.className}</p>}
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">{p.avgScore}%</span>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Attendance Rate — Last 30 Days</h3>
        {attendanceTrend ? (
          <LineChart data={attendanceTrend} labelKey="date" valueKey="presentRate" />
        ) : (
          <SkeletonChart />
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">Average Exam Scores (Recent Exams)</h3>
        {examPerformance ? (
          <PercentBarChart data={examPerformance} labelKey="title" valueKey="avgPercentage" />
        ) : (
          <SkeletonChart height={180} />
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
          <SkeletonChart height={180} />
        )}
      </GlassCard>

      <GlassCard>
        <h3 className="text-xl font-semibold text-slate-800 mb-4">This Month</h3>
        {monthSummary ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {MONTH_ITEMS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 p-4">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold text-slate-900 leading-tight">{monthSummary[key]}</p>
                  <p className="text-xs text-slate-500 truncate">{label}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[60px]" />
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
