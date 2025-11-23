import prisma from '../db';
import { TIMEZONE_COLOMBIA } from '../config/constants';
import { getLastShiftCloseout as getLastShiftCloseoutService } from './cashRegisterService';

/**
 * Obtiene los componentes de fecha (año, mes, día) en zona horaria de Colombia
 */
const getColombiaDateParts = (date: Date): { year: number; month: number; day: number; dayOfWeek: number } => {
  // Crear formatter para obtener componentes en zona horaria de Colombia
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE_COLOMBIA,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    weekday: 'short'
  });

  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1');
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1');
  
  // Convertir nombre del día a número (0=domingo, 1=lunes, etc.)
  const dayName = parts.find(p => p.type === 'weekday')?.value || '';
  const dayNames: { [key: string]: number } = {
    'Sun': 0, 'Mon': 1, 'Tue': 2, 'Wed': 3, 'Thu': 4, 'Fri': 5, 'Sat': 6
  };
  const dayOfWeek = dayNames[dayName] ?? 0;

  return { year, month, day, dayOfWeek };
};

/**
 * Obtiene el nombre del día en español (zona horaria de Colombia)
 */
const getColombiaDayName = (date: Date): string => {
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    timeZone: TIMEZONE_COLOMBIA
  });
};

/**
 * Obtiene la fecha de inicio del día en Colombia (00:00:00) como objeto Date UTC
 */
