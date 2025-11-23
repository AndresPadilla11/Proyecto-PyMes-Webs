# Guía de Depuración - PyMes Desktop

## Problema: La aplicación no muestra ventana

Si la aplicación aparece en el Administrador de Tareas pero no muestra una ventana, sigue estos pasos:

### 1. Verificar Logs

Los logs de Electron se escriben en la consola. Para verlos:

**En Windows (PowerShell como administrador):**
```powershell
# Ejecutar la aplicación directamente y ver los logs
cd "C:\Users\admin\Videos\Proyecto PyMes\desktop-app\release\win-unpacked"
.\"PyMes Contables POS.exe"
```

### 2. Abrir DevTools

Si la ventana se muestra pero está en blanco:

1. **Presiona `F12`** o **`Ctrl+Shift+I`** para abrir las herramientas de desarrollador
2. **Presiona `Ctrl+R`** para recargar la ventana
3. Revisa la consola para ver errores

### 3. Verificar que el frontend esté compilado

Asegúrate de que el frontend esté compilado antes de empaquetar:

```bash
cd ../frontend
npm run build
```

### 4. Verificar rutas de archivos

Cuando la aplicación está empaquetada, los archivos están en `app.asar`. El archivo `index.html` debería estar en la raíz de `app.asar`.

### 5. Recompilar la aplicación

Si los cambios no funcionan, recompila:

```bash
cd desktop-app
npm run dist
```

### 6. Verificar configuración de electron-builder

El archivo `package.json` debe incluir el frontend compilado:

```json
"files": [
  "main.js",
  "preload.js",
  "assets/**/*",
  {
    "from": "../frontend/dist",
    "to": ".",
    "filter": ["**/*"]
  }
]
```

### Solución Temporal

Si la aplicación no abre, puedes:

1. **Ejecutar desde la línea de comandos** para ver los errores
2. **Abrir DevTools manualmente** (F12 cuando la ventana aparezca)
3. **Verificar que el frontend esté compilado** y los archivos estén en la ubicación correcta

