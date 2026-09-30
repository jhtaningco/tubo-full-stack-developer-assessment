import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../lib/api';
import { Invoice } from '../types';

export const InvoiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get<Invoice>(`/api/invoices/${id}/`);
      setInvoice(res.data);
    } catch (err: any) {
      console.error('Failed to fetch invoice detail', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  // Polling while in PENDING or PROCESSING state
  useEffect(() => {
    if (!invoice || (invoice.status !== 'PENDING' && invoice.status !== 'PROCESSING')) {
      return;
    }
    const interval = setInterval(() => {
      fetchInvoice();
    }, 3000);
    return () => clearInterval(interval);
  }, [invoice, fetchInvoice]);

  const handleRetry = async () => {
    if (!id) return;
    setRetrying(true);
    setActionMessage(null);

    try {
      const res = await api.post(`/api/invoices/${id}/retry/`);
      setActionMessage({
        text: res.data.message || 'Retry initiated successfully. Processing in background...',
        type: 'success',
      });
      fetchInvoice();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to initiate retry.';
      setActionMessage({ text: msg, type: 'error' });
    } finally {
      setRetrying(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-slate-500">
          <div className="inline-block w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <div className="text-sm">Loading invoice details...</div>
        </div>
      </AppLayout>
    );
  }

  if (!invoice) {
    return (
      <AppLayout>
        <div className="py-24 text-center text-slate-400">
          <div className="text-xl font-bold text-white mb-2">Invoice Not Found</div>
          <p className="text-xs text-slate-500 mb-6">
            The requested invoice does not exist or you do not have permission to view it.
          </p>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Back to Dashboard
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isEligibleForRetry = invoice.status === 'FAILED' || invoice.status === 'REJECTED';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/" className="hover:text-indigo-400 transition">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-200 font-medium font-mono">{invoice.invoice_number}</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white font-mono tracking-tight">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} size="lg" />
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              to="/"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition"
            >
              ← Back to Dashboard
            </Link>

            {/* Retry Action Button */}
            {isEligibleForRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
              >
                {retrying ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>Retry Submission</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Banner */}
        {actionMessage && (
          <div
            className={`p-4 rounded-xl text-xs flex items-center gap-2 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-900/30 border-emerald-500/40 text-emerald-200'
                : 'bg-red-900/30 border-red-500/40 text-red-200'
            }`}
          >
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Header Summary Card */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seller / Company */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Issued By (Seller)</div>
            <div className="text-sm font-semibold text-white">{invoice.company_name || 'My Company'}</div>
            <div className="text-xs text-slate-400 font-mono">TIN: {invoice.company_tax_id || '---'}</div>
            <div className="text-xs text-slate-400">Electronic E-Invoice Tax Registered</div>
          </div>

          {/* Customer */}
          <div className="space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed To (Customer)</div>
            <div className="text-sm font-semibold text-white">{invoice.customer_name}</div>
            <div className="text-xs text-slate-400 font-mono">TIN: {invoice.customer_tax_id}</div>
            <div className="text-xs text-slate-400">{invoice.customer_email}</div>
          </div>

          {/* Metadata & Key */}
          <div className="space-y-1 md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Invoice Dates & Key</div>
            <div className="text-xs text-slate-300">
              Date: <span className="font-semibold text-white">{invoice.invoice_date}</span>
            </div>
            <div className="text-xs text-slate-400">
              Created: {new Date(invoice.created_at).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={invoice.idempotency_key}>
              Idempotency: {invoice.idempotency_key.slice(0, 16)}...
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-800/60 border-b border-slate-800 text-xs font-bold uppercase tracking-wider text-indigo-400">
            Invoice Line Items ({invoice.items?.length || 0})
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6">Description</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Tax (VAT %)</th>
                  <th className="py-3 px-6 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {invoice.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-6 font-medium text-white">{it.description}</td>
                    <td className="py-3.5 px-4 text-center text-slate-300">{it.quantity}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                      {invoice.currency} {Number(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-400">{it.tax}%</td>
                    <td className="py-3.5 px-6 text-right font-mono font-semibold text-white">
                      {invoice.currency} {Number(it.line_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Totals */}
          <div className="p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono text-slate-200">
                  {invoice.currency} {Number(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Tax Total:</span>
                <span className="font-mono text-slate-200">
                  {invoice.currency} {Number(invoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                <span>Grand Total:</span>
                <span className="font-mono text-indigo-400">
                  {invoice.currency} {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail: Processing History Timeline (Part L) */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Government Submission Audit Trail & Processing Logs
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                Append-only history of every submission attempt, HTTP response, and error status (Part L).
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs font-semibold">
              {invoice.logs?.length || 0} attempt(s)
            </span>
          </div>

          {invoice.logs && invoice.logs.length > 0 ? (
            <div className="space-y-4">
              {invoice.logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        #{log.attempt_number}
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : log.status === 'PROCESSING'
                            ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.http_status_code && (
                        <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          HTTP {log.http_status_code}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Started: {new Date(log.started_at).toLocaleTimeString()}
                      {log.ended_at && ` • Ended: ${new Date(log.ended_at).toLocaleTimeString()}`}
                    </div>
                  </div>

                  {/* Error / Response Info */}
                  {log.error_message && (
                    <div className="p-3 rounded-lg bg-red-950/40 border border-red-900/50 text-red-300 text-xs font-mono">
                      {log.error_message}
                    </div>
                  )}

                  {log.status === 'SUCCESS' && (
                    <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/50 text-emerald-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Successfully registered with Government Tax Authority. Reference recorded.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 text-xs">
              No processing logs recorded yet. Submission queued.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default InvoiceDetailPage;
