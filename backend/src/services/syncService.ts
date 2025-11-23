// backend/src/services/syncService.ts
// Servicio de sincronización bidireccional entre SQLite (local) y PostgreSQL (remoto)

import { DatabaseManager, getPrismaClient, type DatabaseMode } from './databaseManager';

// @ts-expect-error - Cliente SQLite generado desde schema separado
import { PrismaClient as PrismaClientSQLite } from '../../node_modules/.prisma/client-sqlite';
import { PrismaClient as PrismaClientPG } from '@prisma/client';

interface SyncResult {
    success: boolean;
    uploaded: number;
    downloaded: number;
    errors: string[];
}

interface SyncStats {
    tenants: { uploaded: number; downloaded: number };
    users: { uploaded: number; downloaded: number };
    clients: { uploaded: number; downloaded: number };
    products: { uploaded: number; downloaded: number };
    invoices: { uploaded: number; downloaded: number };
    transactions: { uploaded: number; downloaded: number };
}

/**
 * Detecta si hay conexión a internet/disponibilidad del servidor PostgreSQL
 */
export async function isOnline(): Promise<boolean> {
    try {
        const dbManager = DatabaseManager.getInstance();
        if (dbManager.isOffline()) {
            return false;
        }

        // Intentar conectar a PostgreSQL
        const pgClient = dbManager.getPostgreSQLClient();
        await pgClient.$queryRaw`SELECT 1`;
        return true;
    } catch (error) {
        console.warn('⚠️  [SyncService] PostgreSQL no disponible:', error);
        return false;
    }
}

/**
 * Sincroniza datos bidireccionalmente entre SQLite (local) y PostgreSQL (remoto)
 * 
 * Estrategia:
 * 1. Subir cambios locales (isSynced = false) a PostgreSQL
 * 2. Descargar cambios remotos (updatedAt más reciente) desde PostgreSQL
 */
export async function syncData(): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        uploaded: 0,
        downloaded: 0,
        errors: []
    };

    try {
        // Verificar que estemos online
        const online = await isOnline();
        if (!online) {
            result.errors.push('No hay conexión a PostgreSQL. Modo offline activo.');
            return result;
        }

        const dbManager = DatabaseManager.getInstance();
        const sqliteClient = dbManager.getSQLiteClient();
        const pgClient = dbManager.getPostgreSQLClient();

        // Conectar ambos clientes si no están conectados
        await sqliteClient.$connect().catch(() => {});
        await pgClient.$connect().catch(() => {});

        console.log('🔄 [SyncService] Iniciando sincronización bidireccional...');

        const stats: SyncStats = {
            tenants: { uploaded: 0, downloaded: 0 },
            users: { uploaded: 0, downloaded: 0 },
            clients: { uploaded: 0, downloaded: 0 },
            products: { uploaded: 0, downloaded: 0 },
            invoices: { uploaded: 0, downloaded: 0 },
            transactions: { uploaded: 0, downloaded: 0 }
        };

        // 1. SUBIR CAMBIOS LOCALES (SQLite -> PostgreSQL)
        console.log('📤 [SyncService] Subiendo cambios locales...');
        
        // Sincronizar Tenants
        stats.tenants = await syncTenants(sqliteClient, pgClient);
        
        // Sincronizar Users
        stats.users = await syncUsers(sqliteClient, pgClient);
        
        // Sincronizar Clients
        stats.clients = await syncClients(sqliteClient, pgClient);
        
        // Sincronizar Products
        stats.products = await syncProducts(sqliteClient, pgClient);
        
        // Sincronizar Invoices
        stats.invoices = await syncInvoices(sqliteClient, pgClient);
        
        // Sincronizar Transactions
        stats.transactions = await syncTransactions(sqliteClient, pgClient);

        // 2. DESCARGAR CAMBIOS REMOTOS (PostgreSQL -> SQLite)
        console.log('📥 [SyncService] Descargando cambios remotos...');
        
        // Descargar Tenants actualizados
        stats.tenants.downloaded += await downloadTenants(sqliteClient, pgClient);
        
        // Descargar Users actualizados
        stats.users.downloaded += await downloadUsers(sqliteClient, pgClient);
        
        // Descargar Clients actualizados
        stats.clients.downloaded += await downloadClients(sqliteClient, pgClient);
        
        // Descargar Products actualizados
        stats.products.downloaded += await downloadProducts(sqliteClient, pgClient);
        
        // Descargar Invoices actualizados
        stats.invoices.downloaded += await downloadInvoices(sqliteClient, pgClient);
        
        // Descargar Transactions actualizadas
        stats.transactions.downloaded += await downloadTransactions(sqliteClient, pgClient);

        // Calcular totales
        result.uploaded = Object.values(stats).reduce((sum, stat) => sum + stat.uploaded, 0);
        result.downloaded = Object.values(stats).reduce((sum, stat) => sum + stat.downloaded, 0);
        result.success = true;

        console.log(`✅ [SyncService] Sincronización completada:`);
        console.log(`   📤 Subidos: ${result.uploaded} registros`);
        console.log(`   📥 Descargados: ${result.downloaded} registros`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        result.errors.push(errorMessage);
        console.error('❌ [SyncService] Error en sincronización:', error);
    }

    return result;
}

