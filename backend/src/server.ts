import path from 'node:path';

import { config as loadEnv } from 'dotenv';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';

import prisma from './db';
import authRoutes from './routes/authRoutes';
import clientRoutes from './routes/clientRoutes';
import healthRoutes from './routes/health';
import invoiceRoutes from './routes/invoiceRoutes';
import productRoutes from './routes/productRoutes';
import reportRoutes from './routes/reportRoutes';

const envPath = path.resolve(process.cwd(), '.env');
loadEnv({ path: envPath });

const PORT = Number(process.env.PORT) || 8089;

async function bootstrap(): Promise<void> {
    try {
        const app = express();

        app.use(cors({
            origin: '*',
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

        await prisma.$connect();
        console.log('✅ [Prisma] Conectado a PostgreSQL');

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