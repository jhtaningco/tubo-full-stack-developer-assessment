import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Invoice Console',
      path: '/',
      badge: 'Live',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Issue Invoice',
      path: '/invoices/new',
      badge: 'New',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-72 bg-[#0B0F19]/95 backdrop-blur-xl border-r border-white/[0.07] flex flex-col min-h-screen shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-[#0B0F19] rounded-full"></span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-white font-extrabold tracking-tight text-lg">TUBO</span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                PRO
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-400">E-Invoicing Cloud</div>
          </div>
        </div>
      </div>

      {/* Verified Organization Card */}
      <div className="p-4 mx-4 my-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] transition-colors group">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
            <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified Issuer
          </span>
          <span className="text-[10px] text-slate-500 font-mono">TIN OK</span>
        </div>
        <div className="text-white font-semibold text-sm truncate group-hover:text-indigo-200 transition-colors">
          {user?.company?.name || 'Corporate Account'}
        </div>
        <div className="text-slate-400 text-xs font-mono mt-0.5 flex items-center gap-1">
          <span>TIN:</span>
          <span className="text-slate-300">{user?.company?.tax_id || '---'}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-1.5">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Main Console
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/25 ring-1 ring-white/20'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-white/[0.06] text-slate-400 group-hover:text-slate-300'
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
      <div className="p-4 mx-4 mb-4 rounded-2xl bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold text-slate-200 text-xs">Gov Tax Gateway</span>
          </div>
          <span className="text-[10px] text-emerald-400 font-mono font-medium">99.9% Up</span>
        </div>
        <div className="text-[11px] text-slate-400 leading-relaxed">
          Connected to Central Tax Portal for automated clearance & audit receipts.
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
