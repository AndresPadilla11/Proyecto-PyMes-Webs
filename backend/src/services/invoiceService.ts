// backend/src/services/invoiceService.ts
// Servicio optimizado para gestión de facturas - Sin referencias a columnas inexistentes

import { Prisma } from '@prisma/client';
import prisma from '../db';
import { IVA_RATE } from '../config/constants';

export type CreateInvoiceDTO = Prisma.InvoiceUncheckedCreateInput;
export type UpdateInvoiceDTO = Prisma.InvoiceUncheckedUpdateInput;

// ==================== TIPOS E INTERFACES ====================

// Interfaz para un item de factura
export interface InvoiceItemInput {
  productId: string;
  quantity: number;
  description?: string;
  unitPrice?: number;
  taxRate?: number;
}

// Interfaz para crear factura con items
export interface CreateInvoiceInput {
  clientId?: string | null;
  number: string;
  items: InvoiceItemInput[];
  issueDate?: Date | string;
  dueDate?: Date | string | null;
  status?: 'DRAFT' | 'ISSUED' | 'PAID' | 'CANCELLED';
  paymentMethod?: 'CASH' | 'CREDIT' | 'TRANSFER';
  currency?: string;
  isCreditSale?: boolean;
  notes?: string | null;
  createdById?: string | null;
  applyIva?: boolean; // Aplicar IVA del 19% si está activo
}

// Respuesta de creación de factura
export interface CreateInvoiceResult {
  invoice: any; // Invoice con items incluidos
  warnings: string[];
}

// ==================== CAMPOS VÁLIDOS DEL SCHEMA ====================
// Solo campos que existen en el schema.prisma actual
// NO incluir: existe (no existe en el schema)

// Campos válidos de Invoice según schema (sin isSynced - no existe en producción)
const INVOICE_FIELDS = {
  id: true,
  tenantId: true,
  clientId: true,
  number: true,
  status: true,
  issueDate: true,
  dueDate: true,
  paymentMethod: true,
  currency: true,
  subtotal: true,
  taxTotal: true,
  total: true,
  totalPaid: true,
  isCreditSale: true,
  notes: true,
  createdById: true,
  createdAt: true,
  updatedAt: true
} as const;

// Campos válidos de InvoiceItem según schema (sin isSynced, updatedAt - no existen en producción)
const INVOICE_ITEM_FIELDS = {
  id: true,
  invoiceId: true,
  productId: true,
  description: true,
  quantity: true,
  unitPrice: true,
  taxRateApplied: true,
  taxAmount: true,
  totalAmount: true,
  createdAt: true
} as const;

// Campos válidos de Product según schema (sin isSynced, existe - no existen en producción)
const PRODUCT_FIELDS = {
  id: true,
  tenantId: true,
  name: true,
  sku: true,
  description: true,
  price: true,
  cost: true,
  stock: true,
  isActive: true,
  createdAt: true,
  updatedAt: true
} as const;

// Campos válidos de Client según schema (sin isSynced - no existe en producción)
const CLIENT_FIELDS = {
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
} as const;

// ==================== READ OPERATIONS ====================

/**
 * Obtiene todas las facturas de un tenant
 * Usa select explícito para evitar errores P2022 con campos inexistentes
 * 
 * @param tenantId - ID del tenant
 * @returns Array de facturas con items y relaciones
 */
export const getAllInvoices = async (tenantId: string) => {
  try {
    // CONSULTA SEGURA - Select explícito con SOLO campos válidos
    // NO usa include que puede traer campos inexistentes
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: tenantId
      },
      select: {
        ...INVOICE_FIELDS,
        client: {
          select: CLIENT_FIELDS
        },
        items: {
          select: {
            ...INVOICE_ITEM_FIELDS,
            product: {
              select: PRODUCT_FIELDS
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return invoices;
  } catch (error) {
    // Manejo robusto de errores con contexto para modo offline
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2022') {
        console.error('❌ [InvoiceService] Error P2022: Columna inexistente en la base de datos');
        console.error('💡 [InvoiceService] Modo: ONLINE | Solución: Regenera el cliente de Prisma con `npx prisma generate`');
        console.error('💡 [InvoiceService] Verifica que el schema.prisma coincida con la base de datos PostgreSQL');
        throw new Error('Error de esquema de base de datos. Regenera el cliente de Prisma.');
      }
    }
    
    console.error('❌ [InvoiceService] Error al obtener facturas:', error);
    throw error;
  }
};

/**
 * Obtiene una factura por ID con relaciones
 * 
 * @param id - ID de la factura
 * @param tenantId - ID del tenant
 * @returns Factura o null si no existe
 */
export const getInvoiceById = async (id: string, tenantId: string) => {
  try {
    // Select explícito con SOLO campos válidos
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      select: {
        ...INVOICE_FIELDS,
        client: {
          select: CLIENT_FIELDS
        },
        items: {
          select: {
            ...INVOICE_ITEM_FIELDS,
            product: {
              select: PRODUCT_FIELDS
            }
          }
        }
      }
    });

    // Verificar que la factura pertenece al tenant
    if (!invoice || invoice.tenantId !== tenantId) {
      return null;
    }

    return invoice;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2022') {
        console.error('❌ [InvoiceService] Error P2022: Columna inexistente');
        throw new Error('Error de esquema. Ejecuta `npx prisma generate`.');
      }
    }
    
    console.error('❌ [InvoiceService] Error al obtener factura:', error);
    throw error;
  }
};

