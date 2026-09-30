import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../lib/api';
import { Invoice, PaginatedResponse } from '../types';

interface StatsResponse {
  total: number;
  pending: number;
  processing: number;
  submitted: number;
  failed: number;
  rejected: number;
}

export const DashboardPage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<StatsResponse>({
    total: 0,
    pending: 0,
    processing: 0,
    submitted: 0,
    failed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [lastSync, setLastSync] = useState<string>('Just now');

  const fetchStats = async () => {
    try {
      const res = await api.get<StatsResponse>('/api/invoices/stats/');
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch invoice stats', err);
    }
  };

  const fetchInvoices = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      if (selectedStatus) params.append('status', selectedStatus);
      if (searchQuery) params.append('search', searchQuery);
      if (selectedDate) params.append('invoice_date', selectedDate);

      const res = await api.get<PaginatedResponse<Invoice>>(`/api/invoices/?${params.toString()}`);
      setInvoices(res.data.results);
      setTotalCount(res.data.count);
      setTotalPages(Math.ceil(res.data.count / 10) || 1);
      setLastSync(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Failed to fetch invoices', err);
    } finally {
      if (!isSilent) {
        setLoading(false);
      }
    }
  }, [page, selectedStatus, searchQuery, selectedDate]);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchInvoices(false);
  }, [fetchInvoices]);

  // Polling every 5 seconds for live background queue updates (silent in background)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchInvoices(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchInvoices]);

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600">Electronic Invoicing</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-mono">Live Synced: {lastSync}</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Invoice Operations Console</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { fetchStats(); fetchInvoices(); }}
              className="p-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs"
              title="Refresh Invoices"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link
              to="/invoices/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>Issue New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Executive Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Invoices */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-card hover:border-slate-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Volume</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1.5 font-mono">{stats.total}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="text-blue-600 font-bold font-mono">100%</span>
              <span>All company invoices</span>
            </div>
          </div>

          {/* Gov Submitted */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-200/80 shadow-card hover:border-emerald-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Gov Clearance OK</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1.5 font-mono">{stats.submitted}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-700 font-semibold">
              <span>● Tax clearance registered</span>
            </div>
          </div>

          {/* In Queue / Processing */}
          <div className="p-5 rounded-2xl bg-white border border-amber-200/80 shadow-card hover:border-amber-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">In Worker Queue</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1.5 font-mono">{stats.pending + stats.processing}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
              <span>● Async Celery submission</span>
            </div>
          </div>

          {/* Failed / Rejected */}
          <div className="p-5 rounded-2xl bg-white border border-rose-200/80 shadow-card hover:border-rose-300 transition-all">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Attention Needed</div>
                <div className="text-3xl font-extrabold text-slate-900 mt-1.5 font-mono">{stats.failed + stats.rejected}</div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold">
              <span>● Manual retry available</span>
            </div>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search invoice number, buyer TIN, customer name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>

            {/* Status Select */}
            <div className="w-full sm:w-48">
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="PENDING">Queued / Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="FAILED">Failed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {/* Date Picker */}
            <div className="w-full sm:w-44">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3.5 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {(selectedStatus || searchQuery || selectedDate) && (
            <button
              onClick={() => {
                setSelectedStatus('');
                setSearchQuery('');
                setSelectedDate('');
                setPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-700 font-bold px-2 py-1 transition whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Invoices Table Card */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-4 px-6">Invoice #</th>
                  <th className="py-4 px-5">Customer & TIN</th>
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-4 text-center">Items</th>
                  <th className="py-4 px-5 text-right">Gross Total</th>
                  <th className="py-4 px-5">Gov Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
                      <div className="text-xs font-semibold">Fetching real-time invoices...</div>
                    </td>
                  </tr>
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-500">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center text-slate-400 mb-3">
                        <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="font-bold text-slate-800 text-sm">No invoices found</div>
                      <div className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        {searchQuery || selectedStatus || selectedDate
                          ? 'No matching records for current filter parameters.'
                          : 'You haven’t issued any electronic invoices yet.'}
                      </div>
                      <div className="mt-5">
                        <Link
                          to="/invoices/new"
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition inline-block shadow-md shadow-blue-600/20"
                        >
                          Issue New Invoice
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-4 px-6 font-semibold">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="font-mono text-blue-600 group-hover:text-blue-800 hover:underline flex items-center gap-1.5 font-bold"
                        >
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="py-4 px-5">
                        <div className="font-bold text-slate-900 truncate max-w-[200px]">{inv.customer_name}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">TIN: {inv.customer_tax_id}</div>
                      </td>
                      <td className="py-4 px-5 text-slate-600 font-mono whitespace-nowrap">
                        {inv.invoice_date}
                      </td>
                      <td className="py-4 px-4 text-center text-slate-600 font-mono">
                        {inv.items?.length || 0}
                      </td>
                      <td className="py-4 px-5 text-right font-bold text-slate-900 font-mono whitespace-nowrap">
                        <span className="text-xs text-slate-400 font-sans mr-1">{inv.currency}</span>
                        {Number(inv.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-5 whitespace-nowrap">
                        <StatusBadge status={inv.status} />
                      </td>
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <Link
                          to={`/invoices/${inv.id}`}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-bold text-xs transition inline-flex items-center gap-1 border border-slate-200"
                        >
                          <span>Review</span>
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 bg-slate-50/50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                Page <span className="font-bold text-slate-900 font-mono">{page}</span> of{' '}
                <span className="font-bold text-slate-900 font-mono">{totalPages}</span> ({totalCount} records)
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold transition border border-slate-200 shadow-xs"
                >
                  Previous
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                  className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-bold transition border border-slate-200 shadow-xs"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default DashboardPage;