// Funciones auxiliares de sincronización por modelo

async function syncTenants(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    
    try {
        // Obtener tenants no sincronizados de SQLite
        const unsyncedTenants = await sqlite.tenant.findMany({
            where: { isSynced: false }
        });

        for (const tenant of unsyncedTenants) {
            try {
                await pg.tenant.upsert({
                    where: { id: tenant.id },
                    create: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        email: tenant.email,
                        phone: tenant.phone,
                        address: tenant.address,
                        createdAt: tenant.createdAt,
                        updatedAt: tenant.updatedAt,
                        isSynced: true
                    },
                    update: {
                        name: tenant.name,
                        slug: tenant.slug,
                        email: tenant.email,
                        phone: tenant.phone,
                        address: tenant.address,
                        updatedAt: tenant.updatedAt,
                        isSynced: true
                    }
                });

                // Marcar como sincronizado en SQLite
                await sqlite.tenant.update({
                    where: { id: tenant.id },
                    data: { isSynced: true }
                });

                uploaded++;
            } catch (error) {
                console.error(`Error sincronizando tenant ${tenant.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error en syncTenants:', error);
    }

    return { uploaded, downloaded: 0 };
}

async function downloadTenants(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;

    try {
        // Obtener última fecha de actualización en SQLite
        const lastTenant = await sqlite.tenant.findFirst({
            orderBy: { updatedAt: 'desc' }
        });

        const lastUpdate = lastTenant?.updatedAt || new Date(0);

        // Obtener tenants actualizados desde PostgreSQL
        const updatedTenants = await pg.tenant.findMany({
            where: {
                updatedAt: {
                    gt: lastUpdate
                }
            }
        });

        for (const tenant of updatedTenants) {
            try {
                await sqlite.tenant.upsert({
                    where: { id: tenant.id },
                    create: {
                        id: tenant.id,
                        name: tenant.name,
                        slug: tenant.slug,
                        email: tenant.email,
                        phone: tenant.phone,
                        address: tenant.address,
                        createdAt: tenant.createdAt,
                        updatedAt: tenant.updatedAt,
                        isSynced: true
                    },
                    update: {
                        name: tenant.name,
                        slug: tenant.slug,
                        email: tenant.email,
                        phone: tenant.phone,
                        address: tenant.address,
                        updatedAt: tenant.updatedAt,
                        isSynced: true
                    }
                });

                downloaded++;
            } catch (error) {
                console.error(`Error descargando tenant ${tenant.id}:`, error);
            }
        }
    } catch (error) {
        console.error('Error en downloadTenants:', error);
    }

    return downloaded;
}

// Funciones similares para otros modelos (simplificadas)

async function syncUsers(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    
    try {
        const unsynced = await sqlite.user.findMany({ where: { isSynced: false } });
        for (const user of unsynced) {
            await pg.user.upsert({
                where: { id: user.id },
                create: { ...user, isSynced: true },
                update: { ...user, isSynced: true }
            });
            await sqlite.user.update({ where: { id: user.id }, data: { isSynced: true } });
            uploaded++;
        }
    } catch (error) {
        console.error('Error en syncUsers:', error);
    }

    return { uploaded, downloaded: 0 };
}

async function downloadUsers(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;
    try {
        const lastUser = await sqlite.user.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastUpdate = lastUser?.updatedAt || new Date(0);
        const updated = await pg.user.findMany({ where: { updatedAt: { gt: lastUpdate } } });
        
        for (const user of updated) {
            await sqlite.user.upsert({
                where: { id: user.id },
                create: { ...user, isSynced: true },
                update: { ...user, isSynced: true }
            });
            downloaded++;
        }
    } catch (error) {
        console.error('Error en downloadUsers:', error);
    }
    return downloaded;
}

async function syncClients(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    try {
        const unsynced = await sqlite.client.findMany({ where: { isSynced: false } });
        for (const client of unsynced) {
            await pg.client.upsert({
                where: { id: client.id },
                create: { ...client, isSynced: true },
                update: { ...client, isSynced: true }
            });
            await sqlite.client.update({ where: { id: client.id }, data: { isSynced: true } });
            uploaded++;
        }
    } catch (error) {
        console.error('Error en syncClients:', error);
    }
    return { uploaded, downloaded: 0 };
}

async function downloadClients(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;
    try {
        const lastClient = await sqlite.client.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastUpdate = lastClient?.updatedAt || new Date(0);
        const updated = await pg.client.findMany({ where: { updatedAt: { gt: lastUpdate } } });
        
        for (const client of updated) {
            await sqlite.client.upsert({
                where: { id: client.id },
                create: { ...client, isSynced: true },
                update: { ...client, isSynced: true }
            });
            downloaded++;
        }
    } catch (error) {
        console.error('Error en downloadClients:', error);
    }
    return downloaded;
}

async function syncProducts(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    try {
        const unsynced = await sqlite.product.findMany({ where: { isSynced: false } });
        for (const product of unsynced) {
            await pg.product.upsert({
                where: { id: product.id },
                create: { ...product, isSynced: true },
                update: { ...product, isSynced: true }
            });
            await sqlite.product.update({ where: { id: product.id }, data: { isSynced: true } });
            uploaded++;
        }
    } catch (error) {
        console.error('Error en syncProducts:', error);
    }
    return { uploaded, downloaded: 0 };
}

async function downloadProducts(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;
    try {
        const lastProduct = await sqlite.product.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastUpdate = lastProduct?.updatedAt || new Date(0);
        const updated = await pg.product.findMany({ where: { updatedAt: { gt: lastUpdate } } });
        
        for (const product of updated) {
            await sqlite.product.upsert({
                where: { id: product.id },
                create: { ...product, isSynced: true },
                update: { ...product, isSynced: true }
            });
            downloaded++;
        }
    } catch (error) {
        console.error('Error en downloadProducts:', error);
    }
    return downloaded;
}

async function syncInvoices(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    try {
        const unsynced = await sqlite.invoice.findMany({ where: { isSynced: false } });
        for (const invoice of unsynced) {
            await pg.invoice.upsert({
                where: { id: invoice.id },
                create: { ...invoice, isSynced: true },
                update: { ...invoice, isSynced: true }
            });
            await sqlite.invoice.update({ where: { id: invoice.id }, data: { isSynced: true } });
            uploaded++;
        }
    } catch (error) {
        console.error('Error en syncInvoices:', error);
    }
    return { uploaded, downloaded: 0 };
}

async function downloadInvoices(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;
    try {
        const lastInvoice = await sqlite.invoice.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastUpdate = lastInvoice?.updatedAt || new Date(0);
        const updated = await pg.invoice.findMany({ where: { updatedAt: { gt: lastUpdate } } });
        
        for (const invoice of updated) {
            await sqlite.invoice.upsert({
                where: { id: invoice.id },
                create: { ...invoice, isSynced: true },
                update: { ...invoice, isSynced: true }
            });
            downloaded++;
        }
    } catch (error) {
        console.error('Error en downloadInvoices:', error);
    }
    return downloaded;
}

async function syncTransactions(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<{ uploaded: number; downloaded: number }> {
    let uploaded = 0;
    try {
        const unsynced = await sqlite.transaction.findMany({ where: { isSynced: false } });
        for (const transaction of unsynced) {
            await pg.transaction.upsert({
                where: { id: transaction.id },
                create: { ...transaction, isSynced: true },
                update: { ...transaction, isSynced: true }
            });
            await sqlite.transaction.update({ where: { id: transaction.id }, data: { isSynced: true } });
            uploaded++;
        }
    } catch (error) {
        console.error('Error en syncTransactions:', error);
    }
    return { uploaded, downloaded: 0 };
}

async function downloadTransactions(sqlite: PrismaClientSQLite, pg: PrismaClientPG): Promise<number> {
    let downloaded = 0;
    try {
        const lastTransaction = await sqlite.transaction.findFirst({ orderBy: { updatedAt: 'desc' } });
        const lastUpdate = lastTransaction?.updatedAt || new Date(0);
        const updated = await pg.transaction.findMany({ where: { updatedAt: { gt: lastUpdate } } });
        
        for (const transaction of updated) {
            await sqlite.transaction.upsert({
                where: { id: transaction.id },
                create: { ...transaction, isSynced: true },
                update: { ...transaction, isSynced: true }
            });
            downloaded++;
        }
    } catch (error) {
        console.error('Error en downloadTransactions:', error);
    }
    return downloaded;
}
