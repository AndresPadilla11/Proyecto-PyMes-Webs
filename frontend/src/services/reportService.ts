import apiClient from '../api/axios';

export interface DashboardSummary {
  totalClients: number;
  totalProducts: number;
  inventoryValue: number; // Valor del inventario (stock * cost)
  lowStockProducts: number; // Productos con stock <= 5
  totalInvoices: number;
}

export interface RevenueByMonth {
  month: string;
  revenue: number;
}

export interface DailyRevenue {
  date: string;
  day: string;
  revenue: number;
}

export interface WeeklyRevenue {
  week: string;
  revenue: number;
}

export interface DailyAndWeeklyRevenue {
  daily: DailyRevenue[];
  weekly: WeeklyRevenue[];
}

export interface ShiftCloseout {
  id: number;
  closingTime: string;
  cashRegisterName: string;
  startingBalance: number;
  finalBalance: number;
  salesTotal: number;
  closedBy: string;
}

export interface TopSellingProduct {
  productId: string;
  productName: string;
  totalQuantity: number; // Cantidad total vendida
  totalRevenue: number; // Ingresos totales (suma de totalAmount)
}

/**
 * Obtiene el resumen del dashboard
 */
export const getDashboardSummary = async (): Promise<DashboardSummary> => {
  const response = await apiClient.get<DashboardSummary>('/reports/dashboard');
  return response.data;
};

/**
 * Obtiene ingresos por mes para gráficas
 */
export const getRevenueByMonth = async (): Promise<RevenueByMonth[]> => {
  const response = await apiClient.get<RevenueByMonth[]>('/reports/revenue-by-month');
  return response.data;
};

/**
 * Obtiene ingresos diarios (últimos 7 días) y semanales (últimas 4 semanas)
 */
export const getDailyAndWeeklyRevenue = async (): Promise<DailyAndWeeklyRevenue> => {
  const response = await apiClient.get<DailyAndWeeklyRevenue>('/reports/daily-weekly-revenue');
  return response.data;
};

/**
 * Obtiene el último cierre de caja
 */
export const getLastShiftCloseout = async (): Promise<ShiftCloseout | null> => {
  const response = await apiClient.get<ShiftCloseout | null>('/reports/last-shift-closeout');
  return response.data;
};

/**
 * Obtiene los 10 productos más vendidos
 */
export const getTopSellingProducts = async (): Promise<TopSellingProduct[]> => {
  const response = await apiClient.get<TopSellingProduct[]>('/reports/top-selling-products');
  return response.data;
};

