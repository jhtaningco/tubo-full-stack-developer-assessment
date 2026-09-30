import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Invoice Console',
      path: '/',
      badge: 'Live',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Issue Invoice',
      path: '/invoices/new',
      badge: 'New',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-white border-r border-slate-200 flex flex-col min-h-screen shrink-0 relative z-20 shadow-sm transition-all duration-300 ease-in-out`}
    >
      {/* Brand Header */}
      <div className="h-20 px-4 flex items-center justify-between border-b border-slate-100">
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/25 ring-1 ring-blue-600/20">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div className="truncate">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-900 font-extrabold tracking-tight text-lg">TUBO</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 rounded border border-blue-200">
                    PRO
                  </span>
                </div>
                <div className="text-[11px] font-semibold text-slate-500">E-Invoicing Cloud</div>
              </div>
            </div>

            {/* Collapse Toggle Button */}
            <button
              onClick={toggleSidebar}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              title="Collapse sidebar"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </>
        ) : (
          <div className="w-full flex flex-col items-center justify-center">
            <button
              onClick={toggleSidebar}
              className="relative p-1 rounded-xl hover:bg-slate-100 transition group"
              title="Expand sidebar"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center shadow-md shadow-blue-500/25 ring-1 ring-blue-600/20 group-hover:scale-105 transition">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </button>
          </div>
        )}
      </div>

      {/* Verified Organization Card */}
      {!isCollapsed ? (
        <div className="p-4 mx-4 my-4 rounded-2xl bg-blue-50/50 border border-blue-100/80 transition-colors">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1">
              <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified Issuer
            </span>
            <span className="text-[10px] text-blue-600 font-mono font-semibold">TIN OK</span>
          </div>
          <div className="text-slate-900 font-bold text-sm truncate">
            {user?.company?.name || 'Corporate Account'}
          </div>
          <div className="text-slate-500 text-xs font-mono mt-0.5 flex items-center gap-1">
            <span>TIN:</span>
            <span className="text-slate-700 font-semibold">{user?.company?.tax_id || '---'}</span>
          </div>
        </div>
      ) : (
        <div className="py-3 flex justify-center">
          <div
            className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold"
            title={`${user?.company?.name || 'Company'} (TIN: ${user?.company?.tax_id || ''})`}
          >
            <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1.5 mt-1">
        {!isCollapsed && (
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Main Console
          </div>
        )}
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            title={isCollapsed ? item.name : undefined}
            className={({ isActive }) =>
              `flex items-center ${
                isCollapsed ? 'justify-center p-3' : 'justify-between px-3.5 py-3'
              } rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/25'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Government Tax Gateway Status Box */}
      {!isCollapsed ? (
        <div className="p-4 mx-4 mb-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-bold text-slate-800 text-xs">Gov Tax Gateway</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-mono font-bold">99.9% Up</span>
          </div>
          <div className="text-[11px] text-slate-500 leading-relaxed">
            Connected to Central Tax Portal for clearance & audit receipts.
          </div>
        </div>
      ) : (
        <div className="py-4 flex justify-center" title="Gov Tax Gateway: Online 99.9%">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </span>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
