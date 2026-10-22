process.env.NODE_ENV = 'test';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import app from '../src/server';
import prisma from '../src/prisma';
import { backgroundQueue } from '../src/services/backgroundQueue';

describe('COD Online Payment Conversion & Flipkart-Style Tracking Tests', () => {
  let activeProduct: any;
  let testCustomer: any;

  before(async () => {
    activeProduct = await prisma.product.findFirst({
      where: { isActive: true, stock: { gt: 5 } }
    });

    if (!activeProduct) {
      activeProduct = await prisma.product.create({
        data: {
          name: 'Varanasi Royal Brocade Lehengas',
          slug: `royal-brocade-lehenga-test-${Date.now()}`,
          sku: `SKU-LEH-COD-${Date.now()}`,
          description: 'Handcrafted bridal brocade lehenga',
          price: 28000,
          stock: 12,
          isActive: true
        }
      });
    }

    testCustomer = {
      name: 'Aditi Rao Hydari',
      email: `aditi.couture.${Date.now()}@example.com`,
      phone: '9820198201'
    };
  });

  after(async () => {
    try {
      await prisma.order.deleteMany({
        where: { customerEmail: { contains: 'aditi.couture.' } }
      });
    } catch {
      // ignore
    }
    backgroundQueue.stop();
  });

  test('1. Place COD order and verify tracking payload contains id and paymentMethod', async () => {
    // 1. Create COD Order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        shippingStreet: '14 Palace Road',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302001',
        shippingCountry: 'India',
        paymentMethod: 'COD',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            price: activeProduct.price,
            quantity: 1,
            size: 'L',
            color: 'Royal Burgundy'
          }
        ]
      });

    assert.strictEqual(createRes.status, 201);
    const order = createRes.body.order;
    assert.ok(order.id);
    assert.ok(order.orderNumber);
    assert.strictEqual(order.paymentMethod, 'COD');
    assert.strictEqual(order.paymentStatus, 'PENDING');
    assert.strictEqual(order.orderStatus, 'CONFIRMED');

    // 2. Fetch via Tracking endpoint
    const trackRes = await request(app)
      .get('/api/orders/track')
      .query({ orderNumber: order.orderNumber });

    assert.strictEqual(trackRes.status, 200);
    const trackedOrder = trackRes.body.order;
    assert.strictEqual(trackedOrder.id, order.id);
    assert.strictEqual(trackedOrder.orderNumber, order.orderNumber);
    assert.strictEqual(trackedOrder.paymentMethod, 'COD');
    assert.strictEqual(trackedOrder.paymentStatus, 'PENDING');
    assert.ok(trackedOrder.items.length > 0);
    assert.strictEqual(trackedOrder.items[0].productName, activeProduct.name);
    assert.ok(trackedOrder.items[0].price > 0);
  });

  test('2. Convert COD order to prepaid online payment and verify update', async () => {
    // 1. Create another COD Order
    const createRes = await request(app)
      .post('/api/orders')
      .send({
        customerName: testCustomer.name,
        customerEmail: testCustomer.email,
        customerPhone: testCustomer.phone,
        shippingStreet: '22 Hawa Mahal Lane',
        shippingCity: 'Jaipur',
        shippingState: 'Rajasthan',
        shippingPincode: '302002',
        shippingCountry: 'India',
        paymentMethod: 'COD',
        items: [
          {
            productId: activeProduct.id,
            name: activeProduct.name,
            price: activeProduct.price,
            quantity: 1
          }
        ]
      });

    const order = createRes.body.order;
    assert.strictEqual(order.paymentMethod, 'COD');
    assert.strictEqual(order.paymentStatus, 'PENDING');

    // 2. Initialize Payment Intent for online conversion
    const intentRes = await request(app)
      .post('/api/payments/create-intent')
      .send({
        orderId: order.id,
        amount: order.totalAmount,
        currency: 'inr'
      });

    assert.strictEqual(intentRes.status, 200);
    assert.ok(intentRes.body.paymentIntentId);

    // 3. Verify Payment
    const verifyRes = await request(app)
      .post('/api/payments/verify')
      .send({
        orderId: order.id,
        paymentIntentId: intentRes.body.paymentIntentId
      });

    assert.strictEqual(verifyRes.status, 200);
    assert.strictEqual(verifyRes.body.success, true);
    assert.strictEqual(verifyRes.body.order.paymentStatus, 'PAID');
    assert.strictEqual(verifyRes.body.order.paymentMethod, 'ONLINE');

    // 4. Verify Tracking endpoint reflects prepaid state
    const trackRes = await request(app)
      .get('/api/orders/track')
      .query({ orderNumber: order.orderNumber });

    assert.strictEqual(trackRes.status, 200);
    assert.strictEqual(trackRes.body.order.paymentStatus, 'PAID');
    assert.strictEqual(trackRes.body.order.paymentMethod, 'ONLINE');

    // 5. Subsequent attempt to create intent on already-paid order returns 400
    const doubleIntentRes = await request(app)
      .post('/api/payments/create-intent')
      .send({
        orderId: order.id
      });

    assert.strictEqual(doubleIntentRes.status, 400);
    assert.strictEqual(doubleIntentRes.body.message, 'Order has already been paid');
  });
});
