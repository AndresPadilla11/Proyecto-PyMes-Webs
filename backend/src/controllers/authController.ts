import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../db';
import '../types/express';
import * as AuthService from '../services/authService';

class AuthController {
  /**
   * Registro de nuevo usuario
   * POST /api/v1/auth/register
   */
  static async register(req: Request, res: Response) {
    try {
      const { fullName, email, password, tenantName, tenantSlug } = req.body;

      // Validaciones básicas
      if (!fullName || !email || !password) {
        res.status(400).json({
          message: 'Nombre completo, email y contraseña son requeridos'
        });
        return;
      }

      // Validar formato de email básico
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        res.status(400).json({
          message: 'El formato del email no es válido'
        });
        return;
      }

      // Validar longitud mínima de contraseña
      if (password.length < 6) {
        res.status(400).json({
          message: 'La contraseña debe tener al menos 6 caracteres'
        });
        return;
      }

      const result = await AuthService.register({
        fullName,
        email,
        password,
        tenantName,
        tenantSlug
      });

      res.status(201).json({
        message: 'Usuario registrado exitosamente',
        ...result
      });
    } catch (error) {
      AuthController.handleError(res, error);
    }
  }

  /**
   * Login de usuario
   * POST /api/v1/auth/login
   */
  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validaciones básicas
      if (!email || !password) {
        res.status(400).json({
          message: 'Email y contraseña son requeridos'
        });
        return;
      }

      const result = await AuthService.login({ email, password });

      res.status(200).json({
        message: 'Login exitoso',
        ...result
      });
    } catch (error) {
      AuthController.handleError(res, error);
    }
  }

  /**
   * Autenticación con Google Sign-In
   * POST /api/v1/auth/google
   */
  static async googleSignIn(req: Request, res: Response) {
    try {
      const { idToken } = req.body;

      // Validaciones básicas
      if (!idToken) {
        res.status(400).json({
          message: 'Token de Google es requerido'
        });
        return;
      }

      const result = await AuthService.loginWithGoogle({ idToken });

      res.status(200).json({
        message: 'Login con Google exitoso',
        ...result
      });
    } catch (error) {
      AuthController.handleError(res, error);
    }
  }

  /**
   * Verifica la contraseña del usuario actual para acceso admin
   * POST /api/v1/auth/verify-password
   */
  static async verifyPassword(req: Request, res: Response) {
    try {
      const { password } = req.body;
      const userId = req.user?.userId;

      // Validaciones básicas
      if (!password) {
        res.status(400).json({
          message: 'La contraseña es requerida'
        });
        return;
      }

      if (!userId) {
        res.status(401).json({
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Buscar el usuario en la base de datos
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          password: true,
          role: true,
          isActive: true
        }
      });

      if (!user) {
        res.status(401).json({
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Verificar si el usuario está activo
      if (!user.isActive) {
        res.status(401).json({
          message: 'Usuario inactivo'
        });
        return;
      }

      // DOBLE CHEQUEO DE SEGURIDAD:
      // 1. Verificar que el usuario tenga rol ADMIN (primera verificación)
      // 2. Verificar que la contraseña sea correcta (segunda verificación)
      // Si el usuario es CASHIER, se deniega el acceso incluso si la contraseña es válida
      if (user.role !== 'ADMIN') {
        res.status(403).json({
          message: 'Acceso denegado. Solo administradores pueden acceder.',
          success: false
        });
        return;
      }

      // Comparar la contraseña enviada con la almacenada (segunda verificación)
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        res.status(401).json({
          message: 'Contraseña incorrecta',
          success: false
        });
        return;
      }

      // Si todo es correcto
      res.status(200).json({
        message: 'Contraseña verificada correctamente',
        success: true
      });
    } catch (error) {
      AuthController.handleError(res, error);
    }
  }

  /**
   * Promueve el usuario actual a ADMIN (solo si es el primer usuario del tenant o ya es ADMIN)
   * POST /api/v1/auth/promote-to-admin
   */
  static async promoteToAdmin(req: Request, res: Response) {
    try {
      const userId = req.user?.userId;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({
          message: 'Usuario no autenticado'
        });
        return;
      }

      // Buscar el usuario actual
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          tenantId: true,
          isActive: true
        }
      });

      if (!user) {
        res.status(404).json({
          message: 'Usuario no encontrado'
        });
        return;
      }

      // Si ya es ADMIN, no hacer nada pero regenerear token
      if (user.role === 'ADMIN') {
        // Generar nuevo token con el rol actualizado
        const token = await AuthService.generateToken(user.id, user.tenantId, user.role);
        
        res.status(200).json({
          message: 'El usuario ya es ADMIN',
          user: {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            tenantId: user.tenantId,
            role: user.role
          },
          token: token
        });
        return;
      }

      // Verificar si es el primer usuario del tenant (solo los primeros usuarios pueden promoverse)
      const userCount = await prisma.user.count({
        where: { tenantId: tenantId }
      });

      // Permitir la promoción si es el primer usuario o si hay menos de 3 usuarios (medida de seguridad básica)
      if (userCount > 3) {
        res.status(403).json({
          message: 'No puedes promover tu cuenta a ADMIN. Contacta a un administrador existente.'
        });
        return;
      }

      // Actualizar el rol a ADMIN
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: 'ADMIN' },
        select: {
          id: true,
          email: true,
          fullName: true,
          tenantId: true,
          role: true
        }
      });

      // Generar nuevo token con el rol actualizado
      const token = await AuthService.generateToken(updatedUser.id, updatedUser.tenantId, updatedUser.role);

      res.status(200).json({
        message: 'Usuario promovido a ADMIN exitosamente',
        user: updatedUser,
        token: token
      });
    } catch (error) {
      AuthController.handleError(res, error);
    }
  }

  /**
   * Manejo centralizado de errores
   */
  private static handleError(res: Response, error: unknown) {
    if (error instanceof Error) {
      // Errores conocidos del servicio
      if (
        error.message.includes('Credenciales inválidas') ||
        error.message.includes('Usuario inactivo')
      ) {
        res.status(401).json({ message: error.message });
        return;
      }

      if (
        error.message.includes('Ya existe un usuario') ||
        error.message.includes('requeridos') ||
        error.message.includes('formato')
      ) {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    // Error genérico del servidor
    console.error('Error en autenticación:', error);
    res.status(500).json({
      message: 'Error interno del servidor'
    });
  }
}

export default AuthController;

