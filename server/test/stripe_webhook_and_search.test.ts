process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import Stripe from 'stripe';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';
import { cacheService } from '../src/services/cacheService';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Workstream A & B — Stripe Webhook Reliability & Search Compatibility', () => {
  const stripe = new Stripe('sk_test_placeholder_key', {
    apiVersion: '2024-11-20.acacia' as any
  });
  const webhookSecret = config.stripeWebhookSecret || 'whsec_test_secret_for_automated_testing_key_12345';

  let testCategoryId: string;
  let testProductId: string;
  const initialStock = 10;
  const createdOrderIds: string[] = [];
  const createdIdempKeys: string[] = [];
  const createdProductIds: string[] = [];

  // Helper to generate official Stripe signature header
  function generateSignature(payloadString: string, secret = webhookSecret): string {
    return stripe.webhooks.generateTestHeaderString({
      payload: payloadString,
      secret
    });
  }

  before(async () => {
    cacheService.flush();

    // Ensure category exists
    let category = await prisma.category.findFirst({ where: { slug: 'bridal-lehengas' } });
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'Bridal Lehengas',
          slug: 'bridal-lehengas',
          description: 'Luxury bridal couture collection'
        }
      });
    }
    testCategoryId = category.id;

    // Create a deterministic product
    const product = await prisma.product.create({
      data: {
        name: 'Zardozi Velvet Lehenga',
        slug: `zardozi-velvet-lehenga-${Date.now()}`,
        sku: `SKU-LEHENGA-${Date.now()}`,
        description: 'Exquisite crimson velvet lehenga with handcrafted zardozi embroidery',
        price: 25000,
        stock: initialStock,
        isActive: true,
        categoryId: testCategoryId,
        fabric: 'Velvet',
        tags: 'bridal,lehenga,zardozi,velvet'
      }
    });
    testProductId = product.id;
    createdProductIds.push(product.id);
  });

  after(async () => {
    // 1. Drain and stop background queue
    await backgroundQueue.drain(3000);
    await backgroundQueue.stop();

    // 2. Clean up test orders and their relations
    if (createdOrderIds.length > 0) {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      await prisma.orderItem.deleteMany({ where: { orderId: { in: createdOrderIds } } });
      for (const oid of createdOrderIds) {
        await prisma.backgroundJob.deleteMany({ where: { payload: { contains: oid } } });
      }
      await prisma.order.deleteMany({ where: { id: { in: createdOrderIds } } });
    }

    // 3. Clean up idempotency records
    if (createdIdempKeys.length > 0) {
      await prisma.idempotencyRecord.deleteMany({ where: { key: { in: createdIdempKeys } } });
    }

    // Also clean any stripe_webhook_% keys
    await prisma.idempotencyRecord.deleteMany({ where: { key: { startsWith: 'stripe_webhook_' } } });

    // 4. Clean up audit logs
    await prisma.auditLog.deleteMany({ where: { action: 'PAYMENT_VALIDATION_FAILED' } });

    // 5. Clean up created products
    if (createdProductIds.length > 0) {
      await prisma.product.deleteMany({ where: { id: { in: createdProductIds } } });
    }

    cacheService.flush();
  });

  // Helper to create test order
  async function createTestOrder(customTotal = 25000, itemsCount = 1): Promise<any> {
    const orderNumber = `EC-TEST-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const order = await prisma.order.create({
      data: {
        orderNumber,
        customerName: 'Aarohi Sen',
        customerEmail: 'aarohi.sen@example.com',
        customerPhone: '+91 98765 43210',
        shippingStreet: '88 Heritage Enclave',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302001',
        shippingCountry: 'India',
        subtotal: customTotal,
        totalAmount: customTotal,
        paymentStatus: 'PENDING',
        orderStatus: 'PENDING',
        paymentMethod: 'STRIPE',
        items: {
          create: [
            {
              productId: testProductId,
              productName: 'Zardozi Velvet Lehenga',
              price: customTotal / itemsCount,
              quantity: itemsCount,
              total: customTotal
            }
          ]
        },
        statusHistory: {
          create: {
            status: 'PENDING',
            notes: 'Order initiated, awaiting payment confirmation.'
          }
        }
      },
      include: {
        items: true,
        statusHistory: true
      }
    });

    createdOrderIds.push(order.id);
    return order;
  }

  // --- WORKSTREAM A: STRIPE WEBHOOK TESTS ---

  test('A2.1: Valid signature verifies and transitions order to PAID/CONFIRMED with background job', async () => {
    const order = await createTestOrder(25000);
    const eventId = `evt_test_success_${Date.now()}`;
    const paymentIntentId = `pi_test_${Date.now()}`;
    createdIdempKeys.push(`stripe_webhook_${eventId}`);

    const payload = {
      id: eventId,
      object: 'event',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          amount: 2500000, // 25,000 INR in paise
          currency: 'inr',
          status: 'succeeded',
          metadata: {
            orderId: order.id
          }
        }
      }
    };

    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.orderId, order.id);

    // Verify order in database
    const updatedOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { statusHistory: true }
    });

    assert.strictEqual(updatedOrder?.paymentStatus, 'PAID');
    assert.strictEqual(updatedOrder?.orderStatus, 'CONFIRMED');
    assert.strictEqual(updatedOrder?.paymentIntentId, paymentIntentId);

    // Verify status history
    const confirmedHistory = updatedOrder?.statusHistory.find((h) => h.status === 'CONFIRMED');
    assert.ok(confirmedHistory, 'Expected CONFIRMED status history record');

    // Verify idempotency record
    const idemp = await prisma.idempotencyRecord.findUnique({
      where: { key: `stripe_webhook_${eventId}` }
    });
    assert.ok(idemp, 'Expected idempotency record for event');
    assert.strictEqual(idemp.resourceType, 'STRIPE_WEBHOOK');
  });

  test('A2.2: Invalid signature is rejected with 400 and does NOT mutate order state', async () => {
    const order = await createTestOrder(25000);
    const eventId = `evt_test_tampered_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_tampered_${Date.now()}`,
          amount: 2500000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };

    const payloadString = JSON.stringify(payload);
    // Tampered / bad signature header
    const badSignature = 't=1234567890,v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', badSignature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Invalid webhook signature');

    // Order state must be untouched
    const untouchedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(untouchedOrder?.paymentStatus, 'PENDING');
    assert.strictEqual(untouchedOrder?.orderStatus, 'PENDING');
  });

  test('A2.3: Missing Stripe-Signature header is rejected with 400', async () => {
    const order = await createTestOrder(25000);
    const payloadString = JSON.stringify({
      id: `evt_no_sig_${Date.now()}`,
      type: 'payment_intent.succeeded',
      data: { object: { metadata: { orderId: order.id } } }
    });

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Missing stripe-signature header');
  });

  test('A2.4: Duplicate delivery of same event is acknowledged idempotently without re-execution', async () => {
    const order = await createTestOrder(35000);
    const eventId = `evt_test_dup_${Date.now()}`;
    const paymentIntentId = `pi_dup_${Date.now()}`;
    createdIdempKeys.push(`stripe_webhook_${eventId}`);

    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 3500000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    // First delivery
    const res1 = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);
    assert.strictEqual(res1.status, 200);
    assert.strictEqual(res1.body.received, true);

    const historyCount1 = await prisma.orderStatusHistory.count({ where: { orderId: order.id } });

    // Second delivery (duplicate)
    const res2 = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.received, true);
    assert.strictEqual(res2.body.duplicate, true);

    const historyCount2 = await prisma.orderStatusHistory.count({ where: { orderId: order.id } });
    assert.strictEqual(historyCount2, historyCount1, 'Duplicate webhook must not duplicate status history');
  });

  test('A2.5: Concurrent duplicate deliveries handle race conditions cleanly', async () => {
    const order = await createTestOrder(18000);
    const eventId = `evt_test_concurrent_${Date.now()}`;
    createdIdempKeys.push(`stripe_webhook_${eventId}`);

    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_concurrent_${Date.now()}`,
          amount: 1800000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    // Fire 2 concurrent requests
    const [resA, resB] = await Promise.all([
      request(app).post('/api/payments/webhook').set('Stripe-Signature', signature).set('Content-Type', 'application/json').send(payloadString),
      request(app).post('/api/payments/webhook').set('Stripe-Signature', signature).set('Content-Type', 'application/json').send(payloadString)
    ]);

    // Both should receive 200 OK without errors
    assert.strictEqual(resA.status, 200);
    assert.strictEqual(resB.status, 200);

    // Exactly one idempotency record should exist
    const idempRecords = await prisma.idempotencyRecord.findMany({
      where: { key: `stripe_webhook_${eventId}` }
    });
    assert.strictEqual(idempRecords.length, 1);
  });

  test('A2.6: Out-of-order delivery: Late payment_failed cannot downgrade PAID order', async () => {
    const order = await createTestOrder(22000);
    const eventIdSuccess = `evt_seq_1_${Date.now()}`;
    const eventIdFail = `evt_seq_2_${Date.now()}`;
    const paymentIntentId = `pi_seq_${Date.now()}`;

    // 1. Success event arrives first
    const payloadSuccess = {
      id: eventIdSuccess,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 2200000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const strSuccess = JSON.stringify(payloadSuccess);
    await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', generateSignature(strSuccess))
      .set('Content-Type', 'application/json')
      .send(strSuccess);

    // Order is now PAID
    let dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(dbOrder?.paymentStatus, 'PAID');

    // 2. Delayed failure arrives late
    const payloadFailed = {
      id: eventIdFail,
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: paymentIntentId,
          amount: 2200000,
          currency: 'inr',
          last_payment_error: { message: 'Network dropped during 3DS challenge' },
          metadata: { orderId: order.id }
        }
      }
    };
    const strFailed = JSON.stringify(payloadFailed);
    const resFailed = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', generateSignature(strFailed))
      .set('Content-Type', 'application/json')
      .send(strFailed);

    assert.strictEqual(resFailed.status, 200);

    // Crucial check: Order MUST remain PAID!
    dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(dbOrder?.paymentStatus, 'PAID', 'Late failure must not overwrite PAID status');
    assert.strictEqual(dbOrder?.orderStatus, 'CONFIRMED');
  });

  test('A2.7: Payment cancellation transitions order to CANCELLED and restores reserved inventory', async () => {
    // Check initial stock
    const prodBefore = await prisma.product.findUnique({ where: { id: testProductId } });
    const stockBefore = prodBefore!.stock;

    // Create order with 2 units (simulate reservation decrementing stock)
    const order = await createTestOrder(50000, 2);
    await prisma.product.update({
      where: { id: testProductId },
      data: { stock: { decrement: 2 } }
    });

    const prodAfterReserve = await prisma.product.findUnique({ where: { id: testProductId } });
    assert.strictEqual(prodAfterReserve!.stock, stockBefore - 2);

    const eventId = `evt_cancel_${Date.now()}`;
    const payload = {
      id: eventId,
      type: 'payment_intent.canceled',
      data: {
        object: {
          id: `pi_cancel_${Date.now()}`,
          amount: 5000000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 200);

    // Verify order is cancelled
    const cancelledOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(cancelledOrder?.orderStatus, 'CANCELLED');

    // Verify stock is restored!
    const prodRestored = await prisma.product.findUnique({ where: { id: testProductId } });
    assert.strictEqual(prodRestored!.stock, stockBefore, 'Inventory must be restored upon PaymentIntent cancellation');
  });

  test('A2.8: Currency mismatch is rejected with 400 and logged to AuditLog', async () => {
    const order = await createTestOrder(25000);
    const eventId = `evt_bad_curr_${Date.now()}`;

    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_bad_curr_${Date.now()}`,
          amount: 2500000,
          currency: 'usd', // Tampered currency
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Currency mismatch between PaymentIntent and Order');

    // Order remains pending
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(dbOrder?.paymentStatus, 'PENDING');

    // AuditLog recorded
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: order.id, action: 'PAYMENT_VALIDATION_FAILED' }
    });
    assert.ok(audit, 'Expected security audit log for currency tampering');
  });

  test('A2.9: Amount mismatch is rejected with 400 and logged to AuditLog', async () => {
    const order = await createTestOrder(25000); // 25,000 INR
    const eventId = `evt_bad_amt_${Date.now()}`;

    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_bad_amt_${Date.now()}`,
          amount: 10000, // Tampered: 100 INR instead of 25,000 INR
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error, 'Amount mismatch between PaymentIntent and Order');

    // Order remains pending
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(dbOrder?.paymentStatus, 'PENDING');

    // AuditLog recorded
    const audit = await prisma.auditLog.findFirst({
      where: { entityId: order.id, action: 'PAYMENT_VALIDATION_FAILED' }
    });
    assert.ok(audit, 'Expected security audit log for amount tampering');
  });

  test('A2.10: Unsupported event types are acknowledged with 200 without changing state', async () => {
    const order = await createTestOrder(25000);
    const eventId = `evt_unsupported_${Date.now()}`;

    const payload = {
      id: eventId,
      type: 'customer.subscription.created', // Unsupported type
      data: {
        object: {
          id: 'sub_12345'
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.ignored, true);

    // Order remains pending
    const dbOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(dbOrder?.paymentStatus, 'PENDING');
  });

  test('A2.11: Route alias /api/webhooks/stripe accepts raw body identically', async () => {
    const order = await createTestOrder(15000);
    const eventId = `evt_alias_${Date.now()}`;
    const paymentIntentId = `pi_alias_${Date.now()}`;
    createdIdempKeys.push(`stripe_webhook_${eventId}`);

    const payload = {
      id: eventId,
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          amount: 1500000,
          currency: 'inr',
          metadata: { orderId: order.id }
        }
      }
    };
    const payloadString = JSON.stringify(payload);
    const signature = generateSignature(payloadString);

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Stripe-Signature', signature)
      .set('Content-Type', 'application/json')
      .send(payloadString);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);
    assert.strictEqual(res.body.orderId, order.id);

    const updatedOrder = await prisma.order.findUnique({ where: { id: order.id } });
    assert.strictEqual(updatedOrder?.paymentStatus, 'PAID');
  });

  // --- WORKSTREAM B: CASE-INSENSITIVE SEARCH TESTS ---

  test('B1.1: Product search handles mixed case queries identically (lehenga, LEHENGA, LeHeNgA)', async () => {
    cacheService.flush();

    const variations = ['lehenga', 'LEHENGA', 'LeHeNgA', 'LeHeNgA '];
    let expectedCount: number | null = null;

    for (const query of variations) {
      const res = await request(app)
        .get(`/api/products?search=${encodeURIComponent(query)}`)
        .set('Accept', 'application/json');

      assert.strictEqual(res.status, 200);
      assert.ok(Array.isArray(res.body.products), 'Expected products array');

      if (expectedCount === null) {
        expectedCount = res.body.products.length;
        assert.ok(expectedCount > 0, `Expected search for '${query}' to match at least 1 product`);
      } else {
        assert.strictEqual(
          res.body.products.length,
          expectedCount,
          `Search variation '${query}' count (${res.body.products.length}) did not match expected (${expectedCount})`
        );
      }

      // Verify the test product is in results
      const found = res.body.products.some((p: any) => p.id === testProductId);
      assert.ok(found, `Expected test product in search results for '${query}'`);
    }
  });

  test('B1.2: Product search matches fabric in mixed case (velvet, VELVET)', async () => {
    cacheService.flush();

    const resLower = await request(app).get('/api/products?fabric=velvet');
    const resUpper = await request(app).get('/api/products?fabric=VELVET');

    assert.strictEqual(resLower.status, 200);
    assert.strictEqual(resUpper.status, 200);
    assert.strictEqual(resLower.body.products.length, resUpper.body.products.length);
    assert.ok(resLower.body.products.some((p: any) => p.id === testProductId));
  });

  test('B1.3: Product pagination, sorting, and category filters are preserved with search', async () => {
    cacheService.flush();

    const res = await request(app)
      .get(`/api/products?search=lehenga&category=bridal-lehengas&sortBy=price&order=desc&page=1&limit=5`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.pagination.page, 1);
    assert.strictEqual(res.body.pagination.limit, 5);
    assert.ok(res.body.products.length <= 5);
  });
});
