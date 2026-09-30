import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface TopbarProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ isCollapsed, toggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-10 shadow-xs">
      <div className="flex items-center gap-4">
        {/* Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-xs transition"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-bold text-slate-700">Production Node</span>
          <span className="text-slate-300">•</span>
          <span className="text-xs font-mono text-slate-500">Asia-East (MNL-01)</span>
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-5">
        {/* User Badge */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 pl-3.5 pr-2 py-1.5 rounded-xl">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-slate-900 leading-tight">{user?.email}</div>
            <div className="text-[11px] text-blue-600 font-semibold">{user?.company?.name}</div>
          </div>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 to-blue-500 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-1 ring-blue-600/20">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Logout Action */}
        <button
          onClick={logout}
          className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 transition-all flex items-center gap-2"
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
