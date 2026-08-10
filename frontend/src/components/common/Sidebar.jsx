import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../constants/navigation';

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const visibleLinks = NAV_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));

  const sections = [];
  for (const link of visibleLinks) {
    let group = sections.find((s) => s.name === link.section);
    if (!group) {
      group = { name: link.section, links: [] };
      sections.push(group);
    }
    group.links.push(link);
  }

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 shrink-0 h-screen fixed lg:sticky top-0 z-40 bg-white border-r-2 border-slate-200 shadow-lg lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-start justify-between gap-2 p-6 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-16 h-16 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 p-1.5">
              <img src="/logo.png" alt="People's Education Society emblem" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 leading-snug">People's Education Society</p>
              <p className="text-[11px] text-slate-500 tracking-wide">Academic Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-900 shrink-0 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-5">
          {sections.map((group) => (
            <div key={group.name}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {group.name}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-lg text-sm font-medium border-l-[3px] transition-all duration-150 ${
                        isActive
                          ? 'bg-blue-50 border-blue-600 text-blue-700'
                          : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.fullName?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.fullName}</p>
              <p className="text-xs text-slate-500 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={logout} className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0">
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
