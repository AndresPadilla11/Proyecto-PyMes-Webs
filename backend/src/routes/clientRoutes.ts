import { Router } from 'express';

import ClientController from '../controllers/clientController';
import { protect, restrictTo } from '../middleware/authMiddleware';

const router = Router();

// Rutas GET disponibles para todos los usuarios autenticados (incluidos cajeros)
router.get('/', protect, ClientController.getAllClients);
router.get('/:id', protect, ClientController.getClientById);

// Rutas de modificación solo para ADMIN
router.post('/', protect, restrictTo('ADMIN'), ClientController.createClient);
router.put('/:id', protect, restrictTo('ADMIN'), ClientController.updateClient);
router.delete('/:id', protect, restrictTo('ADMIN'), ClientController.deleteClient);

export default router;

