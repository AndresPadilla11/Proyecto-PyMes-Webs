import axios from 'axios';
import { getToken } from '../services/authService';

// URL base de la API configurable por variable de entorno
// Para despliegue web: usar VITE_API_URL con la URL de Render/Supabase
// En desarrollo: http://localhost:8089/api/v1
// En producción (Vercel/Render): https://tu-backend-en-render.onrender.com/api/v1
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8089/api/v1';

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

// Interceptor para manejar errores de autenticación
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
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

