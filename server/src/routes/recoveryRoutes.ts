import { Router } from 'express';
import { handleCartCallback } from '../controllers/recoveryController';

const router = Router();

/**
 * Server-to-server webhook callback from n8n after the wait period.
 * Authenticated via timing-safe comparison of the X-N8N-Key header.
 */
router.post('/cart-callback', handleCartCallback);

export default router;
