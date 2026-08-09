import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function Navbar() {
  const { user, logout } = useAuth();
  return (
    <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white sticky top-0 z-10">
      <div />
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-slate-900">{user?.fullName}</p>
          <p className="text-xs text-slate-500 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-sm font-semibold text-blue-700">
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
