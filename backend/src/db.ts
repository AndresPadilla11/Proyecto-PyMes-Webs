// backend/src/db.ts
// Exporta el cliente Prisma para PostgreSQL (web/producción)

import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Validar que DATABASE_URL esté configurado
const isProduction = process.env.NODE_ENV === 'production';

// Función para validar DATABASE_URL
function validateDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL;

    // Verificar que existe y no está vacía
    if (!databaseUrl || databaseUrl.trim() === '') {
        const errorMessage = isProduction
            ? '❌ [Prisma] DATABASE_URL no está configurado o está vacía.\n' +
              '   💡 En Render, ve a tu servicio → Environment → Add Environment Variable\n' +
              '   💡 Establece DATABASE_URL con la URL de PostgreSQL proporcionada por Render o Supabase.\n' +
              '   💡 Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd?schema=public'
            : '❌ [Prisma] DATABASE_URL no está configurado o está vacía.\n' +
              '   💡 Crea un archivo .env en la raíz de backend/ con: DATABASE_URL="postgresql://..."';
        console.error(errorMessage);
        console.error('   📋 Variables de entorno disponibles:', Object.keys(process.env).filter(key => key.includes('DATABASE')).join(', ') || 'ninguna');
        throw new Error('DATABASE_URL environment variable is required and cannot be empty');
    }

    // Validar que comience con postgresql:// o postgres://
    const trimmedUrl = databaseUrl.trim();
    if (!trimmedUrl.startsWith('postgresql://') && !trimmedUrl.startsWith('postgres://')) {
        const errorMessage = isProduction
            ? `❌ [Prisma] DATABASE_URL tiene un formato inválido.\n` +
              `   💡 La URL debe comenzar con "postgresql://" o "postgres://"\n` +
              `   💡 URL actual: ${trimmedUrl.substring(0, 50)}...\n` +
              `   💡 Asegúrate de usar la URL completa proporcionada por Render o Supabase.`
            : `❌ [Prisma] DATABASE_URL tiene un formato inválido.\n` +
              `   💡 La URL debe comenzar con "postgresql://" o "postgres://"\n` +
              `   💡 URL actual: ${trimmedUrl.substring(0, 50)}...`;
        console.error(errorMessage);
        throw new Error('DATABASE_URL must start with postgresql:// or postgres://');
    }

    // Validar que no contenga localhost en producción
    if (isProduction && trimmedUrl.includes('localhost')) {
        console.error('❌ [Prisma] DATABASE_URL contiene localhost en producción. Esto no funcionará en Render.');
        console.error('💡 [Prisma] Asegúrate de usar la URL de base de datos proporcionada por Render o Supabase.');
        console.error(`💡 URL actual: ${trimmedUrl.substring(0, 100)}...`);
        throw new Error('DATABASE_URL cannot use localhost in production');
    }

    return trimmedUrl;
}

// Validar DATABASE_URL antes de crear PrismaClient
const validatedDatabaseUrl = validateDatabaseUrl();

// Crear PrismaClient con la URL validada explícitamente
// Esto asegura que Prisma use la URL validada incluso si hay problemas con el schema.prisma
const prisma = global.prisma || new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn'],
    datasources: {
        db: {
            url: validatedDatabaseUrl
        }
    }
});

if (!isProduction) {
    global.prisma = prisma;
}

export default prisma;