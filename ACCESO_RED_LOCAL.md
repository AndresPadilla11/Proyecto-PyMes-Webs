# 🌐 Acceso desde la Red Local (Tablet, Móvil, etc.)

Esta guía te explica cómo acceder a tu aplicación PyMes desde otros dispositivos en tu misma red local (WiFi).

## 📋 Requisitos

1. **Todos los dispositivos deben estar en la misma red WiFi**
2. **Backend corriendo en tu PC**
3. **Frontend corriendo en tu PC**
4. **Conocer la IP local de tu PC**

---

## 🚀 Paso 1: Obtener tu IP Local

### En Windows (PowerShell):
```powershell
ipconfig | Select-String "IPv4"
```

O ejecuta este comando para ver solo tu IP:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" | Where-Object {$_.IPAddress -notlike "169.254.*"}).IPAddress
```

**Guarda esta IP**, la necesitarás. Ejemplo: `192.168.1.100`

---

## 🔧 Paso 2: Iniciar el Backend

Abre una terminal en la carpeta `backend` y ejecuta:

```bash
cd backend
npm run dev
```

El backend debería iniciar y mostrar:
```
✅ [Express] Servidor corriendo en http://localhost:8089
🌐 [Express] Accesible desde la red local e internet
```

El backend ya está configurado para escuchar en todas las interfaces (0.0.0.0), así que otros dispositivos pueden conectarse.

---

## 🎨 Paso 3: Iniciar el Frontend

Abre **otra terminal** en la carpeta `frontend` y ejecuta:

```bash
cd frontend
npm run dev
```

Deberías ver algo como:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
```

**¡Importante!** Ahora verás una línea que dice `Network: http://TU_IP:5173/` - esta es la URL que usarás desde otros dispositivos.

---

## 📱 Paso 4: Acceder desde tu Tablet/Móvil

1. **Asegúrate de que tu tablet/móvil esté conectado a la misma WiFi** que tu PC.

2. **Abre el navegador** en tu tablet/móvil (Chrome, Safari, etc.).

3. **Escribe en la barra de direcciones:**
   ```
   http://TU_IP:5173
   ```
   Reemplaza `TU_IP` con la IP que obtuviste en el Paso 1.
   
   Ejemplo: `http://192.168.1.100:5173`

4. **Presiona Enter** y deberías ver tu aplicación PyMes cargándose.

---

## ⚠️ Solución de Problemas

### ❌ No puedo acceder desde otros dispositivos

**Problema:** El firewall de Windows está bloqueando las conexiones.

**Solución:**
1. Abre "Firewall de Windows Defender" en Windows
2. Haz clic en "Permitir una aplicación o característica a través del Firewall"
3. Busca "Node.js" o "npm" y asegúrate de que esté marcado para "Privado" y "Público"
4. O permite manualmente el puerto 5173 y 8089

### ❌ La aplicación carga pero no se conecta al backend

**Problema:** El backend no está accesible desde la red local.

**Solución:** Verifica que el backend esté escuchando en `0.0.0.0` (ya está configurado en `backend/src/server.ts`).

### ❌ No encuentro mi IP

**Solución alternativa:**
1. Presiona `Windows + R`
2. Escribe `cmd` y presiona Enter
3. Ejecuta: `ipconfig`
4. Busca la sección de tu conexión WiFi (ej: "Adaptador de LAN inalámbrica Wi-Fi")
5. Busca "Dirección IPv4" - esa es tu IP

### ❌ Error de CORS

**Solución:** El backend ya está configurado para permitir cualquier origen. Si persiste, verifica que estés usando la misma red WiFi.

---

## 🎯 Configuración para Producción (Opcional)

Si más adelante quieres desplegar en internet (no solo red local), necesitarás:

1. **Hosting para el Backend** (ej: Render, Railway, Heroku)
2. **Hosting para el Frontend** (ej: Vercel, Netlify)
3. Configurar las variables de entorno `VITE_API_URL` en el frontend

Para ahora, con la red local es suficiente para probar desde tu tablet.

---

## 📝 Resumen Rápido

1. ✅ Backend: `npm run dev` en la carpeta `backend`
2. ✅ Frontend: `npm run dev` en la carpeta `frontend`
3. ✅ Obtener IP: `ipconfig` en PowerShell
4. ✅ Abrir en tablet: `http://TU_IP:5173` en el navegador
5. ✅ Disfrutar 🎉

---

## 🔒 Nota de Seguridad

Esta configuración permite acceso desde tu red local. No es seguro para uso público en internet sin autenticación adicional y configuración de seguridad apropiada.

