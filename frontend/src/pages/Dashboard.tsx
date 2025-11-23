import { useEffect, useState, useMemo } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import type { DashboardSummary, DailyAndWeeklyRevenue, ShiftCloseout, TopSellingProduct } from '../services/reportService';
import { getDashboardSummary, getDailyAndWeeklyRevenue, getLastShiftCloseout, getTopSellingProducts } from '../services/reportService';

const Dashboard = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  // Inicializar con objeto vacío para evitar errores de acceso a propiedades
  const [dailyWeeklyRevenue, setDailyWeeklyRevenue] = useState<DailyAndWeeklyRevenue>({ daily: [], weekly: [] });
  const [lastCloseout, setLastCloseout] = useState<ShiftCloseout | null>(null);
  const [topProducts, setTopProducts] = useState<TopSellingProduct[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('daily'); // Modo de visualización

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Hacer las llamadas principales de forma paralela
        const [summaryData, dailyWeeklyData] = await Promise.all([
          getDashboardSummary(),
          getDailyAndWeeklyRevenue()
        ]);

        setSummary(summaryData);
        setDailyWeeklyRevenue(dailyWeeklyData);

        // Intentar obtener el último cierre de forma independiente (no bloquear si falla)
        try {
          const closeoutData = await getLastShiftCloseout();
          // Manejar el resultado con seguridad (puede ser null)
          if (closeoutData) {
            setLastCloseout(closeoutData);
          } else {
            setLastCloseout(null); // No hay cierres registrados
          }
        } catch (err) {
          console.warn('No se pudo cargar el último cierre de caja:', err);
          setLastCloseout(null); // Continuar sin mostrar el cierre
        }

        // Intentar obtener el top 10 de productos de forma independiente (no bloquear si falla)
        try {
          const topProductsData = await getTopSellingProducts();
          setTopProducts(topProductsData || []);
        } catch (err) {
          console.warn('No se pudo cargar el top 10 de productos:', err);
          setTopProducts([]); // Continuar sin mostrar el top 10
        }
      } catch (err: any) {
        // Mensaje de error más específico
        let errorMessage = 'No fue posible cargar los datos del dashboard.';
        
        if (err?.response?.data?.message) {
          errorMessage = err.response.data.message;
        } else if (err?.response?.data?.error) {
          errorMessage = err.response.data.error;
        } else if (err?.message) {
          errorMessage = err.message;
        }
        
        // Mensajes más específicos
        if (errorMessage.includes('migración') || errorMessage.includes('tabla')) {
          errorMessage = 'Las tablas de cierre de caja no están disponibles. Por favor, ejecuta la migración de Prisma en el backend.';
        }
        
        setError(errorMessage);
        console.error('Error al cargar datos del dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  /**
   * Formatea fecha y hora para mostrar el cierre
   */
  const formatCloseoutDateTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const dateStr = date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Bogota'
      });
      const timeStr = date.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'America/Bogota'
      });
      return { date: dateStr, time: timeStr };
    } catch (error) {
      return { date: dateString, time: '' };
    }
  };

  /**
   * Obtiene el nombre del día en español desde una fecha YYYY-MM-DD
   * Retorna el formato corto: 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'
   * Usa la zona horaria de Colombia (America/Bogota) para garantizar precisión
   */
  const getDayShortName = (dateString: string): string => {
    try {
      // Formato YYYY-MM-DD. Crear la fecha en zona horaria de Colombia
      // Usar mediodía en Colombia para evitar problemas de cambio de día
      const dateInColombia = new Date(dateString + 'T12:00:00-05:00');
      
      // Obtener el día de la semana en formato local de Colombia usando toLocaleDateString
      // Esto garantiza que usamos la zona horaria correcta
      const dayName = dateInColombia.toLocaleDateString('es-CO', {
        weekday: 'short',
        timeZone: 'America/Bogota'
      });
      
      // Normalizar el nombre del día
      const dayNameLower = dayName.toLowerCase().replace(/\./g, '').trim();
      
      // Mapeo de nombres posibles a formato estándar corto
      const dayMap: Record<string, string> = {
        'lun': 'lun',
        'lunes': 'lun',
        'mar': 'mar',
        'martes': 'mar',
        'mié': 'mié',
        'mie': 'mié',
        'miércoles': 'mié',
        'miercoles': 'mié',
        'jue': 'jue',
        'jueves': 'jue',
        'vie': 'vie',
        'viernes': 'vie',
        'sáb': 'sáb',
        'sab': 'sáb',
        'sábado': 'sáb',
        'sabado': 'sáb',
        'dom': 'dom',
        'domingo': 'dom'
      };
      
      // Buscar en el mapa o extraer los primeros 3 caracteres
      if (dayMap[dayNameLower]) {
        return dayMap[dayNameLower];
      }
      
      // Fallback: extraer los primeros 3 caracteres
      return dayNameLower.substring(0, 3);
    } catch (error) {
      console.error('Error al obtener día de la semana:', error, dateString);
      // Fallback: usar método simple pero con zona horaria
      try {
        // Crear fecha en zona horaria de Colombia
        const date = new Date(dateString + 'T12:00:00-05:00');
        const dayOfWeek = date.getUTCDay();
        
        // Mapeo: 0=domingo, 1=lunes, ..., 6=sábado
        // Pero queremos retornar en orden Lunes-Domingo para visualización
        // Entonces: 1=lunes→'lun', 2=martes→'mar', ..., 6=sábado→'sáb', 0=domingo→'dom'
        const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        // dayOfWeek ya está en el formato correcto (0-6 de JavaScript)
        return dayNames[dayOfWeek];
      } catch (fallbackError) {
        console.error('Error en fallback:', fallbackError);
        return '';
      }
    }
  };

  /**
   * Obtiene el nombre del día formateado para mostrar (capitalizado, sin punto)
   */
  const getDayNameFromDate = (dateString: string): string => {
    const shortName = getDayShortName(dateString);
    
    // Capitalizar y formatear para mostrar
    const displayNames: Record<string, string> = {
      'lun': 'Lun',
      'mar': 'Mar',
      'mié': 'Mié',
      'jue': 'Jue',
      'vie': 'Vie',
      'sáb': 'Sáb',
      'dom': 'Dom'
    };
    
    return displayNames[shortName] || shortName.charAt(0).toUpperCase() + shortName.slice(1);
  };

  /**
   * Procesa los datos diarios para ordenarlos estrictamente comenzando en Lunes
   * Usa un array de referencia fijo: ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']
   * y reorganiza los datos para que siempre comience en Lunes hasta el día actual
   */
  const processDailyDataOrderedByWeek = () => {
    const dailyData = dailyWeeklyRevenue.daily || [];
    
    if (dailyData.length === 0) {
      return [];
    }

    // Array de referencia fijo: semana comienza en Lunes
    const weekDayOrder: string[] = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
    
    // Tipo para los datos con día de semana
    type DailyDataWithDay = {
      date: string;
      revenue: number;
      dayShort: string;
      day: string;
    };
    
    // Mapear cada item a su día de la semana (formato corto)
    // IMPORTANTE: Usar el campo 'day' que viene del backend (ya calculado en zona horaria de Colombia)
    // El backend envía el día en formato corto (ej: "vie", "jue", etc.)
    const dataWithDay: DailyDataWithDay[] = dailyData.map((item) => {
      // Normalizar el nombre del día que viene del backend
      // El backend usa toLocaleDateString con weekday: 'short' que retorna algo como "vie."
      let dayFromBackend = (item.day || '').toLowerCase().replace(/\./g, '').trim();
      
      // Mapear variaciones posibles al formato corto estándar
      const dayMap: Record<string, string> = {
        'lun': 'lun', 'lunes': 'lun',
        'mar': 'mar', 'martes': 'mar',
        'mié': 'mié', 'mie': 'mié', 'miércoles': 'mié', 'miercoles': 'mié',
        'jue': 'jue', 'jueves': 'jue',
        'vie': 'vie', 'viernes': 'vie',
        'sáb': 'sáb', 'sab': 'sáb', 'sábado': 'sáb', 'sabado': 'sáb',
        'dom': 'dom', 'domingo': 'dom'
      };
      
      const dayShort = dayMap[dayFromBackend] || getDayShortName(item.date);
      
      // Formatear el día para mostrar (capitalizar primera letra)
      let dayDisplay = dayFromBackend || getDayNameFromDate(item.date);
      if (dayDisplay) {
        // Capitalizar y normalizar
        dayDisplay = dayDisplay === 'mie' ? 'Mié' :
                     dayDisplay === 'sab' ? 'Sáb' :
                     dayDisplay.charAt(0).toUpperCase() + dayDisplay.slice(1);
      }
      
      return {
        ...item,
        dayShort, // Día en formato corto para ordenamiento
        day: dayDisplay // Día formateado para mostrar (usa el del backend)
      };
    });

    // Ordenar por fecha primero para obtener la secuencia cronológica
    const sortedByDate = dataWithDay.sort((a, b) => a.date.localeCompare(b.date));

    // Crear un mapa de día -> datos para acceso rápido
    const dayMap = new Map<string, DailyDataWithDay[]>();
    sortedByDate.forEach(item => {
      if (!dayMap.has(item.dayShort)) {
        dayMap.set(item.dayShort, []);
      }
      dayMap.get(item.dayShort)!.push(item);
    });

    // Encontrar el primer lunes en los datos ordenados por fecha
    const firstMondayIndex = sortedByDate.findIndex(item => item.dayShort === 'lun');
    
    // Si hay lunes en los datos, comenzar desde ahí
    if (firstMondayIndex !== -1) {
      // Construir resultado desde el lunes encontrado
      const result: DailyDataWithDay[] = [];
      const remainingDates = new Set(sortedByDate.map(item => item.date));
      
      // Iterar desde el lunes hasta el final de la semana
      let foundMonday = false;
      for (const dayShort of weekDayOrder) {
        const items = dayMap.get(dayShort) || [];
        items.forEach(item => {
          if (remainingDates.has(item.date)) {
            if (dayShort === 'lun') foundMonday = true;
            if (foundMonday || result.length === 0) {
              result.push(item);
              remainingDates.delete(item.date);
            }
          }
        });
      }

      // Agregar cualquier dato restante manteniendo el orden de semana
      sortedByDate.forEach(item => {
        if (remainingDates.has(item.date)) {
          result.push(item);
        }
      });

      return result;
    }

    // Si no hay lunes, reorganizar todos los datos según el orden de semana
    // encontrando el primer día disponible y rotando desde ahí
    const firstDayShort = sortedByDate[0]?.dayShort || '';
    const firstDayIndex = weekDayOrder.indexOf(firstDayShort);
    
    const result: DailyDataWithDay[] = [];
    const remainingDates = new Set(sortedByDate.map(item => item.date));
    
    // Si el primer día no es lunes, rotar el orden
    if (firstDayIndex > 0) {
      // Rotar weekDayOrder para comenzar desde el primer día disponible
      const rotatedOrder = [...weekDayOrder.slice(firstDayIndex), ...weekDayOrder.slice(0, firstDayIndex)];
      
      rotatedOrder.forEach(dayShort => {
        const items = dayMap.get(dayShort) || [];
        items.forEach(item => {
          if (remainingDates.has(item.date)) {
            result.push(item);
            remainingDates.delete(item.date);
          }
        });
      });
    } else {
      // Comenzar desde lunes
      weekDayOrder.forEach(dayShort => {
        const items = dayMap.get(dayShort) || [];
        items.forEach(item => {
          if (remainingDates.has(item.date)) {
            result.push(item);
            remainingDates.delete(item.date);
          }
        });
      });
    }

    return result;
  };

  /**
   * Procesa los datos diarios para asegurar que las etiquetas estén correctamente formateadas
   * y ordenados cronológicamente comenzando en Lunes
   */
  const processedDailyData = processDailyDataOrderedByWeek();

  // Colores para los gráficos (paleta Modern Tech)
  const COLORS = ['#6B46C1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Preparar datos para el gráfico de pastel (distribución de productos)
  const pieData = summary
    ? [
        {
          name: 'Productos Activos',
          value: summary.totalProducts
        },
        {
          name: 'Productos Bajo Stock',
          value: summary.lowStockProducts
        }
      ]
    : [];

  // Datos para el gráfico dinámico (diario o semanal)
  // Para el modo diario, usar los datos procesados con zona horaria de Colombia
  const dynamicChartData = viewMode === 'daily' 
    ? processedDailyData
    : dailyWeeklyRevenue.weekly;

  // Total de ingresos dinámicos
  const totalDynamicRevenue = dynamicChartData.reduce((sum, item) => sum + item.revenue, 0);

  /**
   * Prepara los datos para Highcharts con orden cronológico estricto (Lunes-Domingo)
   * Para el modo diario, garantiza que las categorías siempre comiencen en Lunes
   * y muestre todos los días de la semana en orden, incluso si no hay datos
   * 
   * Mapeo correcto desde JavaScript (0=Domingo, 1=Lunes, ..., 6=Sábado) a orden visual (Lunes-Domingo):
   * - dayOfWeek 1 (Lunes) → índice 0 → 'Lun'
   * - dayOfWeek 2 (Martes) → índice 1 → 'Mar'
   * - ...
   * - dayOfWeek 6 (Sábado) → índice 5 → 'Sáb'
   * - dayOfWeek 0 (Domingo) → índice 6 → 'Dom'
   */
  const highchartsDailyData = useMemo(() => {
    // Array de referencia fijo: semana comienza en Lunes (índice 0 = Lunes, índice 6 = Domingo)
    // Esto coincide con el mapeo: JavaScript día 1 (Lunes) → índice 0, JavaScript día 0 (Domingo) → índice 6
    const weekDayOrder: string[] = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Mapeo inverso: nombre del día → índice en weekDayOrder (0-6, donde 0=Lunes, 6=Domingo)
    const dayNameToIndex: Record<string, number> = {
      'Lun': 1, 'lun': 1, 'Lunes': 1, 'lunes': 1,
      'Mar': 2, 'mar': 2, 'Martes': 2, 'martes': 2,
      'Mié': 3, 'mié': 3, 'mie': 3, 'Miércoles': 3, 'miércoles': 3,
      'Jue': 4, 'jue': 4, 'Jueves': 4, 'jueves': 4,
      'Vie': 5, 'vie': 5, 'Viernes': 5, 'viernes': 5,
      'Sáb': 6, 'sáb': 6, 'Sab': 6, 'sab': 6, 'Sábado': 6, 'sábado': 6,
      'Dom': 0, 'dom': 0, 'Domingo': 0, 'domingo': 0
    };
    
    if (viewMode !== 'daily') {
      return { categories: [], revenue: [] };
    }

    // Si no hay datos procesados, retornar estructura vacía con todas las categorías
    if (processedDailyData.length === 0) {
      return { 
        categories: weekDayOrder, 
        revenue: weekDayOrder.map(() => 0) 
      };
    }

    // Crear array inicializado con ceros para todos los días (índice 0-6)
    const revenueByDayIndex: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    // Mapear los datos procesados a sus índices correctos según el día de la semana
    processedDailyData.forEach(item => {
      // Normalizar el nombre del día (capitalizar primera letra)
      const normalizedDay = item.day.charAt(0).toUpperCase() + item.day.slice(1).toLowerCase();
      
      // Obtener el índice correspondiente (0=Lunes, 6=Domingo)
      const dayIndex = dayNameToIndex[normalizedDay] ?? dayNameToIndex[item.day] ?? -1;
      
      if (dayIndex >= 0 && dayIndex < 7) {
        revenueByDayIndex[dayIndex] = item.revenue;
      }
    });

    // Construir arrays finales en orden estricto Lunes-Domingo
    const categories: string[] = weekDayOrder; // Ya está en el orden correcto
    const revenueData: number[] = revenueByDayIndex; // Ya está mapeado correctamente

    return { categories, revenue: revenueData };
  }, [viewMode, processedDailyData]);

  /**
   * Configuración de Highcharts para el gráfico de ingresos diarios/semanales
   */
  const highchartsOptions: Highcharts.Options = useMemo(() => {
    if (viewMode === 'daily') {
      return {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          height: 300,
          borderRadius: 8
        },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
          categories: highchartsDailyData.categories.length > 0 
            ? highchartsDailyData.categories 
            : ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'], // Fallback: orden estricto Lunes-Domingo
          title: { text: undefined },
          labels: {
            style: { color: '#6b7280', fontSize: '12px' }
          },
          gridLineColor: '#e5e7eb',
          // Forzar que se muestren todos los días en orden
          min: 0,
          max: highchartsDailyData.categories.length > 0 ? highchartsDailyData.categories.length - 1 : 6
        },
        yAxis: {
          title: { text: undefined },
          labels: {
            formatter: function() {
              return `$${(this.value as number) / 1000}k`;
            },
            style: { color: '#6b7280', fontSize: '12px' }
          },
          gridLineColor: '#e5e7eb',
          gridLineDashStyle: 'Dash'
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderRadius: 8,
          shadow: {
            color: 'rgba(0, 0, 0, 0.1)',
            offsetX: 0,
            offsetY: 2,
            opacity: 0.1,
            width: 4
          },
          formatter: function() {
            return `<b>${this.x}</b><br/>Ingresos: ${formatCurrency(this.y as number)}`;
          },
          style: { color: '#1F2937', fontSize: '12px' }
        },
        legend: { enabled: false },
        plotOptions: {
          line: {
            color: '#6B46C1',
            lineWidth: 3,
            marker: {
              fillColor: '#6B46C1',
              radius: 5,
              lineWidth: 0
            },
            states: {
              hover: {
                lineWidth: 4,
                marker: { radius: 7 }
              }
            }
          }
        },
        series: [{
          name: 'Ingresos',
          type: 'line',
          data: highchartsDailyData.revenue,
          animation: {
            duration: 1000
          }
        }]
      };
    } else {
      // Configuración para modo semanal
      const weeklyCategories = dailyWeeklyRevenue.weekly.map(item => item.week);
      const weeklyRevenue = dailyWeeklyRevenue.weekly.map(item => item.revenue);
      
      return {
        chart: {
          type: 'line',
          backgroundColor: 'transparent',
          height: 300,
          borderRadius: 8
        },
        title: { text: undefined },
        credits: { enabled: false },
        xAxis: {
          categories: weeklyCategories,
          title: { text: undefined },
          labels: {
            style: { color: '#6b7280', fontSize: '12px' }
          },
          gridLineColor: '#e5e7eb'
        },
        yAxis: {
          title: { text: undefined },
          labels: {
            formatter: function() {
              return `$${(this.value as number) / 1000}k`;
            },
            style: { color: '#6b7280', fontSize: '12px' }
          },
          gridLineColor: '#e5e7eb',
          gridLineDashStyle: 'Dash'
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          borderColor: '#e5e7eb',
          borderRadius: 8,
          shadow: {
            color: 'rgba(0, 0, 0, 0.1)',
            offsetX: 0,
            offsetY: 2,
            opacity: 0.1,
            width: 4
          },
          formatter: function() {
            return `<b>${this.x}</b><br/>Ingresos: ${formatCurrency(this.y as number)}`;
          },
          style: { color: '#1F2937', fontSize: '12px' }
        },
        legend: { enabled: false },
        plotOptions: {
          line: {
            color: '#6B46C1',
            lineWidth: 3,
            marker: {
              fillColor: '#6B46C1',
              radius: 5,
              lineWidth: 0
            },
            states: {
              hover: {
                lineWidth: 4,
                marker: { radius: 7 }
              }
            }
          }
        },
        series: [{
          name: 'Ingresos',
          type: 'line',
          data: weeklyRevenue,
          animation: {
            duration: 1000
          }
        }]
      };
    }
  }, [viewMode, highchartsDailyData, dailyWeeklyRevenue.weekly]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md max-w-md">
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl text-gray-600">No hay datos disponibles</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Encabezado */}
        <div className="bg-card-background rounded-3xl shadow-lg p-8 lg:p-10">
          <h2 className="text-4xl lg:text-5xl font-extrabold mb-3 text-text-dark tracking-tight">Dashboard</h2>
          <p className="text-text-light text-lg lg:text-xl">Resumen general de tu empresa</p>
        </div>

        {/* Tarjeta de Último Cierre de Caja */}
        {lastCloseout && (() => {
          const { date, time } = formatCloseoutDateTime(lastCloseout.closingTime);
          return (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl shadow-lg p-8 lg:p-10 border border-blue-200/50">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                {/* Sección Izquierda: Información de Cierre */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-500/20 rounded-2xl p-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900">Último Cierre de Caja</h3>
                  </div>
                  
                  {/* Fecha y Hora */}
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-blue-900">{date}</p>
                    <p className="text-base text-blue-700">{time}</p>
                  </div>
                  
                  {/* Información adicional */}
                  <div className="space-y-2">
                    <p className="text-base text-blue-700">
                      <span className="font-semibold text-blue-900">Caja:</span> {lastCloseout.cashRegisterName}
                    </p>
                    <p className="text-base text-blue-700">
                      <span className="font-semibold text-blue-900">Cerrado por:</span> {lastCloseout.closedBy}
                    </p>
                  </div>

                  {/* Saldos */}
                  <div className="space-y-3 pt-4 border-t border-blue-200/50">
                    <div className="flex items-center justify-between">
                      <span className="text-base text-blue-700">Saldo Inicial</span>
                      <span className="text-xl font-semibold text-blue-900">
                        {formatCurrency(lastCloseout.startingBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-base text-blue-700">Saldo Final</span>
                      <span className="text-xl font-semibold text-blue-900">
                        {formatCurrency(lastCloseout.finalBalance)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sección Derecha: Total de Ventas - Elemento más destacado */}
                <div className="flex flex-col justify-center text-left lg:text-right">
                  <p className="text-base text-blue-700 mb-4 font-medium">Ventas del Turno</p>
                  <p className="text-6xl lg:text-7xl font-extrabold text-blue-600 leading-none tracking-tight">
                    {formatCurrency(lastCloseout.salesTotal)}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Tarjetas de métricas con estilo iOS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tarjeta de Clientes */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-primary-purple/10 rounded-2xl p-4">
                  <svg
                    className="w-8 h-8 text-primary-purple"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-text-light uppercase tracking-wide mb-2">Total Clientes</p>
              <p className="text-5xl font-bold text-text-dark mb-2 leading-none">{summary.totalClients}</p>
              <p className="text-sm text-text-light">Clientes registrados</p>
            </div>
          </div>

          {/* Tarjeta de Valor del Inventario */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-accent-orange/10 rounded-2xl p-4">
                  <svg
                    className="w-8 h-8 text-accent-orange"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-text-light uppercase tracking-wide mb-2">Valor Inventario</p>
              <p className="text-4xl font-bold text-text-dark mb-2 leading-none">{formatCurrency(summary.inventoryValue)}</p>
              <p className="text-sm text-text-light">Valor total</p>
            </div>
          </div>

          {/* Tarjeta de Productos Bajos en Stock */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-accent-orange/10 rounded-2xl p-4">
                  <svg
                    className="w-8 h-8 text-accent-orange"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-text-light uppercase tracking-wide mb-2">Bajo Stock (≤5)</p>
              <p className="text-5xl font-bold text-text-dark mb-2 leading-none">{summary.lowStockProducts}</p>
              {summary.lowStockProducts > 0 ? (
                <p className="text-sm text-accent-orange font-semibold">Requieren atención</p>
              ) : (
                <p className="text-sm text-text-light">Todo en orden</p>
              )}
            </div>
          </div>

          {/* Tarjeta de Total Facturas */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 hover:shadow-lg transition-shadow duration-300">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div className="bg-primary-purple/10 rounded-2xl p-4">
                  <svg
                    className="w-8 h-8 text-primary-purple"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-medium text-text-light uppercase tracking-wide mb-2">Total Facturas</p>
              <p className="text-5xl font-bold text-text-dark mb-2 leading-none">{summary.totalInvoices}</p>
              <p className="text-sm text-text-light">Facturas emitidas</p>
            </div>
          </div>
        </div>

        {/* Gráficos en grid de 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Línea: Ingresos Diarios/Semanales */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-2xl font-bold text-text-dark">
                  {viewMode === 'daily' ? 'Ingresos Diarios' : 'Ingresos Semanales'}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('daily')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                      viewMode === 'daily'
                        ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
                        : 'bg-gray-100 text-text-dark hover:bg-gray-200 active:bg-gray-300 active:scale-[0.98]'
                    }`}
                  >
                    Diario
                  </button>
                  <button
                    onClick={() => setViewMode('weekly')}
                    className={`px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all ${
                      viewMode === 'weekly'
                        ? 'bg-blue-500 text-white shadow-md hover:bg-blue-600 active:bg-blue-700 active:scale-[0.98]'
                        : 'bg-gray-100 text-text-dark hover:bg-gray-200 active:bg-gray-300 active:scale-[0.98]'
                    }`}
                  >
                    Semanal
                  </button>
                </div>
              </div>
              <p className="text-sm text-text-light">
                {viewMode === 'daily' ? 'Últimos 7 días' : 'Últimas 4 semanas'}
              </p>
              <div className="mt-2">
                <span className="text-2xl font-bold text-primary-purple">{formatCurrency(totalDynamicRevenue)}</span>
                <span className="text-sm text-text-light ml-2">Total del período</span>
              </div>
            </div>
          {dynamicChartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No hay datos de ingresos disponibles</p>
            </div>
          ) : (
            <HighchartsReact
              highcharts={Highcharts}
              options={highchartsOptions}
            />
          )}
        </div>

          {/* Gráfico de Pastel: Distribución de Productos */}
          <div className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
            <div className="mb-4">
              <h3 className="text-2xl font-bold text-text-dark mb-1">Estado de Productos</h3>
              <p className="text-sm text-text-light">Distribución de productos en inventario</p>
            </div>
          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>No hay datos disponibles</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  animationDuration={1000}
                  animationBegin={0}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

        {/* Gráfico de Barras: Productos Bajo Stock (Full Width) */}
        <div className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-text-dark mb-1">Alerta de Inventario</h3>
            <p className="text-sm text-text-light">Productos que requieren reposición (stock ≤ 5 unidades)</p>
          </div>
          {summary.lowStockProducts === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="bg-green-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-secondary-green"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                </div>
                <p className="text-lg text-text-dark font-semibold">¡Todo en orden!</p>
                <p className="text-sm text-text-light">No hay productos con stock bajo</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Productos Bajo Stock',
                    cantidad: summary.lowStockProducts,
                    fill: '#EF4444'
                  }
                ]}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                style={{ fontSize: '14px', fontWeight: '600' }}
              />
              <YAxis
                stroke="#6b7280"
                style={{ fontSize: '12px' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
                formatter={(value: number) => [`${value} productos`, 'Cantidad']}
              />
              <Bar
                dataKey="cantidad"
                fill="#EF4444"
                radius={[8, 8, 0, 0]}
                animationDuration={1000}
                animationBegin={0}
              />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top 10 Productos Más Vendidos */}
        <div className="bg-card-background rounded-3xl shadow-md p-8 border-b-2 border-gray-100">
          <div className="mb-4">
            <h3 className="text-2xl font-bold text-text-dark mb-1 flex items-center gap-2">
              <svg className="w-7 h-7 text-secondary-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Top 10 Productos Más Vendidos
            </h3>
            <p className="text-sm text-text-light">Ranking de productos por cantidad y valor total vendido</p>
          </div>
        
        {topProducts.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="bg-gray-100 rounded-full p-6 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                  />
                </svg>
              </div>
              <p className="text-lg text-text-dark font-semibold">No hay datos disponibles</p>
              <p className="text-sm text-text-light">No se han registrado ventas aún</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-3 py-4 text-left border-b border-gray-300 font-semibold text-text-dark">#</th>
                  <th className="p-3 py-4 text-left border-b border-gray-300 font-semibold text-text-dark">Producto</th>
                  <th className="p-3 py-4 text-right border-b border-gray-300 font-semibold text-text-dark">Cantidad Vendida</th>
                  <th className="p-3 py-4 text-right border-b border-gray-300 font-semibold text-text-dark">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr 
                    key={product.productId} 
                    className={`hover:bg-gray-50 transition-colors ${
                      index < 3 ? 'bg-gradient-to-r from-green-50 to-transparent' : ''
                    }`}
                  >
                    <td className="p-3 py-4 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        {index === 0 && (
                          <span className="text-yellow-500 text-lg">🥇</span>
                        )}
                        {index === 1 && (
                          <span className="text-gray-400 text-lg">🥈</span>
                        )}
                        {index === 2 && (
                          <span className="text-accent-orange text-lg">🥉</span>
                        )}
                        <span className={`font-bold ${index < 3 ? 'text-lg' : 'text-base'} ${
                          index === 0 ? 'text-yellow-600' :
                          index === 1 ? 'text-gray-500' :
                          index === 2 ? 'text-accent-orange' :
                          'text-text-dark'
                        }`}>
                          {index + 1}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 py-4 border-b border-gray-200 text-text-dark font-medium">
                      {product.productName}
                    </td>
                    <td className="p-3 py-4 border-b border-gray-200 text-right text-text-dark font-semibold">
                      {product.totalQuantity.toLocaleString('es-CO')} unidades
                    </td>
                    <td className="p-3 py-4 border-b border-gray-200 text-right text-secondary-green font-bold">
                      {formatCurrency(product.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
