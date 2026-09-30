import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import api from '../lib/api';

interface LineItemInput {
  description: string;
  quantity: number;
  unit_price: number;
  tax: number;
}

export const CreateInvoicePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Header fields
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [currency, setCurrency] = useState('PHP');

  // Line items
  const [items, setItems] = useState<LineItemInput[]>([
    { description: '', quantity: 1, unit_price: 0, tax: 12 },
  ]);

  const handleItemChange = (index: number, field: keyof LineItemInput, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unit_price: 0, tax: 12 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Real-time calculation
  const subtotal = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const taxAmount = items.reduce((sum, item) => {
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price) || 0;
    const taxRate = Number(item.tax) || 0;
    return sum + qty * price * (taxRate / 100);
  }, 0);

  const totalAmount = subtotal + taxAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic validation
    if (!invoiceNumber.trim()) {
      setErrorMessage('Invoice number is required.');
      return;
    }
    if (!customerName.trim() || !customerTaxId.trim() || !customerEmail.trim()) {
      setErrorMessage('Please complete all customer details.');
      return;
    }
    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        setErrorMessage(`Please enter a description for Item #${i + 1}.`);
        return;
      }
      if (items[i].quantity <= 0) {
        setErrorMessage(`Quantity for Item #${i + 1} must be at least 1.`);
        return;
      }
      if (items[i].unit_price < 0) {
        setErrorMessage(`Unit price for Item #${i + 1} cannot be negative.`);
        return;
      }
    }

    setLoading(true);

    try {
      const payload = {
        invoice_number: invoiceNumber.trim(),
        invoice_date: invoiceDate,
        customer_name: customerName.trim(),
        customer_tax_id: customerTaxId.trim(),
        customer_email: customerEmail.trim(),
        currency,
        items: items.map((it) => ({
          description: it.description.trim(),
          quantity: Number(it.quantity),
          unit_price: Number(it.unit_price).toFixed(2),
          tax: Number(it.tax || 0).toFixed(2),
        })),
      };

      const res = await api.post('/api/invoices/', payload);
      const createdInvoice = res.data.invoice;
      navigate(`/invoices/${createdInvoice.id}`);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setErrorMessage(`Duplicate Error: Invoice number '${invoiceNumber}' has already been registered for your company.`);
      } else if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          setErrorMessage(err.response.data);
        } else if (typeof err.response.data === 'object') {
          const formatted = Object.entries(err.response.data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          setErrorMessage(formatted);
        }
      } else {
        setErrorMessage('Failed to submit invoice. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemoData = () => {
    setCustomerName('Cebu Port Logistics & Terminal Corp');
    setCustomerTaxId('998-776-554');
    setCustomerEmail('billing@cebuportlogistics.ph');
    setItems([
      { description: 'High-Tensile Structural Steel I-Beam 6m', quantity: 25, unit_price: 3850, tax: 12 },
      { description: 'Industrial Grade Epoxy Primer 20L', quantity: 6, unit_price: 4200, tax: 12 },
      { description: 'Forklift Loading & Heavy Transport Freight', quantity: 1, unit_price: 5500, tax: 12 },
    ]);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
              <Link to="/" className="hover:text-indigo-400 transition">Dashboard</Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">New Invoice</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Create Electronic Invoice</h1>
          </div>
          <button
            type="button"
            onClick={fillDemoData}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 border border-slate-700 transition flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span>⚡ Fill Sample Invoice</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/40 text-red-200 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Invoice Header */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 pb-2 border-b border-slate-800">
              1. Invoice Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Invoice Number <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-10001"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Invoice Date <span className="text-rose-400">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="PHP">PHP (Philippine Peso)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Card 2: Customer Information */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 pb-2 border-b border-slate-800">
              2. Customer / Buyer Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Legal Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. XYZ Construction Corp"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Tax ID / TIN <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={customerTaxId}
                  onChange={(e) => setCustomerTaxId(e.target.value)}
                  placeholder="e.g. 987-654-321"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Customer Email <span className="text-rose-400">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="finance@customer.com"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Card 3: Line Items */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                3. Invoice Items & Services
              </div>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span>Add Item</span>
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => {
                const itemLineSubtotal = (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
                const itemLineTax = itemLineSubtotal * ((Number(item.tax) || 0) / 100);
                const itemLineTotal = itemLineSubtotal + itemLineTax;

                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-12 gap-3 items-end"
                  >
                    <div className="col-span-12 sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Description #{idx + 1}
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        placeholder="e.g. Deformed Steel Bars 10mm"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Qty
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-4 sm:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Unit Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="col-span-3 sm:col-span-1">
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Tax %
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.tax}
                        onChange={(e) => handleItemChange(idx, 'tax', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center"
                      />
                    </div>

                    <div className="col-span-12 sm:col-span-2 flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-500 font-semibold">Line Total</div>
                        <div className="text-xs font-bold text-white font-mono">
                          {currency} {itemLineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(idx)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 disabled:opacity-30 transition"
                        title="Delete Item"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calculations Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row justify-between items-end sm:items-center gap-4 mt-4">
              <div className="text-xs text-slate-400">
                <span className="font-semibold text-slate-200">{items.length}</span> item(s) in this invoice
              </div>
              <div className="w-full sm:w-64 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-mono text-slate-200">
                    {currency} {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax Total (VAT):</span>
                  <span className="font-mono text-slate-200">
                    {currency} {taxAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-slate-800">
                  <span>Total Amount:</span>
                  <span className="font-mono text-indigo-400">
                    {currency} {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              to="/"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition border border-slate-700"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              <span>Submit & Submit to Government</span>
            </button>
          </div>
        </form>
      </div>
    </AppLayout>
  );
};

export default CreateInvoicePage;
