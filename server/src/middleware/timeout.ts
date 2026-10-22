import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const timeoutMiddleware = (timeoutMs: number = 15000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logger.warn(`Request timed out after ${timeoutMs}ms: ${req.method} ${req.originalUrl}`, {
          requestId: req.id,
          method: req.method,
          url: req.originalUrl
        });
        res.status(503).json({
          message: 'The server was unable to complete the request within the allotted time limit. Please retry.',
          code: 'REQUEST_TIMEOUT'
        });
      }
    }, timeoutMs);

    if (timer.unref) {
      timer.unref();
    }

    res.on('finish', () => clearTimeout(timer));
    res.on('close', () => clearTimeout(timer));

    next();
  };
};
