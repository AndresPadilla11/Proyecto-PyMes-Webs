import apiClient from '../api/axios';

export interface CloseShiftRequest {
  cashRegisterId: number;
  startingBalance?: number; // Saldo inicial (opcional, si no se proporciona se calcula automáticamente)
  finalBalance: number; // Saldo final contado en la caja
}

export interface CloseShiftResponse {
  id: number;
  closingTime: string;
  salesTotal: number;
  startingBalance: number;
  finalBalance: number;
}

/**
 * Cierra un turno de caja
 */
export const closeDayShift = async (data: CloseShiftRequest): Promise<CloseShiftResponse> => {
  const response = await apiClient.post<CloseShiftResponse>('/reports/close-shift', data);
  return response.data;
};

