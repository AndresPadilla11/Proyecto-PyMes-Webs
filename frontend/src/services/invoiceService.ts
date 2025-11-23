import apiClient from '../api/axios';

export interface Invoice {
  id: string;
  tenantId: string;
  clientId?: string | null;
  number: string;
  status: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  issueDate: string;
  dueDate?: string | null;
  paymentMethod: 'CASH' | 'CREDIT' | 'TRANSFER';
  currency: string;
  subtotal: number;
  taxTotal: number;
  total: number;
  totalPaid: number;
  isCreditSale: boolean;
  notes?: string | null;
  createdById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interfaz para datos de factura (armonizada)
export interface InvoiceData {
  number: string;
  clientId: string;
  issueDate: string;
  total: number;
}

export interface InvoiceItem {
  productId: string;
  quantity: number;
  description?: string;
  unitPrice?: number;
  taxRate?: number;
}

export interface CreateInvoicePayload {
  clientId?: string;
  number: string;
  items: InvoiceItem[];
  issueDate?: string;
  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paymentMethod?: 'CASH' | 'CREDIT' | 'TRANSFER';
  currency?: string;
  isCreditSale?: boolean;
  notes?: string;
  applyIva?: boolean; // Aplicar IVA del 19% si está activo
}

export interface CreateInvoiceResponse {
  invoice: Invoice;
  warnings: string[];
}

export type UpdateInvoicePayload = Partial<CreateInvoicePayload>;

export const getInvoices = async () => {
  const response = await apiClient.get<Invoice[]>('/invoices');
  return response.data;
};

export const createInvoice = async (data: CreateInvoicePayload) => {
  const response = await apiClient.post<CreateInvoiceResponse>('/invoices', data);
  return response.data;
};

export const updateInvoice = async (id: string, data: UpdateInvoicePayload) => {
  const response = await apiClient.put<Invoice>(`/invoices/${id}`, data);
  return response.data;
};

export const deleteInvoice = async (id: string) => {
  await apiClient.delete(`/invoices/${id}`);
};

