import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import '../types/express';
import * as InvoiceService from '../services/invoiceService';

class InvoiceController {
  static async getAllInvoices(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const invoices = await InvoiceService.getAllInvoices(tenantId);
      res.status(200).json(invoices);
    } catch (error) {
      InvoiceController.handleError(res, error);
    }
  }

  static async getInvoiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const invoice = await InvoiceService.getInvoiceById(id, tenantId);
      if (!invoice) {
        res.status(404).json({ message: 'Invoice not found' });
        return;
      }
      res.status(200).json(invoice);
    } catch (error) {
      InvoiceController.handleError(res, error);
    }
  }

  static async createInvoice(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { clientId, number, items, issueDate, status, paymentMethod, currency, isCreditSale, notes, applyIva } = req.body;
      
      // Validar que el número de factura esté presente
      if (!number) {
        res.status(400).json({ message: 'El número de factura es requerido' });
        return;
      }

      // Validar que hay items
      if (!items || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ message: 'La factura debe tener al menos un item con producto' });
        return;
      }

      const invoiceData = {
        clientId: clientId || null,
        number: number,
        items: items,
        issueDate: issueDate ? new Date(issueDate) : new Date(),
        status: status || ('DRAFT' as const),
        paymentMethod: paymentMethod || ('CASH' as const),
        currency: currency || 'COP',
        isCreditSale: isCreditSale || false,
        notes: notes || null,
        applyIva: applyIva === true // Aplicar IVA solo si está explícitamente activo
      };

      const result = await InvoiceService.createInvoice(invoiceData, tenantId);
      
      // Responder con la factura y los warnings
      res.status(201).json({
        invoice: result.invoice,
        warnings: result.warnings
      });
    } catch (error) {
      // Manejo específico de errores de Prisma en createInvoice
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Violación de constraint único (duplicado)
          res.status(400).json({
            message: 'Ya existe una factura con este número',
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
        if (
          error.message.includes('Stock insuficiente') ||
          error.message.includes('no encontrado') ||
          error.message.includes('no pertenece')
        ) {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message.includes('Ya existe una factura') || error.message.includes('número')) {
          res.status(400).json({ message: error.message });
          return;
        }
        if (error.message.includes('requerido') || error.message.includes('required') || error.message.includes('debe tener')) {
          res.status(400).json({ message: error.message });
          return;
        }
      }
      // Cualquier otro error
      InvoiceController.handleError(res, error);
    }
  }

  static async updateInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const invoice = await InvoiceService.updateInvoice(id, req.body, tenantId);
      res.status(200).json(invoice);
    } catch (error) {
      InvoiceController.handleError(res, error);
    }
  }

  static async deleteInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      await InvoiceService.deleteInvoice(id, tenantId);
      res.status(204).send();
    } catch (error) {
      InvoiceController.handleError(res, error);
    }
  }

  private static handleError(res: Response, error: unknown) {
    // Manejo de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          // Violación de constraint único
          res.status(400).json({
            message: 'Ya existe una factura con estos datos únicos',
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
        case 'P2025':
          // Registro no encontrado
          res.status(404).json({
            message: 'Factura no encontrada',
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
    if (error instanceof Error && error.message === 'Invoice not found') {
      res.status(404).json({ message: error.message });
      return;
    }

    // Errores de validación de campos requeridos
    if (error instanceof Error && error.message) {
      const isValidationError = error.message.includes('required') ||
        error.message.includes('is required') ||
        error.message.includes('invalid');
      
      if (isValidationError) {
        res.status(400).json({ message: error.message });
        return;
      }
    }

    // Error genérico del servidor
    console.error('Unexpected error:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export default InvoiceController;

