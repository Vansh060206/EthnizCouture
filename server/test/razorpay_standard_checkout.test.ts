process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { backgroundQueue } from '../src/services/backgroundQueue';

const TEST_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'WrnGOfukdNkeOzeq9MmVme0A';

describe('Razorpay Standard Web Checkout Integration Tests', () => {
  let activeProduct: any;
  let testOrder: any;

  before(async () => {
    activeProduct = await prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 5 } }
    });

    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Banarasi Zardozi Bridal Lehenga',
          slug: `banarasi-zardozi-lehenga-${Date.now()}`,
          sku: `SKU-RZP-${Date.now()}`,
          description: 'Handwoven pure silk bridal masterpiece',
          price: 45000,
          stock: 10,
          isActive: true
        }
      });
    }

    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Meera Rajput',
        customerEmail: `meera.couture.${Date.now()}@example.com`,
        customerPhone: '9876543210',
        shippingStreet: '42 Royal Avenue, Heritage Colony',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302001',
        shippingCountry: 'India',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            quantity: 1
          }
        ],
        paymentMethod: 'CARD'
      });

    assert.strictEqual(orderRes.status, 201, 'Order should be created successfully');
    testOrder = orderRes.body.order;
    assert.ok(testOrder?.id, 'Created order must have an id');
  });

  after(async () => {
    try {
      if (testOrder?.id) {
        await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.orderStatusHistory.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.idempotencyRecord.deleteMany({ where: { resourceId: testOrder.id } });
        await prisma.order.delete({ where: { id: testOrder.id } });
      }
    } catch {
      // cleanup safety
    }
    backgroundQueue.stop();
  });

  test('1. POST /api/create-order: rejects amount < 100 paise with 400', async () => {
    const res = await request(app)
      .post('/api/create-order')
      .send({
        amount: 50, // 50 paise is less than minimum 100 paise
        currency: 'INR'
      });

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /at least 100 paise/i);
  });

  test('2. POST /api/create-order: creates order and returns order_id, amount, and currency', async () => {
    const res = await request(app)
      .post('/api/create-order')
      .send({
        amount: 4500000, // 45,000 INR in paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}`
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.order_id, 'Should return order_id');
    assert.strictEqual(res.body.amount, 4500000);
    assert.strictEqual(res.body.currency, 'INR');
  });

  test('3. POST /api/verify-payment: rejects request with missing fields', async () => {
    const res = await request(app)
      .post('/api/verify-payment')
      .send({
        razorpay_order_id: 'order_12345'
        // missing razorpay_payment_id and razorpay_signature
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Missing required Razorpay fields/i);
  });

  test('4. POST /api/verify-payment: rejects invalid cryptographic HMAC signature with 400', async () => {
    const res = await request(app)
      .post('/api/verify-payment')
      .send({
        razorpay_order_id: 'order_test_999999',
        razorpay_payment_id: 'pay_test_888888',
        razorpay_signature: 'tampered_invalid_signature_hex_value_12345'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Invalid cryptographic signature/i);
  });

  test('5. POST /api/verify-payment: verifies genuine HMAC-SHA256 signature', async () => {
    const fakeOrderId = `order_test_${Date.now()}`;
    const fakePaymentId = `pay_test_${Date.now()}`;
    const payload = `${fakeOrderId}|${fakePaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(payload)
      .digest('hex');

    const res = await request(app)
      .post('/api/verify-payment')
      .send({
        order_id: fakeOrderId,
        payment_id: fakePaymentId,
        signature: validSignature
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.match(res.body.message, /Payment signature verified successfully/i);
  });

  test('6. Full Checkout Flow: Create order, launch checkout, and verify signature with database update', async () => {
    // A. Create Razorpay order for test database order
    const createRes = await request(app)
      .post('/api/payments/razorpay/create-order')
      .send({ orderId: testOrder.id });

    assert.strictEqual(createRes.status, 200);
    assert.strictEqual(createRes.body.success, true);
    assert.ok(createRes.body.order_id);
    assert.strictEqual(createRes.body.amount, Math.round(testOrder.totalAmount * 100));
    assert.strictEqual(createRes.body.currency, 'INR');

    const generatedRzpOrderId = createRes.body.order_id;

    // Verify order in database now has paymentIntentId
    const orderBefore = await prisma.order.findUnique({ where: { id: testOrder.id } });
    assert.strictEqual(orderBefore?.paymentIntentId, generatedRzpOrderId);
    assert.strictEqual(orderBefore?.paymentStatus, 'PENDING');

    // B. Generate genuine HMAC-SHA256 signature
    const testPaymentId = `pay_rzp_mock_${Date.now()}`;
    const payload = `${generatedRzpOrderId}|${testPaymentId}`;
    const validSignature = crypto
      .createHmac('sha256', TEST_KEY_SECRET)
      .update(payload)
      .digest('hex');

    // C. Verify payment
    const verifyRes = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .send({
        orderId: testOrder.id,
        razorpay_order_id: generatedRzpOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature
      });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert.strictEqual(verifyRes.body.orderId, testOrder.id);

    // D. Verify database state: order marked PAID and CONFIRMED
    const orderAfter = await prisma.order.findUnique({
      where: { id: testOrder.id },
      include: { statusHistory: true }
    });
    assert.strictEqual(orderAfter?.paymentStatus, 'PAID');
    assert.strictEqual(orderAfter?.orderStatus, 'CONFIRMED');
    assert.strictEqual(orderAfter?.paymentMethod, 'RAZORPAY');

    // E. Test idempotency: repeated verification returns 200
    const replayRes = await request(app)
      .post('/api/payments/razorpay/verify-payment')
      .send({
        orderId: testOrder.id,
        razorpay_order_id: generatedRzpOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature
      });

    assert.strictEqual(replayRes.status, 200);
    assert.strictEqual(replayRes.body.success, true);
    assert.match(replayRes.body.message, /already marked as PAID/i);
  });
});
