import apiClient from '../api/axios';

export interface Client {
  id: string;
  tenantId: string;
  businessName: string;
  documentType: 'CC' | 'NIT' | 'PASSPORT';
  identification: string;
  nit?: string | null;
  dv?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hasCredit: boolean;
  creditLimit: string;
  currentDebt: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientPayload {
  tenantId: string;
  businessName: string;
  documentType: Client['documentType'];
  identification: string;
  nit?: string | null;
  dv?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  hasCredit?: boolean;
  creditLimit?: string;
  currentDebt?: string;
  isActive?: boolean;
}

export type UpdateClientPayload = Partial<CreateClientPayload>;

export const getClients = async () => {
  const response = await apiClient.get<Client[]>('/clients');
  return response.data;
};

export const createClient = async (data: CreateClientPayload) => {
  const response = await apiClient.post<Client>('/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: UpdateClientPayload) => {
  const response = await apiClient.put<Client>(`/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string) => {
  await apiClient.delete(`/clients/${id}`);
};

