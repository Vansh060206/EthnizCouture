import { Request, Response } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import Razorpay from 'razorpay';
import { config } from '../config';
import prisma from '../prisma';
import { backgroundQueue } from '../services/backgroundQueue';
import { metricsService } from '../services/metricsService';
import { logger } from '../utils/logger';

let stripe: Stripe | null = null;
if (config.stripeSecretKey && !config.stripeSecretKey.includes('placeholder')) {
  try {
    stripe = new Stripe(config.stripeSecretKey, {
      apiVersion: '2024-11-20.acacia' as any
    });
  } catch (err) {
    logger.warn('Stripe initialization warning: proceeding with simulated payment mode');
  }
}

export const getStripeClient = (): Stripe => {
  if (!stripe) {
    stripe = new Stripe(config.stripeSecretKey || 'sk_test_placeholder_key', {
      apiVersion: '2024-11-20.acacia' as any
    });
  }
  return stripe;
};

let razorpayClient: Razorpay | null = null;
export const getRazorpayInstance = (): Razorpay | null => {
  if (razorpayClient) return razorpayClient;
  if (config.razorpayKeyId && config.razorpayKeySecret) {
    try {
      razorpayClient = new Razorpay({
        key_id: config.razorpayKeyId,
        key_secret: config.razorpayKeySecret
      });
      return razorpayClient;
    } catch (err) {
      logger.error('Failed to initialize Razorpay client', err);
      return null;
    }
  }
  return null;
};

export const createPaymentIntent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, currency = 'inr', metadata = {} } = req.body;

    if (!orderId) {
      res.status(400).json({ message: 'Order ID is required to initiate payment' });
      return;
    }

    // Always fetch authoritative amount from the database order, never trust client-provided amounts
    const order = await prisma.order.findUnique({
      where: { id: String(orderId) }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.status(400).json({ message: 'Order has already been paid' });
      return;
    }

    const amountInSmallestUnit = Math.round(order.totalAmount * 100);

    if (amountInSmallestUnit <= 0) {
      res.status(400).json({ message: 'Invalid payment amount' });
      return;
    }

    if (stripe) {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amountInSmallestUnit,
          currency: currency.toLowerCase(),
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            ...metadata
          },
          automatic_payment_methods: {
            enabled: true,
            allow_redirects: 'never'
          }
        });

        // Store intent ID on order
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentIntentId: paymentIntent.id }
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          isSimulated: false
        });
        return;
      } catch (stripeError: any) {
        logger.warn(`Stripe API error: ${stripeError.message}. Falling back to demo simulation.`);
      }
    }

    // Simulated payment fallback for testing and development
    const mockIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockClientSecret = `${mockIntentId}_secret_${Math.random().toString(36).substring(2, 9)}`;

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentIntentId: mockIntentId }
    });

    res.json({
      clientSecret: mockClientSecret,
      paymentIntentId: mockIntentId,
      isSimulated: true,
      message: 'Demo mode active: Stripe test simulation ready.'
    });
  } catch (error: any) {
    logger.error('createPaymentIntent error', error);
    res.status(500).json({ message: 'Failed to initialize payment gateway' });
  }
};

