import apiClient from '../api/axios';

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number | string;
  cost: number | string;
  stock: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  isSynced?: boolean;
}

export interface CreateProductPayload {
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  cost: number;
  stock?: number;
  isActive?: boolean;
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export const getProducts = async () => {
  const response = await apiClient.get<Product[]>('/products');
  return response.data;
};

export const createProduct = async (data: CreateProductPayload) => {
  const response = await apiClient.post<Product>('/products', data);
  return response.data;
};

export const updateProduct = async (id: string, data: UpdateProductPayload) => {
  const response = await apiClient.put<Product>(`/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id: string) => {
  await apiClient.delete(`/products/${id}`);
};


