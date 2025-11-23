import { Prisma } from '@prisma/client';

import prisma from '../db';

// ==================== TIPOS E INTERFACES ====================

export type CreateProductDTO = Prisma.ProductUncheckedCreateInput;
export type UpdateProductDTO = Prisma.ProductUncheckedUpdateInput;

/**
 * Interfaz para crear un producto (sin tenantId, se maneja internamente)
 */
export interface CreateProductInput {
  name: string;
  sku?: string | null;
  description?: string | null;
  price: number;
  cost: number;
  stock?: number;
  isActive?: boolean;
}

/**
 * Opciones de filtrado para getAllProducts
 */
export interface ProductFilterOptions {
  includeInactive?: boolean;
  onlyInStock?: boolean;
  minStock?: number;
  search?: string;
}

const BASIC_PRODUCT_FIELDS = {
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

// ==================== READ OPERATIONS ====================

/**
 * Obtiene todos los productos de un tenant con opciones de filtrado
 * 
 * @param tenantId - ID del tenant
 * @param options - Opciones de filtrado opcionales
 * @returns Array de productos filtrados
 */
export const getAllProducts = async (
  tenantId: string,
  options: ProductFilterOptions = {}
) => {
  try {
    const { includeInactive = false, onlyInStock = false, minStock, search } = options;

    const whereConditions: Prisma.ProductWhereInput = {
      tenantId: tenantId
    };

    if (!includeInactive) {
      whereConditions.isActive = true;
    }

    if (onlyInStock) {
      whereConditions.stock = {
        gt: 0
      };
    }

    if (minStock !== undefined) {
      whereConditions.stock = {
        ...(whereConditions.stock as Prisma.IntFilter || {}),
        gte: minStock
      };
    }

    if (search && search.trim()) {
      whereConditions.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { sku: { contains: search.trim(), mode: 'insensitive' } }
      ];
    }

    const products = await prisma.product.findMany({
      where: whereConditions,
      select: {
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
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return products;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2022') {
        console.error('❌ [ProductService] Error P2022: Columna inexistente en la base de datos');
        console.error('💡 [ProductService] Acción requerida: Detén el servidor y ejecuta `npx prisma generate`');
        throw new Error('Error de esquema de base de datos. Regenera el cliente de Prisma.');
      }
    }
    
    console.error('❌ [ProductService] Error al obtener productos:', error);
    throw error;
  }
};

/**
 * Obtiene un producto por ID verificando pertenencia al tenant
 * 
 * @param id - ID del producto
 * @param tenantId - ID del tenant
 * @returns Producto o null si no está disponible
 */
export const getProductById = async (
  id: string,
  tenantId: string
) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
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
      }
    });

    if (!product || product.tenantId !== tenantId) {
      return null;
    }

    return product;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2022') {
        console.error('❌ [ProductService] Error P2022: Columna inexistente');
        throw new Error('Error de esquema. Ejecuta `npx prisma generate`.');
      }
    }
    
    console.error('❌ [ProductService] Error al obtener producto:', error);
    throw error;
  }
};

/**
 * Obtiene productos por SKU
 * 
 * @param sku - SKU del producto
 * @param tenantId - ID del tenant
 * @returns Producto o null si no está disponible
 */
export const getProductBySku = async (
  sku: string,
  tenantId: string
) => {
  try {
    const product = await prisma.product.findUnique({
      where: { sku },
      select: {
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
      }
    });

    if (!product || product.tenantId !== tenantId) {
      return null;
    }

    return product;
  } catch (error) {
    console.error('❌ [ProductService] Error al obtener producto por SKU:', error);
    throw error;
  }
};

// ==================== CREATE OPERATIONS ====================

/**
 * Crea un nuevo producto
 * Valida datos y asegura que el tenant esté disponible
 * 
 * @param data - Datos del producto
 * @param tenantId - ID del tenant
 * @returns Producto creado
 */
export const createProduct = async (
  data: CreateProductInput,
  tenantId: string
) => {
  try {
    let tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true }
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          id: tenantId,
          name: 'PyMes Contables',
          slug: `tenant-${tenantId.substring(0, 8)}`
        },
        select: { id: true }
      });
    }

    if (!data.name || !data.name.trim()) {
      throw new Error('El nombre del producto es requerido');
    }

    if (data.price === undefined || data.price === null || data.price < 0) {
      throw new Error('El precio del producto es requerido y debe ser mayor o igual a 0');
    }

    if (data.cost === undefined || data.cost === null || data.cost < 0) {
      throw new Error('El costo del producto es requerido y debe ser mayor o igual a 0');
    }

    if (data.sku && data.sku.trim()) {
      const existingProduct = await prisma.product.findUnique({
        where: { sku: data.sku.trim() },
        select: { id: true }
      });

      if (existingProduct) {
        throw new Error('Ya está en uso un producto con este SKU');
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        tenantId: tenantId,
        name: data.name.trim(),
        sku: data.sku?.trim() || null,
        description: data.description?.trim() || null,
        price: new Prisma.Decimal(data.price),
        cost: new Prisma.Decimal(data.cost),
        stock: data.stock ?? 0,
        isActive: data.isActive ?? true
      },
      select: {
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
      }
    });

    return newProduct;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Ya está en uso un producto con este SKU o identificador único');
      }
      if (error.code === 'P2022') {
        console.error('❌ [ProductService] Error P2022 al crear producto');
        throw new Error('Error de esquema de base de datos. Ejecuta `npx prisma generate`.');
      }
    }

    if (error instanceof Error && error.message.includes('requerido')) {
      throw error;
    }

    console.error('❌ [ProductService] Error al crear producto:', error);
    throw error;
  }
};

