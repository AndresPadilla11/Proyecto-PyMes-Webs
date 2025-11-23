// frontend/vite.config.ts

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Configuración del servidor de desarrollo para acceso desde la red local
  server: {
    // Habilitar acceso desde todos los dispositivos en tu red local
    host: '0.0.0.0', // Permite acceso desde otros dispositivos
    port: 5173, // Puerto por defecto de Vite
    // Proxy para las peticiones de la API
    proxy: {
      // Si el frontend pide '/api/v1', lo redirige al backend
      '/api/v1': {
        target: 'http://localhost:8089', // Puerto del backend
        changeOrigin: true,
        secure: false, // Usar false ya que es local (HTTP)
      },
    },
  },
});