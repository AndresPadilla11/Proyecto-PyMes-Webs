import { Router } from 'express';
import { UserRole } from '@prisma/client';

import InvoiceController from '../controllers/invoiceController';
import { protect, checkRole } from '../middleware/authMiddleware';

const router = Router();

// GET disponible para todos los usuarios autenticados
router.get('/', protect, InvoiceController.getAllInvoices);
router.get('/:id', protect, InvoiceController.getInvoiceById);

// POST (crear factura) disponible para todos (cajeros pueden crear ventas)
router.post('/', protect, InvoiceController.createInvoice);

// PUT y DELETE solo para ADMIN y MANAGER
router.put('/:id', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), InvoiceController.updateInvoice);
router.delete('/:id', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), InvoiceController.deleteInvoice);

export default router;

