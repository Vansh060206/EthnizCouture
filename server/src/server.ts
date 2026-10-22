import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { config } from './config';
import prisma from './prisma';
import { logger } from './utils/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { requestLoggerMiddleware } from './middleware/requestLogger';
import { timeoutMiddleware } from './middleware/timeout';
import { apiLimiter } from './middleware/rateLimiter';
import { cacheService } from './services/cacheService';
import { metricsService } from './services/metricsService';
import { backgroundQueue } from './services/backgroundQueue';

// Import Routes
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import categoryRoutes from './routes/categoryRoutes';
import cartRoutes from './routes/cartRoutes';
import orderRoutes from './routes/orderRoutes';
import paymentRoutes from './routes/paymentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import couponRoutes from './routes/couponRoutes';
import userRoutes from './routes/userRoutes';
import contentRoutes from './routes/contentRoutes';
import adminRoutes from './routes/adminRoutes';
import locationRoutes from './routes/locationRoutes';
import {
  handleStripeWebhook,
  handleRazorpayWebhook,
  createRazorpayOrder,
  verifyRazorpayPayment
} from './controllers/paymentController';

const app = express();

// Trust reverse proxy (e.g. Nginx, Cloudflare, AWS ALB) for accurate client IP in rate limiting & logs
app.set('trust proxy', 1);

// Security Headers (Helmet)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: config.isDev ? false : undefined
  })
);

// High-Performance Compression (gzip/deflate for payloads > 1KB)
app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req: any, res: any) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    }
  })
);

// Request Tracing & Structured Logging Middleware
app.use(requestIdMiddleware);
app.use(requestLoggerMiddleware);

// Bounded Request Timeout Middleware (15s default)
app.use(timeoutMiddleware(config.requestTimeoutMs));

// CORS Configuration
app.use(
  cors({
    origin: (origin: any, callback: any) => {
      if (!origin) return callback(null, true);
      const allowed = [config.clientUrl, ...config.corsOrigins];
      if (allowed.some((allowedOrigin) => origin.startsWith(allowedOrigin) || allowedOrigin === '*')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive in dev/testing
    },
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'X-Cache', 'RateLimit-Limit', 'RateLimit-Remaining']
  })
);

// Dedicated Stripe & Razorpay Webhook Endpoints: Must be mounted before standard express.json()
// to receive the unparsed raw request body required for cryptographic HMAC signature verification
app.post(
  ['/api/payments/webhook', '/api/webhooks/stripe'],
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

app.post(
  ['/api/payments/webhook/razorpay', '/api/webhooks/razorpay'],
  express.raw({ type: 'application/json' }),
  handleRazorpayWebhook
);

app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res: any, buf: any) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static media delivery with browser & CDN caching headers (7-day max-age with ETag)
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use(
  '/uploads',
  express.static(uploadDir, {
    maxAge: '7d',
    etag: true,
    lastModified: true,
    immutable: false,
    setHeaders: (res: any) => {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
    }
  })
);

// Apply Global Baseline Rate Limiting to all /api/ endpoints
app.use('/api', apiLimiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.post('/api/create-order', apiLimiter, createRazorpayOrder);
app.post('/api/verify-payment', apiLimiter, verifyRazorpayPayment);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/users', userRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/location', locationRoutes);

// Comprehensive Production Health & Readiness Probe
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'healthy';
  let dbLatencyMs = 0;

  try {
    const start = Date.now();
    await prisma.$queryRawUnsafe('SELECT 1');
    dbLatencyMs = Date.now() - start;
  } catch (err: any) {
    dbStatus = 'unhealthy';
    logger.error('Health check database probe failed', err);
  }

  const isHealthy = dbStatus === 'healthy';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    brand: 'EthnizCouture',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs
    },
    cache: cacheService.getStats(),
    memory: {
      heapUsedMb: Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 100) / 100
    }
  });
});

// Observability Metrics Endpoint (Monitors request rates, latencies, status codes)
app.get('/api/metrics', (_req: Request, res: Response) => {
  res.json({
    brand: 'EthnizCouture',
    timestamp: new Date().toISOString(),
    metrics: metricsService.getMetrics(),
    cache: cacheService.getStats()
  });
});

// 404 Handler for unknown API endpoints
app.all(['/api', '/api/*'], (req: Request, res: Response) => {
  res.status(404).json({
    message: `API endpoint ${req.method} ${req.originalUrl} not found`,
    code: 'NOT_FOUND'
  });
});

// Production Client Static Serving (Supports single-service unified deployments on Render, Railway, VPS)
const clientDistPath = path.resolve(__dirname, '../../client/dist');
const altClientDistPath = path.resolve(__dirname, '../client/dist');
const resolvedClientDist = fs.existsSync(clientDistPath) ? clientDistPath : (fs.existsSync(altClientDistPath) ? altClientDistPath : null);

if (resolvedClientDist) {
  app.use(express.static(resolvedClientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(resolvedClientDist, 'index.html'));
  });
} else {
  // Standalone API mode 404 handler for non-API routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      message: `Resource ${req.method} ${req.originalUrl} not found`,
      code: 'NOT_FOUND'
    });
  });
}

// Global Error Handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled Server Error', err, {
    requestId: req.id,
    url: req.originalUrl,
    method: req.method
  });

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    message: err.message || 'An unexpected error occurred on the server',
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.id,
    ...(config.isDev ? { stack: err.stack } : {})
  });
});

// Server Lifecycle Management & Graceful Shutdown
let server: any = null;

const isTestEnvironment =
  process.env.NODE_ENV === 'test' ||
  process.argv.includes('--test') ||
  Boolean(process.env.npm_lifecycle_event && process.env.npm_lifecycle_event.includes('test'));

if (!isTestEnvironment) {
  server = app.listen(config.port, '0.0.0.0', () => {
    logger.info(`✨ EthnizCouture Luxury Production API running on port ${config.port} [${config.nodeEnv}]`);
    logger.info(`✨ Cache active, rate limiting enabled, background queue initialized.`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    const shutdownTimeout = setTimeout(() => {
      logger.error('Graceful shutdown timed out (10s limit exceeded). Forcing exit.');
      process.exit(1);
    }, 10000);

    try {
      // 1. Stop background queue polling
      await backgroundQueue.stop();

      // 2. Close HTTP server to stop accepting new requests
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err: any) => {
            if (err) return reject(err);
            resolve();
          });
        });
        logger.info('HTTP server closed successfully.');
      }

      // 3. Disconnect database client
      await prisma.$disconnect();
      logger.info('Prisma database client disconnected.');

      clearTimeout(shutdownTimeout);
      logger.info('Graceful shutdown completed successfully. Exiting.');
      process.exit(0);
    } catch (err) {
      logger.error('Error during graceful shutdown', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('unhandledRejection', (reason: any) => {
    logger.error('Unhandled Promise Rejection caught at process level:', reason);
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error('Uncaught Exception caught at process level:', err);
  });
}

export default app;
