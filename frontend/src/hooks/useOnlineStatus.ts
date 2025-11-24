// frontend/src/hooks/useOnlineStatus.ts
// Hook de React para detectar el estado de conexión a internet

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para detectar el estado de conexión online/offline
 * 
 * @returns {Object} Objeto con:
 *   - isOnline: boolean - Indica si hay conexión a internet
 *   - lastOnline: Date | null - Última fecha en que se detectó conexión
 *   - lastOffline: Date | null - Última fecha en que se perdió la conexión
 * 
 * @example
 * ```tsx
 * const { isOnline, lastOnline, lastOffline } = useOnlineStatus();
 * 
 * if (!isOnline) {
 *   return <div>Sin conexión. Trabajando en modo offline.</div>;
 * }
 * ```
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Inicializar con el estado actual
    if (typeof window !== 'undefined') {
      return window.navigator.onLine;
    }
    return true; // Por defecto asumir online en SSR
  });

  const [lastOnline, setLastOnline] = useState<Date | null>(() => {
    if (typeof window !== 'undefined' && window.navigator.onLine) {
      return new Date();
    }
    return null;
  });

  const [lastOffline, setLastOffline] = useState<Date | null>(() => {
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      return new Date();
    }
    return null;
  });

  // Función para actualizar el estado
  const updateOnlineStatus = useCallback(() => {
    const online = window.navigator.onLine;
    setIsOnline(online);
    
    if (online) {
      setLastOnline(new Date());
    } else {
      setLastOffline(new Date());
    }
  }, []);

  useEffect(() => {
    // Verificar estado inicial
    updateOnlineStatus();

    // Escuchar eventos de cambio de conexión
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Cleanup al desmontar el componente
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, [updateOnlineStatus]);

  // Función para verificar manualmente la conexión (opcional)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Intentar hacer una petición a un servicio conocido
      // Usamos un archivo pequeño y rápido (favicon de Google)
      void await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache'
      });
      // Si no hay error, asumimos que hay conexión
      return true;
    } catch (error) {
      // Si hay error, verificamos si realmente estamos offline
      return window.navigator.onLine;
    }
  }, []);

  return {
    isOnline,
    lastOnline,
    lastOffline,
    checkConnection
  };
}

export default useOnlineStatus;
