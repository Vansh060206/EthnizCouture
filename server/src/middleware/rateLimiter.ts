import rateLimit from 'express-rate-limit';

// Standard rate limit response
const createLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      message,
      code: 'RATE_LIMIT_EXCEEDED'
    },
    // Don't rate limit automated test runners running locally in non-prod if TEST_MODE is set
    skip: () => process.env.NODE_ENV === 'test'
  });
};

// 1. Strict rate limiting for authentication (Login & Register)
export const authLimiter = createLimiter(
  15 * 60 * 1000, // 15 minutes
  25, // 25 attempts per IP
  'Too many login or registration attempts. Please wait 15 minutes before trying again.'
);

// 2. Order creation limiter to prevent checkout spam
export const orderLimiter = createLimiter(
  15 * 60 * 1000,
  40,
  'Too many checkout attempts initiated from this network. Please wait a few moments.'
);

// 3. Payment operations limiter
export const paymentLimiter = createLimiter(
  15 * 60 * 1000,
  60,
  'Too many payment requests processed. Please wait before attempting further transactions.'
);

// 4. Coupon validation limiter (prevents brute-force dictionary attacks on coupon codes)
export const couponLimiter = createLimiter(
  15 * 60 * 1000,
  40,
  'Too many promo code attempts. Please wait a moment before trying again.'
);

// 5. Global API baseline protection
export const apiLimiter = createLimiter(
  15 * 60 * 1000,
  600,
  'Too many requests to EthnizCouture API. Please slow down.'
);