export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { paymentIntentId, orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: 'Order ID is required' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Idempotency check: If order is already PAID, return success immediately
    if (order.paymentStatus === 'PAID') {
      res.json({
        success: true,
        message: 'Payment has already been confirmed for this order',
        order
      });
      return;
    }

    let isSuccess = true;

    // Verify against Stripe server if live stripe client is active
    if (stripe && paymentIntentId && !paymentIntentId.startsWith('pi_mock')) {
      try {
        let intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // In test mode, confirm with test payment method if not yet confirmed
        if (intent.status === 'requires_payment_method' || intent.status === 'requires_confirmation') {
          if (config.stripeSecretKey.startsWith('sk_test_')) {
            intent = await stripe.paymentIntents.confirm(paymentIntentId, {
              payment_method: 'pm_card_visa'
            });
          }
        }

        isSuccess = intent.status === 'succeeded' || intent.status === 'processing';
      } catch (verifyErr: any) {
        logger.error('Stripe retrieval error during verification', verifyErr);
        isSuccess = false;
      }
    }

    if (isSuccess) {
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          paymentMethod: order.paymentMethod === 'COD' ? 'ONLINE' : order.paymentMethod,
          paymentIntentId: paymentIntentId || order.paymentIntentId || undefined,
          statusHistory: {
            create: {
              status: 'CONFIRMED',
              notes: order.paymentMethod === 'COD'
                ? 'Payment completed online (converted from Cash on Delivery).'
                : `Payment verified via ${order.paymentMethod}.`
            }
          }
        },
        include: {
          items: true,
          statusHistory: true
        }
      });

      // Enqueue durable background confirmation job (does not block HTTP response)
      backgroundQueue.enqueue('ORDER_CONFIRMATION', {
        orderId: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        email: updatedOrder.customerEmail,
        totalAmount: updatedOrder.totalAmount
      }).catch(() => {});

      logger.info(`Payment verified successfully for order ${updatedOrder.orderNumber}`);

      res.json({
        success: true,
        order: updatedOrder
      });
    } else {
      metricsService.recordPaymentFailure();

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          statusHistory: {
            create: {
              status: 'FAILED',
              notes: 'Payment verification failed at gateway.'
            }
          }
        }
      });

      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error: any) {
    metricsService.recordPaymentFailure();
    logger.error('verifyPayment error', error);
    res.status(500).json({ message: 'Failed to verify payment status' });
  }
};

