/**
 * Archivo principal de Electron para PyMes Desktop
 * Este archivo maneja la creación y gestión de la ventana principal de la aplicación
 */

const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Determinar si estamos en desarrollo o producción
const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

// URL del servidor de desarrollo (solo para modo desarrollo)
const FRONTEND_DEV_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Ruta al frontend compilado local
// En producción empaquetada: los archivos de frontend/dist están en la misma raíz que main.js
// En desarrollo no empaquetado: están en ../frontend/dist
// Usar protocolo file:// para cargar archivos locales
const getFrontendPath = () => {
  if (app.isPackaged) {
    // Aplicación empaquetada: archivos en la raíz de resources/app (o resources/app.asar)
    // Intentar múltiples ubicaciones posibles
    const possiblePaths = [
      path.join(__dirname, 'index.html'),           // Recursos normales (archivos copiados a la raíz)
      path.join(process.resourcesPath, 'app', 'index.html'),  // Si está fuera de asar
      path.join(__dirname, '..', 'app', 'index.html')         // Alternativa
    ];
    
    // Retornar la primera ruta que exista, o la primera si ninguna existe (para mostrar error)
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        console.log(`✅ Frontend encontrado en: ${possiblePath}`);
        return possiblePath;
      }
    }
    
    // Si ninguna existe, retornar la primera como fallback (mostrará error)
    console.warn(`⚠️  No se encontró index.html en ninguna ubicación esperada`);
    return possiblePaths[0];
  } else {
    // Desarrollo: archivos en ../frontend/dist
    return path.join(__dirname, '..', 'frontend', 'dist', 'index.html');
  }
};

const FRONTEND_BUILD_PATH = getFrontendPath();

// Referencia global a la ventana principal
let mainWindow = null;

/**
 * Crea la ventana principal de la aplicación
 */
