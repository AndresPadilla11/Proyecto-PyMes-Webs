/**
 * Definición de tipos e interfaces compartidas del frontend
 */

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
  defaultTaxRate: number;
}