/**
 * Verified Stripe Webhook Processing (PAY-01)
 * Handles asynchronous server-to-server notifications from Stripe with:
 * - Cryptographic HMAC signature verification
 * - Replay & duplicate protection via IdempotencyRecord
 * - Out-of-order state transition guards (older events cannot downgrade terminal states)
 * - Server-side amount and currency validation
 * - Atomic database transactions for state transitions and inventory restoration
 * - Asynchronous background confirmation job dispatch
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  // 1. Raw body detection for cryptographic signature verification
  const rawBody: Buffer | null = Buffer.isBuffer(req.body)
    ? req.body
    : (req as any).rawBody
    ? (req as any).rawBody
    : typeof req.body === 'string'
    ? Buffer.from(req.body, 'utf8')
    : null;

  if (!rawBody) {
    logger.warn('Stripe webhook rejected: Raw body buffer unavailable for signature verification');
    res.status(400).json({
      error: 'Invalid request body',
      message: 'Webhook body must be raw Buffer or string for signature verification'
    });
    return;
  }

  // 2. Stripe-Signature header verification
  const sig = req.headers['stripe-signature'] as string;
  if (!sig) {
    logger.warn('Stripe webhook rejected: Missing stripe-signature header');
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  if (!config.stripeWebhookSecret) {
    logger.error('Stripe webhook processing error: STRIPE_WEBHOOK_SECRET is not configured');
    res.status(500).json({ error: 'Stripe webhook secret is not configured on server' });
    return;
  }

  let event: Stripe.Event;
  try {
    const stripeClient = getStripeClient();
    event = stripeClient.webhooks.constructEvent(
      rawBody,
      sig,
      config.stripeWebhookSecret
    );
  } catch (err: any) {
    logger.warn(`Stripe webhook signature verification failed: ${err.message}`);
    res.status(400).json({
      error: 'Invalid webhook signature',
      message: err.message
    });
    return;
  }

  // 3. Explicitly supported event types whitelist
  const SUPPORTED_EVENTS = new Set([
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'payment_intent.canceled',
    'payment_intent.processing'
  ]);

  if (!SUPPORTED_EVENTS.has(event.type)) {
    logger.info(`Received unsupported Stripe event type: ${event.type}. Acknowledged without state change.`);
    res.status(200).json({
      received: true,
      ignored: true,
      reason: `Unsupported event type: ${event.type}`,
      eventId: event.id
    });
    return;
  }

  // 4. Replay & Duplicate Delivery Pre-check (Idempotency)
  const idempotencyKey = `stripe_webhook_${event.id}`;
  try {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey }
    });

    if (existingRecord) {
      logger.info(`Duplicate Stripe webhook event ignored: ${event.id}`);
      res.status(200).json({
        received: true,
        duplicate: true,
        eventId: event.id,
        message: 'Event has already been processed'
      });
      return;
    }
  } catch (lookupErr: any) {
    logger.error('Failed to lookup idempotency record for webhook event', lookupErr);
  }

  // 5. Extract PaymentIntent payload
  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const orderId = paymentIntent.metadata?.orderId;
  const paymentIntentId = paymentIntent.id;

  // Authoritative Order Lookup: match by metadata.orderId OR stored paymentIntentId
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ id: orderId }] : []),
        { paymentIntentId: paymentIntentId }
      ]
    },
    include: {
      items: true,
      statusHistory: true
    }
  });

  if (!order) {
    logger.warn(`Stripe webhook: No matching order found for PaymentIntent ${paymentIntentId} (orderId: ${orderId})`);
    res.status(404).json({
      error: 'Order not found for PaymentIntent',
      paymentIntentId,
      orderId
    });
    return;
  }

  // 6. Currency and Amount Validation against authoritative server-side record
  const expectedCurrency = 'inr';
  if (paymentIntent.currency && paymentIntent.currency.toLowerCase() !== expectedCurrency) {
    logger.error(`Stripe webhook currency mismatch for order ${order.orderNumber}: expected ${expectedCurrency}, got ${paymentIntent.currency}`);
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_VALIDATION_FAILED',
        entity: 'ORDER',
        entityId: order.id,
        details: JSON.stringify({
          reason: 'Currency mismatch',
          expected: expectedCurrency,
          received: paymentIntent.currency,
          eventId: event.id
        })
      }
    }).catch(() => {});

    res.status(400).json({
      error: 'Currency mismatch between PaymentIntent and Order',
      expectedCurrency,
      receivedCurrency: paymentIntent.currency
    });
    return;
  }

  const expectedAmount = Math.round(order.totalAmount * 100);
  if (paymentIntent.amount !== expectedAmount) {
    logger.error(`Stripe webhook amount mismatch for order ${order.orderNumber}: expected ${expectedAmount}, got ${paymentIntent.amount}`);
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_VALIDATION_FAILED',
        entity: 'ORDER',
        entityId: order.id,
        details: JSON.stringify({
          reason: 'Amount mismatch',
          expected: expectedAmount,
          received: paymentIntent.amount,
          eventId: event.id
        })
      }
    }).catch(() => {});

    res.status(400).json({
      error: 'Amount mismatch between PaymentIntent and Order',
      expectedAmount,
      receivedAmount: paymentIntent.amount
    });
    return;
  }

  // 7. Atomic Database Transaction with Out-of-Order Guards
  let shouldEnqueueConfirmation = false;

  try {
    await prisma.$transaction(async (tx: any) => {
      // Create idempotency record inside transaction to guard against concurrent duplicates
      await tx.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          resourceType: 'STRIPE_WEBHOOK',
          resourceId: order.id,
          statusCode: 200,
          responseBody: JSON.stringify({
            received: true,
            eventId: event.id,
            eventType: event.type,
            orderId: order.id
          }),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days retention
        }
      });

      switch (event.type) {
        case 'payment_intent.succeeded': {
          // Idempotency: If order is already paid, do not repeat business actions
          if (order.paymentStatus === 'PAID') {
            logger.info(`Order ${order.orderNumber} already marked PAID. Idempotently skipping update.`);
            return;
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'PAID',
              orderStatus: order.orderStatus === 'PENDING' ? 'CONFIRMED' : order.orderStatus,
              paymentIntentId: paymentIntent.id,
              statusHistory: {
                create: {
                  status: 'CONFIRMED',
                  notes: `Payment confirmed via Stripe webhook (${event.id}).`
                }
              }
            }
          });

          shouldEnqueueConfirmation = true;
          break;
        }

        case 'payment_intent.canceled': {
          // Out-of-order protection: cannot cancel order if already PAID or SHIPPED/DELIVERED
          if (order.paymentStatus === 'PAID' || ['SHIPPED', 'DELIVERED'].includes(order.orderStatus)) {
            logger.warn(`Stripe webhook canceled received for order ${order.orderNumber} in state ${order.orderStatus}/${order.paymentStatus}. Ignoring downgrade.`);
            return;
          }

          if (order.orderStatus === 'CANCELLED') {
            return; // Already cancelled
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              orderStatus: 'CANCELLED',
              paymentStatus: 'FAILED',
              statusHistory: {
                create: {
                  status: 'CANCELLED',
                  notes: `PaymentIntent canceled via Stripe webhook (${event.id}). Reserved inventory restored.`
                }
              }
            }
          });

          // Restore reserved stock to products atomically
          for (const item of order.items) {
            if (item.productId) {
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stock: {
                    increment: item.quantity
                  }
                }
              });
            }
          }
          break;
        }

        case 'payment_intent.payment_failed': {
          // Out-of-order protection: never downgrade a PAID order
          if (order.paymentStatus === 'PAID') {
            logger.warn(`Stripe webhook payment_failed received for order ${order.orderNumber} which is already PAID. Ignoring downgrade.`);
            return;
          }

          metricsService.recordPaymentFailure();
          const failureMessage = paymentIntent.last_payment_error?.message || 'Payment authentication or authorization failed';

          await tx.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'FAILED',
              statusHistory: {
                create: {
                  status: 'FAILED',
                  notes: `Payment failed at gateway: ${failureMessage} (Event: ${event.id})`
                }
              }
            }
          });
          break;
        }

        case 'payment_intent.processing': {
          if (order.paymentStatus === 'PAID') {
            return;
          }

          await tx.order.update({
            where: { id: order.id },
            data: {
              statusHistory: {
                create: {
                  status: order.orderStatus,
                  notes: `Payment is processing at gateway (Event: ${event.id})`
                }
              }
            }
          });
          break;
        }
      }
    });
  } catch (txError: any) {
    // Check for concurrency duplicate collision on unique idempotency key
    if (txError.code === 'P2002' || txError.message?.includes('Unique constraint')) {
      logger.info(`Concurrent duplicate Stripe webhook detected for event ${event.id}`);
      res.status(200).json({
        received: true,
        duplicate: true,
        eventId: event.id
      });
      return;
    }

    logger.error('Stripe webhook transaction failed', txError);
    res.status(500).json({
      error: 'Failed to process webhook transaction',
      message: txError.message
    });
    return;
  }

  // 8. Enqueue durable background confirmation job only after successful transaction commit
  if (shouldEnqueueConfirmation) {
    backgroundQueue.enqueue('ORDER_CONFIRMATION', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      email: order.customerEmail,
      totalAmount: order.totalAmount
    }).catch(() => {});
  }

  logger.info(`Stripe webhook event ${event.id} (${event.type}) processed successfully for order ${order.orderNumber}`);

  res.status(200).json({
    received: true,
    eventId: event.id,
    eventType: event.type,
    orderId: order.id,
    orderNumber: order.orderNumber
  });
};

/**
 * Dynamic UPI QR Code Generation
 * Generates an authoritative single-use UPI QR code with:
 * - Pre-filled exact transaction amount in INR
 * - Unique order reference & VPA
 * - Standard 15-minute countdown expiry
 * - Razorpay QR API integration with local high-res NPCI QR fallback
 */