function createWindow() {
  // Crear la ventana del navegador
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#ffffff',
    icon: (() => {
      const icoPath = path.join(__dirname, 'assets', 'icon.ico');
      const pngPath = path.join(__dirname, 'assets', 'icon.png');
      if (fs.existsSync(icoPath)) return icoPath;
      if (fs.existsSync(pngPath)) return pngPath;
      return undefined; // Usar icono por defecto de Electron
    })(),
    webPreferences: {
      nodeIntegration: false, // Por seguridad, no exponer Node.js en el renderer
      contextIsolation: true, // Aislar el contexto del renderer
      preload: path.join(__dirname, 'preload.js'), // Script de precarga si es necesario
      webSecurity: true // Habilitar seguridad web
    },
    show: true, // Mostrar inmediatamente para evitar que se quede invisible
    titleBarStyle: 'default',
    frame: true // Con barra de título estándar de Windows
  });

  // IMPORTANTE: Mostrar la ventana después de un breve delay como fallback
  // Esto asegura que siempre se muestre, incluso si hay errores de carga
  let showWindowTimeout = setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      console.warn('⚠️  [FALLBACK] Timeout: asegurando visibilidad después de 2 segundos');
      try {
        if (!mainWindow.isVisible()) {
          console.log('🔧 Forzando visibilidad de la ventana...');
          mainWindow.show();
        }
        mainWindow.focus();
        mainWindow.moveTop(); // Asegurar que esté en la parte superior
        // Abrir DevTools automáticamente para depuración en producción
        if (!isDev) {
          mainWindow.webContents.openDevTools();
        }
      } catch (err) {
        console.error('❌ Error al mostrar ventana:', err);
      }
    }
  }, 1500); // Reducido a 1.5 segundos para respuesta más rápida

  // Función auxiliar para mostrar la ventana
  const showWindow = () => {
    if (showWindowTimeout) {
      clearTimeout(showWindowTimeout);
      showWindowTimeout = null;
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        if (!mainWindow.isVisible()) {
          console.log('✅ Mostrando ventana...');
          mainWindow.show();
          mainWindow.focus();
          mainWindow.moveTop(); // Asegurar que esté en la parte superior
        }
        
        // En modo desarrollo, abrir DevTools automáticamente
        // En producción, abrir DevTools solo si hay un error
        if (isDev) {
          mainWindow.webContents.openDevTools();
        }
      } catch (err) {
        console.error('❌ Error al mostrar ventana:', err);
      }
    }
  };

  // Cargar el frontend compilado localmente usando protocolo file://
  // En modo desarrollo (con --dev flag), usar el servidor Vite
  if (isDev) {
    // Modo desarrollo: cargar desde el servidor Vite
    console.log(`🔧 [Modo Desarrollo] Cargando desde servidor Vite: ${FRONTEND_DEV_URL}`);
    mainWindow.loadURL(FRONTEND_DEV_URL).catch((error) => {
      console.error('❌ Error al cargar URL de desarrollo:', error);
      showWindow(); // Mostrar ventana incluso con error
    });
  } else {
    // Modo producción: cargar desde archivos compilados locales (file://)
    console.log(`📦 [Modo Producción]`);
    console.log(`📦 __dirname: ${__dirname}`);
    console.log(`📦 app.isPackaged: ${app.isPackaged}`);
    console.log(`📦 process.resourcesPath: ${process.resourcesPath || 'N/A'}`);
    console.log(`📦 Cargando desde: ${FRONTEND_BUILD_PATH}`);
    
    // Listar archivos en __dirname para depuración
    try {
      const files = fs.readdirSync(__dirname);
      console.log(`📦 Archivos en __dirname (${__dirname}):`, files.slice(0, 10));
    } catch (err) {
      console.warn(`⚠️  No se pudieron listar archivos en __dirname:`, err.message);
    }
    
    if (fs.existsSync(FRONTEND_BUILD_PATH)) {
      console.log(`✅ Archivo index.html encontrado, cargando...`);
      // Usar loadFile para cargar archivos locales con protocolo file://
      mainWindow.loadFile(FRONTEND_BUILD_PATH).catch((error) => {
        console.error('❌ Error al cargar archivo local:', error);
        showWindow(); // Mostrar ventana incluso con error
        
        // Abrir DevTools para ver el error
        mainWindow.webContents.openDevTools();
        
        // Mostrar mensaje de error en la ventana después de que se cargue algo
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`
            if (document.body) {
              document.body.innerHTML = \`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f8f9fa;">
                  <h1 style="color: #e74c3c; margin-bottom: 20px;">Error al Cargar Frontend</h1>
                  <p style="color: #555; margin-bottom: 10px;">No se pudo cargar el archivo:</p>
                  <code style="background: #fff; padding: 10px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #ddd; word-break: break-all; max-width: 80%;">${String(error.message || error).substring(0, 200)}</code>
                  <p style="color: #777; margin-top: 20px; font-size: 12px;">Revisa la consola de desarrollador para más detalles</p>
                </div>
              \`;
            }
          `).catch((err) => console.error('Error al mostrar mensaje:', err));
        }, 1000);
      });
    } else {
      console.error(`❌ No se encontró el frontend compilado en: ${FRONTEND_BUILD_PATH}`);
      console.warn(`⚠️  Asegúrate de compilar el frontend primero: cd ../frontend && npm run build`);
      
      // Mostrar la ventana inmediatamente con mensaje de error
      showWindow();
      
      // Abrir DevTools para depuración
      mainWindow.webContents.openDevTools();
      
      // Cargar una página en blanco primero
      mainWindow.loadURL('data:text/html,<html><head><title>Error</title></head><body></body></html>').then(() => {
        // Esperar un momento y luego mostrar el mensaje
        setTimeout(() => {
          mainWindow.webContents.executeJavaScript(`
            document.body.innerHTML = \`
              <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f8f9fa;">
                <h1 style="color: #e74c3c; margin-bottom: 20px;">Frontend No Encontrado</h1>
                <p style="color: #555; margin-bottom: 10px;">No se encontró el archivo index.html en:</p>
                <code style="background: #fff; padding: 10px; border-radius: 4px; margin-bottom: 20px; border: 1px solid #ddd; word-break: break-all; max-width: 90%;">${FRONTEND_BUILD_PATH}</code>
                <p style="color: #777; margin-bottom: 10px;">__dirname: ${__dirname}</p>
                <p style="color: #777; margin-bottom: 20px;">app.isPackaged: ${app.isPackaged}</p>
              </div>
            \`;
          `).catch((err) => console.error('Error al mostrar mensaje:', err));
        }, 500);
      }).catch((err) => {
        console.error('Error al cargar página de error:', err);
      });
    }
  }

  // Asegurar que la ventana esté siempre visible
  mainWindow.once('ready-to-show', () => {
    console.log('✅ ready-to-show disparado');
    showWindow();
  });
  
  // También asegurar visibilidad cuando la página termine de cargar
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ did-finish-load disparado');
    showWindow(); // Asegurar que siempre esté visible
  });
  
  // Evento adicional: cuando el DOM esté listo
  mainWindow.webContents.once('dom-ready', () => {
    console.log('✅ dom-ready disparado');
    showWindow();
  });

  // Manejar errores de carga
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('❌ Error al cargar la URL:', {
      errorCode,
      errorDescription,
      validatedURL
    });
    
    // Asegurarse de que la ventana sea visible para mostrar el error
    showWindow();
    
    // Si no puede cargar el frontend, mostrar un mensaje
    const errorMessage = isDev 
      ? `<p style="color: #777; margin-bottom: 20px;">Asegúrate de que el servidor de desarrollo esté ejecutándose en:</p>
         <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; margin-bottom: 20px;">${FRONTEND_DEV_URL}</code>
         <p style="color: #777;">Para iniciar el frontend, ejecuta en la carpeta 'frontend':</p>
         <code style="background: #f4f4f4; padding: 10px; border-radius: 4px;">npm run dev</code>`
      : `<p style="color: #777; margin-bottom: 20px;">No se encontró el frontend compilado en:</p>
         <code style="background: #f4f4f4; padding: 10px; border-radius: 4px; margin-bottom: 20px; word-break: break-all;">${FRONTEND_BUILD_PATH}</code>
         <p style="color: #777;">Por favor, compila el frontend ejecutando en la carpeta 'frontend':</p>
         <code style="background: #f4f4f4; padding: 10px; border-radius: 4px;">npm run build</code>
         <p style="color: #777; margin-top: 20px; font-size: 12px;">Código de error: ${errorCode} - ${errorDescription}</p>`;

    // Esperar a que la página esté lista antes de inyectar HTML
    setTimeout(() => {
      mainWindow.webContents.executeJavaScript(`
        if (document.body) {
          document.body.innerHTML = \`
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial, sans-serif; padding: 20px; text-align: center; background: #f8f9fa;">
              <h1 style="color: #e74c3c; margin-bottom: 20px;">Error de Conexión</h1>
              <p style="color: #555; margin-bottom: 10px;">No se pudo cargar el frontend.</p>
              ${errorMessage}
            </div>
          \`;
        }
      `).catch((err) => console.error('Error al mostrar mensaje de error:', err));
    }, 500);
  });

  // Manejar cuando la ventana se cierra
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Manejar navegación a URLs externas (abrir en navegador externo)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  // Crear el menú de la aplicación
  createMenu();
}

