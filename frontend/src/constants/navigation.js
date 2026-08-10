import { LayoutDashboard, Users, CalendarCheck, GraduationCap, School, FileText, ClipboardList, DollarSign, BarChart3, ShieldCheck, FileUp, Megaphone, MessageSquare } from 'lucide-react';
import { ALL_STAFF, ADMIN_TRIO } from './roles';

// Single source of truth for sidebar links and the navbar's current-page title —
// keep in sync with the routes registered in App.jsx.
// `section` groups related links under a heading in the sidebar.
export const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true, section: 'Overview' },

  { to: '/students', label: 'Students', icon: Users, roles: ALL_STAFF, section: 'People' },
  { to: '/teachers', label: 'Teachers', icon: GraduationCap, roles: ALL_STAFF, section: 'People' },
  { to: '/classes', label: 'Classes', icon: School, roles: ALL_STAFF, section: 'People' },

  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ALL_STAFF, section: 'Academics' },
  { to: '/exams', label: 'Exams', icon: FileText, section: 'Academics' },
  { to: '/assignments', label: 'Assignments', icon: ClipboardList, section: 'Academics' },
  { to: '/fees', label: 'Fees', icon: DollarSign, roles: [...ADMIN_TRIO, 'student'], section: 'Academics' },

  { to: '/announcements', label: 'Announcements', icon: Megaphone, section: 'Communication' },
  { to: '/messages', label: 'Messages', icon: MessageSquare, section: 'Communication' },

  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ALL_STAFF, section: 'Administration' },
  { to: '/audit-log', label: 'Audit Log', icon: ShieldCheck, roles: ['super_admin', 'head_master'], section: 'Administration' },
  { to: '/bulk-tools', label: 'Import / Export', icon: FileUp, roles: ADMIN_TRIO, section: 'Administration' },
];

export function pageTitleFor(pathname) {
  if (pathname === '/') return 'Dashboard';
  const match = NAV_LINKS.find((link) => link.to !== '/' && pathname.startsWith(link.to));
  return match?.label ?? '';
}
