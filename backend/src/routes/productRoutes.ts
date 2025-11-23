import { Router } from 'express';
import { UserRole } from '@prisma/client';

import ProductController from '../controllers/productController';
import { protect, checkRole } from '../middleware/authMiddleware';

const router = Router();

// Rutas GET disponibles para todos los usuarios autenticados (incluidos cajeros)
router.get('/', protect, ProductController.getAllProducts);
router.get('/:id', protect, ProductController.getProductById);

// Rutas de modificación solo para ADMIN y MANAGER
router.post('/', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), ProductController.createProduct);
router.put('/:id', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), ProductController.updateProduct);
router.delete('/:id', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), ProductController.deleteProduct);

export default router;


