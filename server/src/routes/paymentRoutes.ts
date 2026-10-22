import express, { Router } from 'express';
import {
  createPaymentIntent,
  verifyPayment,
  handleStripeWebhook,
  createUpiQr,
  getPaymentStatus,
  handleRazorpayWebhook,
  simulateUpiPayment,
  createRazorpayOrder,
  verifyRazorpayPayment
} from '../controllers/paymentController';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Dedicated webhook routes with raw body parser (exempt from client paymentLimiter)
router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/webhook/razorpay', express.raw({ type: 'application/json' }), handleRazorpayWebhook);

// Stripe & standard routes
router.post('/create-intent', paymentLimiter, createPaymentIntent);
router.post('/verify', paymentLimiter, verifyPayment);

// Dynamic UPI QR routes
router.post('/upi/create-qr', paymentLimiter, createUpiQr);
router.get('/status/:orderId', getPaymentStatus);
router.post('/upi/simulate-pay', paymentLimiter, simulateUpiPayment);

// Razorpay Standard Web Checkout routes (with exact prompt paths & aliases)
router.post('/razorpay/create-order', paymentLimiter, createRazorpayOrder);
router.post('/razorpay/verify-payment', paymentLimiter, verifyRazorpayPayment);
router.post('/create-order', paymentLimiter, createRazorpayOrder);
router.post('/verify-payment', paymentLimiter, verifyRazorpayPayment);

export default router;
