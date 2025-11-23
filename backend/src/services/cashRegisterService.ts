import prisma from '../db';
import { TIMEZONE_COLOMBIA } from '../config/constants';

/**
 * Calcula las ventas desde el último cierre hasta ahora
 */
const calculateSalesSinceLastCloseout = async (
  tenantId: string,
  cashRegisterId: number,
  lastCloseoutDate: Date | null
): Promise<number> => {
  try {
    // Verificar que el modelo Invoice esté disponible
    if (!prisma.invoice) {
      console.warn('Modelo Invoice no disponible, retornando 0');
      return 0;
    }

    const whereClause: any = {
      tenantId: tenantId,
      status: {
        in: ['ISSUED', 'PAID'] // Solo ventas reales (emitidas o pagadas)
      }
      // Nota: Incluir todas las ventas del turno, no solo las de efectivo
      // El cierre de caja debe reflejar todas las ventas realizadas durante el turno
      // paymentMethod: 'CASH' // Removido para incluir todas las ventas
    };

    // Si hay un cierre anterior, calcular desde esa fecha
    // Si no hay cierre anterior, incluir todas las facturas del tenant con status ISSUED o PAID
    if (lastCloseoutDate) {
      whereClause.issueDate = {
        gte: lastCloseoutDate
      };
      console.log(`[calculateSalesSinceLastCloseout] Calculando ventas desde último cierre: ${lastCloseoutDate.toISOString()}`);
    } else {
      console.log(`[calculateSalesSinceLastCloseout] No hay cierre anterior, incluyendo todas las ventas del tenant`);
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      select: {
        total: true,
        issueDate: true,
        status: true,
        number: true
      }
    });

    console.log(`[calculateSalesSinceLastCloseout] Encontradas ${invoices.length} facturas con status ISSUED o PAID`);

    // Sumar todas las ventas (retornar 0 si no hay facturas)
    const salesTotal = invoices.reduce(
      (sum, invoice) => {
        const total = Number(invoice.total);
        const validTotal = isNaN(total) ? 0 : total;
        console.log(`[calculateSalesSinceLastCloseout] Factura ${invoice.number}: ${invoice.issueDate?.toISOString()}, Status: ${invoice.status}, Total: ${validTotal}`);
        return sum + validTotal;
      },
      0
    );

    console.log(`[calculateSalesSinceLastCloseout] Total de ventas del turno calculado: ${salesTotal}`);
    return salesTotal;
  } catch (error: any) {
    // Si es un error de tabla no encontrada, retornar 0 en lugar de lanzar
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    if (
      errorCode === 'P2001' || 
      errorCode === '42P01' || 
      errorCode === 'P1001' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('does not exist in the current database') ||
      errorMessage.includes('(not available)')
    ) {
      console.warn('Tabla Invoice no disponible al calcular ventas:', errorMessage);
      return 0;
    }
    
    console.error('Error al calcular ventas desde último cierre:', error);
    // Si es otro tipo de error, retornar 0 para que el cierre pueda continuar
    // En lugar de lanzar el error, registrarlo y continuar
    return 0;
  }
};

/**
 * Cierra un turno de caja
 */
