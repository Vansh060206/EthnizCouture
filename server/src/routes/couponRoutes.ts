import { Router } from 'express';
import { validateCoupon, getActiveCoupons } from '../controllers/couponController';
import { couponLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', getActiveCoupons);
router.post('/validate', couponLimiter, validateCoupon);

export default router;
