# PyMes Desktop

Aplicación de escritorio para PyMes - Sistema de gestión contable para pequeñas y medianas empresas.

## Requisitos

- Node.js 16 o superior
- npm o yarn
- El frontend debe estar ejecutándose en `http://localhost:5173`

## Instalación

1. Instala las dependencias:

```bash
npm install
```

## Uso

### Modo Desarrollo

1. Asegúrate de que el frontend esté ejecutándose:

```bash
cd ../frontend
npm run dev
```

2. En otra terminal, inicia la aplicación Electron:

```bash
cd desktop-app
npm start
```

O con las herramientas de desarrollo automáticamente abiertas:

```bash
npm run dev
```

### Construir Aplicación

Para generar los ejecutables:

```bash
npm run build
```

Para generar solo el instalador de Windows:

```bash
npm run build:win
```

Los ejecutables se generarán en la carpeta `dist/`.

## Configuración

### Cambiar la URL del Frontend

Puedes cambiar la URL del frontend estableciendo la variable de entorno `FRONTEND_URL`:

```bash
# Windows (PowerShell)
$env:FRONTEND_URL="http://localhost:3000"; npm start

# Windows (CMD)
set FRONTEND_URL=http://localhost:3000 && npm start

# Linux/Mac
FRONTEND_URL=http://localhost:3000 npm start
```

O modifica directamente la variable `FRONTEND_URL` en `main.js`.

## Estructura del Proyecto

```
desktop-app/
├── main.js          # Archivo principal de Electron
├── preload.js       # Script de precarga (seguridad)
├── package.json     # Configuración del proyecto
└── assets/          # Recursos (iconos, etc.)
    └── icon.png     # Icono de la aplicación
```

## Notas

- La aplicación carga el frontend desde `http://localhost:5173` por defecto
- Asegúrate de que el frontend esté ejecutándose antes de iniciar la aplicación de escritorio
- En modo desarrollo, las DevTools se abren automáticamente