const getColombiaDayStartUTC = (year: number, month: number, day: number): Date => {
  // Crear una cadena de fecha en formato ISO para Colombia
  // Colombia está en UTC-5, así que 00:00:00 en Colombia = 05:00:00 UTC del mismo día
  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T05:00:00.000Z`;
  return new Date(dateStr);
};

/**
 * Calcula el lunes de la semana para una fecha en zona horaria de Colombia
 */
const getWeekStartInColombia = (date: Date): { year: number; month: number; day: number } => {
  const parts = getColombiaDateParts(date);
  const { year, month, day, dayOfWeek } = parts;
  
  // Calcular días para retroceder hasta el lunes (0=domingo, 1=lunes)
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Crear fecha en Colombia y restar días
  const dateInColombia = getColombiaDayStartUTC(year, month, day);
  dateInColombia.setUTCDate(dateInColombia.getUTCDate() - daysToMonday);
  
  // Obtener componentes de la fecha del lunes
  const mondayParts = getColombiaDateParts(dateInColombia);
  
  return { year: mondayParts.year, month: mondayParts.month, day: mondayParts.day };
};

/**
 * Resumen del dashboard con métricas clave de la empresa
 */
export interface DashboardSummary {
  totalClients: number;
  totalProducts: number;
  inventoryValue: number; // Valor del inventario (stock * cost)
  lowStockProducts: number; // Productos con stock <= 5
  totalInvoices: number;
}

/**
 * Ingresos por mes para gráficas
 */
export interface RevenueByMonth {
  month: string;
  revenue: number;
}

/**
 * Ingresos diarios (últimos 7 días)
 */
export interface DailyRevenue {
  date: string;
  day: string;
  revenue: number;
}

/**
 * Ingresos semanales (últimas 4 semanas)
 */
export interface WeeklyRevenue {
  week: string;
  revenue: number;
}

/**
 * Obtiene un resumen de métricas clave del dashboard para un tenant
 * Retorna valores por defecto si hay un error
 */
export const getDashboardSummary = async (tenantId: string): Promise<DashboardSummary> => {
  try {
    // Total de clientes
    const totalClients = await prisma.client.count({
      where: {
        tenantId: tenantId
      }
    }).catch(() => 0);

    // Total de productos
    const totalProducts = await prisma.product.count({
      where: {
        tenantId: tenantId,
        isActive: true
      }
    }).catch(() => 0);

    // Obtener productos para calcular valor de inventario y productos bajos en stock
    const products = await prisma.product.findMany({
      where: {
        tenantId: tenantId,
        isActive: true
      },
      select: {
        stock: true,
        cost: true
      }
    }).catch(() => []);

    // Calcular valor del inventario (suma de stock * cost)
    const inventoryValue = (products || []).reduce(
      (sum, product) => {
        const stock = product?.stock || 0;
        const cost = Number(product?.cost) || 0;
        return sum + stock * cost;
      },
      0
    );

    // Contar productos con stock <= 5
    const lowStockProducts = (products || []).filter(
      (product) => (product?.stock || 0) <= 5
    ).length;

    // Total de facturas
    const totalInvoices = await prisma.invoice.count({
      where: {
        tenantId: tenantId
      }
    }).catch(() => 0);

    return {
      totalClients: totalClients || 0,
      totalProducts: totalProducts || 0,
      inventoryValue: inventoryValue || 0,
      lowStockProducts: lowStockProducts || 0,
      totalInvoices: totalInvoices || 0
    };
  } catch (error) {
    console.error('Error al obtener resumen del dashboard:', error);
    // Retornar valores por defecto en lugar de lanzar error para no bloquear el dashboard
    return {
      totalClients: 0,
      totalProducts: 0,
      inventoryValue: 0,
      lowStockProducts: 0,
      totalInvoices: 0
    };
  }
};

/**
 * Obtiene ingresos por mes para gráficas basado en ventas reales
 * Incluye facturas ISSUED (ventas del POS) y PAID para mostrar todas las ventas
 * Retorna array vacío si no hay ventas o si hay un error
 */
export const getRevenueByMonth = async (tenantId: string): Promise<RevenueByMonth[]> => {
  try {
    // Obtener facturas pagadas del último año
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // Incluir facturas ISSUED y PAID para mostrar todas las ventas reales
    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: tenantId,
        status: {
          in: ['ISSUED', 'PAID'] // Incluir facturas emitidas (ventas del POS) y pagadas
        },
        issueDate: {
          gte: oneYearAgo
        }
      },
      select: {
        issueDate: true,
        total: true
      }
    });

    // Si no hay facturas, retornar array vacío
    if (!invoices || invoices.length === 0) {
      return [];
    }

    // Agrupar por mes
    const monthlyRevenue: { [key: string]: { month: string; revenue: number } } = {};

    invoices.forEach((invoice) => {
      // Validar que invoice tenga las propiedades necesarias
      if (!invoice || !invoice.issueDate || invoice.total === undefined) {
        return;
      }

      try {
        // Obtener componentes de fecha en zona horaria de Colombia
        const invoiceDate = new Date(invoice.issueDate);
        const { year, month } = getColombiaDateParts(invoiceDate);
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        
        // Obtener nombre del mes en español usando formatter con zona horaria
        const monthName = invoiceDate.toLocaleDateString('es-CO', { 
          month: 'long', 
          year: 'numeric',
          timeZone: TIMEZONE_COLOMBIA
        });
        
        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = {
            month: monthName,
            revenue: 0
          };
        }
        monthlyRevenue[monthKey].revenue += Number(invoice.total) || 0;
      } catch (err) {
        // Ignorar facturas con fechas inválidas
        console.warn('Error al procesar factura:', err);
      }
    });

    // Convertir a array y ordenar por mes
    const revenueByMonth: RevenueByMonth[] = Object.entries(monthlyRevenue)
      .sort((a, b) => {
        // Ordenar por clave (YYYY-MM)
        return a[0].localeCompare(b[0]);
      })
      .map(([, item]) => ({
        month: item.month,
        revenue: item.revenue
      }));

    // Retornar datos reales de ventas
    // Si no hay ventas, el array estará vacío y la gráfica mostrará "No hay datos disponibles"
    return revenueByMonth || [];
  } catch (error) {
    console.error('Error al obtener ingresos por mes:', error);
    // Retornar array vacío en lugar de lanzar error para no bloquear el dashboard
    return [];
  }
};

/**
 * Obtiene ingresos diarios (últimos 7 días) y semanales (últimas 4 semanas)
 * Retorna arrays vacíos si no hay ventas o si hay un error
 */
export const getDailyAndWeeklyRevenue = async (tenantId: string): Promise<{
  daily: DailyRevenue[];
  weekly: WeeklyRevenue[];
}> => {
  try {
    // Obtener la fecha actual y calcular componentes en zona horaria de Colombia
    const now = new Date();
    const todayColombia = getColombiaDateParts(now);
    
    // Calcular fecha de inicio (hace 7 días desde hoy en Colombia)
    const sevenDaysAgoDate = getColombiaDayStartUTC(todayColombia.year, todayColombia.month, todayColombia.day);
    sevenDaysAgoDate.setUTCDate(sevenDaysAgoDate.getUTCDate() - 7);
    const sevenDaysAgo = sevenDaysAgoDate;
    
    // Calcular fecha de inicio (hace 4 semanas desde hoy en Colombia)
    const fourWeeksAgoDate = getColombiaDayStartUTC(todayColombia.year, todayColombia.month, todayColombia.day);
    fourWeeksAgoDate.setUTCDate(fourWeeksAgoDate.getUTCDate() - 28);
    const fourWeeksAgo = fourWeeksAgoDate;

    // Obtener facturas de los últimos 7 días para datos diarios (ISSUED y PAID = ventas reales)
    const dailyInvoices = await prisma.invoice.findMany({
      where: {
        tenantId: tenantId,
        status: {
          in: ['ISSUED', 'PAID'] // Incluir facturas emitidas (ventas del POS) y pagadas
        },
        issueDate: {
          gte: sevenDaysAgo
        }
      },
      select: {
        issueDate: true,
        total: true
      }
    }).catch(() => []); // Retornar array vacío si hay error

    // Obtener facturas de las últimas 4 semanas para datos semanales (ISSUED y PAID = ventas reales)
    const weeklyInvoices = await prisma.invoice.findMany({
      where: {
        tenantId: tenantId,
        status: {
          in: ['ISSUED', 'PAID'] // Incluir facturas emitidas (ventas del POS) y pagadas
        },
        issueDate: {
          gte: fourWeeksAgo
        }
      },
      select: {
        issueDate: true,
        total: true
      }
    }).catch(() => []); // Retornar array vacío si hay error

    // Agrupar por día (últimos 7 días)
    const dailyRevenueMap: { [key: string]: DailyRevenue } = {};
    
    // Inicializar los últimos 7 días con 0 (usando zona horaria de Colombia)
    // Empezar desde el día actual y retroceder 6 días
    const todayStart = getColombiaDayStartUTC(todayColombia.year, todayColombia.month, todayColombia.day);
    
    for (let i = 6; i >= 0; i--) {
      // Calcular fecha restando días desde hoy en Colombia
      const targetDate = new Date(todayStart);
      targetDate.setUTCDate(targetDate.getUTCDate() - i);
      
      // Obtener componentes de fecha en zona horaria de Colombia
      const targetParts = getColombiaDateParts(targetDate);
      const { year, month, day } = targetParts;
      
      const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Obtener el nombre del día en español usando zona horaria de Colombia
      const dayName = getColombiaDayName(targetDate);
      
      dailyRevenueMap[dateKey] = {
        date: dateKey,
        day: dayName,
        revenue: 0
      };
    }

    // Agregar ingresos reales (agrupados por día en zona horaria de Colombia)
    if (dailyInvoices && Array.isArray(dailyInvoices)) {
      dailyInvoices.forEach((invoice) => {
        // Validar que invoice tenga las propiedades necesarias
        if (!invoice || !invoice.issueDate || invoice.total === undefined) {
          return;
        }

        try {
          // Obtener componentes de fecha en zona horaria de Colombia
          const invoiceDate = new Date(invoice.issueDate);
          const { year, month, day } = getColombiaDateParts(invoiceDate);
          const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          
          if (dailyRevenueMap[dateKey]) {
            dailyRevenueMap[dateKey].revenue += Number(invoice.total) || 0;
          }
        } catch (err) {
          // Ignorar facturas con fechas inválidas
          console.warn('Error al procesar factura diaria:', err);
        }
      });
    }

    const dailyRevenue: DailyRevenue[] = Object.values(dailyRevenueMap).sort((a, b) => 
      a.date.localeCompare(b.date)
    );

    // Agrupar por semana (últimas 4 semanas)
    const weeklyRevenueMap: { [key: string]: WeeklyRevenue } = {};
    
    if (weeklyInvoices && Array.isArray(weeklyInvoices)) {
      weeklyInvoices.forEach((invoice) => {
        // Validar que invoice tenga las propiedades necesarias
        if (!invoice || !invoice.issueDate || invoice.total === undefined) {
          return;
        }

        try {
          // Obtener el lunes de la semana en zona horaria de Colombia
          const invoiceDate = new Date(invoice.issueDate);
          const weekStart = getWeekStartInColombia(invoiceDate);
          
          const weekKey = `${weekStart.year}-${String(weekStart.month).padStart(2, '0')}-${String(weekStart.day).padStart(2, '0')}`;
          const weekLabel = `Sem ${weekStart.day}/${weekStart.month}`;
          
          if (!weeklyRevenueMap[weekKey]) {
            weeklyRevenueMap[weekKey] = {
              week: weekLabel,
              revenue: 0
            };
          }
          
          weeklyRevenueMap[weekKey].revenue += Number(invoice.total) || 0;
        } catch (err) {
          // Ignorar facturas con fechas inválidas
          console.warn('Error al procesar factura semanal:', err);
        }
      });
    }

    // Obtener todas las semanas de los últimos 28 días y ordenarlas
    const weeklyDates: Date[] = [];
    for (let i = 3; i >= 0; i--) {
      const weekDate = getColombiaDayStartUTC(todayColombia.year, todayColombia.month, todayColombia.day);
      weekDate.setUTCDate(weekDate.getUTCDate() - (i * 7));
      const weekStart = getWeekStartInColombia(weekDate);
      const weekStartDate = getColombiaDayStartUTC(weekStart.year, weekStart.month, weekStart.day);
      weeklyDates.push(weekStartDate);
    }

    const weeklyRevenue: WeeklyRevenue[] = weeklyDates
      .map(weekDate => {
        const weekStart = getWeekStartInColombia(weekDate);
        const weekKey = `${weekStart.year}-${String(weekStart.month).padStart(2, '0')}-${String(weekStart.day).padStart(2, '0')}`;
        const weekLabel = `Sem ${weekStart.day}/${weekStart.month}`;
        
        return {
          week: weekLabel,
          revenue: weeklyRevenueMap[weekKey]?.revenue || 0
        };
      })
      .sort((a, b) => {
        // Ordenar por fecha de semana
        const aDate = a.week.split(' ')[1].split('/');
        const bDate = b.week.split(' ')[1].split('/');
        const aDateObj = new Date(parseInt(aDate[1]), parseInt(aDate[0]) - 1);
        const bDateObj = new Date(parseInt(bDate[1]), parseInt(bDate[0]) - 1);
        return aDateObj.getTime() - bDateObj.getTime();
      });

    return {
      daily: dailyRevenue || [],
      weekly: weeklyRevenue || []
    };
  } catch (error) {
    console.error('Error al obtener ingresos diarios y semanales:', error);
    // Retornar objetos seguros en lugar de lanzar error para no bloquear el dashboard
    return {
      daily: [],
      weekly: []
    };
  }
};

/**
 * Obtiene el último cierre de caja de un tenant
 * Retorna null si no hay cierres o si hay un error (para no bloquear el dashboard)
 */
export const getLastShiftCloseout = async (tenantId: string) => {
  try {
    return await getLastShiftCloseoutService(tenantId);
  } catch (error: any) {
    // Si es un error de tabla no encontrada (migración pendiente), retornar null
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

/**
 * Información de un producto en el top de ventas
 */
export interface TopSellingProduct {
  productId: string;
  productName: string;
  totalQuantity: number; // Cantidad total vendida
  totalRevenue: number; // Ingresos totales (suma de totalAmount)
}

/**
 * Obtiene los 10 productos más vendidos por cantidad y por valor (ingresos)
 * Agrupa por productId, suma las cantidades y calcula el valor total
 * Retorna array vacío si no hay ventas o si hay un error
 */
export const getTopSellingProducts = async (tenantId: string): Promise<TopSellingProduct[]> => {
  try {
    // Obtener todos los items de factura con información del producto y factura
    // Filtrar solo facturas del tenant y facturas emitidas o pagadas (ventas reales)
    const invoiceItems = await prisma.invoiceItem.findMany({
      where: {
        productId: {
          not: null // Solo items con producto asociado
        },
        invoice: {
          tenantId: tenantId,
          status: {
            in: ['ISSUED', 'PAID'] // Solo ventas reales (emitidas o pagadas)
          }
        }
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            tenantId: true
          }
        },
        invoice: {
          select: {
            tenantId: true,
            status: true
          }
        }
      }
    }).catch(() => []); // Retornar array vacío si hay error

    // Si no hay items, retornar array vacío
    if (!invoiceItems || invoiceItems.length === 0) {
      return [];
    }

    // Agrupar por productId y calcular totales
    const productStats: { [productId: string]: TopSellingProduct } = {};

    invoiceItems.forEach((item) => {
      // Validar que el item tenga producto y datos válidos
      if (!item.productId || !item.product) {
        return;
      }

      // Validar que el producto pertenezca al tenant
      if (item.product.tenantId !== tenantId) {
        return;
      }

      const productId = item.productId;
      const quantity = Number(item.quantity) || 0;
      const revenue = Number(item.totalAmount) || 0; // Usar totalAmount que ya incluye impuestos

      // Si el producto no está en el mapa, inicializarlo
      if (!productStats[productId]) {
        productStats[productId] = {
          productId: productId,
          productName: item.product.name || 'Producto sin nombre',
          totalQuantity: 0,
          totalRevenue: 0
        };
      }

      // Sumar cantidad y ingresos
      productStats[productId].totalQuantity += quantity;
      productStats[productId].totalRevenue += revenue;
    });

    // Convertir a array, ordenar por cantidad descendente y limitar a 10
    const topProducts: TopSellingProduct[] = Object.values(productStats)
      .sort((a, b) => {
        // Ordenar primero por cantidad (descendente), luego por ingresos (descendente)
        if (b.totalQuantity !== a.totalQuantity) {
          return b.totalQuantity - a.totalQuantity;
        }
        return b.totalRevenue - a.totalRevenue;
      })
      .slice(0, 10); // Limitar a los top 10

    return topProducts || [];
  } catch (error) {
    console.error('Error al obtener productos más vendidos:', error);
    // Retornar array vacío en lugar de lanzar error para no bloquear el dashboard
    return [];
  }
};