export const createUpiQr = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: 'Order ID is required to generate dynamic UPI QR' });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { id: String(orderId) }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.status(400).json({ message: 'Order has already been paid' });
      return;
    }

    const amountInPaise = Math.round(order.totalAmount * 100);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute standard expiration
    const closeByUnix = Math.floor(expiresAt.getTime() / 1000);

    // Standard NPCI UPI Intent & QR Payload
    // pa: Payee VPA, pn: Payee Name, am: Amount, tr: Transaction Ref (Order Number), tn: Transaction Note, cu: Currency
    const upiPayload = `upi://pay?pa=${config.upiMerchantVpa}&pn=${encodeURIComponent(
      config.upiMerchantName
    )}&am=${order.totalAmount.toFixed(2)}&tr=${order.orderNumber}&tn=${encodeURIComponent(
      `Order ${order.orderNumber}`
    )}&cu=INR`;

    let qrCodeId = `qr_${order.orderNumber}_${Date.now()}`;
    let qrImageUrl = '';
    let isSimulated = true;

    // If live/test Razorpay API credentials configured, call Razorpay QR Codes API
    if (config.razorpayKeyId && config.razorpayKeySecret && !config.razorpayKeyId.includes('placeholder')) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');
        const rzpResponse = await fetch('https://api.razorpay.com/v1/payments/qr_codes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader
          },
          body: JSON.stringify({
            type: 'upi_qr',
            name: `${config.upiMerchantName} - Order ${order.orderNumber}`,
            usage: 'single_use',
            fixed_amount: true,
            payment_amount: amountInPaise,
            description: `Payment for Order ${order.orderNumber}`,
            close_by: closeByUnix,
            notes: {
              orderId: order.id,
              orderNumber: order.orderNumber
            }
          })
        });

        if (rzpResponse.ok) {
          const rzpData: any = await rzpResponse.json();
          qrCodeId = rzpData.id;
          qrImageUrl = rzpData.image_url;
          isSimulated = false;
        } else {
          const errText = await rzpResponse.text();
          logger.warn(`Razorpay QR API call failed: ${errText}. Generating local high-res NPCI QR.`);
        }
      } catch (err: any) {
        logger.warn(`Razorpay API exception: ${err.message}. Generating local high-res NPCI QR.`);
      }
    }

    // Generate local high-resolution scannable QR Data URL (works on actual PhonePe/GPay apps & offline)
    if (!qrImageUrl) {
      qrImageUrl = await QRCode.toDataURL(upiPayload, {
        errorCorrectionLevel: 'M',
        margin: 2,
        scale: 8,
        color: {
          dark: '#3E1A1E', // Luxury royal burgundy QR dots
          light: '#FFFFFF'
        }
      });
    }

    // Update order with payment method and QR code identifier
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: 'UPI',
        paymentIntentId: qrCodeId
      }
    });

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      qrCodeId,
      qrDataUrl: qrImageUrl,
      qrImageUrl,
      imageUrl: qrImageUrl,
      upiUrl: upiPayload,
      upiPayload,
      expiresAt: expiresAt.toISOString(),
      vpa: config.upiMerchantVpa,
      merchantName: config.upiMerchantName,
      isSimulated
    });
  } catch (error: any) {
    logger.error('createUpiQr error', error);
    res.status(500).json({ message: 'Failed to generate dynamic UPI QR code' });
  }
};

