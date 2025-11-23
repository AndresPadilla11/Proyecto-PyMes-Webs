# Configuración de Acceso Remoto - PyMes Desktop

Esta guía explica cómo configurar la aplicación de escritorio PyMes para conectarse a un backend remoto.

## 📋 Requisitos Previos

1. **Frontend compilado**: El frontend debe estar compilado antes de empaquetar la aplicación Electron.
   ```bash
   cd frontend
   npm run build
   ```

2. **Backend ejecutándose**: El backend debe estar corriendo y accesible desde la red.

## 🔧 Configuración

### 1. Frontend (`frontend/.env` o `frontend/.env.local`)

Crea un archivo `.env` en la carpeta `frontend` con la siguiente configuración:

```env
# URL base del Backend
# Desarrollo local:
VITE_API_URL=http://localhost:8089/api/v1

# Acceso remoto (red local):
# VITE_API_URL=http://192.168.1.100:8089/api/v1

# Acceso remoto (internet):
# VITE_API_URL=https://tu-dominio.com/api/v1
```

**Importante**: Después de modificar `.env`, debes **recompilar** el frontend para que los cambios surtan efecto:

```bash
cd frontend
npm run build
```

### 2. Backend (`backend/.env`)

Asegúrate de que el backend esté configurado para aceptar conexiones remotas:

```env
# Puerto del servidor
PORT=8089

# Host: 0.0.0.0 permite conexiones desde cualquier IP
HOST=0.0.0.0

# Orígenes permitidos para CORS (separados por comas)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000,file://,http://192.168.1.100:5173

# Para permitir todos los orígenes (NO recomendado en producción):
# CORS_ORIGINS=*
```

### 3. Aplicación de Escritorio (Electron)

La aplicación de escritorio está configurada para:
- **En desarrollo** (`npm run dev`): Cargar desde el servidor Vite (`http://localhost:5173`)
- **En producción** (empaquetado): Cargar desde los archivos compilados locales (`file://`)

## 🚀 Uso

### Modo Desarrollo

1. Inicia el frontend en modo desarrollo:
   ```bash
   cd frontend
   npm run dev
   ```

2. Inicia la aplicación de escritorio en modo desarrollo:
   ```bash
   cd desktop-app
   npm run dev
   ```

### Modo Producción

1. **Compila el frontend** con la URL del backend configurada:
   ```bash
   cd frontend
   # Asegúrate de que .env tenga la URL correcta del backend
   npm run build
   ```

2. **Empaqueta la aplicación de escritorio**:
   ```bash
   cd desktop-app
   npm run dist
   ```

3. La aplicación empaquetada cargará el frontend compilado localmente y se conectará al backend usando la URL configurada en `VITE_API_URL`.

## 🌐 Ejemplos de Configuración

### Red Local

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://192.168.1.100:8089/api/v1
```

**Backend** (`backend/.env`):
```env
PORT=8089
HOST=0.0.0.0
CORS_ORIGINS=http://localhost:5173,file://,http://192.168.1.100:5173
```

### Internet (con dominio)

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=https://api.tu-dominio.com/api/v1
```

**Backend** (`backend/.env`):
```env
PORT=8089
HOST=0.0.0.0
CORS_ORIGINS=https://tu-dominio.com,file://
```

## ⚠️ Notas Importantes

1. **Variables de entorno en Vite**: Las variables de entorno que comienzan con `VITE_` están disponibles en el código del frontend. La URL del backend se compila **estáticamente** en el bundle, por lo que debes recompilar el frontend cada vez que cambies `VITE_API_URL`.

2. **Seguridad**: En producción, evita usar `CORS_ORIGINS=*` ya que permite conexiones desde cualquier origen. Especifica solo los orígenes necesarios.

3. **Firewall**: Asegúrate de que el firewall del servidor permita conexiones entrantes en el puerto del backend (por defecto 8089).

4. **Protocolo HTTPS**: Si planeas acceder al backend a través de internet, considera usar HTTPS para mayor seguridad.

## 🔍 Troubleshooting

### Error: "No se encontró el frontend compilado"

**Solución**: Compila el frontend antes de empaquetar la aplicación:
```bash
cd frontend
npm run build
```

### Error: "CORS bloqueado"

**Solución**: Verifica que el origen de la aplicación esté en `CORS_ORIGINS` del backend. Las aplicaciones Electron cargan con protocolo `file://`, así que asegúrate de incluir `file://` en los orígenes permitidos.

### Error: "No se puede conectar al backend"

**Solución**: 
1. Verifica que el backend esté corriendo.
2. Verifica que `VITE_API_URL` en el frontend apunte a la URL correcta del backend.
3. Verifica que el firewall permita conexiones en el puerto del backend.
4. Verifica que el backend esté escuchando en `0.0.0.0` (no solo `localhost`).

