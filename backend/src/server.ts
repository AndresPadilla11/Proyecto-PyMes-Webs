import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import healthRoutes from './routes/health';
import invoiceRoutes from './routes/invoiceRoutes';
import productRoutes from './routes/productRoutes';
import reportRoutes from './routes/reportRoutes';

// Solo cargar .env en desarrollo (en producción, Render proporciona las variables de entorno)
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
    const envPath = path.resolve(process.cwd(), '.env');
    loadEnv({ path: envPath });
}

// Validar DATABASE_URL ANTES de importar Prisma (que se ejecuta inmediatamente)
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || databaseUrl.trim() === '') {
    if (isProduction) {
        console.error('❌ [Server] DATABASE_URL no está configurado en Render.');
        console.error('💡 Pasos para solucionarlo:');
        console.error('   1. Ve a tu servicio en Render → Settings → Environment');
        console.error('   2. Haz clic en "Add Environment Variable"');
        console.error('   3. Nombre: DATABASE_URL');
        console.error('   4. Si conectaste una BD PostgreSQL en Render, DATABASE_URL se establece automáticamente');
        console.error('   5. Si usas Supabase, copia la connection string completa (con sslmode=require)');
        console.error('   6. Formato: postgresql://usuario:contraseña@host:puerto/nombre_bd?schema=public');
    } else {
        console.error('❌ [Server] DATABASE_URL no está configurado.');
        console.error('💡 Crea un archivo .env en backend/ con: DATABASE_URL="postgresql://..."');
    }
    process.exit(1);
}

// Importar Prisma DESPUÉS de validar DATABASE_URL
// eslint-disable-next-line @typescript-eslint/no-require-imports
const prisma = require('./db').default;

const PORT = Number(process.env.PORT) || 8089;

async function bootstrap(): Promise<void> {
    try {
        const app = express();

        // Configuración de CORS
        // Permite conexiones desde Vercel, localhost y otros orígenes
        const allowedOrigins = [
            'https://proyecto-pymes-webs.vercel.app', // Frontend en Vercel
            'http://localhost:5173', // Vite dev server
            'http://localhost:3000', // React dev server alternativo
            'http://localhost:8080', // Puerto alternativo
            process.env.FRONTEND_URL // Variable de entorno para custom URL
        ].filter(Boolean) as string[];

        app.use(cors({
            origin: (origin, callback) => {
                // Permitir requests sin origin (mobile apps, Postman, etc.)
                if (!origin) {
                    return callback(null, true);
                }
                // Permitir si está en la lista de orígenes permitidos
                if (allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
                    return callback(null, true);
                }
                // En producción, ser más estricto
                if (isProduction) {
                    return callback(new Error('Not allowed by CORS'));
                }
                // En desarrollo, permitir todo
                return callback(null, true);
            },
            credentials: false,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
            exposedHeaders: ['Content-Type', 'Authorization']
        }));

        app.use(helmet());
        app.use(express.json());

        app.use('/api/v1/health', healthRoutes);
        app.use('/api/v1/auth', authRoutes);
        app.use('/api/v1/clients', clientRoutes);
        app.use('/api/v1/invoices', invoiceRoutes);
        app.use('/api/v1/products', productRoutes);
        app.use('/api/v1/reports', reportRoutes);

        app.get('/', (_req, res) => {
            res.json({ message: 'Backend PyMes Operativo 🚀' });
        });

        app.get('/api/v1/status', async (_req, res) => {
            try {
                await prisma.$queryRaw`SELECT 1`;
                
                res.json({
                    status: 'operational',
                    database: {
                        type: 'PostgreSQL',
                        connected: true
                    },
                    timestamp: new Date().toISOString()
                });
            } catch (error) {
                res.status(500).json({
                    status: 'error',
                    database: {
                        type: 'PostgreSQL',
                        connected: false
                    },
                    error: error instanceof Error ? error.message : 'Error desconocido'
                });
            }
        });

        // Intentar conectar a la base de datos
        console.log('🔄 [Prisma] Intentando conectar a PostgreSQL...');
        try {
            await prisma.$connect();
            
            // Verificar la conexión con una query simple
            await prisma.$queryRaw`SELECT 1 as connected`;
            console.log('✅ [Prisma] Conectado a PostgreSQL exitosamente');
        } catch (connectError) {
            // Manejo específico de errores de conexión
            if (connectError instanceof Error) {
                const errorCode = (connectError as { code?: string; errorCode?: string }).errorCode || 
                                 (connectError as { code?: string }).code;
                
                if (errorCode === 'P1001') {
                    console.error('❌ [Prisma] Error P1001: No se puede alcanzar el servidor de base de datos');
                    console.error('💡 Posibles causas:');
                    console.error('   1. La contraseña tiene caracteres especiales que necesitan codificación URL');
                    console.error('   2. Supabase está bloqueando conexiones (verifica IP allowlist)');
                    console.error('   3. El host o puerto son incorrectos');
                    console.error('   4. Problemas de red entre Render y Supabase');
                    console.error('');
                    console.error('🔧 Soluciones:');
                    console.error('   1. Si tu contraseña tiene *, @, #, etc., codifícalos en la URL:');
                    console.error('      * = %2A, @ = %40, # = %23, % = %25');
                    console.error('   2. En Supabase → Settings → Database → Connection pooling');
                    console.error('      Verifica que "Connection string" esté en modo "Direct connection"');
                    console.error('   3. Verifica que la URL tenga sslmode=require al final');
                }
            }
            throw connectError;
        }

        const HOST = process.env.HOST || '0.0.0.0';

        const server = app.listen(PORT, HOST, () => {
            console.log(`✅ [Express] Servidor corriendo en http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
            if (HOST === '0.0.0.0') {
                console.log(`🌐 [Express] Accesible desde la red local e internet`);
            }
        });

    } catch (error) {
        console.error('❌ Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
}

void bootstrap();

// TAREA 105: Forzando detección de Git.