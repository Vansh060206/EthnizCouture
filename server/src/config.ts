import dotenv from 'dotenv';
import path from 'path';

if (process.env.NODE_ENV === 'test') {
  dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
} else {
  dotenv.config();
}

export const KNOWN_INSECURE_SECRETS = [
  'ethnizcouture_super_secret_jwt_key_2026_luxury_brand',
  'your_jwt_secret_here',
  'secret',
  'changeme',
  'placeholder',
  'jwt_secret',
  'admin',
  '123456',
  'password'
];

/**
 * Validates the JWT secret ensuring cryptographic entropy in production
 * while keeping local development and testing friction-free.
 *
 * @param secret The JWT secret string from environment variables
 * @param nodeEnv The current runtime environment (production, development, test)
 * @returns Validated JWT secret string
 * @throws Error if production requirements are violated
 */
export function validateJwtSecret(secret: string | undefined, nodeEnv: string): string {
  const isProduction = nodeEnv === 'production';
  const trimmed = secret?.trim();

  if (isProduction) {
    if (!trimmed) {
      throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET environment variable is missing or empty in production.');
    }

    const lower = trimmed.toLowerCase();
    const isPlaceholder = KNOWN_INSECURE_SECRETS.some(
      (known) => lower === known.toLowerCase() || (known.length >= 10 && lower.includes(known.toLowerCase()))
    );

    if (isPlaceholder) {
      throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET cannot use a default, test, or known placeholder value in production.');
    }

    if (trimmed.length < 32) {
      throw new Error('FATAL CONFIGURATION ERROR: JWT_SECRET must be at least 32 characters long in production to ensure cryptographic entropy.');
    }

    return trimmed;
  }

  // Non-production (development, test) fallback
  if (trimmed && trimmed.length > 0) {
    return trimmed;
  }

  return 'dev-secret-ethniz-couture-local-testing-key-32chars';
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = validateJwtSecret(process.env.JWT_SECRET, nodeEnv);

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv,
  isDev: nodeEnv !== 'production',
  jwtSecret,
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(','),
  requestTimeoutMs: parseInt(process.env.REQUEST_TIMEOUT_MS || '15000', 10),
  cacheTtlSeconds: parseInt(process.env.CACHE_TTL_SECONDS || '60', 10),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug'),
  adminMasterKey: process.env.ADMIN_MASTER_KEY || 'EC-ROYAL-ATELIER-7K9F-2026-X8Q2',
  razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET || '',
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  upiMerchantVpa: process.env.UPI_MERCHANT_VPA || 'ethnizcouture@icici',
  upiMerchantName: process.env.UPI_MERCHANT_NAME || 'Ethniz Couture',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  emailApiKey: process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || '',
  emailFrom: process.env.EMAIL_FROM || 'Ethniz Couture <atelier@ethnizcouture.com>',
  frontendUrl: process.env.FRONTEND_URL || process.env.CLIENT_URL || 'https://ethnizcouture.com'
};
