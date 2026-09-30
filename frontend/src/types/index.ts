// TypeScript interfaces for the Tubo platform

export interface Company {
  id: string;
  name: string;
  tax_id: string;
  email: string;
  created_at: string;
}

export interface User {
  id: string;
  company: Company | null;
  email: string;
  is_active: boolean;
  is_staff: boolean;
  created_at: string;
}

export type InvoiceStatus = 'PENDING' | 'PROCESSING' | 'SUBMITTED' | 'FAILED' | 'REJECTED';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: string;
  tax: string;
  line_total: string;
}

export interface Invoice {
  id: string;
  company: string;
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  customer_tax_id: string;
  customer_email: string;
  currency: string;
  subtotal: string;
  tax_amount: string;
  total_amount: string;
  status: InvoiceStatus;
  idempotency_key: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
  items: InvoiceItem[];
}

export type ProcessingLogStatus = 'PROCESSING' | 'SUCCESS' | 'FAILED';

export interface ProcessingLog {
  id: string;
  invoice: string;
  attempt_number: number;
  status: ProcessingLogStatus;
  http_status_code: number | null;
  error_message: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  [key: string]: string | string[] | undefined;
}
