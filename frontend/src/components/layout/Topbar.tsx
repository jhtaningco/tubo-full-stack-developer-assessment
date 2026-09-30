import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-20 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span className="text-xs font-semibold text-slate-300">Production Node</span>
          <span className="text-slate-600">•</span>
          <span className="text-xs font-mono text-slate-400">Asia-East (MNL-01)</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* User Badge */}
        <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.06] pl-3.5 pr-2 py-1.5 rounded-xl">
          <div className="text-right">
            <div className="text-xs font-bold text-white leading-tight">{user?.email}</div>
            <div className="text-[11px] text-indigo-400 font-medium">{user?.company?.name}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-white/20">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <div className="h-5 w-px bg-white/[0.08]" />

        {/* Logout Action */}
        <button
          onClick={logout}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-rose-500/10 hover:border-rose-500/30 border border-white/[0.08] transition-all flex items-center gap-2"
          title="Sign out of Tubo"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
