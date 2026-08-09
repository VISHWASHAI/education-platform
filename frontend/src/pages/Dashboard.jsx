import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, GraduationCap, School, CalendarCheck, FileText, ClipboardList, DollarSign, Megaphone, Clock, Activity } from 'lucide-react';
import { api } from '../api/client';
import { StatCard } from '../components/shared/StatCard';
import { GlassCard } from '../components/shared/GlassCard';
import { useAuth } from '../context/AuthContext';
import { ALL_STAFF } from '../constants/roles';

const QUICK_LINKS = [
  { to: '/students', label: 'Students', icon: Users, roles: ALL_STAFF },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL_STAFF },
  { to: '/exams', label: 'Exams', icon: FileText },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/fees', label: 'Fees', icon: DollarSign },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
];

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function describeAction(entry) {
  const verb = entry.action.split(' ')[0];
  const verbLabel = { POST: 'created', PUT: 'updated', PATCH: 'updated', DELETE: 'deleted' }[verb] || verb.toLowerCase();
  return `${entry.user_name ?? 'Someone'} ${verbLabel} ${entry.entity}${entry.entity_id ? ` #${entry.entity_id}` : ''}`;
}

export function Dashboard() {
  const { user } = useAuth();
  const isStaff = ALL_STAFF.includes(user?.role);

  const [overview, setOverview] = useState(null);
  const [activity, setActivity] = useState(null);
  const [deadlines, setDeadlines] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/overview').then(({ data }) => setOverview(data)).catch(() => setError('Could not load dashboard data'));
    api.get('/dashboard/upcoming-deadlines').then(({ data }) => setDeadlines(data)).catch(() => setDeadlines([]));
    if (isStaff) {
      api.get('/dashboard/recent-activity').then(({ data }) => setActivity(data)).catch(() => setActivity([]));
    }
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your institution</p>
      </div>

      {error && <p className="text-danger">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={overview?.totalStudents ?? '—'} icon={Users} />
        <StatCard title="Total Teachers" value={overview?.totalTeachers ?? '—'} icon={GraduationCap} />
        <StatCard title="Total Classes" value={overview?.totalClasses ?? '—'} icon={School} />
        <StatCard
          title="Attendance Rate Today"
          value={overview ? `${overview.attendanceRateToday}%` : '—'}
          icon={CalendarCheck}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {QUICK_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role)).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-sm text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-slate-900 transition-all duration-300"
          >
            <Icon size={15} /> {label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h3 className="text-xl font-semibold text-slate-800 mb-4">Today's Attendance Breakdown</h3>
          {overview ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Object.entries(overview.attendanceToday).map(([status, count]) => (
                <div key={status} className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="text-xs uppercase tracking-wide text-slate-500 mt-1">{status}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500">Loading…</p>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={18} className="text-blue-600" />
            <h3 className="text-xl font-semibold text-slate-800">Due in the Next 7 Days</h3>
          </div>
          {deadlines === null ? (
            <p className="text-slate-500">Loading…</p>
          ) : deadlines.length === 0 ? (
            <p className="text-slate-500">Nothing due soon.</p>
          ) : (
            <ul className="space-y-2">
              {deadlines.map((d) => (
                <li key={`${d.type}-${d.id}`}>
                  <Link
                    to={d.type === 'exam' ? `/exams/${d.id}` : `/assignments/${d.id}`}
                    className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 hover:bg-blue-50 transition-colors duration-300"
                  >
                    <div>
                      <p className="text-slate-900 text-sm font-medium">{d.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">{d.type} · {d.class_name} - {d.class_section}</p>
                    </div>
                    <span className="text-xs text-warning font-semibold whitespace-nowrap">
                      {new Date(d.due_at).toLocaleDateString()}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>

      {isStaff && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <Activity size={18} className="text-blue-600" />
            <h3 className="text-xl font-semibold text-slate-800">Recent Activity</h3>
          </div>
          {activity === null ? (
            <p className="text-slate-500">Loading…</p>
          ) : activity.length === 0 ? (
            <p className="text-slate-500">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-0">
                  <span className="text-slate-700">{describeAction(a)}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      )}
    </div>
  );
}