/**
 * Real-Time Payment Status Polling Endpoint
 * High-performance lightweight lookup queried every 2.5s by the frontend UPI QR modal
 */
export const getPaymentStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({ message: 'Order ID is required' });
      return;
    }

    // Support lookup by UUID or human-readable orderNumber
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: String(orderId) },
          { orderNumber: String(orderId) }
        ]
      },
      select: {
        id: true,
        orderNumber: true,
        paymentStatus: true,
        orderStatus: true,
        paymentMethod: true,
        totalAmount: true,
        updatedAt: true
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({
      success: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      isPaid: order.paymentStatus === 'PAID'
    });
  } catch (error: any) {
    logger.error('getPaymentStatus error', error);
    res.status(500).json({ message: 'Failed to retrieve payment status' });
  }
};

/**
 * Razorpay Signed Webhook Handler for UPI QR Events
 * Verifies HMAC-SHA256 signature and captures qr_code.credited / payment.captured
 */
export const handleRazorpayWebhook = async (req: Request, res: Response): Promise<void> => {
  const rawBody: Buffer | null = Buffer.isBuffer(req.body)
    ? req.body
    : (req as any).rawBody
    ? (req as any).rawBody
    : typeof req.body === 'string'
    ? Buffer.from(req.body, 'utf8')
    : req.body && typeof req.body === 'object'
    ? Buffer.from(JSON.stringify(req.body), 'utf8')
    : null;

  if (!rawBody) {
    logger.warn('Razorpay webhook rejected: Raw body buffer unavailable');
    res.status(400).json({ error: 'Raw body required' });
    return;
  }

  const signature = req.headers['x-razorpay-signature'] as string;

  // Cryptographic signature verification if secret is configured
  if (config.razorpayWebhookSecret && !config.razorpayWebhookSecret.includes('placeholder')) {
    if (!signature) {
      res.status(400).json({ error: 'Missing x-razorpay-signature header' });
      return;
    }
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpayWebhookSecret)
      .update(rawBody)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Razorpay webhook signature mismatch');
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }
  }

  let eventPayload: any;
  try {
    eventPayload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    res.status(400).json({ error: 'Invalid JSON payload' });
    return;
  }

  const eventType = eventPayload.event;
  // Supported events: qr_code.credited, payment.captured
  if (eventType !== 'qr_code.credited' && eventType !== 'payment.captured') {
    res.status(200).json({ received: true, ignored: true });
    return;
  }

  const qrEntity = eventPayload.payload?.qr_code?.entity || {};
  const paymentEntity = eventPayload.payload?.payment?.entity || {};
  const eventNotes = eventPayload.notes || {};
  const orderId = qrEntity.notes?.orderId || paymentEntity.notes?.orderId || eventNotes.orderId;
  const orderNumber = qrEntity.notes?.orderNumber || paymentEntity.notes?.orderNumber || eventNotes.orderNumber;
  const paymentIntentId = qrEntity.id || paymentEntity.id;

  // 1. Idempotency Check using IdempotencyRecord
  const eventId = eventPayload.id || paymentEntity.id || qrEntity.id || `rzp_${Date.now()}`;
  const idempotencyKey = `razorpay_webhook_${eventId}`;

  try {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: { key: idempotencyKey }
    });
    if (existingRecord) {
      logger.info(`Duplicate Razorpay webhook event detected: ${eventId} - Returning idempotent 200`);
      res.status(200).json({
        received: true,
        duplicate: true,
        deduplicated: true,
        eventId,
        message: 'Event has already been processed'
      });
      return;
    }
  } catch (lookupErr: any) {
    logger.error('Failed to lookup idempotency record for Razorpay webhook', lookupErr);
  }

  // 2. Authoritative Order Lookup
  const order = await prisma.order.findFirst({
    where: {
      OR: [
        ...(orderId ? [{ id: String(orderId) }] : []),
        ...(orderNumber ? [{ orderNumber: String(orderNumber) }] : []),
        ...(paymentIntentId ? [{ paymentIntentId: String(paymentIntentId) }] : [])
      ]
    }
  });

  if (!order) {
    logger.warn(`Razorpay webhook: Order not found for reference ${orderNumber || orderId || paymentIntentId}`);
    res.status(200).json({ received: true, notFound: true });
    return;
  }

  // Idempotency check: If already paid, acknowledge without duplicate actions
  if (order.paymentStatus === 'PAID') {
    res.status(200).json({ received: true, alreadyPaid: true, deduplicated: true });
    return;
  }

  // 3. Atomic Database Transaction with Idempotency Record
  let updatedOrder: any;
  await prisma.$transaction(async (tx: any) => {
    await tx.idempotencyRecord.create({
      data: {
        key: idempotencyKey,
        resourceType: 'RAZORPAY_WEBHOOK',
        resourceId: order.id,
        statusCode: 200,
        responseBody: JSON.stringify({ received: true, eventId }),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        paymentMethod: 'UPI',
        paymentIntentId: qrEntity.id || paymentEntity.id || order.paymentIntentId || undefined,
        statusHistory: {
          create: {
            status: 'CONFIRMED',
            notes: 'Payment verified via dynamic UPI QR code.'
          }
        }
      }
    });
  });

  backgroundQueue.enqueue('ORDER_CONFIRMATION', {
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber,
    email: updatedOrder.customerEmail,
    totalAmount: updatedOrder.totalAmount
  }).catch(() => {});

  logger.info(`UPI payment confirmed for order ${updatedOrder.orderNumber}`);
  res.status(200).json({
    received: true,
    success: true,
    orderId: updatedOrder.id,
    orderNumber: updatedOrder.orderNumber
  });
};

