# 🔧 Cómo Configurar Supabase en Render

## 📋 Tu URL de Supabase

Tu URL actual tiene asteriscos en la contraseña:

```
postgresql://postgres:PADILLa2122**@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANTE:** Debes reemplazar los `**` con tu contraseña real de Supabase.

## 🔑 Paso 1: Obtener tu Contraseña Real de Supabase

### Opción A: Desde el Panel de Supabase

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Haz clic en tu proyecto
3. Ve a **"Settings"** (⚙️) en el menú lateral
4. Haz clic en **"Database"**
5. Desplázate hasta la sección **"Connection string"**
6. Selecciona **"URI"** (no "Session mode" ni "Transaction mode")
7. **IMPORTANTE:** La contraseña NO se muestra por seguridad
8. Si olvidaste tu contraseña, debes resetearla (ver Opción B)

### Opción B: Resetear la Contraseña de la Base de Datos

Si no recuerdas tu contraseña:

1. En Supabase, ve a **"Settings"** → **"Database"**
2. Desplázate hasta **"Database password"**
3. Haz clic en **"Reset database password"**
4. Copia la nueva contraseña que se genera
5. **⚠️ GUARDA ESTA CONTRASEÑA** - no podrás verla de nuevo

## 🔗 Paso 2: Construir la URL Completa

Una vez que tengas tu contraseña real, construye la URL así:

```
postgresql://postgres:TU_CONTRASEÑA_AQUI@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**Ejemplo** (si tu contraseña es `MiPassword123`):

```
postgresql://postgres:MiPassword123@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**⚠️ IMPORTANTE:**
- Reemplaza `TU_CONTRASEÑA_AQUI` con tu contraseña real (sin asteriscos)
- Asegúrate de incluir `?sslmode=require` al final (ya está incluido)
- NO incluyas espacios antes o después de la URL

## 🔧 Paso 3: Configurar en Render

1. Ve a tu servicio de backend en Render
2. Haz clic en **"Environment"** en el menú lateral
3. Busca la variable `DATABASE_URL`
4. Si existe, haz clic en el ícono de **editar** (✏️) o haz clic en el valor
5. Pega la URL completa con tu contraseña real:

```
postgresql://postgres:TU_CONTRASEÑA_REAL@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

6. Haz clic en **"Save Changes"** o **"Update"**

## ✅ Paso 4: Verificar la Configuración

Después de configurar:

1. Render hará un redeploy automático
2. Ve a **"Logs"** en tu servicio
3. Busca estos mensajes:

```
📊 [Prisma] DATABASE_URL configurada:
   🔗 Host: db.gmocqnaslfqyomaoohpc.supabase.co:5432
   📍 Tipo: Supabase
   🔒 SSL: Requerido (sslmode=require)
   ✅ Formato: Correcto
🔄 [Prisma] Intentando conectar a PostgreSQL...
✅ [Prisma] Conectado a PostgreSQL exitosamente
```

Si ves estos mensajes, la conexión está funcionando correctamente.

## 🐛 Solución de Problemas

### Error: "password authentication failed"

**Causa:** La contraseña en la URL es incorrecta.

**Solución:**
1. Verifica que copiaste la contraseña correctamente (sin espacios)
2. Si usaste "Reset database password", asegúrate de usar la nueva contraseña
3. Reconstruye la URL completa con la contraseña correcta

### Error: "connection refused" o "timeout"

**Causa:** Problemas de conectividad o la base de datos no está disponible.

**Solución:**
1. Verifica que tu proyecto de Supabase esté activo
2. Verifica que la URL del host sea correcta: `db.gmocqnaslfqyomaoohpc.supabase.co`
3. Asegúrate de que el puerto sea `5432`

### Error: "SSL connection required"

**Causa:** Falta el parámetro `sslmode=require` en la URL.

**Solución:**
Asegúrate de que tu URL termine con `?sslmode=require`:

```
...postgres?sslmode=require
```

### La URL tiene caracteres especiales en la contraseña

Si tu contraseña tiene caracteres especiales (`@`, `#`, `%`, `&`, etc.), debes codificarlos:

| Carácter | Código URL |
|----------|------------|
| `@` | `%40` |
| `#` | `%23` |
| `%` | `%25` |
| `&` | `%26` |
| `+` | `%2B` |
| `=` | `%3D` |

**Ejemplo:**
Si tu contraseña es `Pass@word#123`, la URL sería:
```
postgresql://postgres:Pass%40word%23123@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

## 📝 Resumen de tu Configuración

**Host de Supabase:** `db.gmocqnaslfqyomaoohpc.supabase.co`  
**Puerto:** `5432`  
**Base de datos:** `postgres`  
**Usuario:** `postgres`  
**SSL:** Requerido (`sslmode=require`)

**URL Final (reemplaza PASSWORD con tu contraseña real):**
```
postgresql://postgres:PASSWORD@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

## 🔒 Seguridad

- **NUNCA** compartas tu contraseña de base de datos
- **NUNCA** subas archivos `.env` con contraseñas a Git
- La contraseña solo debe estar en las variables de entorno de Render
- Si sospechas que tu contraseña fue comprometida, resétala inmediatamente en Supabase

