// backend/src/services/databaseManager.ts
// Gestor de base de datos dual (PostgreSQL/SQLite) para arquitectura Offline-First

import { PrismaClient } from '@prisma/client';
// @ts-expect-error - Cliente SQLite generado desde schema separado
import { PrismaClient as PrismaClientSQLite } from '../../node_modules/.prisma/client-sqlite';

declare global {
    // eslint-disable-next-line no-var
    var prismaPG: PrismaClient | undefined;
    // eslint-disable-next-line no-var
    var prismaSQLite: PrismaClientSQLite | undefined;
}

export type DatabaseMode = 'online' | 'offline';
export type PrismaClientType = PrismaClient | PrismaClientSQLite;

/**
 * DatabaseManager - Gestiona las conexiones a PostgreSQL y SQLite
 * Selecciona automáticamente el cliente correcto según DB_MODE
 */
export class DatabaseManager {
    private static instance: DatabaseManager;
    private mode: DatabaseMode;
    private pgClient: PrismaClient | null = null;
    private sqliteClient: PrismaClientSQLite | null = null;

    private constructor() {
        // Determinar el modo basándose en la variable de entorno
        this.mode = (process.env.DB_MODE || 'online') as DatabaseMode;
        console.log(`📊 [DatabaseManager] Modo inicializado: ${this.mode}`);
    }

    /**
     * Obtiene la instancia singleton del DatabaseManager
     */
    public static getInstance(): DatabaseManager {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }

    /**
     * Obtiene el cliente Prisma activo según el modo actual
     */
    public getPrismaClient(): PrismaClientType {
        if (this.mode === 'offline') {
            return this.getSQLiteClient();
        } else {
            return this.getPostgreSQLClient();
        }
    }

    /**
     * Obtiene el cliente PostgreSQL
     */
    public getPostgreSQLClient(): PrismaClient {
        if (!this.pgClient) {
            // Reutilizar instancia global si existe (útil en desarrollo)
            if (process.env.NODE_ENV !== 'production' && global.prismaPG) {
                this.pgClient = global.prismaPG;
            } else {
                // En producción, priorizar DATABASE_URL (usado por Render/Supabase)
                // En desarrollo, permitir DATABASE_URL_PG como alternativa
                const isProduction = process.env.NODE_ENV === 'production';
                const databaseUrl = isProduction
                    ? process.env.DATABASE_URL
                    : (process.env.DATABASE_URL_PG || process.env.DATABASE_URL);

                if (!databaseUrl) {
                    const errorMessage = isProduction
                        ? '❌ [DatabaseManager] DATABASE_URL no está configurado. Asegúrate de establecer esta variable de entorno en Render.'
                        : '❌ [DatabaseManager] DATABASE_URL o DATABASE_URL_PG no está configurado. Crea un archivo .env con una de estas variables.';
                    console.error(errorMessage);
                    throw new Error('DATABASE_URL environment variable is required');
                }

                // Validar que no use localhost en producción
                if (isProduction && databaseUrl.includes('localhost')) {
                    console.error('❌ [DatabaseManager] DATABASE_URL contiene localhost en producción. Esto no funcionará en Render.');
                    throw new Error('DATABASE_URL cannot use localhost in production');
                }

                this.pgClient = new PrismaClient({
                    log: this.mode === 'online' ? ['error', 'warn'] : [],
                    datasources: {
                        db: {
                            url: databaseUrl
                        }
                    }
                });
                if (!isProduction) {
                    global.prismaPG = this.pgClient;
                }
            }
        }
        return this.pgClient;
    }

    /**
     * Obtiene el cliente SQLite
     */
    public getSQLiteClient(): PrismaClientSQLite {
        if (!this.sqliteClient) {
            // Reutilizar instancia global si existe (útil en desarrollo)
            if (process.env.NODE_ENV !== 'production' && global.prismaSQLite) {
                this.sqliteClient = global.prismaSQLite;
            } else {
                this.sqliteClient = new PrismaClientSQLite({
                    log: this.mode === 'offline' ? ['error', 'warn'] : [],
                    datasources: {
                        db: {
                            url: process.env.DATABASE_URL_SQLITE || 'file:./prisma/local.db'
                        }
                    }
                });
                if (process.env.NODE_ENV !== 'production') {
                    global.prismaSQLite = this.sqliteClient;
                }
            }
        }
        return this.sqliteClient;
    }

    /**
     * Obtiene el modo actual de base de datos
     */
    public getMode(): DatabaseMode {
        return this.mode;
    }

    /**
     * Cambia el modo de base de datos (útil para cambios dinámicos)
     */
    public setMode(mode: DatabaseMode): void {
        if (this.mode !== mode) {
            console.log(`🔄 [DatabaseManager] Cambiando modo de ${this.mode} a ${mode}`);
            this.mode = mode;
        }
    }

    /**
     * Verifica si está en modo online
     */
    public isOnline(): boolean {
        return this.mode === 'online';
    }

    /**
     * Verifica si está en modo offline
     */
    public isOffline(): boolean {
        return this.mode === 'offline';
    }

    /**
     * Conecta ambos clientes a sus respectivas bases de datos
     */
    public async connectAll(): Promise<void> {
        try {
            if (this.mode === 'online') {
                await this.getPostgreSQLClient().$connect();
                console.log('✅ [DatabaseManager] Conectado a PostgreSQL');
            } else {
                await this.getSQLiteClient().$connect();
                console.log('✅ [DatabaseManager] Conectado a SQLite');
            }
        } catch (error) {
            console.error('❌ [DatabaseManager] Error al conectar:', error);
            throw error;
        }
    }

    /**
     * Desconecta ambos clientes
     */
    public async disconnectAll(): Promise<void> {
        try {
            if (this.pgClient) {
                await this.pgClient.$disconnect();
                console.log('✅ [DatabaseManager] Desconectado de PostgreSQL');
            }
            if (this.sqliteClient) {
                await this.sqliteClient.$disconnect();
                console.log('✅ [DatabaseManager] Desconectado de SQLite');
            }
        } catch (error) {
            console.error('❌ [DatabaseManager] Error al desconectar:', error);
        }
    }
}

/**
 * Función de conveniencia para obtener el cliente Prisma activo
 * Usa el modo configurado en DB_MODE
 */
export function getPrismaClient(): PrismaClientType {
    return DatabaseManager.getInstance().getPrismaClient();
}

/**
 * Función de conveniencia para obtener el modo actual
 */
export function getDatabaseMode(): DatabaseMode {
    return DatabaseManager.getInstance().getMode();
}

/**
 * Función de conveniencia para verificar si está online
 */
export function isOnline(): boolean {
    return DatabaseManager.getInstance().isOnline();
}

export default DatabaseManager;
