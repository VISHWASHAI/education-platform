import { LogOut, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-slate-200 bg-white sticky top-0 z-10">
      <button onClick={onMenuClick} className="text-slate-500 hover:text-slate-900 transition-colors duration-200 lg:hidden" aria-label="Open menu">
        <Menu size={22} />
      </button>
      <div className="hidden lg:block" />
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700 shrink-0">
          {user?.fullName?.[0] ?? '?'}
        </div>
        <button
          onClick={logout}
          className="text-slate-400 hover:text-danger transition-colors duration-200"
          title="Log out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
