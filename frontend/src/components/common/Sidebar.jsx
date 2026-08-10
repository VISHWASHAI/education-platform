import { NavLink } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS } from '../../constants/navigation';

export function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const visibleLinks = NAV_LINKS.filter((link) => !link.roles || link.roles.includes(user?.role));

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
        className={`w-64 shrink-0 h-screen fixed lg:sticky top-0 z-40 bg-white border-r-2 border-slate-200 shadow-lg lg:shadow-none p-6 flex flex-col gap-8 transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="flex items-start justify-between gap-2 pb-5 border-b border-slate-100">
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
        <nav className="flex flex-col gap-1 overflow-y-auto">
          {visibleLinks.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-blue-50 hover:text-slate-900'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
