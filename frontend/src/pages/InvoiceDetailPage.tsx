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
          <div className="text-xs font-semibold">Loading electronic invoice record...</div>
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
            The requested invoice does not exist or access is restricted by multi-tenant security policies.
          </p>
          <Link
            to="/"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Back to Console
          </Link>
        </div>
      </AppLayout>
    );
  }

  const isEligibleForRetry = invoice.status === 'FAILED' || invoice.status === 'REJECTED';

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb & Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/[0.06]">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/" className="hover:text-indigo-400 transition">Console</Link>
              <span>/</span>
              <span className="text-slate-200 font-mono font-medium">{invoice.invoice_number}</span>
            </div>
            <div className="flex items-center gap-3.5">
              <h1 className="text-2xl font-extrabold text-white font-mono tracking-tight">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} size="lg" />
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] text-slate-300 text-xs font-semibold border border-white/[0.08] transition"
            >
              ← Back to Console
            </Link>

            {/* Retry Action Button */}
            {isEligibleForRetry && (
              <button
                onClick={handleRetry}
                disabled={retrying}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 ring-1 ring-white/20"
              >
                {retrying ? (
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                <span>Retry Gov Submission</span>
              </button>
            )}
          </div>
        </div>

        {/* Action Banner */}
        {actionMessage && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 border ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            <span>{actionMessage.text}</span>
          </div>
        )}

        {/* Official Voucher Card: Seller, Buyer & Metadata */}
        <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/[0.07] shadow-card grid grid-cols-1 md:grid-cols-3 gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Seller / Company */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              Issued By (Issuer)
            </div>
            <div className="text-base font-bold text-white">{invoice.company_name || 'My Company'}</div>
            <div className="text-xs text-slate-300 font-mono">TIN: {invoice.company_tax_id || '---'}</div>
            <div className="text-[11px] text-slate-500">Official Electronic Invoicing Registered</div>
          </div>

          {/* Customer */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Billed To (Customer)
            </div>
            <div className="text-base font-bold text-white">{invoice.customer_name}</div>
            <div className="text-xs text-slate-300 font-mono">TIN: {invoice.customer_tax_id}</div>
            <div className="text-[11px] text-slate-400 truncate">{invoice.customer_email}</div>
          </div>

          {/* Metadata & Key */}
          <div className="space-y-1.5 md:text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Document Verification</div>
            <div className="text-xs text-slate-300">
              Date: <span className="font-semibold text-white font-mono">{invoice.invoice_date}</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Created: {new Date(invoice.created_at).toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono truncate" title={invoice.idempotency_key}>
              Key: {invoice.idempotency_key.slice(0, 20)}...
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="rounded-2xl bg-[#0B0F19] border border-white/[0.07] shadow-card overflow-hidden">
          <div className="p-4 bg-white/[0.02] border-b border-white/[0.06] text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
            <span>Invoice Line Items</span>
            <span className="text-slate-500 font-mono font-normal">{invoice.items?.length || 0} item(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-6">Description</th>
                  <th className="py-3.5 px-4 text-center">Qty</th>
                  <th className="py-3.5 px-4 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-center">Tax %</th>
                  <th className="py-3.5 px-6 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {invoice.items?.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-white/[0.02] transition">
                    <td className="py-4 px-6 font-semibold text-white">{it.description}</td>
                    <td className="py-4 px-4 text-center font-mono text-slate-300">{it.quantity}</td>
                    <td className="py-4 px-4 text-right font-mono text-slate-300">
                      {invoice.currency} {Number(it.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-4 px-4 text-center font-mono text-slate-400">{it.tax}%</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-white">
                      {invoice.currency} {Number(it.line_total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Amount Totals */}
          <div className="p-6 bg-[#070A11] border-t border-white/[0.06] flex justify-end">
            <div className="w-full sm:w-80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Net Taxable Base:</span>
                <span className="font-mono text-slate-200">
                  {invoice.currency} {Number(invoice.subtotal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Value Added Tax (VAT):</span>
                <span className="font-mono text-slate-200">
                  {invoice.currency} {Number(invoice.tax_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-white pt-3 border-t border-white/[0.08]">
                <span>Total Amount:</span>
                <span className="font-mono text-indigo-400 text-lg">
                  {invoice.currency} {Number(invoice.total_amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Audit Trail: Processing History Timeline (Part L) */}
        <div className="p-6 rounded-2xl bg-[#0B0F19] border border-white/[0.07] shadow-card space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <div>
              <div className="text-xs font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Government Submission Audit Trail (Part L)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Immutable, append-only log of every background transmission, response payload, and HTTP code.
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-slate-300 text-xs font-mono font-semibold">
              {invoice.logs?.length || 0} attempt(s)
            </span>
          </div>

          {invoice.logs && invoice.logs.length > 0 ? (
            <div className="space-y-4">
              {invoice.logs.map((log, idx) => (
                <div
                  key={log.id || idx}
                  className="p-4 rounded-2xl bg-[#070A11] border border-white/[0.06] space-y-2 hover:border-white/[0.1] transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-xs font-mono font-bold text-indigo-400">
                        #{log.attempt_number}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : log.status === 'PROCESSING'
                            ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {log.status}
                      </span>
                      {log.http_status_code && (
                        <span className="text-[11px] font-mono text-slate-300 bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                          HTTP {log.http_status_code}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      Started: {new Date(log.started_at).toLocaleTimeString()}
                      {log.ended_at && ` • Ended: ${new Date(log.ended_at).toLocaleTimeString()}`}
                    </div>
                  </div>

                  {/* Error / Response Info */}
                  {log.error_message && (
                    <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-mono leading-relaxed">
                      {log.error_message}
                    </div>
                  )}

                  {log.status === 'SUCCESS' && (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Cleared by Government Tax Authority. Official reference clearance recorded.</span>
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
