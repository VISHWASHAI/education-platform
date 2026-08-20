import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { NAV_LINKS, sectionFor } from '../../constants/navigation';

const ROYAL_BLUE = '#1a1f6e';

export function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
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

  const [openSection, setOpenSection] = useState(sectionFor(location.pathname));

  useEffect(() => {
    setOpenSection(sectionFor(location.pathname));
  }, [location.pathname]);

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
        className={`w-64 shrink-0 h-screen fixed lg:sticky top-0 z-40 text-white shadow-lg lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ background: `linear-gradient(180deg, ${ROYAL_BLUE} 0%, #12154d 100%)` }}
      >
        <div className="flex items-start justify-between gap-2 p-6 pb-5 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-16 h-16 rounded-lg bg-white border border-white/20 flex items-center justify-center shrink-0 p-1.5">
              <img src="/logo.png" alt="People's Education Society emblem" className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white leading-snug">People's Education Society</p>
              <p className="text-[11px] text-white/60 tracking-wide">Academic Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white shrink-0 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-1">
          {sections.map((group) => {
            const isOpen = openSection === group.name;
            return (
              <div key={group.name}>
                <button
                  onClick={() => setOpenSection(isOpen ? null : group.name)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-[11px] font-bold uppercase tracking-widest text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors duration-150"
                >
                  {group.name}
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && (
                  <div className="flex flex-col gap-0.5 pb-2">
                    {group.links.map(({ to, label, icon: Icon, end }) => (
                      <NavLink
                        key={to}
                        to={to}
                        end={end}
                        className={({ isActive }) =>
                          `flex items-center gap-3 pl-3 pr-4 py-2.5 rounded-lg text-sm font-medium border-l-[3px] transition-all duration-150 ${
                            isActive
                              ? 'bg-white/15 border-white text-white'
                              : 'border-transparent text-white/70 hover:bg-white/5 hover:text-white'
                          }`
                        }
                      >
                        <Icon size={18} />
                        {label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 border border-white/10 px-3 py-2.5">
            <div className="w-9 h-9 rounded-full bg-white text-blue-900 flex items-center justify-center text-sm font-semibold shrink-0">
              {user?.fullName?.[0] ?? '?'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.fullName}</p>
              <p className="text-xs text-white/60 capitalize truncate">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button onClick={logout} className="text-xs font-semibold text-white/80 hover:text-white shrink-0">
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
