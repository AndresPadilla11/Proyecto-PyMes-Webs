import { Router } from 'express';
import { UserRole } from '@prisma/client';
import AuthController from '../controllers/authController';
import { protect, checkRole } from '../middleware/authMiddleware';

const router = Router();

// POST /api/v1/auth/register (pública - cualquiera puede registrarse)
router.post('/register', AuthController.register);

// POST /api/v1/auth/login (pública)
router.post('/login', AuthController.login);

// POST /api/v1/auth/google (pública - autenticación con Google)
router.post('/google', AuthController.googleSignIn);

// POST /api/v1/auth/verify-password (protegida - solo para usuarios autenticados)
router.post('/verify-password', protect, AuthController.verifyPassword);

// POST /api/v1/auth/promote-to-admin (protegida - solo para usuarios autenticados, sin restricción de rol adicional)
// Nota: La lógica de promoción está dentro del controller y solo permite promoción a los primeros 3 usuarios
router.post('/promote-to-admin', protect, AuthController.promoteToAdmin);

// Nota: Si en el futuro se implementan rutas para gestionar usuarios (crear/actualizar/eliminar otros usuarios),
// estas deberían estar protegidas con checkRole([UserRole.ADMIN]) para que solo los administradores puedan gestionarlos

export default router;