// ==================== CREATE OPERATIONS ====================

/**
 * Crea una nueva factura con items
 * Valida stock y aplica IVA si está activo
 * 
 * @param data - Datos de la factura
 * @param tenantId - ID del tenant
 * @returns Factura creada con warnings de stock
 */
export const createInvoice = async (
  data: CreateInvoiceInput,
  tenantId: string
): Promise<CreateInvoiceResult> => {
  const warnings: string[] = [];

  try {
    // Validar campos obligatorios
    if (!data.number || !data.number.trim()) {
      throw new Error('El número de factura es requerido');
    }

    if (!data.items || data.items.length === 0) {
      throw new Error('La factura debe tener al menos un item');
    }

    // Verificar que el número de factura no esté en uso para este tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        tenantId_number: {
          tenantId: tenantId,
          number: data.number.trim()
        }
      },
      select: { id: true }
    });

    if (existingInvoice) {
      throw new Error('Ya está en uso un número de factura con este valor');
    }

    // Ejecutar transacción de Prisma
    const result = await prisma.$transaction(async (tx) => {
      // Procesar cada item y validar stock
      const processedItems: Array<{
        productId: string;
        product: any;
        quantity: number;
        description: string;
        unitPrice: number;
        taxRate: number;
        taxAmount: number;
        totalAmount: number;
        newStock: number;
      }> = [];

      for (const item of data.items) {
        // Buscar el producto - SOLO campos válidos
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: PRODUCT_FIELDS
        });

        if (!product) {
          throw new Error(`Producto con ID ${item.productId} no encontrado`);
        }

        // Verificar que el producto pertenece al tenant
        if (product.tenantId !== tenantId) {
          throw new Error(`El producto no pertenece a tu tenant`);
        }

        // Validar stock disponible (usar stock válido del schema)
        const quantity = Number(item.quantity);
        if (product.stock < quantity) {
          throw new Error(
            `Stock insuficiente para el producto "${product.name}". Stock disponible: ${product.stock}, solicitado: ${quantity}`
          );
        }

        // Calcular precios
        const unitPrice = item.unitPrice
          ? Number(item.unitPrice)
          : Number(product.price);
        const subtotal = unitPrice * quantity;
        // Impuesto (IVA) solo si applyIva es true
        const taxAmount = data.applyIva === true ? subtotal * IVA_RATE : 0;
        const totalAmount = subtotal + taxAmount;

        // Calcular nuevo stock
        const newStock = product.stock - quantity;

        // Actualizar stock del producto - SOLO campo stock válido
        await tx.product.update({
          where: { id: product.id },
          data: { 
            stock: newStock
          }
        });

        // Verificar si el stock quedó bajo (<= 5)
        if (newStock <= 5) {
          warnings.push(
            `¡Atención! El producto "${product.name}" se está agotando. Stock restante: ${newStock}`
          );
        }

        processedItems.push({
          productId: product.id,
          product,
          quantity,
          description: item.description || product.name,
          unitPrice,
          taxRate: IVA_RATE * 100,
          taxAmount,
          totalAmount,
          newStock
        });
      }

      // Calcular totales de la factura
      const subtotal = processedItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0
      );
      
      // Calcular Impuesto (IVA) total
      const impuestoTotal = processedItems.reduce((sum, item) => sum + item.taxAmount, 0);
      
      // El total final es subtotal + impuesto total
      const finalTotal = subtotal + impuestoTotal;

      // Crear la factura - SOLO campos válidos del schema
      const invoice = await tx.invoice.create({
        data: {
          tenantId: tenantId,
          clientId: data.clientId || null,
          number: data.number.trim(),
          status: data.status || 'DRAFT',
          issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paymentMethod: data.paymentMethod || 'CASH',
          currency: data.currency || 'COP',
          subtotal: subtotal,
          taxTotal: impuestoTotal,
          total: finalTotal,
          totalPaid: 0,
          isCreditSale: data.isCreditSale || false,
          notes: data.notes || null,
          createdById: data.createdById || null,
          items: {
            create: processedItems.map((item) => ({
              productId: item.productId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRateApplied: data.applyIva === true ? IVA_RATE * 100 : 0,
              taxAmount: item.taxAmount,
              totalAmount: item.totalAmount
            }))
          }
        },
        // Select explícito con SOLO campos válidos
        select: {
          ...INVOICE_FIELDS,
          client: {
            select: CLIENT_FIELDS
          },
          items: {
            select: {
              ...INVOICE_ITEM_FIELDS,
              product: {
                select: PRODUCT_FIELDS
              }
            }
          }
        }
      });

      return invoice;
    });

    console.log(`✅ [InvoiceService] Factura creada: ${result.number} (${result.id})`);
    return {
      invoice: result,
      warnings
    };
  } catch (error) {
    // Manejo específico de errores
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Ya está en uso un número de factura con este valor');
      }
      if (error.code === 'P2022') {
        console.error('❌ [InvoiceService] Error P2022 al crear factura');
        console.error('💡 [InvoiceService] Modo: ONLINE | Regenera el cliente: `npx prisma generate`');
        throw new Error('Error de esquema de base de datos. Ejecuta `npx prisma generate`.');
      }
    }

    // Re-lanzar errores de validación
    if (error instanceof Error) {
      throw error;
    }

    console.error('❌ [InvoiceService] Error al crear factura:', error);
    throw error;
  }
};

