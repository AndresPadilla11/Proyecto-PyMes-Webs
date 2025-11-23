import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import './index.css'
import App from './App.tsx'

// Client ID de Google OAuth (debe estar en las variables de entorno)
// Para desarrollo local, crea un archivo .env en la carpeta frontend con:
// VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() || '';

// Validar que el CLIENT_ID esté configurado (solo en desarrollo)
if (import.meta.env.DEV && !GOOGLE_CLIENT_ID) {
  console.warn(
    '⚠️ VITE_GOOGLE_CLIENT_ID no está configurado.\n' +
    'Por favor, crea un archivo .env en la carpeta frontend con:\n' +
    'VITE_GOOGLE_CLIENT_ID=tu-client-id-aqui.apps.googleusercontent.com'
  );
}

// Componente wrapper que maneja la inicialización condicional de GoogleOAuthProvider
const AppWithGoogleAuth = () => {
  // Si hay CLIENT_ID, envolver con GoogleOAuthProvider
  if (GOOGLE_CLIENT_ID) {
    return (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    );
  }
  
  // Si no hay CLIENT_ID, renderizar sin el provider (el botón de Google no funcionará)
  return <App />;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppWithGoogleAuth />
    </BrowserRouter>
  </StrictMode>,
)