/**
 * Crea el menú de la aplicación
 */
function createMenu() {
  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Cerrar',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Forzar Recarga' },
        { role: 'toggleDevTools', label: 'Herramientas de Desarrollo' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Zoom Normal' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla Completa' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de PyMes Desktop',
          click: () => {
            require('electron').dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de PyMes Desktop',
              message: 'PyMes Desktop v1.0.0',
              detail: 'Sistema de gestión contable para pequeñas y medianas empresas.\n\nDesarrollado con Electron y React.'
            });
          }
        }
      ]
    }
  ];

  // En macOS, agregar menú de aplicación
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about', label: 'Acerca de' },
        { type: 'separator' },
        { role: 'services', label: 'Servicios' },
        { type: 'separator' },
        { role: 'hide', label: 'Ocultar' },
        { role: 'hideOthers', label: 'Ocultar Otros' },
        { role: 'unhide', label: 'Mostrar Todo' },
        { type: 'separator' },
        { role: 'quit', label: 'Salir' }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * Maneja el evento cuando Electron está listo
 */
app.whenReady().then(() => {
  console.log('🚀 Electron está listo, creando ventana...');
  createWindow();

  // En macOS, recrear la ventana cuando se hace clic en el icono del dock
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('🔄 Recreando ventana desde activate...');
      createWindow();
    } else {
      // Si hay una ventana pero está oculta, mostrarla
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(win => {
        if (win && !win.isDestroyed() && !win.isVisible()) {
          win.show();
          win.focus();
        }
      });
    }
  });
}).catch((error) => {
  console.error('❌ Error fatal al inicializar Electron:', error);
  // Intentar mostrar un diálogo de error
  const { dialog } = require('electron');
  dialog.showErrorBox('Error Fatal', `No se pudo iniciar la aplicación: ${error.message || error}`);
});

/**
 * Maneja el evento cuando todas las ventanas están cerradas
 */
app.on('window-all-closed', () => {
  // En macOS, mantener la aplicación activa incluso cuando todas las ventanas están cerradas
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * Maneja el evento antes de que la aplicación se cierre
 */
app.on('before-quit', () => {
  // Aquí puedes agregar lógica de limpieza si es necesario
  console.log('Cerrando PyMes Desktop...');
});

/**
 * Maneja el evento cuando la aplicación se cierra completamente
 */
app.on('will-quit', () => {
  // Aquí puedes agregar lógica de limpieza final si es necesario
  console.log('PyMes Desktop cerrado');
});

/**
 * Maneja errores no capturados
 */
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  // Asegurarse de que la ventana sea visible para ver el error
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    // En producción, abrir DevTools para depuración
    if (!isDev) {
      mainWindow.webContents.openDevTools();
    }
  }
});

/**
 * Maneja rechazos de promesas no manejados
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  // Asegurarse de que la ventana sea visible
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
  }
});

// Manejar eventos IPC si es necesario
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});
