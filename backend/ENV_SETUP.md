# Configuración de Variables de Entorno - Backend

Esta guía explica cómo configurar las variables de entorno para el backend en desarrollo local y producción (Render).

## 📋 Variables Requeridas

### Desarrollo Local

Crea un archivo `.env` en la carpeta `backend/` con las siguientes variables:

```env
# BASE DE DATOS (REQUERIDO)
# URL de conexión a PostgreSQL
# Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd?schema=public
DATABASE_URL="postgresql://postgres:PADILLa21@localhost:4000/PROYECTO_PYMES?schema=public"

# SERVIDOR
PORT=8089
HOST=0.0.0.0

# AUTENTICACIÓN
JWT_SECRET=tu_jwt_secret_super_seguro_aqui_cambiar_en_produccion
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,file://

# ENTORNO
NODE_ENV=development

# MODO DE BASE DE DATOS (Opcional)
DB_MODE=online
```

### Producción (Render)

En Render, configura las siguientes variables de entorno en el panel de tu servicio:

#### Variables Obligatorias

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | **OBLIGATORIO**. URL de conexión a PostgreSQL proporcionada por Render o Supabase. |
| `JWT_SECRET` | `string` | **OBLIGATORIO**. Secret seguro para JWT. Genera uno con: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | **OBLIGATORIO**. Indica que está en producción. |

#### Variables Opcionales

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `PORT` | `8089` | Puerto del servidor (Render lo establece automáticamente si no se especifica) |
| `CORS_ORIGINS` | `https://tu-app.vercel.app` | Dominios permitidos para CORS. Especifica tu frontend en producción. |
| `JWT_EXPIRES_IN` | `7d` | Tiempo de expiración del token JWT (por defecto: 7 días) |
| `DB_MODE` | `online` | Modo de base de datos (por defecto: online) |

## 🔧 Configuración en Render

### Paso 1: Conectar Base de Datos

1. En Render, ve a tu servicio de backend
2. En la sección **"Environment"**, busca **"Add Environment Variable"**
3. Si conectaste una base de datos PostgreSQL en Render, la variable `DATABASE_URL` se establece automáticamente
4. Si usas Supabase, copia la connection string y créala manualmente:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST].supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANTE:**
- NO uses `localhost` en producción - no funcionará en Render
- Asegúrate de que la URL de Supabase incluya `?sslmode=require` al final

### Paso 2: Configurar Variables de Entorno

1. Haz clic en **"Add Environment Variable"** para cada variable requerida
2. Asegúrate de agregar:
   - `DATABASE_URL` (si no se estableció automáticamente)
   - `JWT_SECRET` (genera uno seguro)
   - `NODE_ENV=production`
   - `CORS_ORIGINS` (URL de tu frontend en Vercel)

### Paso 3: Verificar Configuración

Después de desplegar, verifica que la conexión funciona:

```bash
# Hacer una petición al endpoint de salud
curl https://tu-backend.onrender.com/api/v1/status
```

Deberías recibir una respuesta indicando que la base de datos está conectada.

## 🔍 Solución de Problemas

### Error: "DATABASE_URL no está configurado"

**Solución:**
- Verifica que `DATABASE_URL` esté configurada en Render
- Si usas Supabase, asegúrate de copiar la URL completa incluyendo el parámetro `sslmode=require`

### Error: "DATABASE_URL contiene localhost en producción"

**Causa:** Estás usando una URL de localhost en producción.

**Solución:**
- Elimina cualquier referencia a `localhost` en `DATABASE_URL` en Render
- Usa la URL de base de datos proporcionada por Render o Supabase

### Error: "PrismaClientInitializationError"

**Causa:** La URL de la base de datos es incorrecta o la base de datos no está accesible.

**Solución:**
- Verifica que `DATABASE_URL` esté correctamente configurada en Render
- Verifica que la base de datos esté ejecutándose y accesible
- Revisa los logs de Render para ver el error específico

## 📝 Ejemplo de Configuración Completa en Render

```
DATABASE_URL=postgresql://postgres:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/pymes_db
JWT_SECRET=aB3xY7mP9qR2sT5vW8yZ1cD4fG6hJ0kL3nO7pQ9
NODE_ENV=production
PORT=8089
CORS_ORIGINS=https://pymes-contables.vercel.app
JWT_EXPIRES_IN=7d
```

## 🔐 Seguridad

- **NUNCA** subas archivos `.env` a Git
- Genera un `JWT_SECRET` único y seguro para producción
- Usa HTTPS en producción (Render lo proporciona automáticamente)
- Limita `CORS_ORIGINS` solo a los dominios de tu frontend en producción

