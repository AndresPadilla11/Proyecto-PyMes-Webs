// backend/src/services/clientService.ts

import { Prisma } from '@prisma/client';
import prisma from '../db';

export type CreateClientDTO = Prisma.ClientUncheckedCreateInput;
export type UpdateClientDTO = Prisma.ClientUncheckedUpdateInput;

// Interfaz para validar campos obligatorios
interface ClientData {
    businessName: string;
    tenantId: string;
    documentType: 'CC' | 'NIT' | 'PASSPORT';
    identification: string;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    nit?: string | null;
    dv?: string | null;
    hasCredit?: boolean;
    creditLimit?: string | number;
    currentDebt?: string | number;
    isActive?: boolean;
}

// ------------------- CREATE -------------------
export const createClient = async (data: CreateClientDTO, tenantId: string) => {
    // Validar campos obligatorios
    if (!data.businessName) {
        throw new Error('businessName is required');
    }
    if (!tenantId) {
        throw new Error('tenantId is required');
    }
    if (!data.documentType) {
        throw new Error('documentType is required');
    }
    if (!data.identification) {
        throw new Error('identification is required');
    }

    try {
        // Asegurar que el tenant existe, si no, crearlo
        let tenant = await prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            // Crear tenant por defecto si no existe
            const slug = tenantId.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            // Verificar si el slug ya existe
            const existingTenant = await prisma.tenant.findUnique({
                where: { slug }
            });
            
            tenant = await prisma.tenant.create({
                data: {
                    id: tenantId,
                    name: tenantId,
                    slug: existingTenant ? `${slug}-${Date.now()}` : slug
                }
            });
        }

        const newClient = await prisma.client.create({
            data: {
                businessName: data.businessName,
                tenantId: tenantId, // Usar tenantId recibido como parámetro
                documentType: data.documentType,
                identification: data.identification,
                email: data.email ?? null,
                phone: data.phone ?? null,
                address: data.address ?? null,
                nit: data.nit ?? null,
                dv: data.dv ?? null,
                hasCredit: data.hasCredit ?? false,
                creditLimit: data.creditLimit ? Number(data.creditLimit) : 0,
                currentDebt: data.currentDebt ? Number(data.currentDebt) : 0,
                isActive: data.isActive ?? true,
            },
            select: {
                id: true,
                tenantId: true,
                businessName: true,
                documentType: true,
                identification: true,
                nit: true,
                dv: true,
                email: true,
                phone: true,
                address: true,
                hasCredit: true,
                creditLimit: true,
                currentDebt: true,
                isActive: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return newClient;
    } catch (error) {
        // Re-lanzar el error para que el controlador lo maneje
        throw error;
    }
};

// ------------------- READ -------------------
export const getAllClients = async (tenantId: string) => {
    // Select explícito con SOLO campos válidos (sin isSynced, existe, localId)
    const clients = await prisma.client.findMany({
        where: {
            tenantId: tenantId
        },
        select: {
            id: true,
            tenantId: true,
            businessName: true,
            documentType: true,
            identification: true,
            nit: true,
            dv: true,
            email: true,
            phone: true,
            address: true,
            hasCredit: true,
            creditLimit: true,
            currentDebt: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
    return clients;
};

export const getClientById = async (id: string, tenantId: string) => {
    // Select explícito con SOLO campos válidos (sin isSynced, existe, localId)
    const client = await prisma.client.findUnique({
        where: { id },
        select: {
            id: true,
            tenantId: true,
            businessName: true,
            documentType: true,
            identification: true,
            nit: true,
            dv: true,
            email: true,
            phone: true,
            address: true,
            hasCredit: true,
            creditLimit: true,
            currentDebt: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        }
    });
    
    // Verificar que el cliente pertenece al tenant
    if (!client || client.tenantId !== tenantId) {
        return null;
    }
    
    return client;
};

// ------------------- UPDATE & DELETE (Mantenidos para completar el CRUD) -------------------
export const updateClient = async (id: string, data: UpdateClientDTO, tenantId: string) => {
    // Verificar que el cliente pertenece al tenant
    const existingClient = await prisma.client.findUnique({
        where: { id }
    });

    if (!existingClient || existingClient.tenantId !== tenantId) {
        throw new Error('Client not found');
    }

    // Eliminar isSynced, existe, localId si están presentes (no existen en la base de datos)
    const updateData: UpdateClientDTO = { ...data };
    if ('isSynced' in updateData) {
        delete updateData.isSynced;
    }
    if ('existe' in updateData) {
        delete updateData.existe;
    }
    if ('localId' in updateData) {
        delete updateData.localId;
    }

    const updatedClient = await prisma.client.update({
        where: { id },
        data: updateData,
        select: {
            id: true,
            tenantId: true,
            businessName: true,
            documentType: true,
            identification: true,
            nit: true,
            dv: true,
            email: true,
            phone: true,
            address: true,
            hasCredit: true,
            creditLimit: true,
            currentDebt: true,
            isActive: true,
            createdAt: true,
            updatedAt: true
        }
    });
    return updatedClient;
};

export const deleteClient = async (id: string, tenantId: string) => {
    // Verificar que el cliente pertenece al tenant
    const existingClient = await prisma.client.findUnique({
        where: { id }
    });

    if (!existingClient || existingClient.tenantId !== tenantId) {
        throw new Error('Client not found');
    }

    const deletedClient = await prisma.client.delete({
        where: { id },
    });
    return deletedClient;
};