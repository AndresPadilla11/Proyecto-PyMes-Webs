# 🚀 Inicio Rápido - Acceso desde Red Local

## 📱 Acceder desde tu Tablet/Móvil en la misma WiFi

### **Tu IP Local es:** `192.168.100.104`

---

## ⚡ Pasos Rápidos (3 minutos)

### 1️⃣ **Iniciar el Backend**
Abre PowerShell o CMD y ejecuta:
```bash
cd backend
npm run dev
```
**Espera a ver:** `✅ [Express] Servidor corriendo en http://localhost:8089`

---

### 2️⃣ **Iniciar el Frontend** 
Abre **otra ventana** de PowerShell o CMD y ejecuta:
```bash
cd frontend
npm run dev
```
**Busca esta línea en la salida:**
```
➜  Network: http://192.168.100.104:5173/
```

---

### 3️⃣ **Abrir en tu Tablet/Móvil**

1. **Asegúrate** de que tu tablet/móvil esté conectada a la **misma WiFi** que tu PC
2. **Abre el navegador** en tu tablet (Chrome, Safari, etc.)
3. **Escribe en la barra de direcciones:**
   ```
   http://192.168.100.104:5173
   ```
4. **Presiona Enter** ✅

¡Listo! Tu aplicación debería cargar en la tablet.

---

## 🔧 Solución Rápida de Problemas

### ❌ No puedo acceder desde la tablet

**Solución 1: Firewall de Windows**
1. Presiona `Windows` y busca "Firewall"
2. Abre "Firewall de Windows Defender"
3. Haz clic en "Permitir una aplicación..."
4. Busca "Node.js" y márcalo para "Privado" y "Público"
5. O permite manualmente los puertos **5173** y **8089**

**Solución 2: Verificar la IP**
Abre PowerShell y ejecuta:
```powershell
ipconfig | Select-String "IPv4"
```
Busca la IP de "Wi-Fi" o "Adaptador de LAN inalámbrica".

**Solución 3: Verificar que ambos estén corriendo**
- Backend: Debe mostrar `✅ [Express] Servidor corriendo`
- Frontend: Debe mostrar `Network: http://TU_IP:5173/`

---

## 📝 Notas Importantes

✅ **Misma WiFi:** Tu PC y tablet deben estar en la misma red WiFi  
✅ **Backend primero:** Siempre inicia el backend antes que el frontend  
✅ **Dos terminales:** Necesitas dos ventanas abiertas (una para backend, otra para frontend)  

---

## 🎯 URL para Acceso Rápido

**Desde tu tablet/móvil, usa:**
```
http://192.168.100.104:5173
```

**Guarda esta página** en los marcadores de tu tablet para acceso rápido.

---

## 💡 Tip Extra

Si tu IP cambia (puede pasar cuando reinicias el router), ejecuta esto para obtenerla de nuevo:
```powershell
(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like "*Wi-Fi*" -and $_.IPAddress -notlike "169.254.*"}).IPAddress
```

