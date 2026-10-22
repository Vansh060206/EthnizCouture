process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { config } from '../src/config';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('Dynamic UPI QR Payment Integration Tests', () => {
  let activeProduct: any;
  let testCustomer: any;
  let createdOrder: any;

  before(async () => {
    // 1. Ensure test product exists
    activeProduct = await prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 5 } }
    });

    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Zardozi Embroidered Bridal Anarkali',
          slug: `zardozi-bridal-anarkali-${Date.now()}`,
          sku: `SKU-ANR-UPI-${Date.now()}`,
          description: 'Handcrafted raw silk anarkali with zardozi embroidery',
          price: 34500,
          stock: 10,
          isActive: true
        }
      });
    }

    testCustomer = {
      name: 'Princess Gayatri Devi',
      email: `gayatri.couture.${Date.now()}@example.com`,
      phone: '9876543210'
    };

    // 2. Create test order for UPI QR payment
    const orderRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        shippingStreet: '10 City Palace Complex',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302002',
        shippingCountry: 'India',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            quantity: 1
          }
        ],
        paymentMethod: 'UPI'
      });

    assert.strictEqual(orderRes.status, 201, 'Order should be created successfully');
    createdOrder = orderRes.body.order;
    assert.ok(createdOrder?.id, 'Created order must have an id');
    assert.strictEqual(createdOrder.paymentStatus, 'PENDING');
  });

  after(async () => {
    try {
      await prisma.order.deleteMany({
        where: { customerEmail: { contains: 'gayatri.couture.' } }
      });
    } catch {
      // ignore
    }
    backgroundQueue.stop();
  });

  test('1. Reject QR creation when orderId is missing or invalid', async () => {
    const resMissing = await request(app)
      .post('/api/payments/upi/create-qr')
      .send({});

    assert.strictEqual(resMissing.status, 400);
    assert.ok(resMissing.body.message.includes('Order ID is required'));

    const resNotFound = await request(app)
      .post('/api/payments/upi/create-qr')
      .send({ orderId: 'non-existent-order-uuid-999' });

    assert.strictEqual(resNotFound.status, 404);
    assert.ok(resNotFound.body.message.includes('Order not found'));
  });

  test('2. Generate dynamic NPCI UPI QR code with locked order total', async () => {
    const res = await request(app)
      .post('/api/payments/upi/create-qr')
      .send({ orderId: createdOrder.id });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.orderId, createdOrder.id);
    assert.strictEqual(res.body.orderNumber, createdOrder.orderNumber);
    assert.strictEqual(res.body.totalAmount, createdOrder.totalAmount);

    // Verify NPCI standard UPI URI format
    const upiUrl = res.body.upiUrl;
    assert.ok(upiUrl.startsWith('upi://pay?'), 'Must be a valid NPCI UPI payment deep-link');
    assert.ok(upiUrl.includes(`am=${createdOrder.totalAmount.toFixed(2)}`), 'Must lock exact authoritative total amount');
    assert.ok(upiUrl.includes('cu=INR'), 'Currency must strictly be INR');
    assert.ok(upiUrl.includes(`tr=${createdOrder.orderNumber}`), 'Must embed unique order reference transaction ID');

    // Verify QR Code Base64 Data URL
    assert.ok(res.body.qrDataUrl, 'Must return crisp Base64 QR code image');
    assert.ok(res.body.qrDataUrl.startsWith('data:image/png;base64,'), 'QR must be a high-resolution PNG data URL');

    // Verify 15-minute dynamic expiration timestamp
    assert.ok(res.body.expiresAt, 'Must include session expiration');
    const expiryTime = new Date(res.body.expiresAt).getTime();
    assert.ok(expiryTime > Date.now(), 'Expiry must be in the future');
  });

  test('3. Real-time payment status polling returns accurate pending state', async () => {
    // Lookup by ID
    const resById = await request(app).get(`/api/payments/status/${createdOrder.id}`);
    assert.strictEqual(resById.status, 200);
    assert.strictEqual(resById.body.isPaid, false);
    assert.strictEqual(resById.body.paymentStatus, 'PENDING');
    assert.strictEqual(resById.body.orderNumber, createdOrder.orderNumber);

    // Lookup by human-readable Order Number
    const resByNum = await request(app).get(`/api/payments/status/${createdOrder.orderNumber}`);
    assert.strictEqual(resByNum.status, 200);
    assert.strictEqual(resByNum.body.isPaid, false);
    assert.strictEqual(resByNum.body.paymentStatus, 'PENDING');
  });

  test('4. Signed Razorpay Webhook authoritatively approves UPI payment and updates order', async () => {
    const webhookPayload = {
      id: `evt_rzp_test_${Date.now()}`,
      event: 'qr_code.credited',
      payload: {
        qr_code: {
          entity: {
            id: `qr_${Date.now()}`,
            notes: {
              orderId: createdOrder.id,
              orderNumber: createdOrder.orderNumber
            }
          }
        },
        payment: {
          entity: {
            id: `pay_upi_${Date.now()}`,
            amount: Math.round(createdOrder.totalAmount * 100),
            currency: 'INR',
            status: 'captured',
            method: 'upi',
            vpa: 'customer@okhdfcbank',
            notes: {
              orderId: createdOrder.id,
              orderNumber: createdOrder.orderNumber
            }
          }
        }
      }
    };

    const payloadString = JSON.stringify(webhookPayload);
    const rawBuffer = Buffer.from(payloadString, 'utf8');

    // Sign payload with Razorpay webhook secret if present, or compute HMAC
    const secret = config.razorpayWebhookSecret || 'test_webhook_secret_key';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBuffer)
      .digest('hex');

    const res = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.received, true);

    // Verify authoritative database state change
    const updatedOrder = await prisma.order.findUnique({
      where: { id: createdOrder.id },
      include: { statusHistory: true }
    });

    assert.strictEqual(updatedOrder?.paymentStatus, 'PAID', 'Payment status must be marked PAID');
    assert.strictEqual(updatedOrder?.orderStatus, 'CONFIRMED', 'Order status must be CONFIRMED');
    assert.ok(
      updatedOrder?.statusHistory.some((h) => h.notes?.includes('UPI QR')),
      'Must record status history entry with payment note'
    );
  });

  test('5. Duplicate webhook events are handled idempotently without redundant mutations', async () => {
    const uniqueEventId = `evt_rzp_dup_${Date.now()}`;
    const duplicatePayload = {
      id: uniqueEventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: `pay_upi_duplicate_${Date.now()}`,
            notes: {
              orderId: createdOrder.id,
              orderNumber: createdOrder.orderNumber
            }
          }
        }
      }
    };

    const payloadString = JSON.stringify(duplicatePayload);
    const rawBuffer = Buffer.from(payloadString, 'utf8');
    const secret = config.razorpayWebhookSecret || 'test_webhook_secret_key';
    const signature = crypto
      .createHmac('sha256', secret)
      .update(rawBuffer)
      .digest('hex');

    // First call (processes or deduplicates)
    const res1 = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    assert.strictEqual(res1.status, 200);

    // Second duplicate call with identical event ID
    const res2 = await request(app)
      .post('/api/payments/webhook/razorpay')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', signature)
      .send(payloadString);

    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.body.deduplicated, true, 'Second call must be deduplicated via IdempotencyRecord');
  });

  test('6. Real-time polling reflects isPaid: true immediately after webhook approval', async () => {
    const res = await request(app).get(`/api/payments/status/${createdOrder.id}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.isPaid, true);
    assert.strictEqual(res.body.paymentStatus, 'PAID');
    assert.strictEqual(res.body.orderStatus, 'CONFIRMED');
  });

  test('7. Instant sandbox simulation endpoint enables frictionless automated test approval', async () => {
    // Create another test order to simulate
    const order2Res = await request(app)
      .post('/api/orders')
      .send({
        customerName: 'Maharani Gayatri',
        customerEmail: `maharani.${Date.now()}@example.com`,
        customerPhone: '9876543211',
        shippingStreet: '11 Rambagh Palace',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302005',
        shippingCountry: 'India',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            quantity: 1
          }
        ],
        paymentMethod: 'UPI'
      });

    const order2 = order2Res.body.order;

    // Simulate approval
    const simRes = await request(app)
      .post('/api/payments/upi/simulate-pay')
      .send({ orderId: order2.id });

    assert.strictEqual(simRes.status, 200);
    assert.strictEqual(simRes.body.success, true);
    assert.strictEqual(simRes.body.paymentStatus, 'PAID');

    // Confirm polling reflects instant approval
    const pollRes = await request(app).get(`/api/payments/status/${order2.id}`);
    assert.strictEqual(pollRes.body.isPaid, true);
  });
});
