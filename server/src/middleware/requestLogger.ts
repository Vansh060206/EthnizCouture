import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { metricsService } from '../services/metricsService';

export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;
    const statusCode = res.statusCode;

    // Record metrics
    metricsService.recordRequest(req.method, req.baseUrl || req.path, statusCode, durationMs);

    const meta = {
      requestId: req.id,
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')
    };

    if (statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.originalUrl} responded with ${statusCode}`, undefined, meta);
    } else if (durationMs > 500) {
      logger.warn(`SLOW REQUEST: HTTP ${req.method} ${req.originalUrl} took ${durationMs}ms`, meta);
    } else {
      logger.info(`HTTP ${req.method} ${req.originalUrl} ${statusCode} [${durationMs}ms]`, meta);
    }
  });

  next();
};
