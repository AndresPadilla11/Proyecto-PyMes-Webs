import bcrypt from 'bcryptjs';
import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import prisma from '../db';

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'tu-secret-key-super-segura-cambiar-en-produccion';
const JWT_EXPIRES_IN: StringValue = (process.env.JWT_EXPIRES_IN || '7d') as StringValue;

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  tenantName?: string;
  tenantSlug?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    fullName: string;
    tenantId: string;
    role: string;
  };
  token: string;
}

/**
 * Registra un nuevo usuario y crea un tenant si no existe
 */
export const register = async (data: RegisterData): Promise<AuthResponse> => {
  // Validar campos requeridos
  if (!data.email || !data.password || !data.fullName) {
    throw new Error('Email, contraseña y nombre completo son requeridos');
  }

  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email }
  });

  if (existingUser) {
    throw new Error('Ya existe un usuario con este email');
  }

  // Hashear la contraseña
  const hashedPassword = await bcrypt.hash(data.password, 10);

  // Crear o encontrar tenant
  let tenant;
  if (data.tenantSlug) {
    tenant = await prisma.tenant.findUnique({
      where: { slug: data.tenantSlug }
    });
  }

  if (!tenant) {
    // Crear nuevo tenant
    const tenantName = data.tenantName || data.fullName;
    const tenantSlug = data.tenantSlug || 
      tenantName.toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    // Verificar si el slug ya existe
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug }
    });

    tenant = await prisma.tenant.create({
      data: {
        name: tenantName,
        slug: existingTenant ? `${tenantSlug}-${Date.now()}` : tenantSlug
      }
    });

    // Crear configuración por defecto para el tenant
    await prisma.companySettings.create({
      data: {
        tenantId: tenant.id
      }
    });
  }

  // Verificar si es el primer usuario del tenant (será ADMIN)
  const existingUsers = await prisma.user.count({
    where: { tenantId: tenant.id }
  });

  // Crear el usuario (el primero del tenant será ADMIN, los demás CASHIER)
  const user = await prisma.user.create({
    data: {
      fullName: data.fullName,
      email: data.email,
      password: hashedPassword,
      tenantId: tenant.id,
      role: existingUsers === 0 ? 'ADMIN' : 'CASHIER' // Primer usuario = ADMIN
    },
    select: {
      id: true,
      email: true,
      fullName: true,
      tenantId: true,
      role: true
    }
  });

  // Generar JWT incluyendo el role
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    options
  );

  return {
    user,
    token
  };
};

/**
 * Autentica un usuario y genera un JWT
 */
export const login = async (data: LoginData): Promise<AuthResponse> => {
  // Validar campos requeridos
  if (!data.email || !data.password) {
    throw new Error('Email y contraseña son requeridos');
  }

  // Buscar el usuario
  const user = await prisma.user.findUnique({
    where: { email: data.email },
    select: {
      id: true,
      email: true,
      fullName: true,
      password: true,
      tenantId: true,
      role: true,
      isActive: true
    }
  });

  if (!user) {
    throw new Error('Credenciales inválidas');
  }

  // Verificar si el usuario está activo
  if (!user.isActive) {
    throw new Error('Usuario inactivo. Contacte al administrador');
  }

  // Verificar la contraseña
  const isPasswordValid = await bcrypt.compare(data.password, user.password);

  if (!isPasswordValid) {
    throw new Error('Credenciales inválidas');
  }

  // Generar JWT incluyendo el role
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId, role: user.role },
    JWT_SECRET,
    options
  );

  // Retornar datos del usuario sin la contraseña
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    token
  };
};

/**
 * Verifica y decodifica un token JWT
 */
export const verifyToken = (token: string): { userId: string; tenantId: string; role: string } => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; tenantId: string; role: string };
    return decoded;
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

/**
 * Genera un nuevo token JWT para un usuario
 */
export const generateToken = async (userId: string, tenantId: string, role: string): Promise<string> => {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  const token = jwt.sign(
    { userId, tenantId, role },
    JWT_SECRET,
    options
  );
  return token;
};

/**
 * Interfaz para datos de autenticación con Google
 */
export interface GoogleAuthData {
  idToken: string;
}

