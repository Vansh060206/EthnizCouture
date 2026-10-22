export interface LogMeta {
  [key: string]: any;
}

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'token',
  'secret',
  'authorization',
  'creditcard',
  'cardnumber',
  'cvv',
  'jwt',
  'jwtsecret',
  'stripesecretkey'
]);

function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item));
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.has(lowerKey)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      sanitized[key] = redactSensitiveData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const logger = {
  info: (message: string, meta?: LogMeta): void => {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? redactSensitiveData(meta) : undefined;
    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({ timestamp, level: 'INFO', message, ...cleanMeta }));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
    }
  },

  warn: (message: string, meta?: LogMeta): void => {
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? redactSensitiveData(meta) : undefined;
    if (process.env.NODE_ENV === 'production') {
      console.warn(JSON.stringify({ timestamp, level: 'WARN', message, ...cleanMeta }));
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
    }
  },

  error: (message: string, error?: any, meta?: LogMeta): void => {
    const timestamp = new Date().toISOString();
    const errorDetails = error instanceof Error
      ? { errorMessage: error.message, stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined }
      : { rawError: String(error) };
    const cleanMeta = meta ? redactSensitiveData(meta) : {};

    if (process.env.NODE_ENV === 'production') {
      console.error(JSON.stringify({
        timestamp,
        level: 'ERROR',
        message,
        ...errorDetails,
        ...redactSensitiveData(cleanMeta)
      }));
    } else {
      console.error(`[${timestamp}] [ERROR] ${message}`, error?.message || error, cleanMeta);
    }
  },

  debug: (message: string, meta?: LogMeta): void => {
    if (process.env.NODE_ENV === 'production' && process.env.LOG_LEVEL !== 'debug') return;
    const timestamp = new Date().toISOString();
    const cleanMeta = meta ? redactSensitiveData(meta) : undefined;
    console.log(`[${timestamp}] [DEBUG] ${message}`, cleanMeta ? JSON.stringify(cleanMeta) : '');
  }
};
