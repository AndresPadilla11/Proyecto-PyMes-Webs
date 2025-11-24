# 🔧 Configuración de Vercel para Monorepo

## ⚠️ IMPORTANTE: Configurar Root Directory en Vercel

Para que Vercel funcione correctamente con este monorepo, debes configurar el **Root Directory** en el panel de Vercel.

## 📋 Pasos para Configurar Root Directory

### Opción A: Configurar en el Panel de Vercel (Recomendado)

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** (⚙️) en el menú superior
4. En el menú lateral, haz clic en **General**
5. Desplázate hasta la sección **"Root Directory"**
6. Haz clic en **"Edit"** o **"Set"**
7. Ingresa: `frontend`
8. Haz clic en **"Save"**

### Opción B: Usar la Configuración Actual (Sin Root Directory)

Si NO puedes configurar el Root Directory en el panel, el `vercel.json` actual requiere que ejecutes los comandos desde la raíz con `cd frontend`.

**Problema actual:** Vercel no encuentra la carpeta `frontend` cuando ejecuta `cd frontend`.

## 🔧 Configuración Actual de vercel.json

El archivo `vercel.json` está configurado para ejecutar desde dentro de `frontend/`:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Esta configuración asume que:**
- El Root Directory en Vercel está configurado a `frontend`
- Vercel ya está dentro de la carpeta `frontend` al ejecutar los comandos

## ✅ Verificación

Después de configurar el Root Directory a `frontend` en Vercel:

1. Haz un nuevo deploy (puedes hacer un commit vacío o usar "Redeploy" en Vercel)
2. Vercel debería:
   - Clonar el repositorio
   - Cambiar automáticamente al directorio `frontend` (por Root Directory)
   - Ejecutar `npm install` desde `frontend/`
   - Ejecutar `npm run build` desde `frontend/`
   - Encontrar la salida en `dist/`

## 🐛 Si el Error Persiste

Si después de configurar el Root Directory el error persiste:

1. **Verifica que el Root Directory esté guardado:**
   - Ve a Settings → General → Root Directory
   - Debe decir `frontend` (no vacío)

2. **Haz un redeploy completo:**
   - En Vercel, ve a Deployments
   - Haz clic en los tres puntos (...) del último deployment
   - Selecciona "Redeploy"

3. **Verifica los logs:**
   - En los logs de Vercel, verifica que muestre:
     ```
     Running "install" command: npm install...
     ```
   - NO debe decir `cd frontend && npm install`

## 📝 Notas

- El `vercel.json` está en la **raíz del proyecto**
- El Root Directory debe estar configurado a `frontend` en el panel de Vercel
- Los comandos en `vercel.json` NO incluyen `cd frontend` porque Vercel ya está en ese directorio
- El `outputDirectory` es `dist` (relativo a `frontend/`)

