import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, CalendarCheck, GraduationCap, School, FileText, ClipboardList, DollarSign, BarChart3, ShieldCheck, FileUp, Megaphone, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ALL_STAFF, ADMIN_TRIO } from '../../constants/roles';

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/students', label: 'Students', icon: Users, roles: ALL_STAFF },
  { to: '/teachers', label: 'Teachers', icon: GraduationCap, roles: ALL_STAFF },
  { to: '/classes', label: 'Classes', icon: School, roles: ALL_STAFF },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL_STAFF },
  { to: '/exams', label: 'Exams', icon: FileText },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList },
  { to: '/fees', label: 'Fees', icon: DollarSign, roles: [...ADMIN_TRIO, 'student'] },
  { to: '/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ALL_STAFF },
  { to: '/audit-log', label: 'Audit Log', icon: ShieldCheck, roles: ['super_admin', 'head_master'] },
  { to: '/bulk-tools', label: 'Import / Export', icon: FileUp, roles: ADMIN_TRIO },
];

export function Sidebar() {
  const { user } = useAuth();
  const visibleLinks = links.filter((link) => !link.roles || link.roles.includes(user?.role));

  return (
    <aside className="w-64 shrink-0 h-screen sticky top-0 bg-navy-900 p-6 flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0 p-1 shadow-sm">
          <img src="/logo.png" alt="People's Education Society emblem" className="w-full h-full object-contain" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-tight">People's Education Society</p>
          <p className="text-[11px] text-navy-300 tracking-wide">Academic Portal</p>
        </div>
      </div>
      <nav className="flex flex-col gap-1">
        {visibleLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-navy-200 hover:bg-navy-800 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
