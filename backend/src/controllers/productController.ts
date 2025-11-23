import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import '../types/express';
import * as ProductService from '../services/productService';

class ProductController {
  static async getAllProducts(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const products = await ProductService.getAllProducts(tenantId);
      res.status(200).json(products);
    } catch (error) {
      ProductController.handleError(res, error);
    }
  }

  static async getProductById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const product = await ProductService.getProductById(id, tenantId);
      if (!product) {
        res.status(404).json({ message: 'Product not found' });
        return;
      }
      res.status(200).json(product);
    } catch (error) {
      ProductController.handleError(res, error);
    }
  }

  static async createProduct(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { name, sku, description, price, cost, stock, isActive } = req.body;

      // Validar campos obligatorios
      if (!name) {
        res.status(400).json({ message: 'El nombre del producto es requerido' });
        return;
      }

      if (price === undefined || price === null) {
        res.status(400).json({ message: 'El precio del producto es requerido' });
        return;
      }

      if (cost === undefined || cost === null) {
        res.status(400).json({ message: 'El costo del producto es requerido' });
        return;
      }

      const productData: ProductService.CreateProductInput = {
        name,
        sku: sku || null,
        description: description || null,
        price: Number(price),
        cost: Number(cost),
        stock: stock !== undefined ? Number(stock) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      };

      const product = await ProductService.createProduct(productData, tenantId);
      res.status(201).json(product);
    } catch (error) {
      // Manejo específico de errores de Prisma en createProduct
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Violación de constraint único (duplicado)
          res.status(400).json({
            message: 'Ya existe un producto con este SKU',
            code: error.code
          });
          return;
        }
        // Otros errores de Prisma
        res.status(400).json({
          message: 'Error de validación en la base de datos',
          code: error.code
        });
        return;
      }
      // Manejo de errores del servicio
      if (error instanceof Error) {
        if (error.message.includes('Ya existe') || error.message.includes('SKU')) {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message.includes('requerido') || error.message.includes('required')) {
          res.status(400).json({ message: error.message });
          return;
        }
      }
      // Cualquier otro error
      ProductController.handleError(res, error);
    }
  }

  static async updateProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { name, sku, description, price, cost, stock, isActive } = req.body;

      const updateData: any = {};

      if (name !== undefined) updateData.name = name;
      if (sku !== undefined) updateData.sku = sku || null;
      if (description !== undefined) updateData.description = description || null;
      if (price !== undefined) updateData.price = Number(price);
      if (cost !== undefined) updateData.cost = Number(cost);
      if (stock !== undefined) updateData.stock = Number(stock);
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);

      const product = await ProductService.updateProduct(id, updateData, tenantId);
      res.status(200).json(product);
    } catch (error) {
      // Manejo de errores del servicio
      if (error instanceof Error) {
        if (error.message.includes('Ya existe') || error.message.includes('SKU')) {
          res.status(400).json({ message: error.message });
          return;
        }
      }
      ProductController.handleError(res, error);
    }
  }

  static async deleteProduct(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      await ProductService.deleteProduct(id, tenantId);
      res.status(204).send();
    } catch (error) {
      ProductController.handleError(res, error);
    }
  }

  private static handleError(res: Response, error: unknown) {
    // Manejo de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          // Violación de constraint único
          res.status(400).json({
            message: 'Ya existe un producto con estos datos únicos',
            code: error.code
          });
          return;
        case 'P2003':
          // Violación de foreign key
          res.status(400).json({
            message: 'Referencia inválida a otra entidad',
            code: error.code
          });
          return;
        case 'P2022':
          // Columna inexistente en la base de datos
          console.error('❌ [ProductController] Error P2022: Columna inexistente');
          console.error('💡 [ProductController] Solución: Detén el servidor y ejecuta `npx prisma generate`');
          res.status(500).json({
            message: 'Error de esquema de base de datos. El cliente de Prisma está desactualizado. Regenera el cliente con `npx prisma generate`.',
            code: error.code,
            error: 'P2022 - Columna inexistente'
          });
          return;
        case 'P2025':
          // Registro no encontrado
          res.status(404).json({
            message: 'Producto no encontrado',
            code: error.code
          });
          return;
        default:
          res.status(400).json({
            message: 'Error de validación en la base de datos',
            code: error.code
          });
          return;
      }
    }

    // Manejo de errores de validación del servicio
    if (error instanceof Error) {
      // Error específico de esquema de base de datos
      if (error.message.includes('esquema de base de datos') || error.message.includes('Regenera el cliente')) {
        console.error('❌ [ProductController] Error de esquema detectado:', error.message);
        res.status(500).json({
          message: error.message || 'Error de esquema de base de datos. Regenera el cliente de Prisma.',
          error: 'SCHEMA_ERROR'
        });
        return;
      }
      
      if (error.message === 'Product not found') {
        res.status(404).json({ message: error.message });
        return;
      }

      // Errores de validación de campos requeridos
      const isValidationError = error.message.includes('requerido') ||
        error.message.includes('required') ||
        error.message.includes('invalid');

      if (isValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    // Error genérico del servidor
    console.error('❌ [ProductController] Error inesperado:', error);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

export default ProductController;