/**
 * Simulated UPI Payment Authorization (Sandbox / Testing)
 * Allows developers and patrons to approve payment with one click in dev/test mode
 */
export const simulateUpiPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      res.status(400).json({ message: 'Order ID is required' });
      return;
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { id: String(orderId) },
          { orderNumber: String(orderId) }
        ]
      }
    });

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentStatus === 'PAID') {
      res.json({
        success: true,
        message: 'Order is already paid',
        paymentStatus: 'PAID',
        orderStatus: order.orderStatus,
        order
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'PAID',
        orderStatus: 'CONFIRMED',
        paymentMethod: 'UPI',
        statusHistory: {
          create: {
            status: 'CONFIRMED',
            notes: 'Payment verified via dynamic UPI QR code (Simulated Patron Authorization).'
          }
        }
      }
    });

    backgroundQueue.enqueue('ORDER_CONFIRMATION', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      email: updatedOrder.customerEmail,
      totalAmount: updatedOrder.totalAmount
    }).catch(() => {});

    logger.info(`Simulated UPI payment approved for order ${updatedOrder.orderNumber}`);
    res.json({
      success: true,
      paymentStatus: 'PAID',
      orderStatus: 'CONFIRMED',
      orderNumber: updatedOrder.orderNumber,
      order: updatedOrder
    });
  } catch (error: any) {
    logger.error('simulateUpiPayment error', error);
    res.status(500).json({ message: 'Failed to simulate UPI payment' });
  }
};

