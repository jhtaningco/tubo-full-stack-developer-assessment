import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Invoice Dashboard',
      path: '/',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: 'Create Invoice',
      path: '/invoices/new',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
          <span className="text-white font-black text-lg">T</span>
        </div>
        <div>
          <div className="text-white font-bold tracking-tight text-base leading-none">TUBO</div>
          <div className="text-[10px] font-semibold text-indigo-400 tracking-wider uppercase mt-1">E-Invoicing</div>
        </div>
      </div>

      {/* Company Profile Card */}
      <div className="p-4 mx-3 my-4 rounded-xl bg-slate-800/60 border border-slate-800 text-xs">
        <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Company Account</div>
        <div className="text-white font-semibold truncate text-sm">
          {user?.company?.name || 'My Company'}
        </div>
        <div className="text-slate-400 text-xs font-mono mt-0.5">
          TIN: {user?.company?.tax_id || '---'}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1.5">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`
            }
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Environment / Compliance Status */}
      <div className="p-4 border-t border-slate-800/80 m-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-semibold text-slate-300">Gov Gateway: Online</span>
        </div>
        <div className="text-[11px] text-slate-500">
          BIR Electronic Invoicing Compliance Ready
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