/**
 * Autentica un usuario con Google OAuth 2.0
 * Verifica el token de Google, busca o crea el usuario y genera un JWT
 */
export const loginWithGoogle = async (data: GoogleAuthData): Promise<AuthResponse> => {
  // Importar dinámicamente para evitar problemas de carga
  const { OAuth2Client } = await import('google-auth-library');

  // Obtener el Client ID de Google desde las variables de entorno
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_CLIENT_ID no está configurado en las variables de entorno');
  }

  // Validar que se recibió el token
  if (!data.idToken) {
    throw new Error('Token de Google es requerido');
  }

  // Crear cliente de OAuth2
  const client = new OAuth2Client(GOOGLE_CLIENT_ID);

  try {
    // Verificar el token de Google
    const ticket = await client.verifyIdToken({
      idToken: data.idToken,
      audience: GOOGLE_CLIENT_ID
    });

    // Obtener el payload del token verificado
    const payload = ticket.getPayload();
    
    if (!payload) {
      throw new Error('No se pudo obtener la información del token de Google');
    }

    // Extraer información del usuario de Google
    const googleEmail = payload.email;
    const googleName = payload.name || payload.given_name || 'Usuario de Google';
    const googlePicture = payload.picture;

    if (!googleEmail) {
      throw new Error('El token de Google no contiene un email válido');
    }

    // Verificar si el email está verificado por Google
    if (!payload.email_verified) {
      throw new Error('El email de Google no está verificado');
    }

    // Buscar el usuario en la base de datos por email
    let user = await prisma.user.findUnique({
      where: { email: googleEmail },
      select: {
        id: true,
        email: true,
        fullName: true,
        tenantId: true,
        role: true,
        isActive: true
      }
    });

    // Si el usuario no existe, crearlo
    if (!user) {
      // Crear un tenant por defecto para usuarios de Google
      // Usar el nombre de Google como nombre del tenant
      const tenantName = googleName;
      const tenantSlug = googleName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '') + `-${Date.now()}`;

      // Crear el tenant
      const tenant = await prisma.tenant.create({
        data: {
          name: tenantName,
          slug: tenantSlug
        }
      });

      // Crear configuración por defecto para el tenant
      await prisma.companySettings.create({
        data: {
          tenantId: tenant.id
        }
      });

      // Verificar si es el primer usuario del tenant (será ADMIN)
      const existingUsers = await prisma.user.count({
        where: { tenantId: tenant.id }
      });

      // Crear una contraseña aleatoria hasheada para usuarios de Google
      // (aunque no se usará para login, es requerida por el modelo)
      const randomPassword = await bcrypt.hash(
        `google-${googleEmail}-${Date.now()}-${Math.random()}`,
        10
      );

      // Crear el usuario con rol por defecto CASHIER (o ADMIN si es el primero)
      user = await prisma.user.create({
        data: {
          fullName: googleName,
          email: googleEmail,
          password: randomPassword, // Contraseña aleatoria (no se usará para login)
          tenantId: tenant.id,
          role: existingUsers === 0 ? 'ADMIN' : 'CASHIER' // Primer usuario = ADMIN
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          tenantId: true,
          role: true,
          isActive: true
        }
      });
    } else {
      // Verificar si el usuario está activo
      if (!user.isActive) {
        throw new Error('Usuario inactivo. Contacte al administrador');
      }

      // Opcional: Actualizar el nombre si cambió en Google
      if (user.fullName !== googleName) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { fullName: googleName },
          select: {
            id: true,
            email: true,
            fullName: true,
            tenantId: true,
            role: true,
            isActive: true
          }
        });
      }
    }

    // Generar JWT incluyendo el role
    const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
    const token = jwt.sign(
      { userId: user.id, tenantId: user.tenantId, role: user.role },
      JWT_SECRET,
      options
    );

    return {
      user,
      token
    };
  } catch (error: any) {
    // Manejar errores específicos de Google Auth
    if (error.message.includes('Token used too early') || error.message.includes('expired')) {
      throw new Error('El token de Google ha expirado. Por favor, intenta nuevamente');
    }
    
    if (error.message.includes('audience')) {
      throw new Error('Token de Google inválido. Verifica la configuración');
    }

    // Propagar otros errores
    throw error;
  }
};

