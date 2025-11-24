# 🔧 Solución al Error P1001: Can't reach database server

## ❌ Error Actual

```
PrismaClientInitializationError: Can't reach database server at `db.gmocqnaslfqyomaoohpc.supabase.co:5432`
errorCode: 'P1001'
```

Este error significa que **no se puede establecer la conexión TCP** con Supabase. No es un error de autenticación.

## 🔍 Posibles Causas y Soluciones

### 1. ⚠️ Caracteres Especiales en la Contraseña (MÁS PROBABLE)

Tu contraseña tiene un asterisco (`*`): `19PADILLa21*2025`

**Solución:** Codifica el asterisco en la URL como `%2A`

**URL Original (con asterisco):**
```
postgresql://postgres:19PADILLa21*2025@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**URL Corregida (asterisco codificado):**
```
postgresql://postgres:19PADILLa21%2A2025@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**Pasos:**
1. Ve a Render → Environment → `DATABASE_URL`
2. Reemplaza `19PADILLa21*2025` con `19PADILLa21%2A2025`
3. Guarda y espera el redeploy

### 2. 🔒 Configuración de Supabase

**Verificar Connection String en Supabase:**

1. Ve a tu proyecto en Supabase
2. Settings → Database
3. En "Connection string", asegúrate de seleccionar:
   - **"URI"** (no "Session mode" ni "Transaction mode")
   - **"Direct connection"** (no "Connection pooling")
4. Copia la URL completa

**Verificar IP Allowlist:**

1. En Supabase → Settings → Database
2. Busca "Connection pooling" o "Network restrictions"
3. Si hay restricciones de IP, agrega las IPs de Render o desactívalas temporalmente

### 3. 🌐 Problemas de Red

**Verificar que el host sea correcto:**

Tu host actual: `db.gmocqnaslfqyomaoohpc.supabase.co`

1. Verifica en Supabase que este sea el host correcto
2. Asegúrate de que el puerto sea `5432`
3. Verifica que `sslmode=require` esté al final de la URL

### 4. 🔐 Configuración SSL

Asegúrate de que la URL termine con `?sslmode=require`:

```
...postgres?sslmode=require
```

## ✅ Solución Recomendada (Paso a Paso)

### Paso 1: Codificar el Asterisco

En Render, actualiza `DATABASE_URL` con el asterisco codificado:

```
postgresql://postgres:19PADILLa21%2A2025@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

### Paso 2: Verificar en Supabase

1. Ve a Supabase → Settings → Database
2. En "Connection string", selecciona **"URI"**
3. Verifica que la URL que copiaste sea correcta
4. Si es diferente, usa la que muestra Supabase

### Paso 3: Verificar la Configuración

Después del redeploy, revisa los logs. Deberías ver:

```
📊 [Prisma] DATABASE_URL configurada:
   🔗 Host: db.gmocqnaslfqyomaoohpc.supabase.co:5432
   📍 Tipo: Supabase
   🔒 SSL: Requerido (sslmode=require)
   ✅ Formato: Correcto
🔄 [Prisma] Intentando conectar a PostgreSQL...
✅ [Prisma] Conectado a PostgreSQL exitosamente
```

## 🔄 Si Aún No Funciona

### Opción A: Resetear la Contraseña (sin caracteres especiales)

1. En Supabase → Settings → Database
2. Haz clic en "Reset database password"
3. Genera una contraseña **sin caracteres especiales** (solo letras y números)
4. Usa esa contraseña en la URL

### Opción B: Verificar la URL Completa en Supabase

1. En Supabase → Settings → Database
2. En "Connection string", selecciona "URI"
3. Copia la URL completa que muestra
4. Reemplaza solo la contraseña con tu contraseña (codificando caracteres especiales)
5. Pega esa URL en Render

### Opción C: Usar Connection Pooling (Alternativa)

Si el problema persiste, intenta usar Connection Pooling:

1. En Supabase → Settings → Database
2. En "Connection string", selecciona "Connection pooling"
3. Copia la URL (tendrá un puerto diferente, como `6543`)
4. Usa esa URL en Render

**Nota:** Connection Pooling usa un puerto diferente y puede requerir ajustes adicionales.

## 📋 Checklist de Verificación

- [ ] El asterisco (`*`) está codificado como `%2A` en la URL
- [ ] La URL termina con `?sslmode=require`
- [ ] El host es correcto: `db.gmocqnaslfqyomaoohpc.supabase.co`
- [ ] El puerto es `5432`
- [ ] La base de datos es `postgres`
- [ ] El usuario es `postgres`
- [ ] En Supabase, la connection string está en modo "URI" y "Direct connection"
- [ ] No hay restricciones de IP bloqueando Render

## 🎯 URL Final Recomendada

```
postgresql://postgres:19PADILLa21%2A2025@db.gmocqnaslfqyomaoohpc.supabase.co:5432/postgres?sslmode=require
```

**Copia y pega esta URL en Render → Environment → DATABASE_URL**

