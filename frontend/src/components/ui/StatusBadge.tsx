import React from 'react';
import { InvoiceStatus } from '../../types';

interface StatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wide',
    md: 'px-2.5 py-1 text-xs font-semibold tracking-wide',
    lg: 'px-3.5 py-1.5 text-sm font-semibold tracking-wide',
  };

  switch (status) {
    case 'SUBMITTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-500/10 ${sizeClasses[size]}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          SUBMITTED
        </span>
      );

    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 ${sizeClasses[size]}`}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          PROCESSING
        </span>
      );

    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-sm shadow-amber-500/10 ${sizeClasses[size]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
          QUEUED
        </span>
      );

    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-500/10 ${sizeClasses[size]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400"></span>
          FAILED
        </span>
      );

    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10 ${sizeClasses[size]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
          REJECTED
        </span>
      );

    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 ${sizeClasses[size]}`}
        >
          {status}
        </span>
      );
  }
};

export default StatusBadge;