export const closeDayShift = async (
  tenantId: string,
  cashRegisterId: number,
  userId: string,
  finalBalance: number,
  startingBalance?: number // Saldo inicial opcional. Si no se proporciona, se calcula automáticamente
): Promise<{
  id: number;
  closingTime: Date;
  salesTotal: number;
  startingBalance: number;
  finalBalance: number;
}> => {
  try {
    // Verificar si los modelos están disponibles
    if (!prisma.cashRegister || !prisma.shiftCloseout) {
      throw new Error('Los modelos de cierre de caja no están disponibles. Ejecuta: npx prisma generate');
    }

    // Obtener o crear la caja registradora si no existe
    let cashRegister = await prisma.cashRegister.findFirst({
      where: {
        id: cashRegisterId,
        tenantId: tenantId
      }
    });

    // Si no existe, crearla
    if (!cashRegister) {
      cashRegister = await prisma.cashRegister.create({
        data: {
          tenantId: tenantId,
          name: `Caja ${cashRegisterId}`,
          currentBalance: 0,
          isActive: true
        }
      });
    }

    // Si existe pero está inactiva, activarla
    if (!cashRegister.isActive) {
      cashRegister = await prisma.cashRegister.update({
        where: {
          id: cashRegisterId
        },
        data: {
          isActive: true
        }
      });
    }

    // Obtener el último cierre de esta caja
    const lastCloseout = await prisma.shiftCloseout.findFirst({
      where: {
        tenantId: tenantId,
        cashRegisterId: cashRegisterId
      },
      orderBy: {
        closingTime: 'desc'
      }
    });

    // El saldo inicial se puede proporcionar explícitamente o calcularse automáticamente
    // Si se proporciona startingBalance, usarlo; de lo contrario, calcularlo automáticamente
    let calculatedStartingBalance: number;
    
    if (startingBalance !== undefined && startingBalance !== null) {
      // Usar el saldo inicial proporcionado por el usuario
      calculatedStartingBalance = Number(startingBalance);
    } else {
      // Calcular automáticamente: el saldo final del último cierre, o el saldo actual si no hay cierre previo
      calculatedStartingBalance = lastCloseout
        ? Number(lastCloseout.finalBalance)
        : Number(cashRegister.currentBalance);
    }

    // Calcular ventas desde el último cierre
    const salesTotal = await calculateSalesSinceLastCloseout(
      tenantId,
      cashRegisterId,
      lastCloseout?.closingTime || null
    );

    // Crear el registro de cierre
    const shiftCloseout = await prisma.shiftCloseout.create({
      data: {
        tenantId: tenantId,
        cashRegisterId: cashRegisterId,
        closingTime: new Date(),
        startingBalance: calculatedStartingBalance,
        finalBalance: finalBalance,
        salesTotal: salesTotal,
        closedByUserId: userId
      },
      include: {
        closedBy: {
          select: {
            fullName: true
          }
        },
        cashRegister: {
          select: {
            name: true
          }
        }
      }
    });

    // Actualizar el saldo de la caja registradora
    // Resetear a 0 o al saldo inicial del nuevo turno
    await prisma.cashRegister.update({
      where: {
        id: cashRegisterId
      },
      data: {
        currentBalance: 0 // O el saldo inicial deseado para el nuevo turno
      }
    });

    return {
      id: shiftCloseout.id,
      closingTime: shiftCloseout.closingTime,
      salesTotal: Number(shiftCloseout.salesTotal),
      startingBalance: Number(shiftCloseout.startingBalance), // Retornar el saldo inicial usado (calculado o proporcionado)
      finalBalance: Number(shiftCloseout.finalBalance)
    };
  } catch (error: any) {
    // Manejar errores específicos de Prisma
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    // Si es un error de tabla no encontrada (migración pendiente)
    if (
      errorCode === 'P2001' || 
      errorCode === '42P01' || 
      errorCode === 'P1001' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('does not exist in the current database') ||
      errorMessage.includes('(not available)')
    ) {
      const detailedError = new Error('Las tablas de cierre de caja no están disponibles. Por favor, ejecuta la migración de Prisma: npx prisma migrate dev');
      console.error('Error al cerrar turno de caja (tabla no existe):', error);
      throw detailedError;
    }
    
    console.error('Error al cerrar turno de caja:', error);
    // Lanzar el error original para que el controlador pueda manejarlo
    throw error;
  }
};

/**
 * Obtiene el último cierre de caja de un tenant
 * Retorna null si no hay cierres o si hay un error (para no bloquear el dashboard)
 */
export const getLastShiftCloseout = async (tenantId: string) => {
  try {
    // Verificar si el modelo shiftCloseout existe en el cliente de Prisma
    // Si no existe, significa que no se ha regenerado el cliente después de agregar el modelo
    if (!prisma.shiftCloseout) {
      console.warn('El modelo ShiftCloseout no está disponible. Ejecuta: npx prisma generate');
      return null;
    }

    const lastCloseout = await prisma.shiftCloseout.findFirst({
      where: {
        tenantId: tenantId
      },
      orderBy: {
        closingTime: 'desc'
      },
      include: {
        closedBy: {
          select: {
            fullName: true
          }
        },
        cashRegister: {
          select: {
            name: true
          }
        }
      }
    });

    if (!lastCloseout) {
      return null;
    }

    return {
      id: lastCloseout.id,
      closingTime: lastCloseout.closingTime,
      cashRegisterName: lastCloseout.cashRegister.name,
      startingBalance: Number(lastCloseout.startingBalance),
      finalBalance: Number(lastCloseout.finalBalance),
      salesTotal: Number(lastCloseout.salesTotal),
      closedBy: lastCloseout.closedBy.fullName
    };
  } catch (error: any) {
    // Si es un error de tabla no encontrada (migración pendiente), retornar null en lugar de lanzar error
    const errorMessage = error?.message || '';
    const errorCode = error?.code || '';
    
    if (
      errorCode === 'P2001' || 
      errorCode === '42P01' || 
      errorCode === 'P1001' ||
      errorMessage.includes('does not exist') ||
      errorMessage.includes('does not exist in the current database') ||
      errorMessage.includes('(not available)')
    ) {
      console.warn('Tablas de cierre de caja aún no existen. Ejecuta la migración de Prisma.');
      return null;
    }
    console.error('Error al obtener último cierre de caja:', error);
    // Retornar null en lugar de lanzar error para no bloquear el dashboard
    return null;
  }
};