/**
 * Razorpay Standard Web Checkout: Create Order
 * Endpoint: POST /api/payments/razorpay/create-order
 * Minimum amount: 100 paise (₹1.00)
 */
export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const { orderId, amount: directAmount, currency = 'INR', receipt: directReceipt } = req.body;

    // Mode A: Order ID provided from e-commerce checkout
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          OR: [
            { id: String(orderId) },
            { orderNumber: String(orderId) }
          ]
        }
      });

      if (!order) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }

      if (order.paymentStatus === 'PAID') {
        res.status(400).json({ message: 'Order is already marked as PAID' });
        return;
      }

      const amountInPaise = Math.round(order.totalAmount * 100);
      if (amountInPaise < 100) {
        res.status(400).json({ message: 'Amount must be at least 100 paise (₹1.00)' });
        return;
      }

      const rzp = getRazorpayInstance();
      let razorpayOrderId: string;

      if (rzp) {
        try {
          const rzpOrder = await rzp.orders.create({
            amount: amountInPaise,
            currency: 'INR',
            receipt: order.orderNumber,
            notes: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerEmail: order.customerEmail
            }
          });
          razorpayOrderId = rzpOrder.id;
        } catch (apiError: any) {
          logger.error('Razorpay API orders.create failed', apiError);
          res.status(apiError.statusCode || 500).json({
            message: apiError.error?.description || 'Razorpay order creation failed'
          });
          return;
        }
      } else {
        razorpayOrderId = `order_mock_${Date.now()}`;
      }

      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentIntentId: razorpayOrderId,
          paymentMethod: 'RAZORPAY'
        }
      });

      res.json({
        success: true,
        order_id: razorpayOrderId,
        orderId: order.id,
        orderNumber: order.orderNumber,
        amount: amountInPaise,
        currency: 'INR',
        key: config.razorpayKeyId,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone
        }
      });
      return;
    }

    // Mode B: Direct amount provided (Generic Standard Integration Contract)
    if (directAmount !== undefined && directAmount !== null) {
      const parsedAmount = Number(directAmount);
      if (isNaN(parsedAmount) || parsedAmount < 100) {
        res.status(400).json({ message: 'Amount must be at least 100 paise (₹1.00)' });
        return;
      }

      const rzp = getRazorpayInstance();
      let razorpayOrderId: string;

      if (rzp) {
        try {
          const rzpOrder = await rzp.orders.create({
            amount: parsedAmount,
            currency: String(currency || 'INR').toUpperCase(),
            receipt: directReceipt || `rcpt_${Date.now()}`
          });
          razorpayOrderId = rzpOrder.id;
        } catch (apiError: any) {
          logger.error('Razorpay API orders.create failed', apiError);
          res.status(apiError.statusCode || 500).json({
            message: apiError.error?.description || 'Razorpay order creation failed'
          });
          return;
        }
      } else {
        razorpayOrderId = `order_mock_${Date.now()}`;
      }

      res.json({
        order_id: razorpayOrderId,
        amount: parsedAmount,
        currency: String(currency || 'INR').toUpperCase()
      });
      return;
    }

    res.status(400).json({ message: 'Either orderId or amount (in paise) is required' });
  } catch (error: any) {
    logger.error('createRazorpayOrder error', error);
    res.status(500).json({ message: 'Failed to create Razorpay checkout order' });
  }
};

