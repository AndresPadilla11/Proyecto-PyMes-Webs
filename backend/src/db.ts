// backend/src/db.ts
// Exporta el cliente Prisma para PostgreSQL (web/producción)

import { PrismaClient } from '@prisma/client';

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Singleton para desarrollo (evita múltiples instancias en hot-reload)
const prisma = global.prisma || new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn']
});

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

export default prisma;