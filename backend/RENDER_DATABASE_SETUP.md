# Configuración de Base de Datos en Render

## 🔗 URLs de Conexión en Render

Render proporciona dos tipos de URLs para bases de datos PostgreSQL:

### 1. URL Interna (`.internal`) - Recomendada

Cuando tu servicio web y tu base de datos están en la misma cuenta de Render, puedes usar la URL interna:

```
postgresql://postgres:password@pymes-db-2rkj3h.internal:5432/PROYECTO_PYMES?schema=public
```

**Ventajas:**
- ✅ Conexión más rápida (red privada)
- ✅ No consume ancho de banda público
- ✅ Más segura (solo accesible desde servicios de Render)

**Cuándo usar:**
- Tu servicio web y base de datos están en la misma cuenta de Render
- Es la URL que Render establece automáticamente al conectar servicios

### 2. URL Externa

Si necesitas conectarte desde fuera de Render (desarrollo local, por ejemplo):

```
postgresql://postgres:password@dpg-xxxxx-a.oregon-postgres.render.com:5432/pymes_db
```

**Cuándo usar:**
- Desarrollo local
- Conexión desde otras plataformas
- Herramientas de administración externas

## ✅ Verificación de tu Configuración Actual

Tu `DATABASE_URL` actual es:

```
DATABASE_URL="postgresql://postgres:PADILLa21@pymes-db-2rkj3h.internal:5432/PROYECTO_PYMES?schema=public"
```

**Estado:** ✅ **CORRECTO**

- ✅ Formato válido (comienza con `postgresql://`)
- ✅ Host interno de Render (`.internal`)
- ✅ Puerto correcto (`5432`)
- ✅ Schema especificado (`schema=public`)

## 🔧 Configuración en Render

### Paso 1: Verificar que DATABASE_URL esté configurada

1. Ve a tu servicio de backend en Render
2. Haz clic en **"Environment"** (en el menú lateral)
3. Busca la variable `DATABASE_URL`
4. Verifica que tenga un valor (no debe estar vacía)

### Paso 2: Si DATABASE_URL no existe o está vacía

Si Render no estableció automáticamente la variable:

1. En el panel de tu base de datos PostgreSQL, ve a **"Connections"**
2. Copia la **"Internal Database URL"** (para servicios de Render) o **"External Database URL"** (para desarrollo local)
3. Ve a tu servicio de backend → **"Environment"**
4. Haz clic en **"Add Environment Variable"**
5. Nombre: `DATABASE_URL`
6. Valor: Pega la URL completa

### Paso 3: Conectar Base de Datos al Servicio Web

1. En tu servicio de backend, ve a **"Environment"**
2. En la sección **"Link Resource"** o **"Environment"**, busca opciones para conectar recursos
3. Si Render no detectó automáticamente la conexión, puedes:
   - Ir a tu base de datos → **"Connections"** → verificar que el servicio web esté listado
   - O simplemente agregar `DATABASE_URL` manualmente como variable de entorno

## 🐛 Solución de Problemas

### Error: "the URL must start with the protocol postgresql://"

**Causa:** `DATABASE_URL` está vacía o no está configurada.

**Solución:**
1. Verifica que `DATABASE_URL` exista en las variables de entorno
2. Verifica que no esté vacía (sin espacios ni caracteres)
3. Asegúrate de que el valor comience con `postgresql://`

### Error: "Connection refused" o "timeout"

**Posibles causas:**
1. La base de datos no está completamente iniciada (espera 1-2 minutos después de crearla)
2. El servicio web no puede alcanzar la base de datos

**Solución:**
1. Espera a que la base de datos esté completamente iniciada
2. Verifica que ambos servicios estén en la misma cuenta de Render
3. Intenta usar la URL interna (`.internal`) en lugar de la externa

### La base de datos se conecta pero el servicio falla

**Solución:**
1. Verifica los logs del servicio en Render
2. Busca errores de migraciones de Prisma
3. Asegúrate de ejecutar `npx prisma migrate deploy` en el build (si es necesario)

## 📋 Checklist de Configuración

- [ ] Base de datos PostgreSQL creada en Render
- [ ] Servicio web de backend creado en Render
- [ ] `DATABASE_URL` configurada en las variables de entorno del servicio web
- [ ] `DATABASE_URL` comienza con `postgresql://`
- [ ] La URL no está vacía ni tiene espacios extra
- [ ] Si usas URL interna (`.internal`), ambos servicios están en la misma cuenta
- [ ] `NODE_ENV=production` configurado
- [ ] `JWT_SECRET` configurado con un valor seguro

## 🔍 Verificar que Todo Funciona

Después de desplegar, verifica la conexión:

```bash
# Hacer una petición al endpoint de salud
curl https://tu-backend.onrender.com/api/v1/status
```

Deberías recibir:

```json
{
  "status": "operational",
  "database": {
    "type": "PostgreSQL",
    "connected": true
  },
  "timestamp": "2024-..."
}
```

## 📝 Notas Importantes

1. **URLs internas (`.internal`)**: Solo funcionan entre servicios de Render en la misma cuenta. No funcionan desde tu máquina local.

2. **Variables de entorno**: Render puede establecer `DATABASE_URL` automáticamente cuando conectas servicios, pero a veces necesitas agregarla manualmente.

3. **Contraseñas**: Las contraseñas en las URLs son generadas automáticamente por Render. No las cambies manualmente.

4. **Migraciones**: Si necesitas ejecutar migraciones de Prisma en producción, considera agregar un comando de build que ejecute `npx prisma migrate deploy`.

