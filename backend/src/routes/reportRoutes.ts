import { Router } from 'express';

import ReportController from '../controllers/reportController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

// Todas las rutas están protegidas y solo accesibles para ADMIN
router.get('/dashboard', protect, restrictTo('ADMIN'), ReportController.getDashboardSummary);
router.get('/revenue-by-month', protect, restrictTo('ADMIN'), ReportController.getRevenueByMonth);
router.get('/daily-weekly-revenue', protect, restrictTo('ADMIN'), ReportController.getDailyAndWeeklyRevenue);
router.get('/last-shift-closeout', protect, restrictTo('ADMIN'), ReportController.getLastShiftCloseout);
router.get('/top-selling-products', protect, restrictTo('ADMIN'), ReportController.getTopSellingProducts);
router.post('/close-shift', protect, ReportController.closeDayShift); // Permitir a todos los usuarios autenticados

export default router;

