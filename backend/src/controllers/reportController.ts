import { Request, Response } from 'express';

import '../types/express';
import * as ReportService from '../services/reportService';
import * as CashRegisterService from '../services/cashRegisterService';

class ReportController {
  /**
   * Obtiene el resumen del dashboard
   * GET /api/v1/reports/dashboard
   */
  static async getDashboardSummary(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const summary = await ReportService.getDashboardSummary(tenantId);
      res.status(200).json(summary);
    } catch (error) {
      ReportController.handleError(res, error);
    }
  }

  /**
   * Obtiene ingresos por mes para gráficas
   * GET /api/v1/reports/revenue-by-month
   */
  static async getRevenueByMonth(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const revenue = await ReportService.getRevenueByMonth(tenantId);
      res.status(200).json(revenue);
    } catch (error) {
      ReportController.handleError(res, error);
    }
  }

  /**
   * Obtiene ingresos diarios (últimos 7 días) y semanales (últimas 4 semanas)
   * GET /api/v1/reports/daily-weekly-revenue
   */
  static async getDailyAndWeeklyRevenue(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const revenue = await ReportService.getDailyAndWeeklyRevenue(tenantId);
      res.status(200).json(revenue);
    } catch (error) {
      ReportController.handleError(res, error);
    }
  }

  /**
   * Obtiene el último cierre de caja
   * GET /api/v1/reports/last-shift-closeout
   */
  static async getLastShiftCloseout(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const closeout = await ReportService.getLastShiftCloseout(tenantId);
      res.status(200).json(closeout);
    } catch (error) {
      ReportController.handleError(res, error);
    }
  }

  /**
   * Obtiene los 10 productos más vendidos
   * GET /api/v1/reports/top-selling-products
   */
  static async getTopSellingProducts(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const topProducts = await ReportService.getTopSellingProducts(tenantId);
      res.status(200).json(topProducts);
    } catch (error) {
      ReportController.handleError(res, error);
    }
  }

  /**
   * Cierra un turno de caja
   * POST /api/v1/reports/close-shift
   */
  static async closeDayShift(req: Request, res: Response) {
    try {
      // Extraer tenantId y userId del usuario autenticado
      const tenantId = req.user?.tenantId;
      const userId = req.user?.userId; // Usar userId (no id) según el middleware
      
      console.log('Intentando cerrar turno:', { tenantId, userId, body: req.body });
      
      if (!tenantId || !userId) {
        console.error('Error: Usuario no autenticado', { tenantId, userId });
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { cashRegisterId, startingBalance, finalBalance } = req.body;

      if (!cashRegisterId || finalBalance === undefined) {
        console.error('Error: Datos faltantes', { cashRegisterId, finalBalance });
        res.status(400).json({ message: 'cashRegisterId y finalBalance son requeridos' });
        return;
      }

      console.log('Llamando a CashRegisterService.closeDayShift:', {
        tenantId,
        cashRegisterId,
        userId,
        startingBalance: startingBalance ?? 'auto',
        finalBalance
      });

      const result = await CashRegisterService.closeDayShift(
        tenantId,
        cashRegisterId,
        userId,
        finalBalance,
        startingBalance // Si es undefined, el servicio usará el cálculo automático
      );

      console.log('Cierre de turno exitoso:', result);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en closeDayShift:', error);
      ReportController.handleError(res, error);
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private static handleError(res: Response, error: unknown) {
    if (error instanceof Error) {
      console.error('Error en reportes:', error);
      
      // Mensajes más específicos según el tipo de error
      let statusCode = 500;
      let message = 'Error al procesar la solicitud';
      
      if (error.message.includes('tabla') || error.message.includes('tablas') || error.message.includes('migración')) {
        message = error.message;
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('no encontrada') || error.message.includes('no existe')) {
        message = error.message;
        statusCode = 404;
      } else {
        message = error.message || 'Error al procesar la solicitud';
      }
      
      res.status(statusCode).json({
        message: message,
        error: error.message
      });
      return;
    }

    // Error genérico del servidor
    console.error('Error inesperado en reportes:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export default ReportController;

