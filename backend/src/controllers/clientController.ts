import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import '../types/express';
import * as ClientService from '../services/clientService';

class ClientController {
  static async getAllClients(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const clients = await ClientService.getAllClients(tenantId);
      res.status(200).json(clients);
    } catch (error) {
      ClientController.handleError(res, error);
    }
  }

  static async getClientById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const client = await ClientService.getClientById(id, tenantId);
      if (!client) {
        res.status(404).json({ message: 'Client not found' });
        return;
      }
      res.status(200).json(client);
    } catch (error) {
      ClientController.handleError(res, error);
    }
  }

  static async createClient(req: Request, res: Response) {
    try {
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const { name, businessName, email, phone, address, documentType, identification, nit, dv, hasCredit, creditLimit, currentDebt, isActive } = req.body;
      
      // Mapear 'name' a 'businessName' si viene del frontend
      const clientData = {
        businessName: businessName || name,
        documentType: documentType || req.body.documentType,
        identification: identification || req.body.identification,
        email: email || req.body.email || null,
        phone: phone || req.body.phone || null,
        address: address || req.body.address || null,
        nit: nit || req.body.nit || null,
        dv: dv || req.body.dv || null,
        hasCredit: hasCredit ?? req.body.hasCredit ?? false,
        creditLimit: creditLimit || req.body.creditLimit || '0',
        currentDebt: currentDebt || req.body.currentDebt || '0',
        isActive: isActive ?? req.body.isActive ?? true,
      };

      const client = await ClientService.createClient(clientData, tenantId);
      res.status(201).json(client);
    } catch (error) {
      // Manejo específico de errores de Prisma en createClient
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Violación de constraint único (duplicado)
          res.status(400).json({
            message: 'Ya existe un cliente con estos datos únicos',
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
      // Cualquier otro error
      ClientController.handleError(res, error);
    }
  }

  static async updateClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      const client = await ClientService.updateClient(id, req.body, tenantId);
      res.status(200).json(client);
    } catch (error) {
      ClientController.handleError(res, error);
    }
  }

  static async deleteClient(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // Extraer tenantId del usuario autenticado
      const tenantId = req.user?.tenantId;
      if (!tenantId) {
        res.status(401).json({ message: 'Usuario no autenticado' });
        return;
      }

      await ClientService.deleteClient(id, tenantId);
      res.status(204).send();
    } catch (error) {
      ClientController.handleError(res, error);
    }
  }

  private static handleError(res: Response, error: unknown) {
    // Manejo de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const errorCode = error.code as string;
      switch (errorCode) {
        case 'P2002':
          // Violación de constraint único
          res.status(400).json({
            message: 'Ya existe un cliente con estos datos únicos',
            code: errorCode
          });
          return;
        case 'P2003':
          // Violación de foreign key
          res.status(400).json({
            message: 'Referencia inválida a otra entidad',
            code: errorCode
          });
          return;
        case 'P2025':
          // Registro no encontrado
          res.status(404).json({
            message: 'Cliente no encontrado',
            code: errorCode
          });
          return;
        default:
          res.status(400).json({
            message: 'Error de validación en la base de datos',
            code: errorCode
          });
          return;
      }
    }

    // Manejo de errores de validación del servicio
    if (error instanceof Error && error.message === 'Client not found') {
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

export default ClientController;

