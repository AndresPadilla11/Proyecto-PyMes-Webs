import axios from 'axios';
import { getToken } from '../services/authService';

// URL base de la API configurable por variable de entorno
// IMPORTANTE: La URL debe incluir el prefijo completo /api/v1
// En desarrollo: http://localhost:8089/api/v1
// En producción (Vercel): https://proyecto-pymes-webs.onrender.com/api/v1
// NOTA: Las rutas en las llamadas NO deben incluir /api, solo la ruta relativa (ej: /auth/login)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8089/api/v1';

// Log en desarrollo para verificar la URL
if (import.meta.env.DEV) {
  console.log('🔗 [API] Base URL configurada:', API_BASE_URL);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  },
  withCredentials: false
});

// Interceptor para agregar el token JWT a todas las peticiones
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación y 404
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log del error para debugging
    if (error.response) {
      const { status, config } = error.response;
      console.error(`❌ [API] Error ${status}: ${config?.method?.toUpperCase()} ${config?.url}`);
      console.error(`🔗 [API] URL completa: ${config?.baseURL}${config?.url}`);
      
      if (status === 404) {
        console.error('💡 [API] Error 404: La ruta no existe o la URL del backend es incorrecta');
        console.error('💡 [API] Verifica que VITE_API_URL esté configurada en Vercel');
        console.error(`💡 [API] URL actual: ${config?.baseURL || API_BASE_URL}`);
      }
    } else if (error.request) {
      console.error('❌ [API] No se recibió respuesta del servidor');
      console.error(`🔗 [API] URL intentada: ${error.config?.baseURL}${error.config?.url}`);
      console.error('💡 [API] Verifica que el backend esté funcionando y VITE_API_URL sea correcta');
    }
    
    if (error.response?.status === 401) {
      // Token inválido o expirado
      import('../services/authService').then(({ clearAuthData }) => {
        clearAuthData();
        // Redirigir al login si no estamos ya ahí
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;

