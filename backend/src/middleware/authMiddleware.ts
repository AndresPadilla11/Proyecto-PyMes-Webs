import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../services/authService';
import '../types/express';

/**
 * Middleware para proteger rutas verificando el token JWT
 * Verifica la existencia y validez de un JWT en el encabezado Authorization.
 * Si el token es válido, decodifica y extrae userId y tenantId,
 * y los adjunta al objeto req antes de llamar a next().
 * Si el token no es válido o no existe, devuelve un error 401 (No autorizado).
 */
export const protect = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

    if (!token) {
      res.status(401).json({ message: 'Token de autenticación requerido' });
      return;
    }

    // Verificar y decodificar el token
    const decoded = verifyToken(token);
    
    // Agregar información del usuario al request
    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      role: decoded.role
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

/**
 * Middleware para restringir acceso a rutas según el rol del usuario
 * Solo permite acceso a usuarios con el rol especificado
 * 
 * @param roles - Array de roles permitidos (ej. ['ADMIN'])
 */
export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Usuario no autenticado' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ 
        message: 'No tienes permisos para acceder a este recurso' 
      });
      return;
    }

    next();
  };
};

/**
 * Middleware de autorización basado en roles (RBAC)
 * Verifica si el rol del usuario autenticado está incluido en el array de roles permitidos
 * Si el usuario no está autenticado, devuelve un error 401 (No autorizado)
 * Si el rol no está permitido, devuelve un error 403 (Prohibido)
 * 
 * @param allowedRoles - Array de roles permitidos (ej. [UserRole.ADMIN, UserRole.MANAGER])
 * @returns Middleware de Express
 * 
 * @example
 * // Solo permitir acceso a ADMIN y MANAGER
 * router.get('/dashboard', protect, checkRole([UserRole.ADMIN, UserRole.MANAGER]), controller.getDashboard);
 * 
 * @example
 * // Solo permitir acceso a ADMIN
 * router.delete('/users/:id', protect, checkRole([UserRole.ADMIN]), controller.deleteUser);
 */
export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Verificar que el usuario esté autenticado
    if (!req.user) {
      res.status(401).json({ 
        message: 'Usuario no autenticado',
        error: 'Se requiere autenticación para acceder a este recurso'
      });
      return;
    }

    // Verificar que el rol del usuario esté en la lista de roles permitidos
    if (!allowedRoles.includes(req.user.role as UserRole)) {
      res.status(403).json({ 
        message: 'Acceso prohibido',
        error: `No tienes permisos para acceder a este recurso. Roles permitidos: ${allowedRoles.join(', ')}`,
        userRole: req.user.role
      });
      return;
    }

    // Si todo está bien, continuar con el siguiente middleware
    next();
  };
};

