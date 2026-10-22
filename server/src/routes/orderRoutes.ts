import { Router } from 'express';
import {
  createOrder,
  getMyOrders,
  getOrderById,
  trackOrder,
  cancelOrder,
  requestReturn
} from '../controllers/orderController';
import { authenticateUser, optionalUser } from '../middleware/auth';
import { orderLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', orderLimiter, optionalUser, createOrder);
router.get('/my-orders', authenticateUser, getMyOrders);
router.get('/track', optionalUser, trackOrder);
router.get('/:id', optionalUser, getOrderById);
router.put('/:id/cancel', optionalUser, cancelOrder);
router.post('/:id/return', optionalUser, requestReturn);

export default router;
