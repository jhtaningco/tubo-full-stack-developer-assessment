import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const Topbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <h1 className="text-slate-200 font-medium text-sm hidden sm:block">
          Electronic Invoicing Management System
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="flex items-center gap-3 text-right">
          <div className="hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{user?.email}</div>
            <div className="text-[11px] text-slate-400 font-medium">{user?.company?.name}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-indigo-400">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800" />

        {/* Logout Button */}
        <button
          onClick={logout}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition flex items-center gap-1.5"
          title="Sign out of Tubo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Topbar;
