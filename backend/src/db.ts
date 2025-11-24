// backend/src/db.ts
// Exporta el cliente Prisma para PostgreSQL (web/producción)

import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Validar que DATABASE_URL esté configurado
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.DATABASE_URL) {
    const errorMessage = isProduction
        ? '❌ [Prisma] DATABASE_URL no está configurado. Asegúrate de establecer esta variable de entorno en Render.'
        : '❌ [Prisma] DATABASE_URL no está configurado. Crea un archivo .env en la raíz de backend/ con DATABASE_URL.';
    console.error(errorMessage);
    throw new Error('DATABASE_URL environment variable is required');
}

// Validar que DATABASE_URL no contenga localhost en producción
if (isProduction && process.env.DATABASE_URL.includes('localhost')) {
    console.error('❌ [Prisma] DATABASE_URL contiene localhost en producción. Esto no funcionará en Render.');
    console.error('💡 [Prisma] Asegúrate de usar la URL de base de datos proporcionada por Render o Supabase.');
    throw new Error('DATABASE_URL cannot use localhost in production');
}

// Singleton para desarrollo (evita múltiples instancias en hot-reload)
const prisma = global.prisma || new PrismaClient({
    log: isProduction ? ['error'] : ['error', 'warn']
});

if (!isProduction) {
    global.prisma = prisma;
}

export default prisma;