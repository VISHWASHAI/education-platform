import { useLocation } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { pageTitleFor } from '../../constants/navigation';

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const title = pageTitleFor(location.pathname);

  return (
    <header
      className="h-16 flex items-center justify-between gap-4 px-4 sm:px-8 border-b-2 bg-white shadow-sm sticky top-0 z-10"
      style={{ borderBottomColor: '#1a1f6e' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={onMenuClick} className="text-slate-500 hover:text-slate-900 transition-colors duration-200 lg:hidden shrink-0" aria-label="Open menu">
          <Menu size={22} />
        </button>
        {title && (
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">{title}</h2>
        )}
      </div>
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-sm font-semibold text-blue-700 shrink-0">
          {user?.fullName?.[0] ?? '?'}
        </div>
        <button onClick={logout} className="text-slate-400 hover:text-danger transition-colors duration-200" title="Log out">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