/**
 * Razorpay Standard Web Checkout: Verify Payment Signature
 * Endpoint: POST /api/payments/razorpay/verify-payment or POST /api/verify-payment
 * Algorithm: HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */
export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const razorpay_order_id = req.body.razorpay_order_id || req.body.order_id;
    const razorpay_payment_id = req.body.razorpay_payment_id || req.body.payment_id;
    const razorpay_signature = req.body.razorpay_signature || req.body.signature;
    const orderId = req.body.orderId;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({
        success: false,
        message: 'Missing required Razorpay fields: order_id, payment_id, and signature are required'
      });
      return;
    }

    // 1. Cryptographic Signature Verification
    const secret = config.razorpayKeySecret;
    if (!secret) {
      logger.error('Cannot verify payment: RAZORPAY_KEY_SECRET is not configured');
      res.status(500).json({ success: false, message: 'Payment gateway configuration error' });
      return;
    }

    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    let isMatch = false;
    try {
      isMatch = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'utf8'),
        Buffer.from(razorpay_signature, 'utf8')
      );
    } catch {
      isMatch = expectedSignature === razorpay_signature;
    }

    if (!isMatch) {
      logger.warn(`Razorpay payment signature mismatch for order ${razorpay_order_id}`);
      res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid cryptographic signature'
      });
      return;
    }

    // 2. Authoritative Order Lookup (if database order is tracked)
    const order = await prisma.order.findFirst({
      where: {
        OR: [
          ...(orderId ? [{ id: String(orderId) }] : []),
          { paymentIntentId: String(razorpay_order_id) }
        ]
      }
    });

    // If this is a standalone verification without a DB order record
    if (!order) {
      res.json({
        success: true,
        message: 'Payment signature verified successfully',
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id
      });
      return;
    }

    // 3. Idempotency Guard: If already paid, return 200 immediately
    if (order.paymentStatus === 'PAID') {
      res.json({
        success: true,
        message: 'Order is already marked as PAID',
        orderId: order.id,
        orderNumber: order.orderNumber
      });
      return;
    }

    // 4. Atomic Transaction: Transition to PAID / CONFIRMED and record Idempotency
    const idempotencyKey = `razorpay_payment_${razorpay_payment_id}`;
    let updatedOrder: any;

    await prisma.$transaction(async (tx: any) => {
      await tx.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          resourceType: 'RAZORPAY_PAYMENT',
          resourceId: order.id,
          statusCode: 200,
          responseBody: JSON.stringify({
            verified: true,
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id
          }),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      }).catch(() => {});

      updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          orderStatus: 'CONFIRMED',
          paymentMethod: 'RAZORPAY',
          paymentIntentId: razorpay_payment_id,
          statusHistory: {
            create: {
              status: 'CONFIRMED',
              notes: `Payment verified via Razorpay Standard Checkout (Payment ID: ${razorpay_payment_id}).`
            }
          }
        }
      });
    });

    // 5. Enqueue luxury email confirmation job
    backgroundQueue.enqueue('ORDER_CONFIRMATION', {
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      email: updatedOrder.customerEmail,
      totalAmount: updatedOrder.totalAmount
    }).catch(() => {});

    logger.info(`Razorpay payment authoritatively verified for order ${updatedOrder.orderNumber} (Payment ID: ${razorpay_payment_id})`);

    res.json({
      success: true,
      message: 'Payment verified successfully',
      orderId: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      paymentId: razorpay_payment_id
    });
  } catch (error: any) {
    logger.error('verifyRazorpayPayment error', error);
    res.status(500).json({ success: false, message: 'Server error during payment verification' });
  }
};
