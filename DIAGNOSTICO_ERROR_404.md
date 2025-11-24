# 🔍 Diagnóstico de Error 404 (Ruta No Encontrada)

## 📋 Análisis de Rutas Backend vs Frontend

### ✅ Configuración del Backend

**Archivo:** `backend/src/server.ts`

Las rutas están montadas con el prefijo `/api/v1/`:

```62:67:backend/src/server.ts
        app.use('/api/v1/health', healthRoutes);
        app.use('/api/v1/auth', authRoutes);
        app.use('/api/v1/clients', clientRoutes);
        app.use('/api/v1/invoices', invoiceRoutes);
        app.use('/api/v1/products', productRoutes);
        app.use('/api/v1/reports', reportRoutes);
```

**Rutas disponibles en el backend:**
- `POST /api/v1/auth/register` - Registro de usuarios
- `POST /api/v1/auth/login` - Login de usuarios
- `POST /api/v1/auth/google` - Login con Google
- `GET /api/v1/products` - Obtener productos
- `GET /api/v1/clients` - Obtener clientes
- `GET /api/v1/invoices` - Obtener facturas
- `GET /api/v1/health` - Health check
- `GET /api/v1/status` - Estado del servidor

### ✅ Configuración del Frontend

**Archivo:** `frontend/src/api/axios.ts`

El frontend usa una base URL configurable:

```8:11:frontend/src/api/axios.ts
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8089/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
```

**Ejemplo de llamada desde el frontend:**

```80:80:frontend/src/services/authService.ts
  const response = await apiClient.post<AuthResponse>('/auth/login', payload);
```

Esto se convierte en:
- Con `VITE_API_URL` configurada: `{VITE_API_URL}/auth/login`
- Sin configurar (default): `http://localhost:8089/api/v1/auth/login`

## ❌ Problema Identificado

En producción (Vercel), si `VITE_API_URL` no está configurada, el frontend intentará llamar a:
```
http://localhost:8089/api/v1/auth/login
```

Esto fallará porque:
1. `localhost` no existe en el navegador del usuario
2. El backend está en Render (no en localhost)
3. Resultado: Error 404 o CORS

## ✅ Solución: Configurar VITE_API_URL en Vercel

### Paso 1: Obtener la URL del Backend en Render

1. Ve a tu servicio de backend en Render
2. Copia la URL pública (ejemplo: `https://pymes-backend.onrender.com`)
3. Asegúrate de incluir el prefijo `/api/v1` al final

**URL completa del backend:**
```
https://tu-backend.onrender.com/api/v1
```

### Paso 2: Configurar en Vercel

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto (frontend)
3. Ve a **Settings** (⚙️) en el menú superior
4. En el menú lateral, haz clic en **Environment Variables**
5. Haz clic en **Add New**
6. Configura:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://tu-backend.onrender.com/api/v1`
   - **Environment:** Selecciona `Production`, `Preview`, y `Development` (o al menos `Production`)
7. Haz clic en **Save**

### Paso 3: Verificar la Configuración

Después de configurar:

1. **Haz un redeploy** en Vercel (o espera al siguiente push)
2. Verifica en el código compilado que la URL sea correcta:
   - Abre tu app en Vercel
   - Abre las DevTools del navegador (F12)
   - Ve a la pestaña **Network**
   - Intenta hacer login
   - Verifica que las peticiones vayan a: `https://tu-backend.onrender.com/api/v1/auth/login`

## 📊 Comparación de Rutas

### Backend (Render)
```
https://tu-backend.onrender.com/api/v1/auth/login
```

### Frontend (Vercel) - CONFIGURADO CORRECTAMENTE
```
VITE_API_URL = https://tu-backend.onrender.com/api/v1
Llamada: /auth/login
Resultado: https://tu-backend.onrender.com/api/v1/auth/login ✅
```

### Frontend (Vercel) - SIN CONFIGURAR
```
VITE_API_URL = (no configurada, usa default)
Llamada: /auth/login
Resultado: http://localhost:8089/api/v1/auth/login ❌ (404)
```

## 🔍 Verificación Paso a Paso

### 1. Verificar que el Backend Está Funcionando

Prueba directamente la URL del backend:

```bash
curl https://tu-backend.onrender.com/api/v1/health
```

Deberías recibir:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### 2. Verificar que el Frontend Está Llamando Correctamente

1. Abre tu app en Vercel
2. Abre DevTools (F12)
3. Ve a **Console**
4. Intenta hacer login
5. Ve a la pestaña **Network**
6. Busca las peticiones que empiezan con `/auth/` o `/products/`
7. Verifica que la URL completa sea:
   - ✅ `https://tu-backend.onrender.com/api/v1/auth/login`
   - ❌ NO debe ser: `http://localhost:8089/api/v1/auth/login`

### 3. Verificar Variables de Entorno en Vercel

En Vercel → Settings → Environment Variables:

- ✅ Debe existir: `VITE_API_URL`
- ✅ Valor: `https://tu-backend.onrender.com/api/v1` (o tu URL de Render)
- ✅ Environment: Debe estar marcado para `Production`

## 🛠 Solución Rápida

### Si el Error Persiste Después de Configurar VITE_API_URL

1. **Verifica la URL del backend:**
   - Asegúrate de que el backend esté funcionando en Render
   - Prueba: `curl https://tu-backend.onrender.com/api/v1/health`

2. **Verifica CORS en el Backend:**
   - En `backend/src/server.ts`, CORS está configurado para `origin: '*'`
   - Esto debería permitir peticiones desde cualquier origen

3. **Haz un redeploy completo:**
   - En Vercel, elimina el deployment anterior
   - Haz un nuevo push a GitHub
   - Vercel creará un nuevo deployment con las variables de entorno

## 📝 Ejemplo de Configuración Completa

### Variables de Entorno en Vercel

| Variable | Valor | Environment |
|----------|-------|-------------|
| `VITE_API_URL` | `https://tu-backend.onrender.com/api/v1` | Production, Preview |
| `VITE_GOOGLE_CLIENT_ID` | `tu-client-id.apps.googleusercontent.com` | Production (opcional) |

### URL del Backend en Render

Ejemplo: `https://pymes-contables-backend.onrender.com`

**Variable VITE_API_URL completa:**
```
https://pymes-contables-backend.onrender.com/api/v1
```

## ✅ Checklist de Verificación

- [ ] Backend está funcionando en Render
- [ ] URL del backend es accesible (prueba con `curl`)
- [ ] `VITE_API_URL` está configurada en Vercel
- [ ] `VITE_API_URL` tiene el valor correcto: `https://tu-backend.onrender.com/api/v1`
- [ ] `VITE_API_URL` está marcada para `Production`
- [ ] Se hizo un redeploy en Vercel después de configurar la variable
- [ ] Las peticiones del frontend van a la URL correcta (verificar en Network tab)

## 🎯 Conclusión

**Las rutas están correctamente configuradas.** El problema es que falta configurar `VITE_API_URL` en Vercel para que el frontend sepa a qué URL del backend debe llamar.

**Solución:** Configura `VITE_API_URL` en Vercel con la URL completa de tu backend en Render incluyendo `/api/v1`.