// ==================== UPDATE OPERATIONS ====================

/**
 * Actualiza un producto existente
 * Verifica pertenencia al tenant y valida datos
 * 
 * @param id - ID del producto
 * @param data - Datos a actualizar
 * @param tenantId - ID del tenant
 * @returns Producto actualizado
 */
export const updateProduct = async (
  id: string,
  data: UpdateProductDTO,
  tenantId: string
) => {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, tenantId: true }
    });

    if (!existingProduct || existingProduct.tenantId !== tenantId) {
      throw new Error('Product not found');
    }

    const updateData: UpdateProductDTO = { ...data };

    if (data.price !== undefined) {
      if (typeof data.price === 'number' && data.price < 0) {
        throw new Error('El precio debe ser mayor o igual a 0');
      }
      updateData.price = new Prisma.Decimal(data.price as number);
    }

    if (data.cost !== undefined) {
      if (typeof data.cost === 'number' && data.cost < 0) {
        throw new Error('El costo debe ser mayor o igual a 0');
      }
      updateData.cost = new Prisma.Decimal(data.cost as number);
    }

    if (data.name !== undefined) {
      if (!data.name || !String(data.name).trim()) {
        throw new Error('El nombre del producto no puede estar vacío');
      }
      updateData.name = String(data.name).trim();
    }

    if (data.sku !== undefined) {
      updateData.sku = data.sku ? String(data.sku).trim() : null;
    }

    if (data.description !== undefined) {
      updateData.description = data.description ? String(data.description).trim() : null;
    }

    if (updateData.sku) {
      const existingProductBySku = await prisma.product.findUnique({
        where: { sku: updateData.sku as string },
        select: { id: true }
      });

      if (existingProductBySku && existingProductBySku.id !== id) {
        throw new Error('Ya está en uso este SKU en otro producto');
      }
    }

    if ('isSynced' in updateData) {
      delete updateData.isSynced;
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      select: {
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
      }
    });

    return updatedProduct;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new Error('Ya está en uso este SKU en otro producto');
      }
      if (error.code === 'P2025') {
        throw new Error('Product not found');
      }
      if (error.code === 'P2022') {
        console.error('❌ [ProductService] Error P2022 al actualizar producto');
        throw new Error('Error de esquema de base de datos. Ejecuta `npx prisma generate`.');
      }
    }

    if (error instanceof Error) {
      throw error;
    }

    console.error('❌ [ProductService] Error al actualizar producto:', error);
    throw error;
  }
};

// ==================== DELETE OPERATIONS ====================

/**
 * Elimina un producto
 * 
 * @param id - ID del producto
 * @param tenantId - ID del tenant
 * @returns ID del producto eliminado
 */
export const deleteProduct = async (
  id: string,
  tenantId: string
): Promise<{ id: string }> => {
  try {
    const existingProduct = await prisma.product.findUnique({
      where: { id },
      select: { id: true, tenantId: true }
    });

    if (!existingProduct || existingProduct.tenantId !== tenantId) {
      throw new Error('Product not found');
    }

    await prisma.product.delete({
      where: { id }
    });

    return { id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2025') {
        throw new Error('Product not found');
      }
      if (error.code === 'P2022') {
        console.error('❌ [ProductService] Error P2022 al eliminar producto');
        throw new Error('Error de esquema de base de datos. Ejecuta `npx prisma generate`.');
      }
    }

    console.error('❌ [ProductService] Error al eliminar producto:', error);
    throw error;
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Actualiza el stock de un producto
 * 
 * @param id - ID del producto
 * @param stock - Nuevo valor de stock
 * @param tenantId - ID del tenant
 * @returns Producto actualizado
 */
export const updateProductStock = async (
  id: string,
  stock: number,
  tenantId: string
) => {
  return updateProduct(id, { stock }, tenantId);
};

/**
 * Obtiene productos con stock bajo
 * 
 * @param tenantId - ID del tenant
 * @param threshold - Umbral de stock bajo (default: 10)
 * @returns Array de productos con stock bajo
 */
export const getLowStockProducts = async (
  tenantId: string,
  threshold: number = 10
) => {
  return getAllProducts(tenantId, {
    onlyInStock: false,
    minStock: 0,
    includeInactive: false
  }).then(products => 
    products.filter(p => p.stock <= threshold && p.stock > 0)
  );
};