// ==================== UPDATE OPERATIONS ====================

/**
 * Actualiza una factura existente
 * 
 * @param id - ID de la factura
 * @param data - Datos a actualizar
 * @param tenantId - ID del tenant
 * @returns Factura actualizada
 */
export const updateInvoice = async (
  id: string,
  data: UpdateInvoiceDTO,
  tenantId: string
) => {
  try {
    // Verificar que la factura existe y pertenece al tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, tenantId: true }
    });

    if (!existingInvoice || existingInvoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    // Eliminar isSynced si está presente en data (no existe en la base de datos)
    const updateData: UpdateInvoiceDTO = { ...data };
    if ('isSynced' in updateData) {
      delete updateData.isSynced;
    }

    // Actualizar la factura - Select explícito con SOLO campos válidos
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
      select: {
        ...INVOICE_FIELDS,
        client: {
          select: CLIENT_FIELDS
        },
        items: {
          select: {
            ...INVOICE_ITEM_FIELDS,
            product: {
              select: PRODUCT_FIELDS
            }
          }
        }
      }
    });

    console.log(`✅ [InvoiceService] Factura actualizada: ${updatedInvoice.number} (${updatedInvoice.id})`);
    return updatedInvoice;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new Error('Invoice not found');
      }
      if (error.code === 'P2022') {
        console.error('❌ [InvoiceService] Error P2022 al actualizar factura');
        throw new Error('Error de esquema. Ejecuta `npx prisma generate`.');
      }
    }

    console.error('❌ [InvoiceService] Error al actualizar factura:', error);
    throw error;
  }
};

// ==================== DELETE OPERATIONS ====================

/**
 * Elimina una factura
 * 
 * @param id - ID de la factura
 * @param tenantId - ID del tenant
 * @returns ID de la factura eliminada
 */
export const deleteInvoice = async (id: string, tenantId: string) => {
  try {
    // Verificar que la factura existe y pertenece al tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, tenantId: true }
    });

    if (!existingInvoice || existingInvoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    // Eliminar físicamente la factura
    await prisma.invoice.delete({
      where: { id }
    });

    console.log(`✅ [InvoiceService] Factura eliminada: ${id}`);
    return { id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new Error('Invoice not found');
      }
      if (error.code === 'P2022') {
        console.error('❌ [InvoiceService] Error P2022 al eliminar factura');
        throw new Error('Error de esquema. Ejecuta `npx prisma generate`.');
      }
    }

    console.error('❌ [InvoiceService] Error al eliminar factura:', error);
    throw error;
  }
};
